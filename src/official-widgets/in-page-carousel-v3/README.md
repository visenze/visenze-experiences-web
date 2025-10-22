# In Page Carousel (V3) widget

![status](https://img.shields.io/badge/status-stable-blue)
![stable](https://img.shields.io/badge/since-1.0.19-blue)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Add the product ID in the `data-pid` field of the widget selector.
  3. Run:
     ```sh
     npm run start:in-page-carousel-v3
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/in-page-carousel-v3` folder.
- To bundle the widget:
  ```sh
  npm run build:in-page-carousel-v3
  ```
  The bundled file will be available in `dist/in-page-carousel-v3` directory. 
