# Buy The Look widget

![status](https://img.shields.io/badge/status-alpha-red)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Add the product ID in the `data-pid` field of the widget selector.
  3. Run:
     ``` sh
     npm run start:buy-the-look
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/buy-the-look` folder.
- To bundle the widget:
  ``` sh
  npm run build:buy-the-look
  ```
  The bundled file will be available in `dist/buy-the-look` directory. 
