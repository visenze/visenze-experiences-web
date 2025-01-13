# Icon-triggered Grid widget

![status](https://img.shields.io/badge/status-beta-yellow)

This is the repository for ViSenze's Icon-triggered Grid widget. 

This widget is designed to power recommendation experiences in ecommerce websites

## Folder structure and key files

```
├─ icon-triggered-grid        <- Folder containing the standalone code 
   ├─ components        <- Folder containing the product card component - start here to customise the product card
├── icon-triggered-grid.tsx    <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
   2. Run:
      ```sh
      npm run start:icon-triggered-grid
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/icon-triggered-grid` folder.
2. To bundle the widget:
   ```sh
   npm run build:icon-triggered-grid
   ```
   The bundled file will be available in `dist/icon-triggered-grid` directory. 
