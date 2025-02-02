import type { FC } from 'react';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import ShoppingAssistant from './shopping-assistant';
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
    openingMessage1: 'Let\'s get started',
    openingMessage2: 'Tell us about what your styling needs and we will help you find the perfect item for you',
    chatBoxPlaceholder: 'Type your message',
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
    <ShoppingAssistant />
  </AppWrapper>
);

export default App;
