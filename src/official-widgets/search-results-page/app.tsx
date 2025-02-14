import type { FC } from 'react';
import SearchResultsPage from './search-results-page';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { type AppProps, AppWrapper } from '../../common/components/app-wrapper';

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
