# Rezolve Product Search Widgets

This is the repository for all Rezolve widgets aiming to accelerate development and deployment of Rezolve-powered Shopping Experiences.

Each widget can operate as a standalone component to be deployed in an e-commerce website and can be build and distributed independently from each other. 

The widgets use React, HeroUI (formerly known as NextUI) and Tailwind CSS.

Note: for staging testing, please remove the `cloud` under `appSettings` config. Otherwise the widget will always try to connect to production.

## Official Widgets

| Widget | Path | APIs Used |
|--------|------|-----------|
| in-page-carousel | `src/official-widgets/in-page-carousel` | Legacy Recommendations |
| embedded-grid | `src/official-widgets/embedded-grid` | Legacy Recommendations |
| shop-the-look | `src/official-widgets/shop-the-look` | Legacy Recommendations |
| search-bar | `src/official-widgets/search-bar` | Multisearch Autocomplete, Multisearch |
| in-page-carousel-v3 | `src/official-widgets/in-page-carousel-v3` | Multisearch |
| similar-search | `src/official-widgets/similar-search` | Multisearch |
| recommend-me | `src/official-widgets/recommend-me` | Recommend Me, Multisearch |
| camera-search | `src/official-widgets/camera-search` | Multisearch |
| embedded-search-results | `src/official-widgets/embedded-search-results` | Multisearch |
| shoppable-lookbook | `src/official-widgets/shoppable-lookbook` | Legacy Recommendations |
| icon-triggered-grid | `src/official-widgets/icon-triggered-grid` | Legacy Recommendations |
| buy-the-look | `src/official-widgets/buy-the-look` | Legacy Recommendations |
| more-like-this | `src/official-widgets/more-like-this` | Legacy Recommendations |
| slide-out-drawer | `src/official-widgets/slide-out-drawer` | Multisearch, Recommend Me |
| merchandise-search-bar | `src/official-widgets/merchandise-search-bar` | Multisearch Autocomplete, Multisearch |
| shoppable-gallery | `src/official-widgets/shoppable-gallery` | Legacy Recommendations, Gallery Browse |
| shopping-assistant | `src/official-widgets/shopping-assistant` | Shopping Assistant |
| ai-search-launcher | `src/official-widgets/ai-search-launcher` | Shopping Assistant |

**API reference:**
- **Product Search by ID** — `productSearchById` (SDK); legacy Recommendations endpoint
- **Multisearch** — `productMultisearch` / `productMultisearchComplementary` / `productMultisearchOutfitRecommendations` (SDK); routable via `msApiId`
- **Multisearch Autocomplete** — `productMultisearchAutocomplete` (SDK)
- **Recommend Me** — `/v1/product/multisearch/chat/recommend-me` (direct fetch, SSE)
- **Gallery Browse** — `/v1/product/linked/gallery/browse` (direct fetch, legacy API)
- **Shopping Assistant** — `/v1/product/multisearch/chat/shopping-assistant` (direct fetch, SSE); used by both `shopping-assistant` and `ai-search-launcher` (each makes its own independent call to the same backend endpoint)

## Repository structure

```txt
├─ common               <- Folder for common code used across different widgets
   ├─ client            <- Client connecting with Rezolve MS APIs
   ├─ components        <- Common React components
   ├─ types             <- TypeScript typing
├── official-widgets    <- Widgets built and officially supported by Rezolve
   ├─ camera-search 
   ├─ similar-search
   ├─ etc.
```

## Local development

First run `npm install`.

Each widget is designed to be distributed as a separate bundle.
The exact steps for local development vary slightly between different widgets, but generally follow the same idea.
Using `similar-search` as example:

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts` in the relevant folder, which in this case is `src/official-widgets/similar-search`.
  2. Add the widget-specific parameters to `index.html` in the same folder.
     For example, for the `similar-search` widget, add the product image URL in the `data-url` field of the widget selector.
  3. Run:
     ```sh
     npm run start:similar-search
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/similar-search` folder.
- To bundle the widget:
  ```sh
  npm run build:similar-search
  ```
  The bundled file will be available in `dist/similar-search` directory. 

The exact instructions for different widgets can be found in the sub-folder containing the widget.
