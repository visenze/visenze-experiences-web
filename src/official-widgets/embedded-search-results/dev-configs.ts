import type { RecursivePartial, WidgetConfig } from '../../common/visenze-core';

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
    appKey: '',
    placementId: '',
    endpoint: '',
  },
  searchSettings: {
    attrs_to_get: [],
    facets_limit: 10,
    limit: 20,
  },
  displaySettings: {
    cssSelector: '.embedded-search-results-widget',
    productDetails: {
      mainImageUrl: '',
      productUrl: '',
      title: '',
      price: '',
      originalPrice: '',
    },
  },
  callbacks: {
    trackingCallback: (action: string, params: Record<string, any>) => {
      console.log(`Successfully send event: ${action}`, params);
    },
  },
};

// Update according to your catalog's field mappings
export const devFieldMappings: Record<string, string> = {
  main_image_url: 'main_image_url',
  product_url: 'product_url',
  title: 'title',
  price: 'price',
  original_price: 'original_price',
  category: 'category',
};
