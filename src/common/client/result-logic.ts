import type { WidgetClient, WidgetConfig } from '../wigmix-core';
import { Actions } from '../types/tracking-constants';
import type { ResultLogic } from '../types/logic';
import type { ProcessedProduct } from '../types/product';

interface ResultLogicProps {
  displaySettings: WidgetConfig['displaySettings'];
  widgetClient: WidgetClient;
  trackingMeta: Record<string, any>;
  index: number;
  onProductClick?: (result: ProcessedProduct, productTrackingMeta: Record<string, any>, productUrl: string) => void;
  result: ProcessedProduct;
}

const ResultLogicImpl = ({
  displaySettings,
  widgetClient,
  trackingMeta,
  index,
  onProductClick,
  result,
}: ResultLogicProps): ResultLogic => {
  const placementId = widgetClient.placementId;

  const productTrackingMeta: Record<string, any> = {
    ...trackingMeta,
    pid: result.product_id,
    productUrl: result[displaySettings.productDetails['product_url']],
    pos: index + 1,
  };

  const onClick = (event: any, productUrl: string): void => {
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
    widgetClient.sendEvent(Actions.PRODUCT_CLICK, productTrackingMeta);
    if (onProductClick && typeof onProductClick === 'function') {
      event.stopPropagation();
      event.preventDefault();
      onProductClick(result, productTrackingMeta, productUrl);
    }
  };

  return {
    productTrackingMeta,
    onClick,
  };
};

export default ResultLogicImpl;
