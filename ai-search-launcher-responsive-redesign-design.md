# AI Search Launcher — Responsive Redesign (Split Desktop / Stacked Mobile)

## 1. Goal

Add a new `customizations.chat.layout: 'chatlayout' | 'splitlayout'` config option. `chatlayout`
(the default) is today's existing single-column chat UI, unchanged, at every breakpoint.
`splitlayout` renders a two-pane split (chat + products, with a breadcrumb trail linking chat
turns to cached result sets) on tablet/desktop **once the conversation has actual results to
show** — see §3 for the revised engagement rule — and falls back to the exact same single-column
flow as `chatlayout` on mobile at every point. No new color/token values are introduced anywhere —
the redesign is layout and structure only, reusing whatever `customizations` tokens already exist.

Source spec: the acceptance criteria and interaction notes given directly by the user (see
conversation), targeting `src/official-widgets/ai-search-launcher/ai-search-launcher.tsx` and its
subcomponents. This document resolves the spec's flagged open decisions (new-vs-refinement
classifier, crumb branching behavior, per-turn suggestion storage, aspect-ratio scoping) based on
a brainstorming pass grounded in the current implementation, and has been revised twice since:
once to add the `layout` config switch (§3), and again (this revision) to (a) match the codebase
after `ChatWindow`/`FullScreenChatContainer`/`use-chat` were extracted into
`src/common/components/chat/` as a shared module, (b) change split-view to engage only once
results exist rather than immediately on open, and (c) simplify the component hierarchy so it
reuses the shared `ChatWindow` instead of duplicating its bubble-rendering logic in a parallel
component.

## 2. Current implementation (baseline facts, re-verified after the common-chat extraction)

- `ai-search-launcher.tsx` (351 lines) renders the entry-point bar, then
  `FullScreenChatContainer` wrapping either an entry-welcome screen
  (`ImageEntryScreen`/`MicEntryScreen`) or `ChatWindow` + an inline input footer
  (camera/upload/mic/textarea/send, still local to `ai-search-launcher.tsx`).
- **`ChatWindow`, `FullScreenChatContainer`, and the chat hook (`useChat`) now live in
  `src/common/components/chat/`** (`ChatWindow.tsx`, `FullScreenChatContainer.tsx`, `use-chat.ts`),
  not under `ai-search-launcher/components/` as in the previous revision of this doc — they were
  extracted as a shared module (commits `a5265e4`, `b277f8c`, `48a159e`) intended for reuse by any
  widget that adopts the common chat surface. **`ai-search-launcher` is currently the only
  consumer** (confirmed by grep: `shopping-assistant` still has its own separate, unmigrated
  `components/ChatWindow.tsx`) — but because the module is genuinely shared code now, not
  widget-local, every change this redesign makes to it must stay additive/opt-in (new optional
  props, sensible defaults matching today's behavior) so it can't silently change behavior for a
  future second consumer.
- `useChat`'s `Chat` type (`src/common/components/chat/use-chat.ts`) is unchanged in shape:
  ```ts
  interface Chat {
    chatId: string;
    requestId: string;
    author: 'user' | 'bot' | 'products';
    messages: string[];
    products?: ProcessedProduct[];
    image?: SearchImageOrPid;
  }
  ```
  Committed turns are **already per-turn for products** (a `'products'` `Chat` carries its own
  `products` array once `commitResponse` runs). **Suggestions are not per-turn** — `suggestions`
  is one `useState<string[]>` overwritten on every `chat_token`/`onclose`, with no field on `Chat`
  retaining a past turn's chips. There is no backend signal (in the SSE `chat_id`/`reqid`/
  `chat_token`/`product` events) distinguishing "new search" from "refinement" — any such
  classification must be client-side.
- `ChatWindow.tsx` (519 lines) renders one flat scrolling `<div role='log'>`: bubbles, inline
  `grid grid-cols-2` of `ProductCard`s per `'products'` chat (via its own inline
  `renderProductCard`/`RevealedProducts` — there is no separate `ProductGrid` component today),
  streaming reveal, thinking-dots, and a single suggestion-chip row pinned to the bottom of the
  whole list (not per-turn). It already accepts a `pwPrefix` prop and takes wishlist state
  (`wishlistPids`/`setIsInWishlist`) from its caller rather than owning it — precedent that this
  component is designed to take new per-consumer options as props, which the split-layout work
  will follow.
- `FullScreenChatContainer.tsx` (208 lines) is a full-viewport dialog (Portal + own `ShadowWrapper`,
  scroll-lock, Shadow-DOM-aware focus trap) with a header row and exactly one scrolling `children`
  region; it already applies a desktop-only `max-w-[820px]` via `useBreakpoint()`. It takes a
  `widgetName` prop so multiple widgets embedding it can get distinct portal ids — another sign
  it's meant for multi-consumer reuse, not ai-search-launcher-only.
- `useBreakpoint()` (`src/common/components/hooks/use-breakpoint.ts`) returns
  `WidgetBreakpoint.MOBILE | TABLET | DESKTOP`, reading `customizations.breakpoints.mobile/.tablet`
  (default `{ mobile: { maxWidth: 767 }, tablet: { maxWidth: 1023 } }`, the same convention every
  other widget in this repo uses). This redesign introduces no new breakpoint values.
- `ProductCard.tsx` reads image aspect ratio from `customizations.productCard.imageAspectRatio`
  (default `'2 / 3'` today, shared across all widgets via `default-config.ts`), applied as inline
  `style={{ aspectRatio }}` on the `<img>`.
- `customizations` is split (commit `46464e7`) into `chat` (generic: title, voice*, chatAgent —
  documented as "shared by any widget using the common chat module") and `launcher`
  (ai-search-launcher-specific: entry-point toggles, greetings, mic recording duration). `layout`
  is about how the chat surface itself renders, not an entry-point concern, so it belongs in
  `chat`, not `launcher` (correcting the previous revision of this doc, which had put it under
  `launcher`).
- No "breadcrumb", "turn", or "cache" concept exists anywhere in the codebase today.

## 3. Layout split

**Config field:** `customizations.chat.layout?: 'chatlayout' | 'splitlayout'`, added to the `chat`
block in `src/common/wigmix-core.ts` (JSDoc'd like its siblings) and defaulted to `'chatlayout'` in
`src/official-widgets/ai-search-launcher/default-config.ts`'s `DEFAULT_CUSTOMIZATIONS` — every
existing install (nothing sets this key yet) keeps today's behavior byte-for-byte, no migration
needed. Living on the shared `chat` block (rather than `launcher`) means a future second consumer
of the common chat module inherits the option for free, consistent with how `title`/`voice*` are
already scoped there.

**Revised engagement rule (this revision) — split view is not simply "desktop + splitlayout
configured," it also requires the conversation to actually have results:**

- `layout === 'chatlayout'` (default) → the existing single-column `ChatWindow` +
  `FullScreenChatContainer` flow, kept exactly as today, **regardless of breakpoint**. This is the
  literal "unchanged, used on both desktop and phone" requirement.
- `layout === 'splitlayout'` **and** `useBreakpoint() === WidgetBreakpoint.MOBILE` → same
  `ChatWindow` flow as `chatlayout` — split-pane's desktop-only behavior collapses to chat-only
  below the breakpoint, per spec, with no separate mobile implementation.
- `layout === 'splitlayout'` **and** breakpoint is tablet/desktop **and** `hasResults` is true →
  the new `SplitLayout` two-pane component.
- `layout === 'splitlayout'` **and** breakpoint is tablet/desktop **but** `hasResults` is false
  (a fresh chat, or a message sent but no product has streamed in yet) → **the same single-column
  `ChatWindow` flow as `chatlayout`**, full width (no `SplitLayout`, no products pane at all).
  This is the new "starts as chat, transitions into split once results arrive" behavior: there is
  no empty/placeholder state to design for the products pane, because the products pane simply
  doesn't exist yet at that point — it's the same code path as `chatlayout`.

`hasResults` is a plain derived boolean, not new state: `breadcrumbs.length > 0 ||
streamingProducts.length > 0` (both already available from the hook — see §4). Using
`streamingProducts.length > 0` rather than waiting for a turn to fully commit means the transition
happens as soon as products start streaming in, matching "once the product arrives or received,"
not only once the full response finishes.

**Deliberately kept simple, one-way per conversation:** once `hasResults` flips true and
`SplitLayout` mounts, it stays mounted for the rest of that conversation, even if a later turn's
response has zero products (e.g. a text-only follow-up) — there's no flicker-prone flip back to
chat-only mid-conversation. `hasResults` naturally resets to `false` on "new chat" (breadcrumbs
and streaming state both clear there — see §4), which is when the UI legitimately returns to the
chat-only starting state.

This keeps the branch to one place — a single condition in `ai-search-launcher.tsx`:
```ts
const showSplit = customizations.chat?.layout === 'splitlayout'
  && breakpoint !== WidgetBreakpoint.MOBILE
  && (chat.breadcrumbs.length > 0 || chat.streamingProducts.length > 0);
```
choosing between `<SplitLayout>` and the existing chat JSX — not scattered across child
components (satisfies the acceptance criterion that switching layouts is a config change, not a
code branch scattered around). `FullScreenChatContainer` is untouched structurally; it just
receives a different subtree as `children`. Its existing desktop `max-w-[820px]` constraint is
dropped only when `SplitLayout` is actually rendered — `chatlayout` (any breakpoint), `splitlayout`
on mobile, and `splitlayout` pre-results on desktop all keep the existing constraint unchanged.

## 4. Breadcrumb / turn-cache state model

Lives in `use-chat.ts` (`src/common/components/chat/`), as a **separate, parallel structure from
`chats`** — `chats` keeps full history forever (both layouts' scrollback depends on this), while
the breadcrumb trail is independently resettable. Because `use-chat.ts` is shared code, these new
fields are added as new, optional-to-ignore return values — a caller that never reads
`breadcrumbs`/`activeBreadcrumbId` (i.e. `chatlayout`, or a future non-launcher consumer) is
entirely unaffected; the underlying bookkeeping (a bit more state, populated in `commitResponse`)
is cheap enough to always run rather than being conditionally wired.

```ts
interface BreadcrumbTurn {
  requestId: string;
  label: string;           // raw user message for that turn, truncated for display
  products: ProcessedProduct[];
  suggestions: string[];
}
```

New hook state/returns:
- `breadcrumbs: BreadcrumbTurn[]`
- `activeBreadcrumbId: string | null`
- `setActiveBreadcrumb(requestId: string): void`

**Append vs. reset (the new-vs-refinement classifier):** before sending a message, extract a
small set of keyword tokens from it (lowercased, stopwords stripped — no NLP dependency, just a
plain-word split against a short hardcoded stopword list). Compare against the accumulated
keyword set of breadcrumbs `0..activeIndex` (the active crumb's lineage — crumbs after the active
one, if any, are not part of the comparison basis, though per the decision below they are never
removed from the array either):
- **Overlap found → refinement.** Once the response commits, append a new `BreadcrumbTurn` at the
  end of `breadcrumbs` and make it active.
- **No overlap → new search.** Once the response commits, reset `breadcrumbs` to contain only the
  new turn, and make it active.

**Trail never truncates on branch.** If the user clicks an older crumb (making it active) and
then sends a refinement, the new turn is appended at the end of the existing array (not inserted
after the clicked crumb, and nothing after the clicked crumb is dropped) — the trail only ever
grows or fully resets, never truncates a middle branch. "Continues from that active point" is
satisfied by using the active crumb's lineage as the classification basis, not by reshaping the
array.

**Clicking a crumb, or its matching in-chat hint line, calls the exact same function** —
`setActiveBreadcrumb(requestId)` — a pure local-state update, no re-fetch, since
`products`/`suggestions` are already sitting in the array from when that turn originally streamed
in. Per this revision's "don't complicate the hierarchy and links logic" instruction: there is
deliberately no separate event bus, context, or intermediate "selection controller" between the
two click sites — `BreadcrumbTrail`'s `onClick` and `ChatWindow`'s hint-line `onClick` (§6) both
receive the identical `setActiveBreadcrumb` callback prop straight from `use-chat.ts`, and both
compare their own `requestId` against the same `activeBreadcrumbId` value to decide their
highlighted state. One function, one piece of state, two call sites — nothing else.

**While a request is in flight**, the products pane shows the hook's existing live
`streamingProducts`/`streamingRequestId` (same source it already exposes) rather than any
breadcrumb; once `commitResponse` runs, that turn's data becomes the newest `BreadcrumbTurn` per
the append/reset rule above and the pane switches to showing it as committed.

**Explicitly deferred** (per the spec's own framing as "consider," not a requirement): a
"showing earlier results" staleness indicator on non-active crumbs. Not built in this pass.

## 5. Per-turn suggestions (structural prerequisite, not breadcrumb-specific)

`Chat` gains `suggestions?: string[]`, populated in `commitResponse` alongside the existing
per-turn `products`, replacing today's single global `suggestions` slot as the source of truth for
already-committed turns. The in-flight turn continues to use the existing global `suggestions`
state until it commits, exactly as `streamingProducts` does today for products. This is required
on **both** layouts (chat-only and split) per the acceptance criteria ("every AI turn with results
has its own suggestion chips attached, not only the first") — it is not new breadcrumb machinery,
just closing a gap in the existing per-turn data model both layouts depend on. Since `Chat` and
`commitResponse` live in the shared `use-chat.ts`, this fix also benefits any future second
consumer of the common chat module, not just ai-search-launcher.

## 6. Component structure (simplified this revision — reuse over duplication)

**The previous revision of this doc planned a parallel `ChatPane` component re-implementing
`ChatWindow`'s bubble/scroll/streaming logic with a different product-rendering mode. That
duplicates ~450 lines of non-trivial logic (auto-scroll, user-scroll detection, streaming reveal,
viewed-product tracking) for one behavioral difference. This revision reuses `ChatWindow` itself
instead**, per the instruction not to complicate the hierarchy:

- **`ChatWindow`** (`src/common/components/chat/ChatWindow.tsx`, shared) gains a small number of
  new, optional, backward-compatible props:
  - `productDisplayMode?: 'grid' | 'hint'` (default `'grid'`, i.e. today's behavior unchanged) —
    when `'hint'`, a `'products'` chat entry renders a single `↳ N results shown` line (using the
    existing `a11yProductResultsShown` i18n id already defined for the status region) instead of
    the inline product grid.
  - `activeRequestId?: string | null` — when set, the hint line whose `chat.requestId` matches is
    visually marked active (same highlight treatment `BreadcrumbTrail` uses for its active crumb —
    see below).
  - `onSelectTurn?: (requestId: string) => void` — fired when a hint line is clicked. In
    split-layout usage this prop is literally `setActiveBreadcrumb` from `use-chat.ts` (§4), passed
    straight through with no wrapper.
  - All three are optional and only read when `productDisplayMode === 'hint'`; `chatlayout`'s usage
    of `ChatWindow` doesn't pass them and sees zero behavioral change.
  - The existing inline `renderProductCard`/`RevealedProducts` grid-rendering block is factored out
    into a small **shared `ProductGrid`** helper (same file or a new
    `src/common/components/chat/ProductGrid.tsx` sibling — implementation detail, not a design
    fork) so the exact same card wrapper (fixed 3:4 image container via the existing
    `imageAspectRatio` token, focus-highlight ring, wishlist-toggle wiring, view-tracking) is used
    by both `ChatWindow`'s own `'grid'` mode and the new `ProductsPane` below — one rendering
    implementation, two call sites, matching §4's "one function, one state" principle applied to
    markup instead of state.
- **`SplitLayout`** (new, **local to `src/official-widgets/ai-search-launcher/components/`** —
  this is ai-search-launcher-specific UI, not promoted into the shared module, unlike `ChatWindow`
  itself): a two-column flex container, rendered only per §3's `showSplit` condition. Left column
  renders the same `ChatWindow` (with `productDisplayMode='hint'`, `activeRequestId`,
  `onSelectTurn` wired) plus the existing sticky input footer JSX (unchanged, still owned by
  `ai-search-launcher.tsx`, just placed in this column instead of directly under
  `FullScreenChatContainer`). Right column renders `ProductsPane`.
- **`ProductsPane`** (new, local to `ai-search-launcher/components/`) — header (`Results for`
  eyebrow + active crumb's `label`), `BreadcrumbTrail` (also new, local), and one `ProductGrid`
  (the shared helper above) showing the active crumb's products, or `streamingProducts` while a
  request is in flight.

Net effect: the only shared-module (`src/common/components/chat/`) changes are the per-turn
`suggestions` field (§5, needed regardless of layout) and `ChatWindow`'s three new optional props
+ the `ProductGrid` extraction — both fully additive. `SplitLayout`/`ProductsPane`/`BreadcrumbTrail`
and the breadcrumb-vs-new-search classifier stay ai-search-launcher-specific, added to `use-chat.ts`
as optional return fields (§4) rather than forced onto every consumer.

## 7. Shared structural fixes (both layouts)

- **Image aspect ratio**: override `imageAspectRatio` to `'3 / 4'` in
  `src/official-widgets/ai-search-launcher/default-config.ts` only — still fully
  customer-configurable via the same existing token, does not touch `ProductCard.tsx` or any other
  widget's default.
- **Tap targets**: all icon buttons (camera, image/upload, mic, send; entry-point bar;
  `FullScreenChatContainer` header mute/new-chat/close) sized to a minimum 38–40px box via
  padding/min-height/min-width adjustments. No new colors.
- **No new color values** anywhere — every visual token continues to come from
  `customizations.generalLayout`/`.productCard`/etc., exactly as today.

## 8. Testing impact

- `ai-search-launcher.spec.tsx`'s existing snapshot covers the **closed** (pre-entry-point) state
  only — unaffected by this redesign. Its other assertions (which exercise the open chat surface)
  will need updates for: per-turn `suggestions` on `Chat`, the new `breadcrumbs`/
  `activeBreadcrumbId` hook fields, and the new split-rendering path.
- `use-chat.spec.ts` (shared module) needs new coverage for the refinement/new-search classifier
  (overlap → append+activate; no overlap → reset+activate) and for `setActiveBreadcrumb` — and
  since this file is shared, its existing suite (whatever currently covers `chatlayout`'s behavior)
  must stay green, unaffected by fields it doesn't read.
- `ChatWindow`'s own test coverage needs new cases for `productDisplayMode='hint'` (hint line
  renders instead of grid, `onSelectTurn` fires, `activeRequestId` highlights the right turn) in
  addition to confirming `productDisplayMode` unset/`'grid'` is pixel/behavior-identical to today.
- New component tests for `SplitLayout`/`ProductsPane`/`BreadcrumbTrail` following this widget's
  existing per-component test conventions.
- `ai-search-launcher.spec.tsx` needs explicit coverage for the full engagement rule (§3): default
  (`chatlayout`, unset config) renders the chat-only UI at a desktop breakpoint; `splitlayout` with
  no results yet also renders chat-only at desktop (asserting no `SplitLayout`-only markup, e.g. no
  breadcrumb trail, is present); `splitlayout` renders `SplitLayout` once `streamingProducts` or
  `breadcrumbs` is non-empty at tablet/desktop; `splitlayout` at a mobile breakpoint always renders
  chat-only regardless of results.

## 9. Explicitly out of scope for this pass

- The "showing earlier results" staleness indicator (§4).
- Any change to `camera-search`, `shopping-assistant`, or `src/common/assistant/` (the
  parsing/voice module) — this redesign touches `src/official-widgets/ai-search-launcher/**`, its
  own `default-config.ts`, and the specific additive changes to `src/common/components/chat/**`
  and `src/common/wigmix-core.ts` (`chat.layout` field) called out in §3–§6. It does not migrate
  `shopping-assistant` onto the common chat module, and does not change any behavior for
  `chatlayout` callers of that module.
- A smarter (e.g. LLM-backed or backend-provided) new-vs-refinement classifier — the keyword-overlap
  heuristic in §4 is an explicit v1, flagged for revisit if it proves too coarse in practice.
