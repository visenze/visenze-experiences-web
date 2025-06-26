# Search Results Page widget

![status](https://img.shields.io/badge/status-stable-blue)
![stable](https://img.shields.io/badge/since-1.0.1-blue)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. (optional) Add the product image URL in the `data-url` field of the widget selector.
  3. (optional) Add the text query in the `data-text` field of the widget selector.
  4. Run:
     ```sh
     npm run start:search-results-page
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/search-results-page` folder.
- To bundle the widget:
  ```sh
  npm run build:search-results-page
  ```
  The bundled file will be available in `dist/search-results-page` directory. 
