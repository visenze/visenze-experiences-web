# Search Results Page widget

![status](https://img.shields.io/badge/status-deprecated-lightgrey)

This is the repository for ViSenze's Search Results page widget. 

This widget is designed to power search page experiences in ecommerce websites

## Folder structure and key files

```
├─ search-results-page        <- Folder containing the standalone code 
   ├─ components        <- TBC
   ├─ screens           <- TBC
   ├─ icons             <- Folder containing the icons used 
├── search-results-page.tsx    <- Main widget code.
 
   
```

## Local development

1. To run the widget locally:
   1. Add your app key and placement ID to `dev-configs.ts`.
   2. Run:
      ```sh
      npm run start:search-results-page
      ```
      The dev server will be available at `http://localhost:8080` and will automatically reload for changes made in `src/official-widgets/search-results-page` folder.
2. To bundle the widget:
   ```sh
   npm run build:search-results-page
   ```
   The bundled file will be available in `dist/search-results-page` directory. 
