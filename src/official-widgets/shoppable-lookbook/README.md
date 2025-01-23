# Shoppable Lookbook widget

![status](https://img.shields.io/badge/status-beta-yellow)

This is the repository for ViSenze's Shoppable Lookbook widget. 

This widget is designed to power recommendation experiences in ecommerce websites

## Folder structure and key files

```
├─ shoppable-lookbook        <- Folder containing the standalone code 
   ├─ components        <- Components used by the widget
├── shoppable-lookbook.tsx    <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
   2. Run:
      ```sh
      npm run start:shoppable-lookbook
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/shoppable-lookbook` folder.
2. To bundle the widget:
   ```sh
   npm run build:shoppable-lookbook
   ```
   The bundled file will be available in `dist/shoppable-lookbook` directory.
