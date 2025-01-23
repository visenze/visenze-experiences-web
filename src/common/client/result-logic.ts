import type { WidgetClient, WidgetConfig } from '../visenze-core';
import { Actions } from '../types/tracking-constants';
import type { ResultLogic } from '../types/logic';
import type { ProcessedProduct } from '../types/product';
import { getURL } from '../utils';

interface ResultLogicProps {
  displaySettings: WidgetConfig['displaySettings'];
  widgetClient: WidgetClient;
  trackingMeta: Record<string, any>;
  isRecommendation: boolean;
  index: number;
  onProductClick?: (result: ProcessedProduct, productTrackingMeta: Record<string, any>) => void;
  result: ProcessedProduct;
  openLinksInNewTab: boolean;
}

const ResultLogicImpl = ({
  displaySettings,
  widgetClient,
  trackingMeta,
  isRecommendation,
  index,
  onProductClick,
  result,
  openLinksInNewTab,
}: ResultLogicProps): ResultLogic => {
  const placementId = widgetClient.placementId;

  const productTrackingMeta: Record<string, any> = {
    ...trackingMeta,
    pid: result.product_id,
    productUrl: result[displaySettings.productDetails['product_url']],
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
    widgetClient.sendEvent(Actions.PRODUCT_CLICK, productTrackingMeta);
    if (onProductClick && typeof onProductClick === 'function') {
      onProductClick(result, productTrackingMeta);
    } else {
      const url = getURL(result[displaySettings.productDetails['product_url']], productTrackingMeta, isRecommendation);
      if (openLinksInNewTab) {
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
