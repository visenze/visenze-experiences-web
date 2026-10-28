import { type FC, useEffect, useMemo, useState } from 'react';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import EmbeddedHost from './embedded-host';
import EntryHost from './entry-host';
import normalizeProductId, { normalizeQuery } from './product-id';
import { resolveElementEntry } from '../../common/client/entry';
import { type AppPropsWithReferenceElement, AppWrapper } from '../../common/components/app-wrapper';

const ENABLE_CUSTOMIZATION = true;

// One App per host element. The element's data-entry picks its trigger (read once, at mount); every
// element of the placement shares the widgetClient, and so one chat drawer and one conversation —
// except `embedded` elements, each of which runs its own conversation from its data-query.
const App: FC<AppPropsWithReferenceElement> = ({ widgetConfig, widgetClient, element }) => {
  const entry = useMemo(
    () => resolveElementEntry(element, widgetConfig.appSettings.placementId, widgetConfig.appSettings.entry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element],
  );

  // Optional, and watched: the current product id goes with every message sent
  // from this element, and a change mid-conversation simply continues the same conversation.
  // `data-query` (the embedded entry's question) is watched too; either changing starts a fresh embedded conversation.
  const [productId, setProductId] = useState(() => normalizeProductId(element.dataset['pid']));
  const [query, setQuery] = useState(() => normalizeQuery(element.dataset['query']));
  useEffect(() => {
    const syncAttributes = (): void => {
      setProductId(normalizeProductId(element.dataset['pid']));
      setQuery(normalizeQuery(element.dataset['query']));
    };
    syncAttributes();
    const observer = new MutationObserver(syncAttributes);
    observer.observe(element, { attributes: true, attributeFilter: ['data-pid', 'data-query'] });
    return (): void => observer.disconnect();
  }, [element]);

  return (
    <AppWrapper widgetConfig={widgetConfig}
                widgetClient={widgetClient}
                defaultTexts={DEFAULT_TEXTS}
                defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
                enableCustomization={ENABLE_CUSTOMIZATION}>
      {entry === 'embedded'
        // Keyed by query and product: a change remounts it, which disposes the old conversation and starts a fresh one
        // (stored under the new key, see EmbeddedHost).
        ? <EmbeddedHost key={`${query}\n${productId}`} query={query} productId={productId || undefined} />
        : <EntryHost entry={entry} productId={productId || undefined} />}
    </AppWrapper>
  );
};

export default App;
