# Changelog

All notable changes to this project will be documented in this file.

The format is an adaptation of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added


### Fixed


### Changed


### Removed


### Deprecated


### Security


### Build


### Chore
## [1.0.32](https://github.com/visenze/visenze-experiences-web/compare/1.0.31...1.0.32)

<!-- BEGIN visenze-experiences-web 1.0.32 -->

### Removed

- embedded-shopping-assistant: Removed the "new chat" action from the full-screen header — the widget has no entry point for starting a fresh conversation, since it is always tied to the single query it was embedded with.

### Fixed

- embedded-shopping-assistant: `productCard` defaults were incorrect — `price` and `originalPrice` were hidden, and the image aspect ratio/link-open behavior didn't match what was expected. Price is now shown by default, with the correct aspect ratio and link behavior.
- embedded-shopping-assistant: The "See Results" button's text and border color were hardcoded and could not be customized; they are now configurable via `customizations.buttons.secondary` (`fontColor`/`fontColorDark`).
- embedded-shopping-assistant: Fixed a stray empty divider line appearing in the summary view after closing the full-screen chat.

<!-- END visenze-experiences-web 1.0.32 -->

## [1.0.31](https://github.com/visenze/visenze-experiences-web/compare/1.0.30...1.0.31)

<!-- BEGIN visenze-experiences-web 1.0.31 -->

### Added

- embedded-shopping-assistant: New widget providing an inline "AI Overview" experience under the search bar. On mount, it reads a query supplied by the host page (`data-query` on the placement element) and streams a compact AI-generated summary with a clamped preview; clicking "See Results" expands the widget into a full-screen AI shopping assistant built from the same shared chat components ai-search-launcher uses (`useChat`, `ChatComposer`, `ChatWindow`, `FullScreenChatContainer`, `ProductGrid`), rather than this widget's own previous chat implementation. The full-screen surface supports voice narration of replies, gated on `customizations.chatbot.voiceEnabled` and starting muted by default (`customizations.chatbot.startMuted`) until the user unmutes; a "new chat" action in the header that resets the conversation and re-runs the original query as a fresh turn; and a close action that collapses cleanly back to the pre-expansion summary view without losing the live conversation. If the host page provides no query, the widget shows a simple fallback message instead of an empty screen.
- embedded-shopping-assistant: Title, icon, and send-button colors are now configurable via `customizations.generalLayout` (`fontColor`/`fontColorDark`, `backgroundColor`/`backgroundColorDark`, `border`) and `customizations.buttons.primary` (`fontColor`/`fontColorDark`, `backgroundColor`/`backgroundColorDark`), previously hardcoded.
- (internal) Added an opt-in `hideInitialUserMessage` prop to `ChatWindow` (`src/common/components/chat/ChatWindow.tsx`) that suppresses only the first chat row when it is the user's own initial query. Used exclusively by embedded-shopping-assistant, which surfaces that same query as a separate UI element before the chat surface mounts; no other consumer of `ChatWindow` passes this prop, so its default (unset) behavior is unchanged everywhere else.

<!-- END visenze-experiences-web 1.0.31 -->

## [1.0.30](https://github.com/visenze/visenze-experiences-web/compare/1.0.29...1.0.30)

<!-- BEGIN visenze-experiences-web 1.0.30 -->

### Added

- ai-search-launcher: New widget providing a compact entry bar with up to three triggers — image search, voice search, and "Ask AI" — each independently toggleable via `customizations.launcher.cameraEntryEnabled` / `.micEntryEnabled` / `.askAiEntryEnabled` (default `true`). All three open a standalone full-screen AI shopping assistant that calls the same backend endpoint as `shopping-assistant` (`/v1/chat/shopping-assistant` on cloud, `/v1/product/multisearch/chat/shopping-assistant` on legacy) via its own independent request. The image and mic entry points show a dedicated full-screen welcome screen with a configurable greeting (`customizations.launcher.greetings.image` / `.mic` / `.ai`, additionally spoken aloud when `customizations.chatbot.voiceGreetingEnabled` is on) that stays up until the first message is sent; "Ask AI" opens straight into chat. Voice recording auto-stops after `customizations.launcher.voiceRecordingMaxDurationSeconds` (default 5s). The chat surface can render as a two-pane split layout (`customizations.chatbot.layout: 'splitlayout'`) — chat on the left, a breadcrumb trail of past searches plus a dedicated product-results pane on the right — or fall back to the standard single-column layout (`'chatlayout'`, default); split layout only engages above the mobile breakpoint and once the conversation has produced breadcrumbs/products.
- ai-search-launcher: Added `customizations.chatbot.*` (`title`, `voiceGreetingEnabled`, `startMuted`, `layout`, `inputBar` border/menu-panel/voice-recording colors, `splitLayout` pane width/divider), `customizations.launcher.*` (`voiceRecordingMaxDurationSeconds`, `greetings`, entry-point toggles, `chatCameraEnabled`), `customizations.generalLayout.border`, `customizations.buttons.icon`, `customizations.breadcrumbTrail.active` / `.inactive`, and `customizations.imageUpload.galleryColumns` configuration fields.
- (internal) Extracted the chat UI (composer, message list, product grid, full-screen container) and assistant logic (token/stream parsing, voice recording + TTS playback) out of shopping-assistant into common modules (`src/common/components/chat/`, `src/common/assistant/`) so other widgets — currently ai-search-launcher — can reuse them without depending on shopping-assistant's own component tree.

### Fixed

- shopping-assistant: Product cards now respect the configured `customizations.productCard` border (width/color/radius), which was previously ignored in this widget's chat/product grid.

<!-- END visenze-experiences-web 1.0.30 -->

## [1.0.29](https://github.com/visenze/visenze-experiences-web/compare/1.0.28...1.0.29)

<!-- BEGIN visenze-experiences-web 1.0.29 -->

### Added

- shopping-assistant: Optional voice input/output, gated on `customizations.chatbot.voiceEnabled` (new; also new `customizations.chatbot.voiceId`, `customizations.chatbot.voiceModelId`, and `customizations.chatbot.voiceSettings` with `stability`/`similarityBoost` — all fall back to the widget's built-in voice/model/settings when unset). Press-and-hold the mic button to speak — live captions appear in the input via the browser's speech recognition, and releasing sends the message. While voice reading is on, every assistant reply — to typed messages as well as voice messages, including the assistant's opening/greeting messages — is read aloud via text-to-speech, sentence-by-sentence as the reply streams in. The on-screen reply text for a narrated turn holds briefly until narration is about to start, then reveals as a typewriter in step with the audio, so text and voice feel like one synchronized stream instead of racing each other. If the voice API call fails (offline, quota, outage), narration falls back to the browser's own speech synthesis rather than going silent. While a reply is being narrated, the product card it's currently describing is marked "Now Describing" and auto-scrolled into view, backing off automatically whenever the user is scrolling manually.

### Changed

- shopping-assistant: Chat/image query endpoint on cloud domains changed from `/v1/search/chat/shopping-assistant` to `/v1/chat/shopping-assistant` (legacy-domain path is unchanged).


<!-- END visenze-experiences-web 1.0.29 -->

## [1.0.28](https://github.com/visenze/visenze-experiences-web/compare/1.0.27...1.0.28)

<!-- BEGIN visenze-experiences-web 1.0.28 -->

### Added

- recommend-me: Ported `chat_token`/`[[product_id]]` token processing from shopping-assistant (`stripTokensForDisplay`, `resolveProducts`), including live display of the streamed recommendation message.
- recommend-me: Added accessibility support ported from shopping-assistant — focus-visible outlines on interactive buttons, `aria-label`s on the search input and product carousel, `role='list'`/`'listitem'` and keyboard-scrollable carousel, `role='alert'` on error messages, and a live `role='status'` region announcing loading/result state to screen readers.

<!-- END visenze-experiences-web 1.0.28 -->

## [1.0.27](https://github.com/visenze/visenze-experiences-web/compare/1.0.26...1.0.27)

<!-- BEGIN visenze-experiences-web 1.0.27 -->

### Fixed

- shopping-assistant: Focus visible outline on the image-upload dropzone now shows on keyboard focus of its inner input (`focus-within`) instead of only the (non-focusable) drop area, and the drop area no longer sits in the tab order.
- shopping-assistant: Focus moves to the first newly revealed suggested-reply button when "show all" is expanded, to the chat input when the dialog opens, and back to the popup trigger button when the dialog closes.
- shopping-assistant: Chat message list now announces newly streamed messages to screen readers via `aria-live="polite"`.
- shopping-assistant: Tab-cycling through the camera drawer's controls now correctly detects focus when the widget renders inside a Shadow DOM, instead of always falling back to the first control.
- shopping-assistant: Added an accessible name to the chat dialog and `title` tooltips to icon-only buttons (new chat, close, camera controls, send message).
- shopping-assistant: Added `lang="en"` to the standalone widget demo page.
- All widgets: Popup trigger button now forwards a ref so it can receive programmatic focus.

<!-- END visenze-experiences-web 1.0.27 -->

## [1.0.26](https://github.com/visenze/visenze-experiences-web/compare/1.0.25...1.0.26)

<!-- BEGIN visenze-experiences-web 1.0.26 -->

### Changed

- Update default `chat_agent` to `shopping_closer_voice_v2` for Shopping Assistant.

<!-- END visenze-experiences-web 1.0.26 -->

## [1.0.25](https://github.com/visenze/visenze-experiences-web/compare/1.0.24...1.0.25)

<!-- BEGIN visenze-experiences-web 1.0.25 -->

### Fixed

- shopping-assistant: Added `role="log"` to the chat message list and a group label for suggested replies, and labelled the camera preview for screen readers.
- shopping-assistant: Adjusted default price and original-price text colours to meet WCAG AA (4.5:1) contrast on light backgrounds.
- All widgets: Product card link now always exposes an accessible name, with image `alt` derived from the product title.
- All widgets: Added `type="button"` to the popup trigger button to prevent unintended form submission.

<!-- END visenze-experiences-web 1.0.25 -->

## [1.0.24](https://github.com/visenze/visenze-experiences-web/compare/1.0.23...1.0.24)

<!-- BEGIN visenze-experiences-web 1.0.24 -->

### Fixed

- shopping-assistant: Improved accessibility for icon-only controls, image upload, camera drawer focus management, and localized accessible labels.
- All widgets: Localized shared product-card wishlist and find-similar accessible labels.

<!-- END visenze-experiences-web 1.0.24 -->

## [1.0.23](https://github.com/visenze/visenze-experiences-web/compare/1.0.22...1.0.23)

<!-- BEGIN visenze-experiences-web 1.0.23 -->

### Added

- Support new token format for product ID.

<!-- END visenze-experiences-web 1.0.23 -->

## [1.0.22](https://github.com/visenze/visenze-experiences-web/compare/1.0.21...1.0.22)

<!-- BEGIN visenze-experiences-web 1.0.22 -->

### Added

- Add `zh` default texts to all widgets.

<!-- END visenze-experiences-web 1.0.22 -->

## [1.0.21](https://github.com/visenze/visenze-experiences-web/compare/1.0.20...1.0.21)

<!-- BEGIN visenze-experiences-web 1.0.21 -->

### Added

- All widgets: Added `appSettings.cloud` (`'aws'` | `'azure'`) to route requests to cloud-specific domains with their updated API paths. When set, it overrides the API-provided endpoint; a manually specified endpoint still takes highest priority.
- in-page-carousel-v3, similar-search: Added `appSettings.msApiId` support to route multisearch-family requests to regular multisearch (`'1'`), complementary (`'2'`), or outfit recommendations (`'3'`). A non-blank manual override in `window.visenzeConfigs[placementId].appSettings.msApiId` takes precedence over the API-provided value.
- Widget client: Added `multisearchRouter` (msApiId-based dispatcher).

### Changed

- Widget client: Renamed `WidgetClient.multisearchByImage` to `multisearch` (direct image multisearch call).
- Upgrade visearch-javascript-sdk to 5.2.0.
- Set default endpoint to `multimodal.search.rezolve.com`

### Fixed

- (internal) Ignored generated `dist/` output in Jest test discovery.

<!-- END visenze-experiences-web 1.0.21 -->

## [1.0.20](https://github.com/visenze/visenze-experiences-web/compare/1.0.19...1.0.20) - 2025-11-07

<!-- BEGIN visenze-experiences-web 1.0.20 -->
### Updated

- All widgets: Updated brand logo
<!-- END visenze-experiences-web 1.0.20 -->

## [1.0.19](https://github.com/visenze/visenze-experiences-web/compare/1.0.18...1.0.19) - 2025-10-24

<!-- BEGIN visenze-experiences-web 1.0.19 -->
### Highlights

The following widgets are available under stable status and will follow our versioning policy:
- Merchandise search bar
- Slide-out drawer
- In-page carousel V3 (in-page carousel using `product/multisearch` endpoint)

### Changed

- camera-search: Updated camera interface to allow switching front/back camera
- All widgets: Further improved compatibility with RTL languages + updated "Powered by ViSenze" footer (not localizable) to always be LTR

### Fixed

- All widgets: Added missing default discount display and wishlist toggle icon color settings
<!-- END visenze-experiences-web 1.0.19 -->

## [1.0.18](https://github.com/visenze/visenze-experiences-web/compare/1.0.17...1.0.18) - 2025-10-21

<!-- BEGIN visenze-experiences-web 1.0.18 -->
### Added

- All widgets: Added `closeWidget` method to programmatically close popup-like widgets
- All widgets: Added configurable display for price, original price, and discount
- All widgets: Added configurations for add-to-cart button
- All widgets: Added configurations for wishlist toggle icon

### Changed

- All widgets: Improved compatibility with RTL languages by converting most `left` and `right` CSS styling to `start` and `end`

### Fixed

- All widgets: Improved accessibility for popup-like widgets by setting `aria-hidden="true"` near the dialog portal instead of the document body
<!-- END visenze-experiences-web 1.0.18 -->

## [1.0.17](https://github.com/visenze/visenze-experiences-web/compare/1.0.16...1.0.17) - - 2025-09-17

<!-- BEGIN visenze-experiences-web 1.0.17 -->
### Added

- All widgets: Send `session_init` event to ViSenze analytics on widget initialization
<!-- END visenze-experiences-web 1.0.17 -->

## [1.0.16](https://github.com/visenze/visenze-experiences-web/compare/1.0.15...1.0.16) - 2025-09-10

<!-- BEGIN visenze-experiences-web 1.0.16 -->
### Added

- camera-search: Made the "capture image with your camera" button text localized and customizable
<!-- END visenze-experiences-web 1.0.16 -->

## [1.0.15](https://github.com/visenze/visenze-experiences-web/compare/1.0.14...1.0.15) - 2025-09-05

<!-- BEGIN visenze-experiences-web 1.0.15 -->
### Highlights

The following widgets are available under stable status and will follow our versioning policy:
- In-page carousel

### Added

- camera-search: Added entry point to activate device camera directly

### Updated

- All widgets: Updated brand logo
<!-- END visenze-experiences-web 1.0.15 -->

## [1.0.14](https://github.com/visenze/visenze-experiences-web/compare/1.0.13...1.0.14) - 2025-08-20

<!-- BEGIN visenze-experiences-web 1.0.14 -->
This release fixes some interactions within shopping-assistant widget, which is still in beta status.
<!-- END visenze-experiences-web 1.0.14 -->

## [1.0.13](https://github.com/visenze/visenze-experiences-web/compare/1.0.12...1.0.13) - 2025-07-18

<!-- BEGIN visenze-experiences-web 1.0.13 -->
### Fixes

- similar-search: Fixed bug where reference image was not displayed if `data-pid` is passed but `data-url` is not
- similar-search: Fixed bug where image+text query was only passing the text if `data-pid` is used as reference
<!-- END visenze-experiences-web 1.0.13 -->

<!-- BEGIN visenze-experiences-web 1.0.12 -->
## [1.0.12](https://github.com/visenze/visenze-experiences-web/compare/1.0.11...1.0.12) - 2025-07-18

### Added

- similar-search: Supported usage of product ID instead of product image URL as the basis for search
<!-- END visenze-experiences-web 1.0.12 -->

<!-- BEGIN visenze-experiences-web 1.0.11 -->
## [1.0.11](https://github.com/visenze/visenze-experiences-web/compare/1.0.10...1.0.11) - 2025-06-19

### Added

- All widgets: Added basic translations to Polish for most displayed texts
- (internal) Added configurations and callbacks for wishlist and add-to-cart icons
<!-- END visenze-experiences-web 1.0.11 -->

<!-- BEGIN visenze-experiences-web 1.0.10 -->
## [1.0.10](https://github.com/visenze/visenze-experiences-web/compare/1.0.9...1.0.10) - 2025-06-06

### Added

- All widgets: Configuration for source of main image + on-hover image; this replaced the internal `useBestProductImages` field
- All widgets: Configuration to show alternative products instead of the main result products; this replaced the internal `useAlternatives` field

### Changed

- camera-search, similar-search: Updated the default text for the search history
- camera-search, similar-search: Removed the scroll bar in product grid for larger screen size
<!-- END visenze-experiences-web 1.0.10 -->

<!-- BEGIN visenze-experiences-web 1.0.9 -->
## [1.0.9](https://github.com/visenze/visenze-experiences-web/compare/1.0.8...1.0.9) - 2025-06-02

### Fixed

- (internal) Fixed issue where config updated during runtime are not reflected when toggling dark mode / locale
<!-- END visenze-experiences-web 1.0.9 -->

<!-- BEGIN visenze-experiences-web 1.0.8 -->
## [1.0.8](https://github.com/visenze/visenze-experiences-web/compare/1.0.7...1.0.8) - 2025-05-23

### Fixed

- more-like-this: Fixed wrong condition for adding default margin classes
- camera-search, similar-search, embedded-search-results, search-bar: Fixed search bar input not activated by enter on certain devices
- All widgets: Added missing `wigmix-product-card-price-row` selector if original price does not exist
<!-- END visenze-experiences-web 1.0.8 -->

<!-- BEGIN visenze-experiences-web 1.0.7 -->
## [1.0.7](https://github.com/visenze/visenze-experiences-web/compare/1.0.6...1.0.7) - 2025-05-19

### Added

- camera-search, similar-search, icon-triggered-grid: Font color settings for popup trigger button text if the icon is configured to use the default color

### Chore

- search-bar: Moved search bar overlay out of search input div
- embedded-search-results, search-bar: Removed internal event `wigmix_internal_search_bar_append_image`
<!-- END visenze-experiences-web 1.0.7 -->

<!-- BEGIN visenze-experiences-web 1.0.6 -->
## [1.0.6](https://github.com/visenze/visenze-experiences-web/compare/1.0.5...1.0.6) - 2025-05-14

### Added

- Widget client: New method `renderMissing` to re-render widgets only on matched selectors that has no rendered widget yet

### Changed

- camera-search, search-bar: Updated the default images shown in the gallery
<!-- END visenze-experiences-web 1.0.6 -->

<!-- BEGIN visenze-experiences-web 1.0.5 -->
## [1.0.5](https://github.com/visenze/visenze-experiences-web/compare/1.0.4...1.0.5) - 2025-04-29

### Changed

- All widgets: Updated `show_best_product_images` parameter used in recommendation API calls to `false` by default

### Chore

- All widgets: Internal update to use `results.limit` and `results.showBestProductImages` configurations to influence API call results
<!-- END visenze-experiences-web 1.0.5 -->

<!-- BEGIN visenze-experiences-web 1.0.4 -->
## [1.0.4](https://github.com/visenze/visenze-experiences-web/compare/1.0.3...1.0.4) - 2025-04-25

### Added

- All widgets: Added support for hiding decimal values in price fields
- All widgets: Added basic translations to Spanish, French, Portuguese, German, Italian, Korean, Japanese, and Thai for most displayed texts

### Fixed

- Fixed bug where parameters specified in `searchSettings` were unable to override certain parameters when using recommendations API.

### Changed

- camera-search, similar-search, icon-triggered-grid: Updated popup trigger buttons to support combination of icon and text and use `button` instead of `div`
- similar-search, icon-triggered-grid: Updated popup trigger buttons to have white background by default
- camera-search, similar-search, embedded-search-results: Updated find similar buttons to use `button` instead of `div`
<!-- END visenze-experiences-web 1.0.4 -->

<!-- BEGIN visenze-experiences-web 1.0.3 -->
## [1.0.3](https://github.com/visenze/visenze-experiences-web/compare/1.0.2...1.0.3) - 2025-04-11

### Changed

- embedded-search-results: Display the different detected boxes for initial image query
<!-- END visenze-experiences-web 1.0.3 -->

<!-- BEGIN visenze-experiences-web 1.0.2 -->
## [1.0.2](https://github.com/visenze/visenze-experiences-web/compare/1.0.1...1.0.2) - 2025-03-26

### Fixed

- embedded-search-results: Fixed bug where navigating to the next page via infinite scrolling would cause facet filtering to use the wrong page number
- more-like-this: Fixed product slider horizontal margin settings not taking effect

### Changed

- All widgets: Updated default product card image aspect ratio to `2 / 3`
- All widgets: Updated product card image fitting behavior from `contain` to `cover` 
- camera-search, similar-search, search-bar: Standardized general modal layout
- camera-search, search-bar: Larger dropzone for uploading images
- search-bar: Displayed "Powered by ViSenze" logo by default on the upload modal footer
- shop-the-look: Reduced reference image size
- shop-the-look: Added slight opacity to product grid background in mobile view
- more-like-this, shop-the-look: Updated product slider to align left by default

### Removed

- camera-search: Removed "use camera" button

### Chore

- Added more unit tests for camera-search, similar-search, and embedded-search-results
<!-- END visenze-experiences-web 1.0.2 -->

<!-- BEGIN visenze-experiences-web 1.0.1 -->
## [1.0.1](https://github.com/visenze/visenze-experiences-web/compare/1.0.0...1.0.1) - 2025-03-11

### Highlights

The following widgets are available under stable status and will follow our versioning policy:
- Search bar
- Embedded search results
<!-- END visenze-experiences-web 1.0.1 -->

<!-- BEGIN visenze-experiences-web 1.0.0 -->
## 1.0.0 - 2025-02-28

### Highlights

This is the initial full release of ViSenze web widgets.

The following widgets are available under stable status and will follow our versioning policy:
- Camera search
- Similar search
- More like this (carousel of products)
- Shop the look (carousel of products with reference image)
- Embedded grid (grid of products)
- Shoppable lookbook (grid of products with reference image)
- Icon-triggered grid
<!-- END visenze-experiences-web 1.0.0 -->

[unreleased]: https://github.com/visenze/visenze-experiences-web/compare/1.0.1...develop
