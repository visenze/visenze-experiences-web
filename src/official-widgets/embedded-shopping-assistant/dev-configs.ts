import type { RecursivePartial, WidgetConfig } from '../../common/wigmix-core';

const customCss = `
/* Insert the custom CSS here */
`;

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
    appKey: '7a8c2735fa6f4175a9a9723ec0ba6653',
    placementId: '10953',
    endpoint: '',
    cloud: 'aws',
  },
  displaySettings: {
    cssSelector: '.embedded-shopping-assistant-widget',
    productDetails: {},
  },
  customizations: {
    customCss,
  },
  callbacks: {
    trackingCallback: (action: string, params: Record<string, any>) => {
      console.warn(`Successfully send event: ${action}`, params);
    },
  },
  disableAnalytics: true,
};

// Set to true to retrieve field mappings from the backend (requires a valid appKey).
// Leave false when testing with mock data — no credentials needed.
export const shouldRetrieveFieldsMapping = false;

// Update according to your catalog's field mappings
export const devFieldMappings: Record<string, string> = {
  main_image_url: 'main_image_url',
  product_url: 'product_url',
  title: 'title',
  price: 'price',
  original_price: 'original_price',
};
