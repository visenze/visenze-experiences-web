import type { FC } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/wigmix-core';
import SimilarSearch from './similar-search';
import './app.css';
import { type LanguagePack } from '../../common/locales/locale';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import AppWrapper from '../../common/components/app-wrapper';

interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<string, string>;
  element: HTMLElement;
  index: number;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'MORE LIKE THIS',
    searchBarPlaceholder: 'Type here to refine your results...',
    previousViews: 'Previous views',
    errorDescription: 'Sorry, something went wrong',
    back: 'Back',
  },
};

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ widgetConfig, fieldMappings, widgetClient, element }) => {
  const imUrl = element.dataset['url'] ?? '';
  if (!imUrl) {
    return <></>;
  }

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                fieldMappings={fieldMappings}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <SimilarSearch imUrl={imUrl} />
    </AppWrapper>
  );
};

export default App;
