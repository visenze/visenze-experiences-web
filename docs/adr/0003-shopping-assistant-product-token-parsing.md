# ADR 0003: Position-independent `[[product_id]]` token parsing in Shopping Assistant

- **Status:** Accepted
- **Date:** 2026-07-06
- **Related:** `docs/superpowers/specs/2026-07-06-shopping-assistant-product-token-design.md`;
  `docs/superpowers/plans/2026-07-06-shopping-assistant-product-token.md`;
  `src/official-widgets/shopping-assistant/shopping-assistant.tsx`;
  `src/official-widgets/shopping-assistant/components/ChatWindow.tsx`

## Context

The Shopping Assistant widget streams the assistant's response over SSE as a sequence of
`chat_token` events (prose) interleaved with `product` events (full product payloads). Product
references are embedded in the prose as `[[<product_id>]]` tokens, which the widget strips from
the displayed text and replaces with a rendered `ProductCard`.

Detection relied on a line-oriented regex that assumed the token was the first thing on a line:

```js
const PRODUCT_LINE_REGEX = /^(?:\d+\.? |- )?\[\[(.*)]]/;
```

driving a per-SSE-token state machine (`currentLine`, `lastLineWithProduct`, `latestPid`,
`isFetchingProduct`, `messageToDisplay`) that reasoned about token position line-by-line as
chunks arrived.

The backend prompt changed the output format: the token now trails the description on the same
line (`- French light luxury evening dress: ... [[16063094812404715415001820]]`) instead of
leading it (`- [[pid]] **title** - desc`). Because the leading-only regex never matched, product
detection failed silently: no card rendered, and the raw `[[...]]` string leaked into the chat
bubble as literal text. The line-tracking state machine was also fragile independent of this bug —
it reasoned per-SSE-token, so a `[[pid]]` split across two SSE chunks would never be recognized.

## Decision

Replace the line-tracking state machine with two pure helpers that always operate on the full
accumulated stream text (`tokens.join('')`), making detection independent of token position and
immune to chunk-boundary splitting:

- **`stripTokensForDisplay(text)`** — hybrid cleaning: a line whose token *leads* it (old format)
  is dropped in full, since the product card replaces it; a token appearing *inline/trailing* (new
  format) is stripped in place, keeping the surrounding description. Also strips `((suggestion))`
  tokens and any trailing, not-yet-closed `[[...` fragment so a partial token never flashes in the
  bubble mid-stream.
- **`resolveProducts(text, products)`** — walks `[[pid]]` tokens in first-appearance order,
  deduplicates, and includes a product only once its `product` event payload has arrived.

Both formats (leading and trailing token) are supported simultaneously, since the backend prompt
was still in flux at the time of this change and either could appear.

Product cards now stream in live: a new `streamingProducts` React state is recomputed on every
`chat_token` and `product` SSE event and rendered by `ChatWindow` in a grid beneath the
in-progress text bubble, so a card appears as soon as its token is complete in the stream *and*
its payload has arrived — not only once the response finishes. On stream close, the same content
commits as a `bot` text bubble followed by a `products` grid, matching the pre-existing
end-state layout.

### Alternatives considered

- **Patch `PRODUCT_LINE_REGEX` to also match a trailing token, keep the state machine** — rejected.
  The state machine already conflated "detect a token" with "which line is it on," and stretching
  it to strip an inline token while still tracking line-by-line invited a repeat of this same class
  of bug on the next prompt change. It also would not fix the chunk-boundary-splitting weakness.
- **Parse only on stream close (drop live card streaming)** — simpler, but a regression: cards
  currently pop in during the response, and losing that would be a visible UX downgrade.
- **New-format-only parsing (drop old-format support)** — rejected for now because the backend
  prompt was still changing on the same branch; supporting both formats costs one small per-line
  branch and avoids a second bug hunt if the backend reverts or mixes formats.

## Consequences

**Positive**
- Product-card detection is immune to token position and to `[[pid]]` being split across SSE
  chunks, so it does not silently break on future backend prompt formatting changes in the same
  way.
- Deletes ~85 lines of fragile per-token state (`currentLine`, `lastLineWithProduct`, `latestPid`,
  `isFetchingProduct`, `messageToDisplay`, `hasReceivedFirstToken`) in favor of two pure,
  independently testable functions.
- Live card streaming is preserved (a UX requirement), not just restored at stream close.
- Backward compatible with the old, leading-token format already used in production.

**Negative / trade-offs**
- The hybrid old+new format support is a deliberate temporary safety net while the backend prompt
  format is unstable; it adds one branch (`LEADING_PRODUCT_REGEX`) that has no purpose once the
  backend format fully stabilizes and could be simplified away later.
- A card rendered live during streaming and later re-mounted as a committed row (a different DOM
  subtree, since the live grid and the committed `chats` row are separate render locations) would
  otherwise mount a second `IntersectionObserver` and double-count `PRODUCT_VIEW`. `ChatWindow`
  guards against this with a `viewedProductIdsRef` set, keyed by `${requestId}:${productId}` and
  checked via an optional `skipViewTracking`/`onProductViewed` pair on `ProductCard`: a card that
  already fired its view while streaming live is not counted again on remount, while a card that
  streamed but was never actually seen still fires normally once visible. Keying by request (not
  just product ID) intentionally lets the same product recommended again in a later response earn
  its own view, and requires no explicit reset on "New Chat".
- A partial, not-yet-closed token or suggestion fragment can still cause a brief cosmetic flash of
  surrounding text before the closing `]]`/`))` arrives; this is a transient rendering artifact,
  not a data-correctness issue.

## Implementation

Shipped on `feature/prompt` (PR #134), targeting widget version `1.0.23-snapshot.0`. Files:
`shopping-assistant.tsx`, `shopping-assistant.spec.tsx`, `components/ChatWindow.tsx`,
`common/components/product-card/ProductCard.tsx` (the optional `skipViewTracking`/
`onProductViewed` guard, backward compatible for every other consumer of `ProductCard`).

Verification covered:

- New trailing-token format: description text kept, card rendered, no raw token in the DOM.
- Old leading-token format: whole line dropped, card rendered (hybrid support).
- Live streaming: a card renders before the SSE stream closes, once its token and payload have
  both arrived.
- A `[[pid]]` token split across two separate `chat_token` chunks is still recognized once
  complete, with no partial-token leak into the displayed text.
- A `[[pid]]` token with no matching `product` event is stripped from display but renders no card.
- A live card carries the current SSE request ID (not an empty one) into its tracking metadata.
- A card transitioning from the live grid to the committed row fires exactly one `PRODUCT_VIEW`,
  verified by driving a mocked `IntersectionObserver` before and after the stream closes.
- The same product ID appearing in two different responses (different request IDs) still earns
  a `PRODUCT_VIEW` for each response — the dedup key does not over-suppress across requests.
- A live product resolving after its token (no accompanying text change) still triggers
  auto-scroll.
- Suggestion (`((...))`) parsing and the existing `RESULT_LOAD` tracking event on stream close
  (gated on at least one resolved product) are unchanged.
