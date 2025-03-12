# Embedded Search Results widget

![status](https://img.shields.io/badge/status-stable-blue)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. (optional) Add the product image URL in the `data-url` field of the widget selector.
  3. (optional) Add the text query in the `data-text` field of the widget selector.
  4. Run:
     ```sh
     npm run start:embedded-search-results
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/embedded-search-results` folder.
- To bundle the widget:
  ```sh
  npm run build:embedded-search-results
  ```
  The bundled file will be available in `dist/embedded-search-results` directory. 
