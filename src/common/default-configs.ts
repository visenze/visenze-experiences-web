import type { WidgetConfig } from './visenze-core';

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_CURRENCY = 'USD';

export const DEFAULT_CONFIGS: WidgetConfig = {
  // ----ViSearch SDK and tracking parameters---- //
  appSettings: {
    appKey: '', // APP_KEY - required
    placementId: '', // PLACEMENT_ID - required
    country: '', // 2 DIGIT COUNTRY CODE
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
      mainImageUrl: '',
      productUrl: '',
      title: '',
      price: '',
      originalPrice: '',
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
  customizations: {
    fonts: {
      mobile: {
        widgetTitle: {
          fontSize: 20,
          fontWeight: 400,
        },
        callsToActionText: {
          fontSize: 14,
          fontWeight: 400,
        },
        productCardTitle: {
          fontSize: 14,
          fontWeight: 700,
        },
        productCardSecondaryTitle: {
          fontSize: 12,
          fontWeight: 400,
        },
        productCardPrice: {
          fontSize: 12,
          fontWeight: 400,
        },
        productCardOriginalPrice: {
          fontSize: 12,
          fontWeight: 400,
        },
      },
      tablet: {
        widgetTitle: {
          fontSize: 22,
          fontWeight: 400,
        },
        callsToActionText: {
          fontSize: 14,
          fontWeight: 400,
        },
        productCardTitle: {
          fontSize: 14,
          fontWeight: 700,
        },
        productCardSecondaryTitle: {
          fontSize: 12,
          fontWeight: 400,
        },
        productCardPrice: {
          fontSize: 12,
          fontWeight: 400,
        },
        productCardOriginalPrice: {
          fontSize: 12,
          fontWeight: 400,
        },
      },
      desktop: {
        widgetTitle: {
          fontSize: 24,
          fontWeight: 400,
        },
        callsToActionText: {
          fontSize: 16,
          fontWeight: 400,
        },
        productCardTitle: {
          fontSize: 16,
          fontWeight: 700,
        },
        productCardSecondaryTitle: {
          fontSize: 14,
          fontWeight: 400,
        },
        productCardPrice: {
          fontSize: 14,
          fontWeight: 400,
        },
        productCardOriginalPrice: {
          fontSize: 14,
          fontWeight: 400,
        },
      },
    },
    colours: {
      text: {
        primary: '#000000',
        buttonPrimary: '#FFFFFF',
        buttonSecondary: '#FFFFFF',
      },
      background: {
        primary: '#FFFFFF',
        buttonPrimary: '#616161',
        buttonSecondary: '#000000',
      },
    },
    icons: {
      cameraButton: '',
      upload: '',
      moreLikeThis: '',
    },
    images: [
      {
        url: 'https://cdn.visenze.com/images/widget-1.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/images/widget-2.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/images/widget-3.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/images/widget-4.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/images/widget-5.jpg',
        label: '',
      },
    ],
    breakpoints: {
      mobile: {
        maxWidth: 767,
      },
      tablet: {
        // no tablet definition by default
        maxWidth: 0,
      },
    },
    productCards: {
      isOpenInNewTab: true,
      productPrice: {
        show: true,
      },
      productOriginalPrice: {
        show: true,
      },
      productTitle: {
        show: true,
        fieldSource: 'title',
      },
      productSecondaryTitle: {
        show: false,
        fieldSource: '',
      },
    },
    customCss: '',
  },
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
  searchBarResultsSettings: {
    enableImageUpload: true,
    enableFindSimilar: true,
    enableMultiSearch: true,
    redirectUrl: 'http://localhost:8080/',
  },
  hideTrigger: false,
  debugMode: false,
  disableAnalytics: false,
  maxRetryCount: 1,
  vttSource: '',
};
