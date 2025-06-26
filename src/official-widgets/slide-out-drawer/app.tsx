import type { FC } from 'react';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import SlideOutDrawer from './slide-out-drawer';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  const imUrl = element.dataset['url'] ?? '';
  if (!imUrl) {
    return <></>;
  }

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <SlideOutDrawer imUrl={imUrl} />
    </AppWrapper>
  );
};

export default App;
