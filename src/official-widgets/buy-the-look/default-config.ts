import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Buy the look',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'Add to Cart',
  },
  es: {
    widgetTitle: 'Comprar la look',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'Agregar al carrito',
  },
  fr: {
    widgetTitle: 'Acheter la look',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'Ajouter au panier',
  },
  pt: {
    widgetTitle: 'Comprar a look',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'Adicionar ao carrinho',
  },
  de: {
    widgetTitle: 'Kämele',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'In den Warenkorb',
  },
  it: {
    widgetTitle: 'Acquista la look',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'Aggiungi al carrello',
  },
  pl: {
    widgetTitle: 'Kup ten zestaw',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'Dodaj do koszyka',
  },
  ko: {
    widgetTitle: '구매하기',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: '장바구니에 추가',
  },
  ja: {
    widgetTitle: '購入する',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'カートに追加',
  },
  th: {
    widgetTitle: 'ซื้อ',
    price: '{price}',
    originalPrice: '{originalPrice}',
    addToCart: 'เพิ่มสินค้าลงตะกร้า',
  },
};

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
      marginVertical: 8,
      marginHorizontal: 16,
    },
    desktop: {
      productsPerRow: 3,
      marginVertical: 8,
      marginHorizontal: 16,
    },
  },
  productCard: {
    imageAspectRatio: '2 / 3',
    openLinksInNewTab: false,
    price: {
      show: false,
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
      fontColorDark: '#EF4444',
    },
    originalPrice: {
      show: false,
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
      fontColorDark: '#9CA3AF',
      position: 'AFTER',
      strikethrough: true,
    },
    title: {
      show: false,
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
    addToWishlist: {
      enable: false,
      position: 'top_right',
      iconInactive: {
        color: '#000000',
        colorDark: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        backgroundColorDark: '#000000',
      },
      iconActive: {
        color: '#000000',
        colorDark: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        backgroundColorDark: '#000000',
      },
    },
    images: {
      mainImage: 'main',
      hoverImage: 'additional',
      showAlternatives: false,
    },
  },
  buttons: {
    primary: {
      fontColor: '#FFFFFF',
      fontColorDark: '#616161',
      backgroundColor: '#616161',
      backgroundColorDark: '#FFFFFF',
    },
    secondary: {
      fontColor: '#FFFFFF',
      fontColorDark: '#000000',
      backgroundColor: '#000000',
      backgroundColorDark: '#FFFFFF',
    },
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
    fontColorDark: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    backgroundColorDark: '#A9A9A9',
    showWidgetTitle: true,
    showViSenzeLogo: true,
    darkModeDefault: false,
  },
  popup: {
    position: 'center',
    triggerIcon: {
      layout: 'ICON',
      color: '#000000',
      colorDark: '#FFFFFF',
      backgroundColor: '#FFFFFF',
      backgroundColorDark: '#000000',
      hide: false,
    },
  },
};
