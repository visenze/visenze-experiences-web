import type { WidgetConfig } from './wigmix-core';

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';

export const DEFAULT_CONFIGS: WidgetConfig = {
  appSettings: {
    appKey: '', // populated by widget-init API
    placementId: '', // populated by widget-init API
    endpoint: '', // populated by widget-init API
    // Set the values to very large numbers so that the full size of the image is returned.
    resizeSettings: {
      maxHeight: 100000,
      maxWidth: 100000,
    },
  },
  searchSettings: {
    limit: 20, // default number of results returned
  },
  trackingSettings: {},
  displaySettings: {
    cssSelector: '', // populated by widget-init API
    productDetails: {}, // populated by widget-init API
  },
  languageSettings: {
    locale: '',
    currency: '',
  },
  customizations: {} as any, // populated by each individual widget
  callbacks: {},
  disableAnalytics: false,
};
