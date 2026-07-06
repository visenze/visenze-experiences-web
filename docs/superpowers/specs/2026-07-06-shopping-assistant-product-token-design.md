# Shopping Assistant — Product-ID token parsing (design)

Date: 2026-07-06
Widget: `src/official-widgets/shopping-assistant`
Branch context: `feature/prompt` (backend chat prompt/output format is in flux)

## Problem

The Shopping Assistant streams an SSE response of `chat_token` events (the assistant's
prose) interleaved with `product` events (full product payloads). Product references are
embedded in the prose as `[[<product_id>]]` tokens, which the widget is meant to strip
from the text and replace with a rendered `ProductCard`.

Detection currently relies on a line-oriented regex that assumes the token is the **first**
thing on a line:

```js
// shopping-assistant.tsx
const PRODUCT_LINE_REGEX = /^(?:\d+\.? |- )?\[\[(.*)]]/;
```

The backend output format changed: the token now trails the description on the same line, e.g.

```
- French light luxury evening dress: Elegant and refined, ideal for a special night out. [[16063094812404715415001820]]
```

The observed token stream confirms the token sits at the **end** of the line:
`"...evening out. "` → `product` event → `"[[16063094812404715415001820]]"` → `"\n- Banqu..."`.

Because `PRODUCT_LINE_REGEX` only matches a leading token, detection fails entirely: no
product cards are emitted and the raw `[[...]]` string leaks into the chat bubble as literal
text.

The current detection also drives a fragile line-tracking state machine
(`currentLine`, `lastLineWithProduct`, `isFetchingProduct`, `latestPid`, `messageToDisplay`)
that reasons per-SSE-token and breaks if a `[[pid]]` is ever split across two SSE chunks.

## Goal / desired behavior

Match the (already-correct) visual output the old format produced, plus preserve the richer
per-item descriptions:

- One `bot` text bubble containing the assistant's prose with all `[[pid]]` and
  `((suggestion))` tokens stripped out.
- Below it, a **grouped** 2-column grid of full `ProductCard`s — one per referenced product,
  in first-appearance order — identical component/layout to today.
- **Live streaming preserved:** text types out as tokens arrive, and each product card pops in
  as soon as its `[[pid]]` token completes in the stream *and* its `product` event has arrived.
- Suggestions (`((...))`) continue to render as tappable chips (unchanged).

### Decisions (confirmed with user)

1. **Display format:** full `ProductCard` (same component used today).
2. **Placement:** grouped grid below the text bubble (current layout), not inline/interleaved.
3. **Line text:** keep the assistant's descriptive text; strip only the token.
4. **Live streaming:** required — cards must stream in during the response, not only on
   completion (this is why we use Approach C rather than a parse-only-on-close approach).
5. **Format support:** hybrid — support both the old (`[[pid]]`-leading) and new
   (`[[pid]]`-trailing) formats. (Chosen as the safe default while the backend prompt is in
   flux; user was away for final confirmation.)

## Approach (C): token-based parse with live card streaming

Replace the per-SSE-token line-tracking state machine with a small, **position-independent**
parser that always operates on the *full accumulated text* (`tokens.join('')`), so token
position and SSE chunk boundaries no longer matter.

### Regexes

```js
// Product token anywhere in the text. Non-greedy id, no nested brackets.
// Use as a literal in matchAll / replace to avoid shared-lastIndex bugs with /g.
//   const pids = [...text.matchAll(/\[\[([^\]]+)]]/g)].map((m) => m[1]);
//   text.replace(/\[\[[^\]]+]]/g, '');

// Old format only: token leads the line (optionally after "- " / "1." / "1 ").
const LEADING_PRODUCT_REGEX = /^(?:\d+\.? |- )?\[\[[^\]]+]]/;

// Existing, unchanged.
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;
```

### Text cleaning (hybrid old + new format)

```js
const stripTokensForDisplay = (text: string): string => {
  const cleaned = text
    .split('\n')
    .map((line) => {
      // Old format: token leads the line -> drop the whole line (card replaces it).
      if (LEADING_PRODUCT_REGEX.test(line)) {
        return null;
      }
      // New format: strip inline product token(s), keep the surrounding description.
      return line.replace(/\[\[[^\]]+]]/g, '');
    })
    .filter((line): line is string => line !== null)
    .join('\n')
    // remove suggestion tokens
    .replace(SUGGESTION_LINE_REGEX, '')
    // remove a trailing, not-yet-closed token fragment (e.g. "...[[1606") mid-stream
    .replace(/\[\[[^\]]*$/, '');
  return cleaned;
};
```

Displayed text is `stripTokensForDisplay(...).trim()`.

### Ordered product resolution (token-driven)

```js
const resolveProducts = (text: string, products: ProcessedProduct[]): ProcessedProduct[] => {
  const pidsInOrder = [...text.matchAll(/\[\[([^\]]+)]]/g)].map((m) => m[1]);
  const seen = new Set<string>();
  const ordered: ProcessedProduct[] = [];
  for (const pid of pidsInOrder) {
    if (seen.has(pid)) continue;
    const prod = products.find((p) => p.product_id === pid);
    if (prod) {
      seen.add(pid);
      ordered.push(prod);
    }
  }
  return ordered;
};
```

Only pids that appear as a token **and** have a matching `product` event are rendered
(token-driven, consistent with prior behavior). Order = first token appearance.

### Streaming flow (`sendMessage` in `shopping-assistant.tsx`)

Local mutable state kept in the SSE closure (as today): `tokens: string[]`,
`products: ProcessedProduct[]`, `chatIdFromResp`, `reqIdFromResp`.

New React state: `streamingProducts: ProcessedProduct[]` (the live grid shown under the
in-progress bubble). `latestMessage` is reused for the live text bubble.

Remove: `currentLine`, `lastLineWithProduct`, `latestPid`, `isFetchingProduct`,
`messageToDisplay`, `hasReceivedFirstToken`, and `PRODUCT_LINE_REGEX` / `IMAGE_LINE_REGEX`.

On `chat_token`:
1. `setIsWaiting(false)`; push token.
2. `const currentText = tokens.join('')`.
3. `setLatestMessage(stripTokensForDisplay(currentText).trim())`.
4. `setSuggestions(...)` parsed from `currentText` (existing logic).
5. `setStreamingProducts(resolveProducts(currentText, products))`.

On `product`:
1. `products.push(getFlattenProduct(data))` (existing).
2. `setStreamingProducts(resolveProducts(tokens.join(''), products))` — so a card that was
   waiting on its payload appears as soon as the payload arrives.

On `chat_id` / `reqid`: unchanged.

On `close`:
1. `const finalText = stripTokensForDisplay(tokens.join('')).trim()`.
2. `const finalProducts = resolveProducts(tokens.join(''), products)`.
3. Commit in one `setChats`:
   - push a `bot` chat with `messages: [finalText]` **only if** `finalText` is non-empty
     (avoids empty bubbles);
   - push a `products` chat with `products: finalProducts` **only if** it is non-empty.
4. If `finalProducts.length`: send `RESULT_LOAD` tracking + `setLastTrackingMeta`
   (preserve existing tracking behavior).
5. `setSuggestions(...)` from the final text; `setLatestMessage('')`;
   `setStreamingProducts([])`; `setAllowUserInput(true)`.

### Rendering (`components/ChatWindow.tsx`)

- New optional prop `streamingProducts?: ProcessedProduct[]`.
- In the in-progress block (`{(isWaiting || latestMessage) && ...}`), render, **below** the
  `latestMessage` bubble, a 2-column product grid using the same markup/classes as the
  committed `author === 'products'` row (reuse `getProductGridCssClasses` /
  `getProductGridCssConfig`, `ProductCard`, wishlist wiring). Only render when
  `streamingProducts` is non-empty.
- The committed `author === 'products'` row is unchanged.

Result: during streaming the text bubble grows and cards pop in beneath it; on close the same
content is committed as a `bot` bubble + `products` grid — visually continuous.

## Out of scope / non-goals

- **Markdown image lines** (`![alt](url)`): the old code used `IMAGE_LINE_REGEX` only as a
  text-split boundary; it never actually rendered such images. Dropping the state machine means
  these lines simply remain as (escaped) text, same net UX. Rendering markdown images is not
  part of this change.
- No change to endpoint resolution, tracking event names, suggestions UX, camera/upload flows,
  or config schema.
- Inline/interleaved card placement is explicitly not pursued (grouped grid chosen).

## Testing

- Update `shopping-assistant.spec.tsx` and its `__snapshots__` (`npx jest ... -u`) for the new
  rendering. Add/extend cases covering:
  - new format (`... desc [[pid]]`) → description kept, card rendered, no raw token in DOM;
  - old format (`- [[pid]] **title** - desc`) → whole line dropped, card rendered;
  - suggestions still parsed;
  - a `[[pid]]` with no matching `product` event → token stripped, no card;
  - a `[[pid]]` split across two SSE `chat_token` chunks → still parsed (regression guard).
- `npm run type-check` and `npm run lint` must pass (build runs ESLint with `failOnError`).

## Risks

- Snapshot churn is expected; review diffs to confirm intended output.
- If the backend ever emits `[[pid]]` mid-line in genuinely old-format responses where the
  trailing text should be discarded, the hybrid rule keeps it (kept-description wins for
  non-leading tokens). This matches the stated new-format intent and is acceptable.
