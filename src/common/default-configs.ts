import type { WidgetConfig } from './visenze-core';

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';

export const DEFAULT_CONFIGS: WidgetConfig = {
  // ----ViSearch SDK and tracking parameters---- //
  appSettings: {
    appKey: '', // APP_KEY - required
    placementId: '', // PLACEMENT_ID - required
    uid: '', // UID,
    endpoint: '',
    gtmTracking: false, // If true, the widget will push result_load event to GTM objects
    // The visearch SDK by default resize image uploaded to 512 x 512
    // To change the max dimension of image, fill this params with {maxWidth: ${width value in px}, maxHeight: ${height value in px}}
    // eg: resizeSettings: {maxWidth: 1024, maxHeight: 1024},
    resizeSettings: {
      maxHeight: 100000,
      maxWidth: 100000,
    },
  },
  // ----API additional parameters---- //
  searchSettings: {
    // Mapped metadata keys to be returned
    // eg: attrs_to_get: ['product_name', 'link' ,'sale_price', 'brand_name', 'merchant_category'],
    attrs_to_get: [],
    limit: 20, // The number of results returned
  },
  // ----Visual settings---- //
  displaySettings: {
    cssSelector: '',
    // Field mapping for Product Card. Fields are based on the schema, you can't give a field which doesn't exist in the schema.
    productDetails: {
      main_image_url: '',
      product_url: '',
      title: '',
      price: '',
      original_price: '',
      category: '',
      brand: '',
      gender: '',
      sizes: '',
      colors: '',
    },
  },
  // ----Language settings---- //
  languageSettings: {
    locale: '',
    currency: '',
  },
  customizations: {} as any, // this will be populated in each individual widget
  // ----Callback settings---- //
  callbacks: {
    // This will fire whenever an event is sent to ViSenze Analytics, or when `send` is called
    // trackingCallback: (action, params) => {},
    // @param {action} the action that is being recorded
    // @param {params} the attached metadata related to the action
    trackingCallback: undefined,
    // This will fire whenever an event is sent to ViSenze Analytics, or when `send` is called
    // onProductClick: (productDetails, trackingData) => {},
    // @param {productDetails} the details of the product
    // @param {trackingData} relevant metadata attached to the action
    onProductClick: undefined,
    // This will fire whenever response from a search API call returned
    // onSearchCallback: (apiResponse) => {},
    // @param {apiResponse} response from visearch API
    onSearchCallback: undefined,
  },
  hideTrigger: false,
  disableAnalytics: false,
  maxRetryCount: 1,
};
