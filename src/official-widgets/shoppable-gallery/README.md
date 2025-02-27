# Shoppable Gallery widget

![status](https://img.shields.io/badge/status-alpha-red)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Run:
     ```sh
     npm run start:shoppable-gallery
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/shoppable-gallery` folder.
- To bundle the widget:
  ```sh
  npm run build:shoppable-gallery
  ```
  The bundled file will be available in `dist/shoppable-gallery` directory. 
