# Shopping Assistant Product-ID Token Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Shopping Assistant recognize `[[product_id]]` tokens wherever they appear in the streamed response (new backend format puts them at the end of the line), strip them from the chat text, and render the referenced products as `ProductCard`s — while preserving the live-streaming experience.

**Architecture:** Replace the fragile per-SSE-token, line-tracking state machine in `shopping-assistant.tsx` with two small position-independent pure helpers that always operate on the full accumulated text: `stripTokensForDisplay` (hybrid old/new format text cleaning) and `resolveProducts` (token-driven, ordered product resolution). A new `streamingProducts` React state feeds a live product grid that `ChatWindow` renders beneath the in-progress bubble; on stream close the same content is committed as a `bot` bubble + `products` grid row.

**Tech Stack:** React 18, TypeScript (strict), HeroUI, Tailwind, `@microsoft/fetch-event-source` (SSE), Jest + Testing Library.

## Global Constraints

- TS is `strict` with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` (bracket access for index signatures), `noImplicitOverride`.
- ESLint (Airbnb + `@typescript-eslint` strict): single quotes, semicolons, trailing commas (multiline), **explicit function return types**, `import/order` alphabetized with no blank lines between groups, `consistent-type-imports` (`import type`), max line length 180. `no-console` allows only `warn`/`error`. The production build runs ESLint with `failOnError: true` — lint errors break the build.
- Widget version source of truth is `src/version.js` (do not bump for this change).
- Run a single spec file with `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx`.
- Do not use `Date.now()`-dependent assertions; tests use `jest.useFakeTimers()`.

---

## File Structure

- `src/official-widgets/shopping-assistant/shopping-assistant.tsx` — MODIFY. Regexes, two new module-level pure helpers, `streamingProducts` state, rewritten SSE `onmessage`/`onclose`, reset in `newChat`.
- `src/official-widgets/shopping-assistant/components/ChatWindow.tsx` — MODIFY. New optional `streamingProducts` prop, a DRY `renderProductCard` helper, live product grid in the in-progress block.
- `src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx` — MODIFY. New tests for the new trailing-token format, live streaming, split tokens, missing-payload, and hybrid old-format behavior.

Task order matters: **Task 1 (ChatWindow) lands first** as a backward-compatible refactor (adds an optional prop defaulting to `[]`, so existing behavior is unchanged and the current suite stays green). **Task 2 (shopping-assistant.tsx)** then switches the data source to the new parser and passes `streamingProducts` down. This keeps the existing mid-stream product tests green throughout (they assert card counts *before* stream close, so the live grid must exist before the parser rewrite relies on it).

---

### Task 1: ChatWindow — add `streamingProducts` prop and DRY the product-card render

**Files:**
- Modify: `src/official-widgets/shopping-assistant/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: `ProcessedProduct` (already imported), `ProductCard` (already imported), existing `getProductGridCssClasses` / `getProductGridCssConfig` helpers, `wishlistPids` / `setWishlistPids` state.
- Produces: `ChatWindowProps.streamingProducts?: ProcessedProduct[]` — an ordered list of products to render live beneath the in-progress bubble. Defaults to `[]` when the parent passes nothing (backward compatible).

- [ ] **Step 1: Add `ReactElement` to the React type import**

In `ChatWindow.tsx` line 2, change:

```tsx
import { type CSSProperties, type FC, Fragment, useContext, useEffect, useState } from 'react';
```

to:

```tsx
import { type CSSProperties, type FC, Fragment, type ReactElement, useContext, useEffect, useState } from 'react';
```

- [ ] **Step 2: Add the `streamingProducts` prop to `ChatWindowProps`**

In the `ChatWindowProps` interface (lines 21-29), add the new optional field after `sendMessage`:

```tsx
interface ChatWindowProps {
  isWaiting: boolean;
  showAllSuggestions: boolean;
  setShowAllSuggestions: () => void;
  chats: Chat[];
  latestMessage: string;
  suggestions: string[];
  sendMessage: (message: string) => void;
  streamingProducts?: ProcessedProduct[];
}
```

- [ ] **Step 3: Destructure `streamingProducts` with a default**

Change the component signature (line 31) from:

```tsx
const ChatWindow: FC<ChatWindowProps> = ({ isWaiting, chats, latestMessage, suggestions, sendMessage, showAllSuggestions, setShowAllSuggestions }) => {
```

to:

```tsx
const ChatWindow: FC<ChatWindowProps> = ({
  isWaiting, chats, latestMessage, suggestions, sendMessage, showAllSuggestions, setShowAllSuggestions, streamingProducts = [],
}) => {
```

- [ ] **Step 4: Add a DRY `renderProductCard` helper**

Immediately after the `getProductGridCssConfig` function (i.e. after line 103, before the `return (`), add:

```tsx
  const renderProductCard = (product: ProcessedProduct, pidx: number, requestId: string): ReactElement => (
      <ProductCard
          result={product}
          key={`${product.product_id}-${pidx}`}
          metadata={{
            queryId: requestId,
          }}
          isInWishlist={wishlistPids.includes(product.product_id)}
          setIsInWishlist={(pid, isInWishlist) => {
            setWishlistPids((prev) => {
              const newPids = [...prev];
              if (isInWishlist && !newPids.includes(pid)) {
                newPids.push(pid);
              }
              if (!isInWishlist && newPids.includes(pid)) {
                newPids.splice(newPids.indexOf(pid), 1);
              }
              return newPids;
            });
          }}
          index={pidx}
          pwPrefix='sa'
          isRecommendation={false}
          hasFindSimilar={false} />
  );
```

- [ ] **Step 5: Use `renderProductCard` for the committed products row**

Replace the committed products block (lines 169-193) with:

```tsx
                {chat.author === 'products' && (chat.products || []).map((product, pidx) => renderProductCard(product, pidx, chat.requestId))}
```

- [ ] **Step 6: Render the live streaming product grid and widen the in-progress condition**

Replace the entire in-progress block (lines 196-227), which currently starts with `{(isWaiting || latestMessage) && (` and ends at its closing `)}`, with:

```tsx
          {(isWaiting || latestMessage || streamingProducts.length > 0) && (
              <>
                <div className='chat-row flex gap-2 items-end'>
                  {isWaiting && (
                    <div className='flex gap-1 max-w-9/10'>
                      <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
                        bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                        <SparklesIcon className='size-5' />
                      </div>
                      <div className='flex items-center w-fit gap-2 p-2 rounded-lg dark:border-neutral-800
                        bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                        {[0, 1, 2].map((i) => (
                            <div
                              key={`loading-dot-${i}`}
                              className='loading-dot rounded-full'
                              style={{ backgroundColor: darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor }}
                            />
                        ))}
                      </div>
                      </div>
                  )}
                  {latestMessage && (
                      <div
                        className={`
                          mb-2 w-fit max-w-7/10 bg-gray-100 dark:bg-neutral-800 p-2 text-sm text-neutral-900 dark:text-neutral-100
                          rounded-lg border border-neutral-100 dark:border-neutral-800`}
                        dangerouslySetInnerHTML={{
                          __html: processMessageForDisplay(latestMessage),
                        }}
                      />
                  )}
                </div>
                {streamingProducts.length > 0 && (
                    <div
                      className={cn('w-full grid grid-cols-2', getProductGridCssClasses('gap-x-4'))}
                      style={getProductGridCssConfig(true)}>
                      {streamingProducts.map((product, pidx) => renderProductCard(product, pidx, ''))}
                    </div>
                )}
              </>
          )}
```

- [ ] **Step 7: Run the existing test suite to confirm no regressions**

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx`
Expected: PASS — all existing tests still pass (the new prop defaults to `[]`, so nothing renders differently yet; the parent still drives products via the old code until Task 2).

- [ ] **Step 8: Type-check and lint the changed file**

Run: `npm run type-check`
Expected: no errors.

Run: `npx eslint src/official-widgets/shopping-assistant/components/ChatWindow.tsx`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/official-widgets/shopping-assistant/components/ChatWindow.tsx
git commit -m "refactor(shopping-assistant): add streamingProducts prop and DRY product-card render"
```

---

### Task 2: shopping-assistant.tsx — hybrid token parser + live streaming rewrite

**Files:**
- Modify: `src/official-widgets/shopping-assistant/shopping-assistant.tsx`
- Test: `src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx`

**Interfaces:**
- Consumes: `ChatWindowProps.streamingProducts` (from Task 1), `getFlattenProduct` (already imported), `Actions` / `Category` (already imported), `ProcessedProduct` (already imported).
- Produces: two module-level pure helpers:
  - `stripTokensForDisplay(text: string): string` — removes `[[pid]]` and `((suggestion))` tokens for display; drops an entire line when the token *leads* the line (old format), strips only the inline token otherwise (new format), and trims a trailing not-yet-closed `[[…` fragment.
  - `resolveProducts(text: string, products: ProcessedProduct[]): ProcessedProduct[]` — pids in first-appearance order, deduped, included only when a matching product payload exists.

- [ ] **Step 1: Write the failing tests for the new format, live streaming, split tokens, missing payload, and hybrid old format**

In `shopping-assistant.spec.tsx`, inside the `describe('product streaming', ...)` block (after the existing `it('should handle text after products in stream', ...)` test, before the block's closing `});` at line 415), add:

```tsx
      it('should render card and keep the description for the new trailing-token format', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Show me dresses');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Here are dresses:\n' });
        stream.emitEvent('chat_token', { value: '- Floral dress: a vibrant look. ' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'Floral' },
        });
        stream.emitEvent('chat_token', { value: '[[pid-1]]' });
        stream.emitEvent('chat_token', { value: '\n' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('Floral dress: a vibrant look.')).toBeTruthy();
        expect(getTextInBody('[[pid-1]]')).toBeNull();
      });

      it('should stream the card live (before close) once the token and product arrive', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Live card');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Nice pick: a bold red. ' });
        stream.emitEvent('product', {
          product_id: 'pid-9',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p9', price: { currency: 'USD', value: '20' }, title: 'Red' },
        });
        stream.emitEvent('chat_token', { value: '[[pid-9]]' });

        // Assert BEFORE closing the stream — proves the live grid renders mid-stream.
        expect(queryAllModal('.wigmix-product-card').length).toBe(1);

        stream.closeStream();
      });

      it('should parse a product token split across SSE chunks', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Split token');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Item desc ' });
        stream.emitEvent('chat_token', { value: '[[pi' });
        // Partial, unclosed token must not leak into the bubble.
        expect(getTextInBody('[[pi')).toBeNull();
        stream.emitEvent('chat_token', { value: 'd-1]]' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
        });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('[[pid-1]]')).toBeNull();
      });

      it('should strip the token but render no card when the product payload never arrives', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Missing payload');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Missing item: desc here [[pid-x]]\n' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(0);
        expect(getTextInBody('[[pid-x]]')).toBeNull();
        expect(getTextInBody('Missing item: desc here')).toBeTruthy();
      });

      it('should drop the whole line for the old leading-token format', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Old format');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Intro line:\n' });
        stream.emitEvent('chat_token', { value: '- [[pid-1]] leadingdroptext' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'CardTitle' },
        });
        stream.emitEvent('chat_token', { value: '\n' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('leadingdroptext')).toBeNull();
        expect(getTextInBody('Intro line:')).toBeTruthy();
      });
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -t "trailing-token format"`
Expected: FAIL — the current regex only matches leading tokens, so `[[pid-1]]` leaks into the bubble (`getTextInBody('[[pid-1]]')` is truthy) and no card is rendered.

- [ ] **Step 3: Replace the regexes with the hybrid definitions**

In `shopping-assistant.tsx`, replace the comment + regex block (lines 30-39):

```tsx
// Product line can look like one of these:
// [[pid]] **title** - ...
// - [[pid]] **title** - ...
// 1. [[pid]] **title** - ...
const PRODUCT_LINE_REGEX = /^(?:\d+\.? |- )?\[\[(.*)]]/;
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;

// Sometimes an image can be returned by the bot, in a markdown-compatible format:
//     ![title](im_url)
const IMAGE_LINE_REGEX = /^ *!\[/;
```

with:

```tsx
// A product reference is a token that can appear anywhere in the assistant's text:
//   [[<product_id>]]
// Old format put the token at the START of the line (e.g. "- [[pid]] **title** ...");
// the new format puts it at the END (e.g. "- <description> ... [[pid]]").
// LEADING_PRODUCT_REGEX detects the old, line-leading form so its whole line can be dropped.
const LEADING_PRODUCT_REGEX = /^(?:\d+\.? |- )?\[\[[^\]]+]]/;
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;
```

- [ ] **Step 4: Add the two module-level pure helpers**

In `shopping-assistant.tsx`, immediately after the `SUGGESTION_LINE_REGEX` line and before `interface ShoppingAssistantProps {` (line 41), add:

```tsx
// Clean the accumulated text for display:
// - Old format (token leads the line): drop the whole line; the product card replaces it.
// - New format (token inline/trailing): strip only the token, keep the surrounding description.
// Also removes ((suggestion)) tokens and any trailing, not-yet-closed "[[..." fragment
// that is still mid-stream, so partial tokens never flash in the bubble.
const stripTokensForDisplay = (text: string): string => text
  .split('\n')
  .map((line): string | null => {
    if (LEADING_PRODUCT_REGEX.test(line)) {
      return null;
    }
    return line.replace(/\[\[[^\]]+]]/g, '');
  })
  .filter((line): line is string => line !== null)
  .join('\n')
  .replace(SUGGESTION_LINE_REGEX, '')
  .replace(/\[\[[^\]]*$/, '');

// Resolve referenced products in first-appearance order. A product is included only when
// its token is present in the text AND its payload has arrived via a `product` event.
const resolveProducts = (text: string, products: ProcessedProduct[]): ProcessedProduct[] => {
  const tokenRegex = /\[\[([^\]]+)]]/g;
  const seen = new Set<string>();
  const ordered: ProcessedProduct[] = [];
  let match = tokenRegex.exec(text);
  while (match) {
    const pid = match[1];
    if (!seen.has(pid)) {
      const product = products.find((p) => p.product_id === pid);
      if (product) {
        seen.add(pid);
        ordered.push(product);
      }
    }
    match = tokenRegex.exec(text);
  }
  return ordered;
};
```

- [ ] **Step 5: Add the `streamingProducts` state**

In the component body, after the `latestMessage` state (line 59) and near the other `useState` calls, add:

```tsx
  const [streamingProducts, setStreamingProducts] = useState<ProcessedProduct[]>([]);
```

- [ ] **Step 6: Reset `streamingProducts` at the start of `sendMessage`**

In `sendMessage`, in the reset block (lines 79-82) that already calls `setSuggestions([])`, add the reset:

```tsx
    setIsWaiting(true);
    setShowAllSuggestions(false);
    setMessage('');
    setSuggestions([]);
    setStreamingProducts([]);
```

- [ ] **Step 7: Remove the obsolete line-tracking locals**

In `sendMessage`, delete these now-unused local declarations (from lines 96-102): `currentLine`, `latestPid`, `lastLineWithProduct`, `messageToDisplay`, `isFetchingProduct`, `hasReceivedFirstToken`. Keep `chatIdFromResp`, `reqIdFromResp`, `tokens`, `chatIdToUse`, `products`, `uid`, `sid`. The block should read:

```tsx
    let chatIdFromResp = '';
    let reqIdFromResp = '';
    const tokens: string[] = [];
    const chatIdToUse = chatIdParam || chatId;
    const products: ProcessedProduct[] = [];
    // Retrieve user id and session id from ViSearch client
    let uid = '';
    let sid = '';
```

- [ ] **Step 8: Rewrite the `onmessage` handler**

Replace the entire `onmessage: (ev) => { ... }` handler (lines 143-228) with:

```tsx
      onmessage: (ev) => {
        if (ev.event === 'chat_id') {
          chatIdFromResp = JSON.parse(ev.data).value;
        } else if (ev.event === 'reqid') {
          reqIdFromResp = JSON.parse(ev.data).value;
        } else if (ev.event === 'chat_token') {
          setIsWaiting(false);
          tokens.push(JSON.parse(ev.data).value);
          const currentText = tokens.join('');
          const allSuggestions = currentText.match(SUGGESTION_LINE_REGEX);
          setSuggestions((allSuggestions || []).map((s) => s.replace('((', '').replace('))', '').trim()));
          setLatestMessage(stripTokensForDisplay(currentText).trim());
          setStreamingProducts(resolveProducts(currentText, products));
        } else if (ev.event === 'product') {
          products.push(getFlattenProduct(JSON.parse(ev.data)));
          setStreamingProducts(resolveProducts(tokens.join(''), products));
        }
      },
```

- [ ] **Step 9: Rewrite the `onclose` handler**

Replace the entire `onclose: () => { ... }` handler (lines 229-270) with:

```tsx
      onclose: () => {
        const currentText = tokens.join('');
        const allSuggestions = currentText.match(SUGGESTION_LINE_REGEX);
        setSuggestions((allSuggestions || []).map((s) => s.replace('((', '').replace('))', '').trim()));
        const finalText = stripTokensForDisplay(currentText).trim();
        const finalProducts = resolveProducts(currentText, products);
        if (finalProducts.length) {
          const requestMetadata = {
            queryId: reqIdFromResp,
            cat: Category.RESULT,
          };
          widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
          widgetClient.setLastTrackingMeta(requestMetadata);
        }
        setChats((chats1) => {
          const newChats = [...chats1];
          if (finalText) {
            newChats.push({
              chatId: chatIdFromResp,
              requestId: reqIdFromResp,
              messages: [finalText],
              author: 'bot',
              products: [],
            });
          }
          if (finalProducts.length) {
            newChats.push({
              chatId: chatIdFromResp,
              requestId: reqIdFromResp,
              messages: [],
              author: 'products',
              products: finalProducts,
            });
          }
          return newChats;
        });
        setLatestMessage('');
        setStreamingProducts([]);
        setAllowUserInput(true);
      },
```

- [ ] **Step 10: Pass `streamingProducts` to `ChatWindow`**

In `getScreen`, update the `<ChatWindow ... />` usage (lines 383-389) to pass the new prop:

```tsx
        <ChatWindow isWaiting={isWaiting}
                    chats={chats}
                    latestMessage={latestMessage}
                    suggestions={suggestions}
                    streamingProducts={streamingProducts}
                    showAllSuggestions={showAllSuggestions}
                    setShowAllSuggestions={() => setShowAllSuggestions(true)}
                    sendMessage={sendMessage} />
```

- [ ] **Step 11: Reset `streamingProducts` in `newChat`**

In `newChat` (lines 325-353), in the reset block that already calls `setSuggestions([])`, add the reset:

```tsx
    setChats([]);
    setLatestMessage('');
    setSuggestions([]);
    setStreamingProducts([]);
```

- [ ] **Step 12: Run the new tests to verify they pass**

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -t "trailing-token format"`
Expected: PASS.

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -t "stream the card live"`
Expected: PASS.

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -t "split across SSE chunks"`
Expected: PASS.

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -t "product payload never arrives"`
Expected: PASS.

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -t "old leading-token format"`
Expected: PASS.

- [ ] **Step 13: Run the full shopping-assistant suite to confirm no regressions**

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx`
Expected: PASS — all tests, including the existing old-format `product streaming` tests (they assert card counts mid-stream, now served by the live `streamingProducts` grid). If the `closed state` snapshot fails unexpectedly, inspect the diff; it should not change (closed state renders no products). Only run `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx -u` if the diff is a legitimate, intended change.

- [ ] **Step 14: Commit**

```bash
git add src/official-widgets/shopping-assistant/shopping-assistant.tsx src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx
git commit -m "fix(shopping-assistant): recognize [[product_id]] tokens anywhere in the stream"
```

---

### Task 3: Validation — type-check, lint, and full test run

**Files:** none (verification only).

- [ ] **Step 1: Type-check the whole project**

Run: `npm run type-check`
Expected: no errors. (Watch for `noUnusedLocals` on any leftover removed variable and `noPropertyAccessFromIndexSignature` on index-signature access.)

- [ ] **Step 2: Lint the changed files**

Run: `npx eslint src/official-widgets/shopping-assistant/shopping-assistant.tsx src/official-widgets/shopping-assistant/components/ChatWindow.tsx src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx`
Expected: no errors. Fix any `import/order`, explicit-return-type, quote, or trailing-comma issues inline.

- [ ] **Step 3: Run the full shopping-assistant test file once more**

Run: `npx jest src/official-widgets/shopping-assistant/shopping-assistant.spec.tsx`
Expected: PASS, all tests.

- [ ] **Step 4: Manual smoke test (optional but recommended)**

Add a valid app key + placement ID to `dev-configs.ts`, then run:

```bash
npm run start:shopping-assistant
```

Send a query that returns products and confirm: (a) product cards appear as the stream progresses, (b) descriptions remain in the bubble, (c) no raw `[[...]]` text is visible, (d) suggestion chips still work.

- [ ] **Step 5: Commit any lint/type fixes (only if Steps 1-2 required changes)**

```bash
git add -A
git commit -m "chore(shopping-assistant): lint/type fixes for token parsing"
```

---

## Self-Review

**Spec coverage:**
- New trailing-token format detected → Task 2 (`LEADING_PRODUCT_REGEX` no longer required; `resolveProducts`/`stripTokensForDisplay` match tokens anywhere). Tested in Task 2 Step 1 ("trailing-token format").
- Full `ProductCard`, grouped grid, keep-description → Task 1 (`renderProductCard`, grid markup) + Task 2 (`stripTokensForDisplay` keeps inline-token lines). Tested ("trailing-token format" keeps description).
- Live card streaming (Approach C) → Task 1 (live grid in in-progress block) + Task 2 (`setStreamingProducts` on `chat_token`/`product`). Tested ("stream the card live").
- Hybrid old+new format → Task 2 (`stripTokensForDisplay` drops leading-token lines). Tested ("old leading-token format").
- Token split across SSE chunks → Task 2 (parser runs on full accumulated text + trailing-fragment strip). Tested ("split across SSE chunks").
- Token without payload → Task 2 (`resolveProducts` requires a matching product). Tested ("product payload never arrives").
- Suggestions unchanged → Task 2 preserves `SUGGESTION_LINE_REGEX` parsing on `chat_token`/`onclose`.
- Tracking (`RESULT_LOAD`) preserved → Task 2 Step 9.
- State reset on new chat / new send → Task 2 Steps 6 and 11.

**Placeholder scan:** No TBD/TODO/"handle edge cases" placeholders; every code step shows complete code.

**Type consistency:** `stripTokensForDisplay(text: string): string` and `resolveProducts(text: string, products: ProcessedProduct[]): ProcessedProduct[]` are referenced with matching signatures in the `onmessage`/`onclose` handlers. `renderProductCard(product, pidx, requestId)` is defined and called identically (committed row with `chat.requestId`, streaming row with `''`). `streamingProducts` is defined as `ProcessedProduct[]`, passed as the `ChatWindowProps.streamingProducts?: ProcessedProduct[]` prop, and defaulted to `[]` in the destructure.

**Out of scope (unchanged):** markdown image rendering (`IMAGE_LINE_REGEX` removed; such lines now remain as escaped text, same net UX), endpoint resolution, config schema, camera/upload flows.
