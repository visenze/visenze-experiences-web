import { useCallback, useContext } from 'react';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';

export type AddToCartHandler = (
  product: ProcessedProduct,
  selectedOptions?: Record<string, string>,
) => Promise<void>;

// Calls the host's onAddToCartToggle callback. The add_to_cart tracking event is intentionally not sent here:
// add-to-cart can happen anywhere on the host site (homepage, PLP, PDP, ...), so the host owns that event to avoid
// double counting.
// Errors thrown by the callback are logged rather than propagated, so callers can always reset
// their loading state.
const useAddToCart = (): AddToCartHandler => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { onAddToCartToggle } = widgetConfig.callbacks;

  return useCallback(async (product, selectedOptions) => {
    if (!onAddToCartToggle) {
      return;
    }
    try {
      if (selectedOptions) {
        await onAddToCartToggle(true, product.product_id, product, selectedOptions);
      } else {
        await onAddToCartToggle(true, product.product_id, product);
      }
    } catch (err) {
      console.error(err);
    }
  }, [onAddToCartToggle]);
};

export default useAddToCart;
