import type { ProductDetailField, WidgetClient, WidgetConfig } from '../visenze-core';
import { Actions } from '../types/tracking-constants';
import type { ResultLogic } from '../types/logic';
import type { ProcessedProduct } from '../types/product';
import { getURL } from '../utils';

interface ResultLogicProps {
  displaySettings: WidgetConfig['displaySettings'];
  productSearch: WidgetClient;
  trackingMeta: Record<string, any>;
  isRecommendation: boolean;
  index: number;
  onProductClick?: (result: ProcessedProduct, productTrackingMeta: Record<string, any>) => void;
  result: ProcessedProduct;
  isOpenInNewTab: boolean;
}

const ResultLogicImpl = ({
  displaySettings,
  productSearch,
  trackingMeta,
  isRecommendation,
  index,
  onProductClick,
  result,
  isOpenInNewTab,
}: ResultLogicProps): ResultLogic => {
  const placementId = productSearch.placementId;
  const getValue = (key: ProductDetailField): any => {
    return result[displaySettings.productDetails[key]];
  };

  const productTrackingMeta: Record<string, any> = {
    ...trackingMeta,
    pid: result.product_id,
    productUrl: getValue('productUrl'),
    pos: index + 1,
  };

  const onClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    localStorage.setItem(
      'visenze_widget_last_click',
      JSON.stringify({
        placement_id: placementId,
        queryId: productTrackingMeta.queryId,
      }),
    );
    localStorage.setItem(
      `visenze_last_click_query_id_${placementId}`,
      productTrackingMeta.queryId,
    );
    productSearch.sendEvent(Actions.PRODUCT_CLICK, productTrackingMeta);
    if (onProductClick && typeof onProductClick === 'function') {
      onProductClick(result, productTrackingMeta);
    } else {
      const url = getURL(getValue('productUrl'), productTrackingMeta, isRecommendation);
      if (isOpenInNewTab) {
        window.open(url?.href, '_blank');
      } else {
        window.open(url?.href, '_self');
      }
    }
  };

  return {
    productTrackingMeta,
    onClick,
  };
};

export default ResultLogicImpl;
