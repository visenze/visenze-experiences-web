import type { CSSProperties } from 'react';
import type { Product, ProductSearchResponseSuccess, ProductType } from 'visearch-javascript-sdk';
import type { CroppedBox } from './types/box';
import type { ProcessedProduct } from './types/product';
import { FacetType, type WidgetBreakpoint } from './types/constants';
import type { WidgetConfig } from './wigmix-core';

export const getFlattenProduct = (result: Product): ProcessedProduct => {
  return {
    im_url: result.best_images?.length ? result.best_images[0].url : result.main_image_url,
    product_id: result.product_id,
    ...result.data,
  };
};

// TODO add this field to visearch-javascript-sdk
interface ProductWithAlternatives extends Product {
  alternatives?: Product[];
}

export const getFlattenProducts = (results: Product[] = []): ProcessedProduct[] => {
  const maxNumOfAlternatives = results.map((r) => ((r as ProductWithAlternatives).alternatives || []).length)
      .reduce((a, b) => Math.max(a, b), 0);
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
      const rWithAlternatives = r as ProductWithAlternatives;
      if (rWithAlternatives.alternatives?.[i]) {
        output.push(getFlattenProduct(rWithAlternatives.alternatives[i]));
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
  return value.toString().split('.')[0];
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
      outputSet.add(`"${str}"`);
    });

    return outputSet;
  };

  if (filters.price.length > 0) {
    filterQueries.push(`${productDetails['price']}:${filters.price[0]},${filters.price[1]}`);
  }
  if (filters.category.size > 0) {
    filterQueries.push(`${productDetails['category']}:${Array.from(addQuotesToStrings(filters.category)).join(' OR ')}`);
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
