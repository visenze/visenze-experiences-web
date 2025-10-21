import type { FC } from 'react';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import InPageCarouselV3 from './in-page-carousel-v3';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  const productId = element.dataset['pid'] ?? '';
  if (!productId) {
    return <></>;
  }

  return (
    <AppWrapper
      widgetConfig={widgetConfig}
      widgetClient={widgetClient}
      defaultTexts={DEFAULT_TEXTS}
      defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
      enableCustomization={ENABLE_CUSTOMIZATION}>
      <InPageCarouselV3 productId={productId} />
    </AppWrapper>
  );
};

export default App;
