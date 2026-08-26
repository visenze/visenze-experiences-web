import { type FC, useContext } from 'react';
import EmbeddedShoppingAssistantChat from './embedded-shopping-assistant-chat';
import { WidgetDataContext } from '../../common/types/contexts';
import type { ProcessedProduct } from '../../common/types/product';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ConversationTurn {
  id: string;
  title: string;
  queryImageUrl?: string;
  aiText: string;
  products: ProcessedProduct[];
  reqId?: string;
  isLoading: boolean;
  isInitial: boolean;
  productsExpanded: boolean;
  // `isLoading` flips to false as soon as the first chat_token arrives (to reveal streaming text),
  // which is often before any `product` SSE events have arrived — so `products` can still be
  // legitimately empty at that point. This tracks whether the product stream has actually finished,
  // so "No matching products found" only shows once that's really true, not mid-stream.
  productsSettled: boolean;
}

export interface EmbeddedShoppingAssistantProps {
  query: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
// Step 2 of adopting ChatComposer (see migration plan): this outer component's only job is to
// isolate the useChat() instance mounted in EmbeddedShoppingAssistantChat from any
// host-configured onAddToCartToggle/onAddToWishlistToggle callbacks. useChat's action-token
// handling fires those callbacks unconditionally whenever a host has set them for this
// placement id, regardless of whether ESA asked for that behavior — ESA never reads
// widgetConfig.callbacks itself, so overriding it to `{}` in this nested Provider is safe for
// everything else and guarantees those callbacks never fire for ESA, no matter what a host sets.
const EmbeddedShoppingAssistant: FC<EmbeddedShoppingAssistantProps> = ({ query }) => {
  const outerContext = useContext(WidgetDataContext);
  const neuteredContext = {
    ...outerContext,
    widgetConfig: { ...outerContext.widgetConfig, callbacks: {} },
  };

  return (
    <WidgetDataContext.Provider value={neuteredContext}>
      <EmbeddedShoppingAssistantChat query={query} />
    </WidgetDataContext.Provider>
  );
};

export default EmbeddedShoppingAssistant;
