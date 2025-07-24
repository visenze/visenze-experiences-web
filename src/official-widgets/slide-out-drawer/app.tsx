import type { FC } from 'react';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import SlideOutDrawer from './slide-out-drawer';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  const pid = element.dataset['pid'] ?? '';
  if (!pid) {
    return <></>;
  }

  return (
    <AppWrapper
      widgetConfig={widgetConfig}
      widgetClient={widgetClient}
      defaultTexts={DEFAULT_TEXTS}
      defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
      enableCustomization={ENABLE_CUSTOMIZATION}>
      <SlideOutDrawer pid={pid} />
    </AppWrapper>
  );
};

export default App;
