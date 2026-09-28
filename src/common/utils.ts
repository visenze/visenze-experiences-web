import type { CSSProperties } from 'react';
import type { Product, ProductSearchResponseSuccess, ProductType } from 'visearch-javascript-sdk';
import type { BestImage } from 'visearch-javascript-sdk/types/shared';
import { BEST_OUTFIT_IMAGE_SYS_ATTR, BEST_PRODUCT_IMAGE_SYS_ATTR } from './constants';
import type { CroppedBox } from './types/box';
import type { ProcessedProduct } from './types/product';
import { FacetType, type WidgetBreakpoint } from './types/constants';
import type { WidgetConfig } from './wigmix-core';

const SYS_ATTR_BY_TYPE = {
  product: BEST_PRODUCT_IMAGE_SYS_ATTR,
  outfit: BEST_OUTFIT_IMAGE_SYS_ATTR,
} as const;

// The old product-search-by-id API returns best images as a `best_images` array (via
// `show_best_product_images`), while MS APIs (multisearch/complementary/outfit recommendations)
// return them as `sys.best_prod_img_url` / `sys.best_outfit_img_url` (via `sys_attrs_to_get`,
// requested by getBestImageSysAttrsToGet below). Reading a sys key the request never asked for
// simply finds nothing, so this needs no gating on what was actually requested.
export const getBestImageUrl = (result: Product | undefined, type: 'product' | 'outfit'): string | undefined => {
  if (!result) {
    return undefined;
  }
  const fromBestImages = result.best_images?.find((bestImage) => bestImage.type === type)?.url;
  if (fromBestImages) {
    return fromBestImages;
  }
  const sysValue = result.sys?.[SYS_ATTR_BY_TYPE[type]];
  return typeof sysValue === 'string' ? sysValue : undefined;
};

const getBestImages = (result: Product): BestImage[] | undefined => {
  if (result.best_images?.length) {
    return result.best_images;
  }
  const bestImages: BestImage[] = [];
  const bestProductImageUrl = getBestImageUrl(result, 'product');
  if (bestProductImageUrl) {
    bestImages.push({ type: 'product', url: bestProductImageUrl, index: '' });
  }
  const bestOutfitImageUrl = getBestImageUrl(result, 'outfit');
  if (bestOutfitImageUrl) {
    bestImages.push({ type: 'outfit', url: bestOutfitImageUrl, index: '' });
  }
  return bestImages.length > 0 ? bestImages : undefined;
};

// MS request param: best_prod_img_url and best_outfit_img_url are each only requested when the
// widget is actually configured to display that image source, since no MS-based widget needs
// either otherwise.
export const getBestImageSysAttrsToGet = (customizations: WidgetConfig['customizations']): string => {
  const images = customizations.productCard?.images;
  const attrs: string[] = [];
  if (images?.mainImage === 'best_product' || images?.hoverImage === 'best_product') {
    attrs.push(BEST_PRODUCT_IMAGE_SYS_ATTR);
  }
  if (images?.mainImage === 'best_outfit' || images?.hoverImage === 'best_outfit') {
    attrs.push(BEST_OUTFIT_IMAGE_SYS_ATTR);
  }
  return attrs.join(',');
};

export const getFlattenProduct = (result: Product): ProcessedProduct => {
  return {
    im_url: result.main_image_url,
    product_id: result.product_id,
    best_images: getBestImages(result),
    ...result.data,
  };
};

export const getFlattenProducts = (results: Product[] = [], shouldDisplayAlternatives = false): ProcessedProduct[] => {
  if (!shouldDisplayAlternatives) {
    return results.map((r) => getFlattenProduct(r));
  }
  const maxNumOfAlternatives = results.map((r) => (r.alternatives || []).length).reduce((a, b) => Math.max(a, b), 0);
  if (maxNumOfAlternatives === 0) {
    return results.map((r) => getFlattenProduct(r));
  }
  const output: ProcessedProduct[] = [];
  // If there are alternatives, display the alternatives in the following order
  // Alt 1 of product 1, alt 1 of product 2, ..., alt 1 of product N,
  // Alt 2 of product 1, alt 2 of product 2, ..., alt 2 of product N,
  // ...
  // Alt M of product 1, alt M of product 2, ..., alt M of product N
  for (let i = 0; i < maxNumOfAlternatives; i += 1) {
    for (const r of results) {
      if (r.alternatives?.[i]) {
        output.push(getFlattenProduct(r.alternatives[i]));
      }
    }
  }
  return output;
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
  return Math.trunc(value).toString();
};

export const parseToProductTypes = (res: ProductSearchResponseSuccess): ProductType[] => {
  if (res.product_types?.length) {
    return res.product_types;
  } else if ('objects' in res && res.objects?.length) {
    return res.objects.map((objResult) => ({
      box: objResult.box,
      attributes: objResult.attributes,
      score: objResult.score,
      type: objResult.type,
      box_type: '',
    }));
  }
  return [];
};

export const getTitleCase = (text: string): string => {
  if (!text) {
    return '';
  }

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

export const getFacetNameByKey = (
  productDetails: WidgetConfig['displaySettings']['productDetails'],
  key: string,
): string => {
  const entry = Object.entries(productDetails).find(([, value]) => value === key);
  return entry?.[0] ?? '';
};

export const getFilterQueries = (
  productDetails: WidgetConfig['displaySettings']['productDetails'],
  filters: Record<FacetType, any>,
): string[] => {
  const filterQueries: string[] = [];
  const addQuotesToStrings = (inputSet: Set<string>): Set<string> => {
    const outputSet = new Set<string>();

    inputSet.forEach((str) => {
      outputSet.add(`"${str}"`);
    });

    return outputSet;
  };

  if (filters.price.length > 0) {
    filterQueries.push(`${productDetails['price']}:${filters.price[0]},${filters.price[1]}`);
  }
  if (filters.category.size > 0) {
    filterQueries.push(
      `${productDetails['category']}:${Array.from(addQuotesToStrings(filters.category)).join(' OR ')}`,
    );
  }
  if (filters.gender.size > 0) {
    filterQueries.push(`${productDetails['gender']}:${Array.from(addQuotesToStrings(filters.gender)).join(' OR ')}`);
  }
  if (filters.brand.size > 0) {
    filterQueries.push(`${productDetails['brand']}:${Array.from(addQuotesToStrings(filters.brand)).join(' OR ')}`);
  }
  if (filters.colors.size > 0) {
    filterQueries.push(`${productDetails['colors']}:${Array.from(addQuotesToStrings(filters.colors)).join(' OR ')}`);
  }
  if (filters.sizes.size > 0) {
    filterQueries.push(`${productDetails['sizes']}:${Array.from(addQuotesToStrings(filters.sizes)).join(' OR ')}`);
  }

  return filterQueries;
};

export const getProductGridCssClasses = (
  customizations: WidgetConfig['customizations'],
  breakpoint: WidgetBreakpoint,
  defaultCols: string,
  defaultGapX: string,
  defaultGapY: string,
): string => {
  const cssConfigSrc = customizations.productGrid?.[breakpoint];
  const classes = [];
  if (cssConfigSrc) {
    if (!cssConfigSrc.productsPerRow) {
      classes.push(defaultCols);
    }
    if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
      classes.push(defaultGapX);
    }
    if (!cssConfigSrc.marginVertical && cssConfigSrc.marginVertical !== 0) {
      classes.push(defaultGapY);
    }
    return classes.join(' ');
  }
  return [defaultCols, defaultGapX, defaultGapY].join(' ');
};

export const getProductGridCssConfig = (
  customizations: WidgetConfig['customizations'],
  breakpoint: WidgetBreakpoint,
): CSSProperties => {
  const cssConfig = {} as CSSProperties;
  const cssConfigSrc = customizations.productGrid?.[breakpoint];
  if (cssConfigSrc) {
    if (cssConfigSrc.productsPerRow) {
      cssConfig.gridTemplateColumns = `repeat(${cssConfigSrc.productsPerRow}, minmax(0, 1fr))`;
    }
    if (cssConfigSrc.marginVertical || cssConfigSrc.marginVertical === 0) {
      cssConfig.rowGap = `${cssConfigSrc.marginVertical}px`;
    }
    if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
      cssConfig.columnGap = `${cssConfigSrc.marginHorizontal}px`;
    }
  }
  return cssConfig;
};
