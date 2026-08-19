# Embedded Shopping Assistant — End-to-End Flow

Brief reference for how this widget behaves from the host page down to each click, which API
each interaction hits, how product data is loaded, and which parts are mocked for local dev.

## 1. Host page integration

The host page includes the built bundle and drops an empty container on the page:

```html
<script src=".../<env>.wigmix_embedded-shopping-assistant.<version>.js"></script>
<div class="ps-widget-<placementId>" data-query="running shoes"></div>
```

- The bundle self-registers on `window.visenzewigmixwidget.wigmix_embedded-shopping-assistant.<version>`
  ([index.tsx](index.tsx)) and exposes `initWidget(config, fieldMappings)`.
- `data-query` (read via `element.dataset['query']` in [app.tsx](app.tsx)) is **optional**. If present,
  the widget skips its home screen and auto-runs that search on mount (see `useEffect` in
  [embedded-shopping-assistant.tsx](embedded-shopping-assistant.tsx)). If absent, the widget shows the
  Google-style home screen with just a search bar.
- Config (`appKey`, `placementId`, `cloud`/`endpoint`, `customizations`, etc.) comes from
  `window.visenzeConfigs[placementId]` on the host page, merged with this widget's
  `DEFAULT_CUSTOMIZATIONS` ([default-config.ts](default-config.ts)). See `docs/integration.md` at the repo
  root for the full snippet format.
- Locally, [index-dev.tsx](index-dev.tsx) + [dev-configs.ts](dev-configs.ts) stand in for the host page/config.

### Configurability (parity with `shopping-assistant`)

This widget started as a from-scratch, mostly-hardcoded UI. It's since been brought up to the same
configurability as `shopping-assistant` across four dimensions:

**Color.** Icon and button colors follow the same pattern `shopping-assistant` uses (inline
`style`/`color` props reading `widgetConfig.customizations`, no CSS vars involved):

| Element | Reads from |
|---|---|
| Sparkle logo, "Assistant" heading accent, mic/camera/"+" icons | `customizations.generalLayout.fontColor` / `fontColorDark` |
| Send button, loading dots | `customizations.buttons.primary.backgroundColor` / `backgroundColorDark` (+ `fontColor`/`fontColorDark` for the icon/text on top) |

Both default to this widget's own Google-blue accent (`#4285f4`) in [default-config.ts](default-config.ts).
Deliberately left neutral/unthemed: the "See Results" button and suggestion chips (styled as muted outline
controls, matching the Google AI Overview reference look) — no accent color in the reference design, so
nothing to override there.

**Product cards.** `TurnSection.tsx` no longer has its own from-scratch card — it renders the **same
shared `ProductCard`** component (`src/common/components/product-card/ProductCard.tsx`) that
`shopping-assistant` uses, wrapped in this widget's own border/rounding/shadow container for visual style.
That means `customizations.productCard.*` now genuinely drives price/originalPrice/discount (show, color,
format, position), `title`/`secondaryTitle` (show + `fieldSource`, resolved through
`displaySettings.productDetails` instead of hardcoded keys), `images.mainImage/hoverImage` swap,
`openLinksInNewTab`, `findSimilar`, `addToWishlist` (state lifted to `embedded-shopping-assistant.tsx`,
same pattern as `shopping-assistant`'s `ChatWindow.tsx`), `addToCart`, and `imageAspectRatio` — plus
`PRODUCT_VIEW`/click tracking, which the old hardcoded card never fired at all. Price/`secondaryTitle`
default to `show: false` in this widget's own `default-config.ts` (preserving the existing "image + title
only" look), and `openLinksInNewTab` defaults to `true` (preserving the existing new-tab behavior) — both
still fully overridable.

**i18n.** Every UI string (search/ask placeholders, loading/status text, "See Results", "No matching
products found.", aria-labels) now goes through `useIntl()`/`intl.formatMessage({id: ...})`, backed by this
widget's own `DEFAULT_TEXTS` in `default-config.ts` (11 locales) — previously 100% hardcoded English
literals. The "Embedded Shopping Assistant" brand name is deliberately left untranslated (treated as a
product name, same convention as leaving a company name untranslated), same as `shopping-assistant`
doesn't translate its own widget name either.

**Dark mode.** Every component now carries `dark:` Tailwind variants (mirroring `shopping-assistant`'s
`dark:bg-neutral-800`-style classes) — previously zero `dark:` classes existed anywhere in this widget, so
`customizations.generalLayout.darkModeDefault: true` (or the host toggling dark mode at runtime) did
nothing visually. The `thin-scrollbar` utility also gets a `.dark`-scoped color override in `app.css`.
No new plumbing was needed for any of this — `darkMode` already flows generically through
`WidgetDataContext` and `ShadowWrapper` toggles the `.dark` class Tailwind's `darkMode: 'class'` config
expects; the gap was purely that no component was using it.

Override any of the above in `window.visenzeConfigs[placementId].customizations` (or `dev-configs.ts`
locally) — all verified live against the real backend and a Spanish locale/dark-mode override, with no
regressions to the default English/light appearance.

### Top bar (sparkle + "AI Overview" + read-aloud + close)

`components/TopBar.tsx`, rendered at the top of the results screen (above the scrollable turn list, in
`embedded-shopping-assistant.tsx`) — pinned via flex layout, not `position: sticky`, since it's a sibling
of the scroll container rather than inside it. Matches the reference "Google AI Overview" header design:
sparkle icon + "AI Overview" label (both use `iconColor`/i18n like everything else) + a speaker icon + an
"X" on the far right.

Gated on `resultsExpanded` (`turns.some(t => t.productsExpanded)`, the same condition that reveals the
bottom "Ask anything" bar) — it does **not** show during the initial loading dots / clamped AI-text-preview
phase, only once "See Results" has actually been clicked (or, for auto-expanded follow-up turns, once
their results render). Keeps the header from appearing ahead of any content being visible yet.

- **Speaker icon → real, client-side only, no API.** Uses the browser's native
  `SpeechSynthesis`/`SpeechSynthesisUtterance` Web Speech API (nothing like this existed anywhere in the
  codebase before) to read the **initial turn's** `aiText` aloud (`handleToggleReadAloud` in
  embedded-shopping-assistant.tsx). Toggles play/stop via `speechSynthesis.speak()`/`.cancel()` and
  `isSpeaking` state. There's no backend support for translating the AI response itself into another
  language (see the "language switcher" investigation below) — this only reads aloud whatever language the
  backend already returned the text in.
- **"X" → resets to the home search screen, not a real close.** This widget is a full-page embedded view,
  not a dismissible popup like `shopping-assistant` (which has an actual panel to close) — there's nothing
  to hide/unmount. `handleReset` clears `turns`/`suggestions`/`inputQuery`/`chatIdRef` and flips
  `hasSearched` back to `false`, i.e. "start over," same as a fresh page load.

**Investigated and confirmed NOT currently possible:** switching the AI-generated response text itself to
another language (the "मराठी" language-pill part of the reference design). Checked the actual SSE request
params (`q`, `chat_id`, `chat_agent`, `attrs_to_get`, etc. in `addTurn()`) and the `visearch-javascript-sdk`
type defs — no `hl`/`lang`/`locale` param exists anywhere for the chat endpoint, and `chat_agent` is an
opaque backend agent id, not a language selector. `widgetConfig.languageSettings.locale` (which drives this
widget's own i18n) is never sent to the backend at all. This would need a backend/prompt-level change
outside this repo, not a frontend fix — so it wasn't built.

## 2. Click → API map

| User action | Handler | API call | Notes |
|---|---|---|---|
| Type in the home search bar, hit Enter/Search | `handleInitialSearch` | ✅ `POST {base}/shopping-assistant` (SSE) | Starts the **first** turn (`isInitial: true`). Gated behind a "See Results" click before products are revealed. |
| Page loads with `data-query` set | `useEffect` on mount | ✅ same SSE call as above | Auto-runs the initial search without the user typing anything. |
| Click **"See Results"** (first turn only) | `handleShowProducts` | ❌ none | Pure UI state flip (`productsExpanded: true`). The AI text and products were already fetched — this just reveals what's already in state. |
| Click a suggestion chip (a single row, always at the very bottom of the conversation) | `handleChipClick` | ✅ new SSE call, same endpoint | Starts a **follow-up** turn (`isInitial: false`). The chip row vanishes the instant it's clicked (see below) and reappears once the new turn's response arrives, below the new results — matching the `shopping-assistant` widget's flow exactly. Only shown once the **latest** turn's products are actually revealed (`latestTurn.productsExpanded`) — the `((suggestion))` markers parse out of the AI text stream well before the initial turn's "See Results" gate opens, so without this check the chip row would appear ahead of the results it's supposed to follow. |
| Type in the bottom "Ask anything" bar, hit Enter/send | `handleBottomAsk` | ✅ new SSE call, same endpoint | Same as a chip click — a follow-up turn. Auto-expands — no "See Results" gate, products render as soon as they arrive. |
| Click a product card | plain `<a href={product_url} target="_blank">` | ❌ none | Just navigates to the merchant's product page. No click-tracking event is currently fired here (unlike the load events below). |
| Click the **"+"** icon in the bottom bar → pick an image | `handleImageSelect` | ✅ real, but a **different** API — `widgetClient.multisearch()` (via `useImageMultisearch`) | Starts a follow-up turn with an image thumbnail bubble instead of text. This is the standard visual-search/multisearch endpoint, **not** the shopping-assistant chat/SSE endpoint — the chat endpoint has no way to accept an image, so image turns skip the AI text entirely and go straight to "Finding products..." → results (or "No matching products found."). |
| Voice / camera icons (mic in `SearchBar`/`BottomBar`; camera in `SearchBar`) | — | ❌ none | Rendered for visual parity with the reference design; **not wired up** — no handlers attached yet. |
| Speaker icon in the top bar | `handleToggleReadAloud` | ❌ none (client-side `SpeechSynthesis`) | Reads the initial turn's `aiText` aloud via the browser's native Web Speech API. Real functionality, just no network call involved. |
| "X" in the top bar | `handleReset` | ❌ none | Resets local state back to the home search screen — not a real "close" (see Top bar section above). |

All SSE calls go through the single `addTurn()` function in
[embedded-shopping-assistant.tsx](embedded-shopping-assistant.tsx). The one non-SSE call (image search)
goes through `useImageMultisearch()` instead — see [use-image-multisearch.ts](../../common/components/hooks/use-image-multisearch.ts).

## 3. The actual API call

```
POST {base}{path}?app_key=...&placement_id=...&chat_id=...&q=<query>&va_uid=...&va_sid=...&attrs_to_get=...&chat_agent=...
```

- **`base`** — resolved by `resolveBaseEndpoint()` ([endpoint.ts](../../common/client/endpoint.ts)), precedence:
  manual `window.visenzeConfigs[placementId].appSettings.endpoint` → `appSettings.cloud` (`aws`/`azure`) →
  API-provided endpoint → legacy default.
- **`path`** — `/v1/search/chat/shopping-assistant` if cloud paths apply, else
  `/v1/product/multisearch/chat/shopping-assistant` (`usesCloudPaths()`).
- **`chat_id`** — a UUID generated once per conversation (`widgetClient.visearch.generateUuid`) and reused
  across follow-up turns, so the backend keeps chat context.
- **`va_uid` / `va_sid`** — visitor/session IDs from the ViSearch SDK.
- **`chat_agent`** — `customizations.chatbot.chatAgent`, defaults to `'shopping_closer_voice_v2'`.

This is a **Server-Sent Events (SSE)** stream (`fetchEventSource`), not a single JSON response. It emits:

| SSE event | What it carries | What the UI does with it |
|---|---|---|
| `chat_id` | conversation id | stored in `chatIdRef` for the next turn |
| `reqid` | request id | stashed, sent later in the `RESULT_LOAD` tracking event |
| `chat_token` | one chunk of the AI's text response | appended to a running buffer; re-rendered on every chunk (this is what makes the text "type out") |
| `product` | one product object | pushed into a running product list |

### How products actually "load"

1. Product objects arrive as separate `product` events (not embedded in the text).
2. The AI's text stream contains inline markers like `[[product_id]]` — `resolveProducts()` scans the
   accumulated text for these markers and returns the matching products **in the order the AI mentioned
   them**, deduplicated.
3. `stripTokensForDisplay()` strips those `[[...]]` markers (and `((suggestion))` markers) out of the text
   before it's shown to the user, so the visible AI text never shows raw tokens.
4. On `onclose` (stream finished), the final text/products are committed to that turn, and if any products
   were returned, a `RESULT_LOAD` tracking event fires via `widgetClient.sendEvent(...)`.
5. Suggestion chips are extracted from `((suggestion text))` markers in the same stream via
   `SUGGESTION_LINE_REGEX` — into a single top-level `suggestions` state, **not** a field on the turn
   itself. This mirrors `shopping-assistant.tsx`'s own `suggestions` state exactly: it's a "next steps"
   footer for the whole conversation, always rendered once at the very bottom (after the last turn), and
   cleared (`setSuggestions([])`) the instant any new turn starts — so the chip row is never duplicated or
   left stale under an old turn once you've moved on.

So: **one HTTP request per turn**, streamed, carrying both the AI narration and the product results
together — there is no separate "load products" API call.

### Fixed bug: "No matching products found" flashing before real results

`isLoading` flips to `false` on the **first** `chat_token` event (so streaming text can start
rendering), but `product` SSE events often arrive slightly after the first text chunks — so at that
instant `streamProducts` (and therefore `turn.products`, via `resolveProducts()`) can still legitimately
be empty. Since the empty-state message's old condition was just `!isLoading && productsExpanded &&
products.length === 0`, it would render for that brief window, then get replaced once the real `product`
events arrived a moment later — a visible flash on every follow-up turn.

Fixed by adding `ConversationTurn.productsSettled` (default `false`), set to `true` only once the product
stream has actually concluded — `onclose`, `onerror`, the mock branch, and the image-search resolution
`useEffect` all set it. "No matching products found" now also requires `productsSettled`, so it can only
render once we're actually done waiting, not mid-stream. Verified by polling the DOM every 60ms for the
full ~16s duration of a follow-up search — the message never appeared before the real product grid.

### "Getting AI Overview..." loading time

Investigated whether any avoidable client-side delay exists before the request even fires. It doesn't:
`widgetClient.visearch.generateUuid()`, `.getUid()`, and `.getSid()` (all called in `handleInitialSearch()`/
`addTurn()` before the SSE `fetchEventSource` call) are confirmed **synchronous, local-only** calls in the
`visearch-javascript-sdk` source (they just read/generate values off the SDK's in-memory tracker — no
network round-trip). The `fetchEventSource` request is fired essentially immediately after the user
submits a query. Whatever wait shows up in "Getting AI Overview..." is genuine backend AI-generation
latency from the shopping-assistant chat service — not something fixable from this widget's code.

## 4. What's dummy / mock

| Item | Where | Real or dummy? |
|---|---|---|
| Mock response branch | `if (!appSettings.appKey) { ...setTimeout(1500) ... }` in `addTurn()` | **Dummy fallback**, only used when `appKey` is empty/missing. Returns `MOCK_AI_TEXT`, `MOCK_PRODUCTS` (3 hardcoded `picsum.photos` images, `product_id: 'mock-00x'`, `product_url: '#'`), and `MOCK_SUGGESTIONS` (3 canned chip labels) after a fake 1.5s delay — no network call at all. |
| `dev-configs.ts` → `appSettings.appKey` / `placementId` | [dev-configs.ts](dev-configs.ts) | Currently set to **real-looking dev credentials**, so `npm run start:embedded-shopping-assistant` actually hits the live SSE backend, not the mock branch. Blank these out to fall back to mock data. |
| `dev-configs.ts` → `trackingCallback` | [dev-configs.ts](dev-configs.ts) | **Dummy** — just `console.warn`s instead of sending to real analytics. Combined with `disableAnalytics: true`. |
| `devFieldMappings` | [dev-configs.ts](dev-configs.ts) | **Dummy/example** catalog field mapping (`title`, `price`, `main_image_url`, etc.), only used if `shouldRetrieveFieldsMapping = true`; currently `false`, so it's unused and the real mapping comes from whatever `attrs_to_get`/backend returns. |
| Voice / camera search buttons | `SearchBar`, `BottomBar` | **Visual only / dummy** — no `onClick` handlers wired up yet. |
| **"+" image upload button** | `BottomBar` → `handleImageSelect` | **Real, not dummy.** Confirmed live against the real backend: an uploaded image goes through `useImageMultisearch()` → `widgetClient.multisearch()` and returns genuine visually-similar products (verified with a real product photo returning matching items from real brands). |
| Product card click tracking | `ProductCard` in [TurnSection.tsx](components/TurnSection.tsx) | Not dummy, just **absent** — clicking a product only navigates; no click event is sent (contrast with `RESULT_LOAD` firing on result *load*). |
| ~~Rating stars~~ | `ProductCard` in [TurnSection.tsx](components/TurnSection.tsx) | **Removed.** Previously fell back to a hardcoded 4 stars whenever the catalog had no numeric `rating` attribute (i.e. always, in practice — `rating` isn't part of any field mapping). Product cards no longer show a rating or price at all — just image + title. |
| ~~Persistent top search bar~~ | was `TopSearchBar` | **Removed.** The results screen no longer has a re-searchable bar pinned at the top. Instead, each **follow-up** turn's query/suggestion text renders as a right-aligned chat bubble (in [TurnSection.tsx](components/TurnSection.tsx)) above that turn's response, chat-style — there's no going back to edit/resubmit the original query from the results screen; use the bottom "Ask anything" bar (text or image) to continue. |
| ~~Query bubble on the initial turn~~ | `TurnSection.tsx`, gated on `!turn.isInitial` | **Removed for the first turn only.** Once the persistent [TopBar](#top-bar-sparkle--ai-overview--read-aloud--close) was added (always labeled "AI Overview"), repeating the query as a bubble again directly below it read as a redundant step — the initial turn now goes straight from the TopBar into the loading dots/AI text. Follow-up turns (chips, typed questions, image search) still show their bubble, same as a normal chat log. |
| Product card image shape | `ProductCard` in [TurnSection.tsx](components/TurnSection.tsx) | Changed from square (`aspect-square`) to portrait (`aspect-[2/3]`) — matches this codebase's own `DEFAULT_CUSTOMIZATIONS.productCard.imageAspectRatio` convention used by other widgets. |
| Product card **pixel size** | `TurnSection.tsx` product grid | Fixed at `w-[202px]` per card (→ ~200×300px image, `aspect-[2/3]`) — measured to match the `shopping-assistant` widget's actual rendered card size (202×303px) exactly, rather than stretching to fill the (much wider) container. Cards wrap via `flex flex-wrap` instead of a fixed column count, so the same fixed size holds for every query regardless of how many products come back or how wide the host page's container is. |
| ~~"Next steps" caption label~~ | was a `<p>` above the suggestion chips | **Removed** — just the label text; the chips/flow stayed. |
| ~~Per-turn `suggestions`/`selectedSuggestion`~~ | was on `ConversationTurn` in `TurnSection.tsx` | **Restructured**, not removed — suggestions moved to a single top-level `suggestions` state in `embedded-shopping-assistant.tsx`, rendered once after the last turn, matching `shopping-assistant.tsx`'s own top-level `suggestions` state exactly. `selectedSuggestion` (the dimmed/highlighted intermediate state) is gone entirely — the row now just vanishes on click, same as `shopping-assistant`'s `setSuggestions([])` in `sendMessage`. |
| ~~Horizontally-scrolling product row~~ | was in `TurnSection.tsx` | **Replaced** with a vertical, wrapping `flex flex-wrap` grid of fixed-size cards — matching the `shopping-assistant` widget's card size exactly — instead of a single scrollable row. |

## 5. Quick mental model

```
Host page renders <div class="ps-widget-…" data-query="…">
        │
        ▼
 initWidget() → AppWrapper → EmbeddedShoppingAssistant
        │
        ├─ no data-query → home screen, user types + submits
        └─ data-query set → auto-search on mount
                │
                ▼
        handleInitialSearch / useEffect
                │
                ▼
   addTurn(isInitial=true) ──► POST …/shopping-assistant (SSE)
                │                     │
                │              chat_token* → AI text builds up
                │              product*    → product list builds up
                │                     │
                ▼                     ▼
     "See Results" button       (no API call — just reveals state)
                │
                ▼
     products (vertical, fixed-size cards) shown
                │
                ▼
     suggestion chips shown ONCE, at the very bottom (top-level `suggestions` state)
                │
                ▼
   chip click / type in bottom bar / "+" → pick an image
                │
     setSuggestions([]) ── old chip row vanishes immediately, before the new turn even starts
                │
        ┌───────┼───────────────┐
        ▼       ▼               ▼
   chip click  text query   "+" → pick an image
        │       │               │
        └───┬───┘               ▼
            ▼              handleImageSelect
   addTurn(isInitial=false)  useImageMultisearch()
   POST …/shopping-assistant  → widgetClient.multisearch()
   (SSE)                           │
        │                          │
        ▼                          ▼
   loading dots → new turn's products appended directly below the previous turn
                │
                ▼
   new suggestions (if any) parsed from this turn's response → chip row reappears at the new bottom
                │
                ▼
          (repeats per chip/query/image)
```
