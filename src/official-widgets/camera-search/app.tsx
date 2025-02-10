import { type FC } from 'react';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import CameraSearch from './camera-search';
import './app.css';
import { type LanguagePack } from '../../common/locales/locale';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import AppWrapper from '../../common/components/app-wrapper';

interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<string, string>;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    uploadScreenTitle: "SHOW US WHAT YOU'RE LOOKING FOR",
    resultScreenTitle: "HERE'S WHAT WE FOUND",
    dragImageToSearch: 'drag an image to search or click to browse',
    tapToSearchImage: 'tap here to search an image',
    tapProductGallery: 'or tap our trending product gallery below',
    useCamera: 'USE CAMERA',
    searchBarPlaceholder: 'Type here to refine your results...',
    previousViews: 'Previous views',
    errorDescription: 'Sorry, something went wrong',
    back: 'Back',
  },
};

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ widgetConfig, fieldMappings, widgetClient }) => (
  <AppWrapper widgetConfig={widgetConfig}
              widgetClient={widgetClient}
              fieldMappings={fieldMappings}
              defaultTexts={DEFAULT_TEXTS}
              defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
              enableCustomization={ENABLE_CUSTOMIZATION}>
    <CameraSearch />
  </AppWrapper>
);

export default App;
