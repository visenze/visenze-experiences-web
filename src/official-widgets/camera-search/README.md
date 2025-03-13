# Camera Search widget

![status](https://img.shields.io/badge/status-stable-blue)
![stable](https://img.shields.io/badge/since-1.0.0-blue)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Run:
     ```sh
     npm run start:camera-search
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/camera-search` folder.
- To bundle the widget:
  ```sh
  npm run build:camera-search
  ```
  The bundled file will be available in `dist/camera-search` directory. 
