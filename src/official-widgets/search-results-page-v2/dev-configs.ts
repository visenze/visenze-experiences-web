import type { RecursivePartial, WidgetConfig } from '../../common/wigmix-core';

const customCss = `
/* Insert the custom CSS here */
`;

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
    appKey: '9efd32e47f6d4702970da940b2f6a01e',
    placementId: '5138',
    endpoint: '',
  },
  displaySettings: {
    cssSelector: '.search-results-page-v2-widget',
    productDetails: {},
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

// Set to true to retrieve the fields mappings from the backend.
// If this is set to true, the subsequent devFieldMappings variable needs not be set.
export const shouldRetrieveFieldsMapping = true;

// Update according to your catalog's field mappings
export const devFieldMappings: Record<string, string> = {
  main_image_url: 'main_image_url',
  product_url: 'product_url',
  title: 'title',
  price: 'price',
  original_price: 'original_price',
};
