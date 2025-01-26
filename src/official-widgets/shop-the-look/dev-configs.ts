import type { RecursivePartial, WidgetConfig } from '../../common/visenze-core';

const customCss = `
/* Insert the custom CSS here */
`;

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
    appKey: '',
    placementId: '',
    endpoint: '',
  },
  searchSettings: {
    facets_limit: 10,
    limit: 20,
  },
  displaySettings: {
    cssSelector: '.shop-the-look-widget',
    productDetails: {
      mainImageUrl: '',
      productUrl: '',
      title: '',
      price: '',
      originalPrice: '',
    },
  },
  customizations: {
    customCss,
  },
  callbacks: {
    trackingCallback: (action: string, params: Record<string, any>) => {
      console.log(`Successfully send event: ${action}`, params);
    },
  },
  disableAnalytics: true,
};

// Update according to your catalog's field mappings
export const devFieldMappings: Record<string, string> = {
  main_image_url: 'main_image_url',
  product_url: 'product_url',
  title: 'title',
  price: 'price',
  original_price: 'original_price',
};
