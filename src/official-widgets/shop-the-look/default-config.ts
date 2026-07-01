import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'You may also like',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
    addToCart: 'Add to Cart',
  },
  es: {
    widgetTitle: 'También te puede gustar',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
    addToCart: 'Agregar al carrito',
  },
  fr: {
    widgetTitle: 'Vous aimerez peut-être aussi',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
    addToCart: 'Ajouter au panier',
  },
  pt: {
    widgetTitle: 'Você também pode gostar',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
    addToCart: 'Adicionar ao carrinho',
  },
  de: {
    widgetTitle: 'Das könnte dir auch gefallen',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
    addToCart: 'In den Warenkorb',
  },
  it: {
    widgetTitle: 'Potrebbe piacerti anche',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
    addToCart: 'Aggiungi al carrello',
  },
  pl: {
    widgetTitle: 'Może Ci się spodobać',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
    addToCart: 'Dodaj do koszyka',
  },
  ko: {
    widgetTitle: '이 상품도 좋아하실 거예요',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
    addToCart: '장바구니에 추가',
  },
  ja: {
    widgetTitle: 'こちらもおすすめです',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
    addToCart: 'カートに追加',
  },
  th: {
    widgetTitle: 'คุณอาจจะชอบสิ่งนี้ด้วย',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: 'ลดราคา {discount}',
    addToCart: 'เพิ่มสินค้าลงตะกร้า',
  },
  zh: {
    widgetTitle: '您可能也喜欢',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 折扣',
    addToCart: '加入购物车',
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
      productsPerRow: 3,
      marginHorizontal: 8,
      marginVertical: 0,
    },
    tablet: {
      productsPerRow: 4,
      marginHorizontal: 16,
      marginVertical: 0,
    },
    desktop: {
      productsPerRow: 4,
      marginHorizontal: 16,
      marginVertical: 0,
    },
  },
  productCard: {
    imageAspectRatio: '2 / 3',
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
      fontColorDark: '#EF4444',
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
      fontColorDark: '#9CA3AF',
      position: 'AFTER',
      strikethrough: true,
    },
    discount: {
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
      showPercentage: true,
      rounding: 1,
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
    addToCart: {
      enable: false,
      color: '#FFFFFF',
      colorDark: '#000000',
      backgroundColor: '#000000',
      backgroundColorDark: '#FFFFFF',
      layout: 'ICON_TEXT',
    },
    images: {
      mainImage: 'main',
      hoverImage: 'additional',
      showAlternatives: false,
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
    backgroundColorDark: '#000000',
    showWidgetTitle: true,
    showViSenzeLogo: false,
    darkModeDefault: false,
  },
};
