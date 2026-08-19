import type { FC } from 'react';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import EmbeddedShoppingAssistant from './embedded-shopping-assistant';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  const query = element.dataset['query'] ?? '';

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <EmbeddedShoppingAssistant query={query} />
    </AppWrapper>
  );
};

export default App;
