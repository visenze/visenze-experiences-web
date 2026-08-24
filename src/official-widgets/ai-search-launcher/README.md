# AI Search Launcher widget

![status](https://img.shields.io/badge/status-alpha-red)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Run:
     ```sh
     npm run start:ai-search-launcher
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/ai-search-launcher` folder.
- To bundle the widget:
  ```sh
  npm run build:ai-search-launcher
  ```
  The bundled file will be available in `dist/ai-search-launcher` directory. 
