import type { FC } from 'react';
import SearchBar from './search-bar';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, fieldMappings, widgetClient, element }) => {
  const textQuery = element.dataset['text'] ?? '';
  const imUrl = element.dataset['url'] ?? '';

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                fieldMappings={fieldMappings}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <SearchBar textQuery={textQuery} imUrl={imUrl} />
    </AppWrapper>
  );
};

export default App;
