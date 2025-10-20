import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'You may also like',
    showMore: 'Show More',
    showLess: 'Show Less',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
  },
  es: {
    widgetTitle: 'También te puede gustar',
    showMore: 'Mostrar Mas',
    showLess: 'Mostrar Menos',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
  },
  fr: {
    widgetTitle: 'Vous aimerez peut-être aussi',
    showMore: 'Plus de produits',
    showLess: 'Moins de produits',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
  },
  pt: {
    widgetTitle: 'Você também pode gostar',
    showMore: 'Mostrar Mais',
    showLess: 'Mostrar Menos',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
  },
  de: {
    widgetTitle: 'Das könnte dir auch gefallen',
    showMore: 'Weitere Produkte',
    showLess: 'Weniger Produkte',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
  },
  it: {
    widgetTitle: 'Potrebbe piacerti anche',
    showMore: 'Mostra più prodotti',
    showLess: 'Mostra meno prodotti',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
  },
  pl: {
    widgetTitle: 'Może Ci się spodobać',
    showMore: 'Więcej produktów',
    showLess: 'Mniej produktów',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
  },
  ko: {
    widgetTitle: '이 상품도 좋아하실 거예요',
    showMore: '더보기',
    showLess: '닫기',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
  },
  ja: {
    widgetTitle: 'こちらもおすすめです',
    showMore: 'もっと見る',
    showLess: '閉じる',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
  },
  th: {
    widgetTitle: 'คุณอาจจะชอบสิ่งนี้ด้วย',
    showMore: 'ดูเพิ่มเติม',
    showLess: 'ปิด',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: 'ลดราคา {discount}',
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
      marginVertical: 8,
    },
    tablet: {
      productsPerRow: 4,
      marginHorizontal: 16,
      marginVertical: 16,
    },
    desktop: {
      productsPerRow: 6,
      marginHorizontal: 16,
      marginVertical: 16,
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
      show: true,
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
