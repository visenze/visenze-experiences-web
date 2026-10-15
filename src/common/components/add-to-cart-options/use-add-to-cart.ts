import { useCallback, useContext } from 'react';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import { Actions } from '../../types/tracking-constants';

export type AddToCartHandler = (
  product: ProcessedProduct,
  trackingMeta: Record<string, any>,
  selectedOptions?: Record<string, string>,
) => Promise<void>;

// Calls the host's onAddToCartToggle callback and sends the add_to_cart tracking event (only when
// a callback is defined, since nothing is added to cart otherwise).
// Errors thrown by the callback are logged rather than propagated, so callers can always reset
// their loading state.
const useAddToCart = (): AddToCartHandler => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { onAddToCartToggle } = widgetConfig.callbacks;

  return useCallback(async (product, trackingMeta, selectedOptions) => {
    if (!onAddToCartToggle) {
      return;
    }
    // Options first, so an option key (e.g. a callbackKey of `pid`) can never overwrite a tracking param.
    widgetClient.sendEvent(Actions.ADD_TO_CART, { ...selectedOptions, ...trackingMeta, pid: product.product_id });
    try {
      if (selectedOptions) {
        await onAddToCartToggle(true, product.product_id, product, selectedOptions);
      } else {
        await onAddToCartToggle(true, product.product_id, product);
      }
    } catch (err) {
      console.error(err);
    }
  }, [widgetClient, onAddToCartToggle]);
};

export default useAddToCart;
