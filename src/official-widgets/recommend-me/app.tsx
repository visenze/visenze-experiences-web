import type { FC } from 'react';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import RecommendMe from './recommend-me';
import './app.css';
import { type LanguagePack } from '../../common/locales/locale';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import AppWrapper from '../../common/components/app-wrapper';

interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<string, string>;
  element: HTMLElement;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Personalize your recommendations',
    searchBarButton: 'Recommend Me',
    searchBarPlaceholder: 'an outfit to go with this',
    resultLoading1: 'Searching the latest trends...',
    resultLoading2: 'Finding the perfect look...',
    resultLoading3: 'Almost there...',
    resultRendering: 'Here\'s what I found for you',
    resultCarouselTitle: 'Results for',
  },
};

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ widgetConfig, fieldMappings, widgetClient, element }) => {
  const productId = element.dataset['pid'] ?? '';
  if (!productId) {
    return <></>;
  }

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                fieldMappings={fieldMappings}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <RecommendMe productId={productId} />
    </AppWrapper>
  );
};

export default App;
