# Embedded Shopping Assistant — Demo Script

A step-by-step walkthrough for presenting this widget: what to click, what it looks like, and what's
actually happening (API-wise) behind each step. For deeper technical detail on any of this, see
[FLOW.md](FLOW.md) — this doc is the "run the demo" version, that one's the "how it's built" version.

## 0. Before you start

```sh
npm run start:embedded-shopping-assistant
```

- Opens a webpack-dev-server tab automatically (or check the terminal for the exact URL — it
  auto-picks a free port, e.g. `http://localhost:8080`, `:8082`, etc. if 8080 is busy).
- [dev-configs.ts](dev-configs.ts) already has a **real** `appKey`/`placementId`, so the demo hits the
  **live backend** — real AI-generated text, real product photos, real prices. Nothing here is mocked
  unless you deliberately blank out `appKey` (see "If the backend is down" at the end).
- To stop: `Ctrl+C` in the terminal running the dev server.

## 1. Home screen

Nothing clicked yet. Shows the Google-style landing screen: sparkle logo, "Embedded Shopping
**Assistant**" heading, a search bar, and a "Search" button. **No API call has fired yet.**

## 2. Search — the first API call

Type a query (e.g. `jeans`) and hit Enter or click "Search."

- **API:** `POST {base}/v1/search/chat/shopping-assistant` (or the legacy multisearch path), a
  **Server-Sent Events (SSE)** stream — `handleInitialSearch` → `addTurn(..., isInitial=true)` in
  `embedded-shopping-assistant.tsx`.
- **What shows:** three blue dots + "Thinking..." — no persistent header yet (deliberately hidden until
  results are revealed, see step 4).
- **What's streaming in underneath:** the AI's text response, token by token (`chat_token` SSE events),
  and product objects as the backend resolves them (`product` SSE events) — same one HTTP request
  carries both.

## 3. AI Overview text streams in

The text appears live (bold category headers, bulleted sub-items), clamped to a preview height with a
fade-out at the bottom, and a **"See Results"** button appears once at least one product has arrived.

- **API call:** none — this is the same stream from step 2 still delivering tokens.

## 4. Click "See Results" — reveal, not reload

- **API call:** **none.** Pure UI state flip (`productsExpanded: true`) — everything was already fetched
  in step 2, this just un-clamps it.
- **What appears:**
  - The **persistent top bar** (sparkle + "AI Overview" + speaker icon + "X"), pinned above the scroll
    area — this is the moment to point out it wasn't there before, by design.
  - The **product grid** — vertical, fixed-size cards (~202×303px, matching the sizing of the
    `shopping-assistant` widget exactly), wrapping to new rows.
  - **Suggestion chips** ("Next steps") at the very bottom of the conversation.

## 5. Click a suggestion chip — a follow-up turn

Click any chip (e.g. "Show me black jeans").

- **API call:** the **same SSE endpoint**, a brand-new request — `handleChipClick` → `addTurn(...,
  isInitial=false)`.
- **What's different from the first turn, on purpose:**
  - The old chip row vanishes **immediately** on click (not after the new results arrive).
  - Your query now **does** show as a right-aligned chat bubble (only the very first search skips this,
    since the top bar already says "AI Overview" by then).
  - No AI text/"See Results" gate this time — goes straight from "Finding products..." to the product
    grid, appended directly below the previous turn.
  - A fresh set of suggestion chips appears at the new bottom once this turn's response lands.

## 6. Type a follow-up question — the bottom "Ask anything" bar

Same flow as step 5 (`handleBottomAsk`) — just typed instead of clicking a chip. Good moment to show
that the conversation keeps building downward, turn after turn.

## 7. Upload an image — a *different* API

Click the **"+"** icon in the bottom bar and pick a photo.

- **API call:** **not** the chat endpoint — `widgetClient.multisearch()` (standard visearch product
  search, via `useImageMultisearch()`). The chat endpoint has no way to accept an image at all, so this
  is a genuinely separate integration.
- **What shows:** the uploaded photo as a chat bubble (instead of text), then "Finding products..."
  directly into a product grid — or "No matching products found." if nothing visually similar comes
  back. Good demo tip: use an actual product photo (shoe, bag, piece of clothing) for a convincing match.

## 8. Read-aloud (speaker icon in the top bar)

Click the speaker icon next to "AI Overview."

- **API call:** none — client-side only, the browser's native `SpeechSynthesis` Web Speech API reading
  the first turn's AI text aloud. Click again to stop.
- Worth mentioning if asked: this reads whatever language the backend responded in — there's no way to
  translate the AI's own response into another language from this widget (investigated; the chat API has
  no locale parameter). The widget's own UI text (placeholders, buttons, "Thinking...", etc.) **is** fully
  translated instead, in 11 languages — a separate, working feature (see step 10).

## 9. Close ("X" in the top bar) — start over, not a real close

- **API call:** none. This widget is a full-page embedded view, not a popup, so there's nothing to
  dismiss — clicking "X" just resets local state and returns to the home screen from step 1.

## 10. Bonus talking points (if there's time)

- **Dark mode** — toggle `customizations.generalLayout.darkModeDefault` in config; every part of the UI
  (including the scrollbar) has a dark variant.
- **Rebranding colors** — override `customizations.generalLayout.fontColor` (icons/accent) and
  `customizations.buttons.primary.backgroundColor` (send button, loading dots) to reskin without touching
  code.
- **Language** — set `languageSettings.locale` (e.g. `es`) and every UI string switches — search
  placeholder, "Thinking...", "See Results," aria-labels, etc.
- **Product card fields** — flip `customizations.productCard.price.show`/`secondaryTitle.show` to `true`
  to bring back price/brand on cards (off by default, but the shared, fully-configurable `ProductCard`
  component is the same one the `shopping-assistant` widget uses).

## If the backend is down / no network for the demo

Blank out `appKey` in [dev-configs.ts](dev-configs.ts) (`appSettings.appKey: ''`). The widget falls back
to a **mock response** automatically (`MOCK_AI_TEXT`/`MOCK_PRODUCTS`/`MOCK_SUGGESTIONS` in
`embedded-shopping-assistant.tsx`) after a fake 1.5s delay — same UI flow, canned running-shoe data, no
network required. Good fallback for demoing on unreliable wifi. Remember to restore the real `appKey`
afterward.
