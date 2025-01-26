import type { WidgetConfig } from './visenze-core';

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';

export const DEFAULT_CONFIGS: WidgetConfig = {
  appSettings: {
    appKey: '', // populated by widget-init API
    placementId: '', // populated by widget-init API
    uid: '',
    endpoint: '', // populated by widget-init API
    gtmTracking: false,
    // The visearch SDK by default resize image uploaded to 512 x 512
    // To change the max dimension of image, fill this params with {maxWidth: ${width value in px}, maxHeight: ${height value in px}}
    // eg: resizeSettings: {maxWidth: 1024, maxHeight: 1024},
    resizeSettings: {
      maxHeight: 100000,
      maxWidth: 100000,
    },
  },
  searchSettings: {
    limit: 20, // default number of results returned
  },
  displaySettings: {
    cssSelector: '', // populated by widget-init API
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
  languageSettings: {
    locale: '',
    currency: '',
  },
  customizations: {} as any, // populated by each individual widget
  callbacks: {},
  disableAnalytics: false,
};
