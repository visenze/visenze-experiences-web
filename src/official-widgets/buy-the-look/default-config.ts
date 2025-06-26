import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Buy the look',
    errorDescription: 'Sorry, something went wrong',
    triggerCTA: 'Find Similar',
    addToCart: 'Add to Cart',
    seeSimilar: 'See Similar',
  },
  es: {
    widgetTitle: 'Comprar la look',
    errorDescription: 'Lo sentimos, algo salió mal',
    triggerCTA: 'Encontrar similares',
    addToCart: 'Agregar al carrito',
    seeSimilar: 'Ver similares',
  },
  fr: {
    widgetTitle: 'Acheter la look',
    errorDescription: 'Désolé, quelque chose s\'est mal passé',
    triggerCTA: 'Trouver Similaire',
    addToCart: 'Ajouter au panier',
    seeSimilar: 'Voir Similaires',
  },
  pt: {
    widgetTitle: 'Comprar a look',
    errorDescription: 'Desculpe, algo deu errado',
    triggerCTA: 'Encontrar Semelhantes',
    addToCart: 'Adicionar ao carrinho',
    seeSimilar: 'Ver Semelhantes',
  },
  de: {
    widgetTitle: 'Kämele',
    errorDescription: 'Entschuldigung, etwas ist schiefgelaufen',
    triggerCTA: 'Ähnliche finden',
    addToCart: 'In den Warenkorb',
    seeSimilar: 'Ähnliche sehen',
  },
  it: {
    widgetTitle: 'Acquista la look',
    errorDescription: 'Spiacenti, qualcosa è andato storto',
    triggerCTA: 'Trova simili',
    addToCart: 'Aggiungi al carrello',
    seeSimilar: 'Vedi simili',
  },
  ko: {
    widgetTitle: '구매하기',
    errorDescription: '죄송합니다. 오류가 발생했습니다',
    triggerCTA: '비슷한 상품 찾기',
    addToCart: '장바구니에 추가',
    seeSimilar: '비슷한 상품 보기',
  },
  ja: {
    widgetTitle: '購入する',
    errorDescription: '申し訳ありません。問題が発生しました',
    triggerCTA: '類似商品を検索',
    addToCart: 'カートに追加',
    seeSimilar: '類似商品を表示',
  },
  th: {
    widgetTitle: 'ซื้อ',
    errorDescription: 'ขออภัย เกิดข้อผิดพลาดบางอย่าง',
    triggerCTA: 'ค้นหาสินค้าที่คล้ายกัน',
    addToCart: 'เพิ่มสินค้าลงตะกร้า',
    seeSimilar: 'ดูสินค้าคล้ายกัน',
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
      enable: true,
      position: 'top_right',
      iconInactive: {
        color: '#FFFFFF',
        colorDark: '#000000',
        backgroundColor: '#000000',
        backgroundColorDark: '#FFFFFF',
      },
      iconActive: {
        color: '#FFFFFF',
        colorDark: '#000000',
        backgroundColor: '#000000',
        backgroundColorDark: '#FFFFFF',
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
    backgroundColorDark: '#000000',
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
