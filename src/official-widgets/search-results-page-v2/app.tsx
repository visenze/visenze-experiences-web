import type { FC } from 'react';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import SearchResultsPageV2 from './search-results-page-v2';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  const textQuery = element.dataset['text'] ?? '';
  const imUrl = element.dataset['url'] ?? '';

  return (
    <AppWrapper
      widgetConfig={widgetConfig}
      widgetClient={widgetClient}
      defaultTexts={DEFAULT_TEXTS}
      defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
      enableCustomization={ENABLE_CUSTOMIZATION}>
      <SearchResultsPageV2 textQuery={textQuery} imUrl={imUrl} />
    </AppWrapper>
  );
};

export default App;
