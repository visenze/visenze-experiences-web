# Shop The Look widget

![status](https://img.shields.io/badge/status-beta-yellow)

This is the repository for ViSenze's Shop The Look widget. 

This widget is designed to power recommendation experiences in ecommerce websites

## Folder structure and key files

```
├─ shop-the-look        <- Folder containing the standalone code 
   ├─ components        <- Components used by the widget
├── shop-the-look.tsx    <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
   2. Run:
      ```sh
      npm run start:shop-the-look
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/shop-the-look` folder.
2. To bundle the widget:
   ```sh
   npm run build:shop-the-look
   ```
   The bundled file will be available in `dist/shop-the-look` directory. 
