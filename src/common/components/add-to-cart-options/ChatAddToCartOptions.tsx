import { type FC, useContext, useMemo, useState } from 'react';
import { getOptionsProductTitle, resolveOptionFields } from './add-to-cart-options';
import AddToCartOptionsModal from './AddToCartOptionsModal';
import AddToCartOptionsPanel from './AddToCartOptionsPanel';
import useAddToCart from './use-add-to-cart';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import type { Chat } from '../chat/use-chat';

interface ChatAddToCartOptionsProps {
  // The 'options' chat entry whose products need add-to-cart options chosen.
  entry: Chat;
}

// Product ids whose pop-up was already confirmed or closed, per options entry. Keyed by the entry
// rather than the product object, because the same product object is reused when the shopper asks
// to add a product from an earlier turn again, and that new request must still open a pop-up.
// Module-level so a pop-up isn't shown again when the chat row re-mounts, e.g. when the chat
// window is closed and reopened.
const handledPidsByEntry = new WeakMap<Chat, Set<string>>();

const getHandledPids = (entry: Chat): Set<string> => {
  let handledPids = handledPidsByEntry.get(entry);
  if (!handledPids) {
    handledPids = new Set();
    handledPidsByEntry.set(entry, handledPids);
  }
  return handledPids;
};

// When the AI asks to add products to cart and they have add-to-cart options, the options are
// asked for in the same pop-up the product card uses, one product at a time. The pop-up's own
// Add to Cart button carries the onAddToCartToggle callback.
const ChatAddToCartOptions: FC<ChatAddToCartOptionsProps> = ({ entry }) => {
  const products = useMemo(() => entry.products || [], [entry]);
  const { widgetConfig } = useContext(WidgetDataContext);
  const { productDetails } = widgetConfig.displaySettings;
  const addToCartOptions = widgetConfig.customizations.productCard?.addToCart?.options;
  const addToCart = useAddToCart();
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  // Bumped to re-render once the current product has been handled.
  const [, setHandledCount] = useState(0);

  const fieldsByPid = useMemo(() => new Map(products.map((product) => (
    [product.product_id, resolveOptionFields(product, productDetails, addToCartOptions)]
  ))), [products, productDetails, addToCartOptions]);

  const currentIndex = products.findIndex((product) => (
    !getHandledPids(entry).has(product.product_id) && (fieldsByPid.get(product.product_id) || []).length > 0
  ));
  const current = currentIndex >= 0 ? products[currentIndex] : undefined;

  const markHandled = (product: ProcessedProduct): void => {
    getHandledPids(entry).add(product.product_id);
    setHandledCount((count) => count + 1);
  };

  return (
    <>
      {/* Anchor inside the chat so the pop-up can find the widget modal it should cover. */}
      <span ref={setAnchor} className='hidden' aria-hidden='true' />
      {current && anchor && (
        <AddToCartOptionsModal key={current.product_id} anchor={anchor} onClose={() => markHandled(current)}>
          <AddToCartOptionsPanel
            productTitle={getOptionsProductTitle(current, productDetails)}
            fields={fieldsByPid.get(current.product_id) || []}
            onClose={() => markHandled(current)}
            onConfirm={async (selectedOptions) => {
              await addToCart(current, selectedOptions);
              markHandled(current);
            }}
          />
        </AddToCartOptionsModal>
      )}
    </>
  );
};

export default ChatAddToCartOptions;
