import { type FC, useContext, useMemo, useState } from 'react';
import { getOptionsProductTitle, resolveOptionFields } from './add-to-cart-options';
import AddToCartOptionsModal from './AddToCartOptionsModal';
import AddToCartOptionsPanel from './AddToCartOptionsPanel';
import useAddToCart from './use-add-to-cart';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';

interface ChatAddToCartOptionsProps {
  products: ProcessedProduct[];
  requestId: string;
}

// Products whose pop-up was already confirmed or closed. Module-level (keyed by the product
// objects of the chat entry) so a pop-up isn't shown again when the chat row re-mounts, e.g. when
// the chat window is closed and reopened.
const handledProducts = new WeakSet<ProcessedProduct>();

// When the AI asks to add products to cart and they have add-to-cart options, the options are
// asked for in the same pop-up the product card uses, one product at a time. The pop-up's own
// Add to Cart button carries the onAddToCartToggle callback and the add_to_cart tracking event.
const ChatAddToCartOptions: FC<ChatAddToCartOptionsProps> = ({ products, requestId }) => {
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
    !handledProducts.has(product) && (fieldsByPid.get(product.product_id) || []).length > 0
  ));
  const current = currentIndex >= 0 ? products[currentIndex] : undefined;

  const markHandled = (product: ProcessedProduct): void => {
    handledProducts.add(product);
    setHandledCount((count) => count + 1);
  };

  return (
    <>
      {/* Anchor inside the chat so the pop-up can find the widget modal it should cover. */}
      <span ref={setAnchor} className='hidden' aria-hidden='true' />
      {current && anchor && (
        <AddToCartOptionsModal key={current.product_id} anchor={anchor} onClose={() => markHandled(current)}>
          <AddToCartOptionsPanel
            product={current}
            productTitle={getOptionsProductTitle(current, productDetails)}
            fields={fieldsByPid.get(current.product_id) || []}
            onClose={() => markHandled(current)}
            onConfirm={async (selectedOptions) => {
              await addToCart(current, { queryId: requestId, pos: currentIndex + 1 }, selectedOptions);
              markHandled(current);
            }}
          />
        </AddToCartOptionsModal>
      )}
    </>
  );
};

export default ChatAddToCartOptions;
