# Similar Search widget

![status](https://img.shields.io/badge/status-stable-blue)
![stable](https://img.shields.io/badge/since-1.0.0-blue)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Add the product ID in the `data-pid` field of the widget selector.
     - Alternatively, add the product image URL in the `data-url` field of the widget selector.
     - At least one of `data-pid` or `data-url` has to be provided. If both are provided, `data-pid` takes the precedence.
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
