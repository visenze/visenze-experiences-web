import type { Product, ProductSearchResponseSuccess, ProductType } from 'visearch-javascript-sdk';
import type { CroppedBox } from './types/box';
import type { ProcessedProduct } from './types/product';
import {FacetType, SortType} from './types/constants';
import type {WidgetConfig} from './visenze-core';

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

export const parseToProductTypes = (res: ProductSearchResponseSuccess): ProductType[] => {
  if (res.product_types?.length) {
    return res.product_types;
  } else if ('objects' in res) {
    const productTypes: ProductType[] = [];
    res.objects?.map((objResult) => {
      productTypes.push({
        box: objResult.box,
        attributes: objResult.attributes,
        score: objResult.score,
        type: objResult.type,
        box_type: '',
      });
    });
    return productTypes;
  }
  return [];
};

export const getSortTypeIntlId = (sortType: SortType): string => {
  switch (sortType) {
    case SortType.RELEVANCE:
      return 'sortType.relevance';
    case SortType.PRICE_HTL:
      return 'sortType.highToLowPrice';
    case SortType.PRICE_LTH:
      return 'sortType.lowToHighPrice';
    default:
      return '';
  }
};

export const getTitleCase = (text: string): string => {
  if (!text) return '';

  const textLowerCase = text.toLowerCase();
  return textLowerCase.charAt(0).toUpperCase() + textLowerCase.slice(1);
};

export const getFacets = (productDetails: WidgetConfig['displaySettings']['productDetails']): string[] => {
  const facets: string[] = [];
  Object.values(FacetType).forEach((facet) => {
    if (productDetails[facet]) {
      facets.push(productDetails[facet]);
    }
  });
  return facets;
};

export const getFacetNameByKey = (productDetails: WidgetConfig['displaySettings']['productDetails'], key: string): string => {
  let facetName = '';
  Object.entries(productDetails).find(([name, value]) => {
    if (value === key) {
      facetName = name;
    }
  });

  return facetName;
};

export const getFilterQueries = (productDetails: WidgetConfig['displaySettings']['productDetails'], filters: Record<FacetType, any>): string[] => {
  const filterQueries: string[] = [];
  const addQuotesToStrings = (inputSet: Set<string>): Set<string> => {
    const outputSet = new Set<string>();

    inputSet.forEach((str) => {
      if (str.includes(' ') || str.includes('-')) {
        outputSet.add(`"${str}"`);
      } else {
        outputSet.add(str);
      }
    });

    return outputSet;
  };

  if (filters.price.length > 0) {
    filterQueries.push(`${productDetails.price}:${filters.price[0]},${filters.price[1]}`);
  }
  if (filters.category.size > 0) {
    filterQueries.push(`${productDetails.category}:${Array.from(addQuotesToStrings(filters.category)).join(' OR ')}`);
  }
  if (filters.gender.size > 0) {
    filterQueries.push(`${productDetails.gender}:${Array.from(addQuotesToStrings(filters.gender)).join(' OR ')}`);
  }
  if (filters.brand.size > 0) {
    filterQueries.push(`${productDetails.brand}:${Array.from(addQuotesToStrings(filters.brand)).join(' OR ')}`);
  }
  if (filters.colors.size > 0) {
    filterQueries.push(`${productDetails.colors}:${Array.from(addQuotesToStrings(filters.colors)).join(' OR ')}`);
  }
  if (filters.sizes.size > 0) {
    filterQueries.push(`${productDetails.sizes}:${Array.from(addQuotesToStrings(filters.sizes)).join(' OR ')}`);
  }

  return filterQueries;
};
