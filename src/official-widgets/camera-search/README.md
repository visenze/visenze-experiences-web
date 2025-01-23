# Camera Search widget

![status](https://img.shields.io/badge/status-beta-yellow)

This is the repository for ViSenze's Camera Search widget. 

This widget is designed to enable consumers to quickly finding products using images. 

## Folder structure and key files

```
├─ camera-search        <- Folder containing the standalone code for the camera search widget
   ├─ components        <- Folder containing the file uplooad component and header componen 
   ├─ screens           <- Folder containing the image upload screen and the results page code, start here to customise the layout and appearance of the widget
   ├─ icons             <- Folder containing the icons used 
├── camera-search.tsx    <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
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
