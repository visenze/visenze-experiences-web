import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'You may also like',
    searchBarPlaceholder: 'Type here to refine your results...',
    previousViews: 'Searches',
    errorDescription: 'Sorry, something went wrong',
    back: 'Back',
    triggerCTA: 'Find Similar',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
  },
  es: {
    widgetTitle: 'También te puede gustar',
    searchBarPlaceholder: 'Escribe aquí para refinar tus resultados...',
    previousViews: 'Buscas',
    errorDescription: 'Lo sentimos, algo salió mal',
    back: 'Atrás',
    triggerCTA: 'Encontrar similares',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
  },
  fr: {
    widgetTitle: 'Vous aimerez peut-être aussi',
    searchBarPlaceholder: 'Tapez ici pour affiner vos résultats...',
    previousViews: 'Recherches',
    errorDescription: 'Désolé, quelque chose s\'est mal passé',
    back: 'Retour',
    triggerCTA: 'Trouver Similaire',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
  },
  pt: {
    widgetTitle: 'Você também pode gostar',
    searchBarPlaceholder: 'Digite aqui para refinar seus resultados...',
    previousViews: 'Pesquisas',
    errorDescription: 'Desculpe, algo deu errado',
    back: 'Voltar',
    triggerCTA: 'Encontrar Semelhantes',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
  },
  de: {
    widgetTitle: 'Das könnte dir auch gefallen',
    searchBarPlaceholder: 'Gib hier ein, um deine Ergebnisse zu verfeinern...',
    previousViews: 'Suchen',
    errorDescription: 'Entschuldigung, etwas ist schiefgelaufen',
    back: 'Zurück',
    triggerCTA: 'Ähnliche finden',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
  },
  it: {
    widgetTitle: 'Potrebbe piacerti anche',
    searchBarPlaceholder: 'Digita qui per affinare i tuoi risultati...',
    previousViews: 'Cerca',
    errorDescription: 'Spiacenti, qualcosa è andato storto',
    back: 'Indietro',
    triggerCTA: 'Trova simili',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
  },
  pl: {
    widgetTitle: 'Może Ci się spodobać',
    searchBarPlaceholder: 'Wpisz tutaj, aby doprecyzować wyniki...',
    previousViews: 'Wyszukiwania',
    errorDescription: 'Przepraszamy, coś poszło nie tak',
    back: 'Wstecz',
    triggerCTA: 'Znajdź podobne',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
  },
  ko: {
    widgetTitle: '이 상품도 좋아하실 거예요',
    searchBarPlaceholder: '결과를 구체화하려면 여기에 입력하세요...',
    previousViews: '검색',
    errorDescription: '죄송합니다. 오류가 발생했습니다',
    back: '뒤로',
    triggerCTA: '비슷한 상품 찾기',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
  },
  ja: {
    widgetTitle: 'こちらもおすすめです',
    searchBarPlaceholder: '検索結果を絞り込むには、ここに टाइपしてください...',
    previousViews: '検索',
    errorDescription: '申し訳ありません。問題が発生しました',
    back: '戻る',
    triggerCTA: '類似商品を検索',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
  },
  th: {
    widgetTitle: 'คุณอาจจะชอบสิ่งนี้ด้วย',
    searchBarPlaceholder: 'พิมพ์ที่นี่เพื่อปรับแต่งผลลัพธ์ของคุณ...',
    previousViews: 'การค้นหา',
    errorDescription: 'ขออภัย เกิดข้อผิดพลาดบางอย่าง',
    back: 'กลับ',
    triggerCTA: 'ค้นหาสินค้าที่คล้ายกัน',
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
        colorDark: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        backgroundColorDark: '#000000',
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
    position: 'right',
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
