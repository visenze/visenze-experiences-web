# Shopping Assistant widget

![status](https://img.shields.io/badge/status-beta-yellow)

This is the repository for ViSenze's Shopping Assistant widget.

This widget is designed to power recommendation experiences in ecommerce websites.

## Folder structure and key files

```
├─ shopping-assistant        <- Folder containing the standalone code 
   ├─ components             <- Components used by the widget
├── shopping-assistant.tsx   <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
   2. Run:
      ```sh
      npm run start:shopping-assistant
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/shopping-assistant` folder.
2. To bundle the widget:
   ```sh
   npm run build:shopping-assistant
   ```
   The bundled file will be available in `dist/shopping-assistant` directory. 
