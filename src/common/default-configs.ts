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
  customizations: {
    breakpoints: {
      mobile: {
        maxWidth: 767,
      },
      tablet: {
        // no tablet definition by default
        maxWidth: 0,
      },
    },
    productCard: {
      openLinksInNewTab: true,
      price: {
        show: true,
        font: {
          mobile: {
            size: 12,
            weight: 400,
          },
          tablet: {
            size: 12,
            weight: 400,
          },
          desktop: {
            size: 14,
            weight: 400,
          },
        },
        fontColor: '',
      },
      originalPrice: {
        show: true,
        font: {
          mobile: {
            size: 12,
            weight: 400,
          },
          tablet: {
            size: 12,
            weight: 400,
          },
          desktop: {
            size: 14,
            weight: 400,
          },
        },
        fontColor: '',
      },
      title: {
        show: true,
        fieldSource: 'title',
        font: {
          mobile: {
            size: 14,
            weight: 700,
          },
          tablet: {
            size: 14,
            weight: 700,
          },
          desktop: {
            size: 16,
            weight: 700,
          },
        },
      },
      secondaryTitle: {
        show: false,
        fieldSource: '',
        font: {
          mobile: {
            size: 12,
            weight: 400,
          },
          tablet: {
            size: 12,
            weight: 400,
          },
          desktop: {
            size: 14,
            weight: 400,
          },
        },
      },
      findSimilar: {
        enable: true,
        position: 'bottom_right',
        icon: {
          url: '',
          color: '',
        },
      },
    },
    buttons: {
      primary: {
        fontColor: '#FFFFFF',
        backgroundColor: '#616161',
      },
      secondary: {
        fontColor: '#FFFFFF',
        backgroundColor: '#000000',
      },
    },
    imageUpload: {
      enable: true,
      icon: {
        url: '',
        color: '',
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
    },
    customCss: '',
    generalLayout: {
      showWidgetTitle: true,
      headingFont: {
        mobile: {
          size: 20,
          weight: 400,
        },
        tablet: {
          size: 22,
          weight: 400,
        },
        desktop: {
          size: 24,
          weight: 400,
        },
      },
      bodyFont: {
        mobile: {
          size: 14,
          weight: 400,
        },
        tablet: {
          size: 14,
          weight: 400,
        },
        desktop: {
          size: 16,
          weight: 400,
        },
      },
      fontFamily: '',
      fontColor: '#000000',
      backgroundColor: '#FFFFFF',
      showViSenzeLogo: true,
    },
    popup: {
      position: 'center',
      triggerIcon: {
        url: '',
        color: '',
      },
    },
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
