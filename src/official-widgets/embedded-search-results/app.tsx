import type { FC } from 'react';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import EmbeddedSearchResults from './embedded-search-results';
import './app.css';
import { type LanguagePack } from '../../common/locales/locale';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import AppWrapper from '../../common/components/app-wrapper';

interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<any, any>;
  element: HTMLElement;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    filter: 'Filter',
    noResults: 'No Results Found',
    noResultsDescription: 'We could not find any products matching your search.',
    searchBarPlaceholder: 'What are you looking for?',
    noSearchInput: 'No search input',
    noSearchInputDescription: 'Enter a search term or select an image to find results.',
  },
};

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ widgetConfig, fieldMappings, widgetClient, element }) => {
  const textQuery = element.dataset.text ?? '';
  const imUrl = element.dataset.url ?? '';

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                fieldMappings={fieldMappings}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <EmbeddedSearchResults textQuery={textQuery} imUrl={imUrl} />
    </AppWrapper>
  );
};

export default App;
