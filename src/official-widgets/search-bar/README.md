# Search Bar widget

![status](https://img.shields.io/badge/status-beta-yellow)

This is the repository for ViSenze's Search Bar widget. 

This widget is designed to power search experiences in ecommerce websites

## Folder structure and key files

```
├─ search-bar        <- Folder containing the standalone code 
   ├─ components        <- Components used by the widget
├── search-bar.tsx    <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
   2. Run:
      ```sh
      npm run start:search-bar
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/search-bar` folder.
2. To bundle the widget:
   ```sh
   npm run build:search-bar
   ```
   The bundled file will be available in `dist/search-bar` directory. 
