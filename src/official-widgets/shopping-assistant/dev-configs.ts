import type { RecursivePartial, WidgetConfig } from '../../common/wigmix-core';

const customCss = `
/* Insert the custom CSS here */
`;

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
   appKey: 'fe494a80881d401bbfa23e1581d17a2c',
    placementId: '6889',
    endpoint: 'https://search-dev.visenze.com', // staging search API (app created in the staging console)
    // cloud: 'aws', // only for production apps; leave unset for staging
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
    productCard: {
      addToCart: {
        enable: true,
        layout: 'ICON_TEXT',
        // Add-to-cart options (MC-3037). `field` is a productDetails key or a raw catalog field whose value is an array.
        // Fields with no values for a product are skipped, so unknown fields are harmless while testing.
        options: {
          enable: true,
          fields: [
            { field: 'sizes', label: 'Size', layout: 'CAROUSEL', callbackKey: 'size' },
            { field: 'attributes', label: 'Width', layout: 'RADIO', callbackKey: 'width' }, // catalog maps width → attributes
            { field: 'colors', label: 'Colour', layout: 'DROPDOWN', callbackKey: 'color' },
          ],
        },
      },
    },
  },
  callbacks: {
    trackingCallback: (action: string, params: Record<string, any>) => {
      console.log(`Successfully send event: ${action}`, params);
    },
    onAddToCartToggle: (_: boolean, pid: string, productDetails?: Record<string, any>, selectedOptions?: Record<string, string>) => {
      console.log('onAddToCartToggle', pid, selectedOptions, productDetails);
      return true;
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
