import type { WidgetConfig } from '../../common/wigmix-core';

export const DEFAULT_CUSTOMIZATIONS: WidgetConfig['customizations'] = {
  breakpoints: {
    mobile: {
      maxWidth: 767,
    },
    tablet: {
      maxWidth: 1023,
    },
  },
  productGrid: {
    mobile: {
      productsPerRow: 2,
      marginVertical: 8,
      marginHorizontal: 16,
    },
    tablet: {
      productsPerRow: 3,
      marginVertical: 12,
      marginHorizontal: 8,
    },
    desktop: {
      productsPerRow: 3,
      marginVertical: 12,
      marginHorizontal: 8,
    },
  },
  productCard: {
    openLinksInNewTab: false,
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
      fontColor: '#EF4444',
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
      fontColor: '#9CA3AF',
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
      fieldSource: 'brand',
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
        color: '#000000',
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
      color: '#929292',
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
      }],
  },
  generalLayout: {
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
    showWidgetTitle: true,
    showViSenzeLogo: true,
  },
  popup: {
    position: 'center',
    triggerIcon: {
      color: '#000000',
      hide: false,
    },
  },
};
