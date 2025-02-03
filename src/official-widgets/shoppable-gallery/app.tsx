import type { FC } from 'react';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import ShoppableGallery from './shoppable-gallery';
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
    errorDescription: 'Sorry, something went wrong',
    errorResolution: 'Please refresh to try again',
    hotspotRecommendationsTitle: 'In this photo',
    noResults: 'There are no results for this hotspot',
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
    <ShoppableGallery />
  </AppWrapper>
);

export default App;
