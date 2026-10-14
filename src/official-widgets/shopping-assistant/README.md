# Shopping Assistant widget

![status](https://img.shields.io/badge/status-beta-yellow)

## Local development

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts`.
  2. Run:
     ```sh
     npm run start:shopping-assistant
     ```
     The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/shopping-assistant` folder.
- To bundle the widget:
  ```sh
  npm run build:shopping-assistant
  ```
  The bundled file will be available in `dist/shopping-assistant` directory.

## Header icon

`customizations.chatbot.headerIcon` shows an image, including an animated GIF, in the chat header right before
the title. It is optional: nothing is shown when `url` is unset or blank.

```js
customizations: {
  chatbot: {
    headerIcon: { url: 'https://example.com/logo.gif', height: 24 }, // width optional
  },
},
```

`height` defaults to 24 (pixels); without a `width` it follows the image's aspect ratio (up to 240px wide).
`color` / `colorDark` tint the image as a mask, which flattens it to a single color and stops a GIF, so leave
them unset to show the image as it is.
