import type { RecursivePartial, WidgetConfig } from '../../common/wigmix-core';

const customCss = `
/* Insert the custom CSS here */
`;

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
    appKey: '',
    placementId: '',
    endpoint: '',
    cloud: 'aws', // remove this if you are testing in staging environment
  },
  displaySettings: {
    cssSelector: '.ai-search-launcher-widget',
    productDetails: {},
  },
  customizations: {
    customCss,
    chat: {
      layout: 'splitlayout',
      voiceGreetingEnabled: true, // enable to exercise the voice-greeting path locally
      startMuted: false,
      // voiceEnabled: false, // set false to hide all voice UI (footer mic button, mute toggle) and stop voice requests
      // cameraEntryEnabled: false, // set false to hide the top entry-bar image-search button
      // micEntryEnabled: false, // set false to hide the top entry-bar mic-search button
      // askAiEntryEnabled: false, // set false to hide the top entry-bar "Ask AI" button
      // chatCameraEnabled: false, // set false to hide the in-chat footer's inline camera-capture button
    },
    // Populate to exercise the preset image gallery on the image entry welcome screen locally.
    // imageUpload: {
    //   enable: true,
    //   icon: { color: '#000000', colorDark: '#FFFFFF' },
    //   images: [
    //     { url: 'https://cdn.visenze.com/images/sample-product-1.jpg', label: 'Dress' },
    //     { url: 'https://cdn.visenze.com/images/sample-product-2.jpg', label: 'Shoes' },
    //     { url: 'https://cdn.visenze.com/images/sample-product-3.jpg', label: 'Bag' },
    //   ],
    // },
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
