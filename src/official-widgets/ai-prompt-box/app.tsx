import { type FC, useEffect, useState } from 'react';
import './app.css';
import AiPromptBox from './ai-prompt-box';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import normalizeProductId from './product-id';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

const ENABLE_CUSTOMIZATION = true;

const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  // Optional: an empty (or unfilled-placeholder) data-pid means no product, and the widget then works
  // as a general assistant without product context. The host may change it later (e.g. a single-page
  // app moving to another product), so the attribute is watched: the current product id goes with every
  // chat request, and an ongoing conversation simply continues about the new product.
  const [productId, setProductId] = useState(() => normalizeProductId(element.dataset['pid']));
  useEffect(() => {
    const syncProductId = (): void => setProductId(normalizeProductId(element.dataset['pid']));
    syncProductId();
    const observer = new MutationObserver(syncProductId);
    observer.observe(element, { attributes: true, attributeFilter: ['data-pid'] });
    return (): void => observer.disconnect();
  }, [element]);

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      <AiPromptBox productId={productId} />
    </AppWrapper>
  );
};

export default App;
