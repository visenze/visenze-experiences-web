# ViSenze Product Search Widgets

This is the repository for all ViSenze widgets aiming to accelerate development and deployment of ViSenze-powered Shopping Experiences.

Each widget can operate as a standalone component to be deployed in an e-commerce website and can be build and distributed independently from each other. 

The widgets use React, HeroUI (formerly known as NextUI) and Tailwind CSS.

## Documentation

See the [docs](docs/) folder for complete documentation, including:
- [Integration Guide](docs/integration.md)
- [Customization Guide](docs/customization.md)
- [Versioning Policy](docs/versioning.md)
- [Architecture & Technical Docs](docs/architecture/)

## Repository structure

```txt
├─ common               <- Folder for common code used across different widgets
   ├─ client            <- Client connecting with ViSenze APIs
   ├─ components        <- Common React components
   ├─ types             <- TypeScript typing
├── official-widgets    <- Widgets built and officially supported by ViSenze
   ├─ camera-search 
   ├─ similar-search
   ├─ etc.
```

## Local development

Each widget is designed to be distributed as a separate bundle.
The exact steps for local development vary slightly between different widgets, but generally follow the same idea.
Using `similar-search` as example:

- To run the widget locally:
  1. Add your app key and placement ID to `dev-configs.ts` in the relevant folder, which in this case is `src/official-widgets/similar-search`.
  2. Add the widget-specific parameters to `index.html` in the same folder.
     For example, for the `similar-search` widget, add the product image URL in the `data-url` field of the widget selector.
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

The exact instructions for different widgets can be found in the sub-folder containing the widget.
