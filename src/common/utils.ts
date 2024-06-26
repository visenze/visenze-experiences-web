import type { Product } from 'visearch-javascript-sdk';
import type { CroppedBox } from './types/box';
import type { ProcessedProduct } from './types/product';

export const getFlattenProduct = (result: Product): ProcessedProduct => {
  return {
    im_url: result.main_image_url,
    product_id: result.product_id,
    ...result.data,
  };
};

export const getFlattenProducts = (results: Product[] = []): ProcessedProduct[] => {
  return results.map((r) => getFlattenProduct(r));
};

export const flattenBox = (box: CroppedBox): number[] => {
  return [box.x1, box.y1, box.x2, box.y2];
};

export const parseBox = (box: CroppedBox | number[] | undefined | null): string => {
  if (!box) {
    return '';
  }

  if (Array.isArray(box)) {
    return box.join(',');
  }

  return flattenBox(box)
    .map((boxValue) => removeDecimalPlace(boxValue))
    .join(',');
};

const removeDecimalPlace = (value: number): string => {
  return value.toString().split('.')[0];
};

export const getURL = (
  productUrl: string | null | undefined,
  trackingMeta: Record<string, any>,
  isRecommendation: boolean,
): URL | null => {
  if (!productUrl) {
    return null;
  }
  const url = new URL(String(productUrl));
  // For recommendation widgets, we set the query ID, product ID, and position in the URL.
  // This allows other recommendation widgets on the page to use these values as the source for their tracking events.
  if (isRecommendation) {
    url.searchParams.set('vsFromReqId', trackingMeta.queryId);
    url.searchParams.set('vsFromPid', trackingMeta.pid);
    url.searchParams.set('vsFromPos', trackingMeta.pos);
  }
  return url;
};
