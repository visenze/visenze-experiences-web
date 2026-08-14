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
    cssSelector: '.shopping-assistant-widget',
    productDetails: {},
  },
  customizations: {
    customCss,
    chatbot: {
      voiceEnabled: false, // enable to test voice input/output locally (backend resolves the voice provider credential)
      // voiceId: '', // voice-provider voice ID; leave unset to use the widget's built-in voice
      // voiceModelId: '', // voice-provider model ID; leave unset to use the widget's built-in model
      // voiceSettings: { stability: 0.5, similarityBoost: 0.75 }, // leave unset to use the widget's built-in settings
    },
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
