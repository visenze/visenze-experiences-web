import type { FC } from 'react';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import SearchResultsPage from './search-results-page';
import './app.css';
import { type LanguagePack } from '../../common/locales/locale';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import AppWrapper from '../../common/components/app-wrapper';

interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<any, any>;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    searchBarPlaceholder: 'What are you looking for?',
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
    <SearchResultsPage />
  </AppWrapper>
);

export default App;
