# ViSenze Product Search Widgets

This is the repository for all ViSenze widgets aiming to accelerate development and deployment of Visenze powered Shopping Experiences.

The widgets use react and tailwind css. 

Each widget can operate as a standalone component to be deployed in an ecommerce website and can be build and distributed independently from each other. 

## Repository structure

```txt
├─ common               <- Folder for code used across different widgets
   ├─ client            <- Client connecting with ViSenze APIs
   ├─ components        <- Common React components
   ├─ types             <- TypeScript typing
├── official-widgets    <- Widgets built and officially supported by ViSenze
   ├─ camera-search 
   ├─ similar-search
   ├─ etc.
```

## Local development

Each widget is designed to be distributed as a separate bundle. For example, using `camera-search`:

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts` in the relevant folder, which in this case is `src/official-widgets/camera-search`.
   2. Run:
      ```sh
      npm run start:camera-search
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/camera-search` folder.
2. To bundle the widget:
   ```sh
   npm run build:camera-search
   ```
   The bundled file will be available in `dist/camera-search` directory. 
