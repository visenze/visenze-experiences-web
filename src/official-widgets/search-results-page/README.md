# Search Results Page widget

![status](https://img.shields.io/badge/status-deprecated-lightgrey)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Run:
     ```sh
     npm run start:search-results-page
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/search-results-page` folder.
- To bundle the widget:
  ```sh
  npm run build:search-results-page
  ```
  The bundled file will be available in `dist/search-results-page` directory. 
