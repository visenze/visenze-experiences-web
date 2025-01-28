import type { FC } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/wigmix-core';
import IconTriggeredGrid from './icon-triggered-grid';
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
    'widgetTitle': 'You may also like',
    'errorDescription': 'Sorry, something went wrong',
    'errorResolution': 'Please refresh to try again',
    'sort': 'Sort',
    'filter': 'Filter',
    'cancel': 'Cancel',
    'back': 'Back',
    'sortType.relevance': 'Relevance',
    'sortType.highToLowPrice': 'High to low (Price)',
    'sortType.lowToHighPrice': 'Low to high (Price)',
  },
};

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ widgetConfig, fieldMappings, widgetClient, element }) => {
  const productId = element.dataset.pid ?? '';

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                fieldMappings={fieldMappings}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <IconTriggeredGrid productId={productId} />
    </AppWrapper>
  );
};

export default App;
