import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'You may also like',
    searchBarButton: 'Show Me',
    searchBarPlaceholder: 'Type here to refine your results...',
    errorDescription: 'Sorry, something went wrong',
    back: 'Back',
    triggerCTA: 'Find Similar',
    similarProductButton: 'Similar Products',
  },
  es: {
    widgetTitle: 'También te puede gustar',
    searchBarButton: 'Mostrarme',
    searchBarPlaceholder: 'Escribe aquí para refinar tus resultados...',
    errorDescription: 'Lo sentimos, algo salió mal',
    back: 'Atrás',
    triggerCTA: 'Encontrar similares',
    similarProductButton: 'Productos similares',
  },
  fr: {
    widgetTitle: 'Vous aimerez peut-être aussi',
    searchBarButton: 'Montrer-moi',
    searchBarPlaceholder: 'Tapez ici pour affiner vos résultats...',
    errorDescription: 'Désolé, quelque chose s\'est mal passé',
    back: 'Retour',
    triggerCTA: 'Trouver Similaire',
    similarProductButton: 'Produits similaires',
  },
  pt: {
    widgetTitle: 'Você também pode gostar',
    searchBarButton: 'Mostrar-me',
    searchBarPlaceholder: 'Digite aqui para refinar seus resultados...',
    errorDescription: 'Desculpe, algo deu errado',
    back: 'Voltar',
    triggerCTA: 'Encontrar Semelhantes',
    similarProductButton: 'Produtos Semelhantes',
  },
  de: {
    widgetTitle: 'Das könnte dir auch gefallen',
    searchBarButton: 'Zeige mir',
    searchBarPlaceholder: 'Gib hier ein, um deine Ergebnisse zu verfeinern...',
    errorDescription: 'Entschuldigung, etwas ist schiefgelaufen',
    back: 'Zurück',
    triggerCTA: 'Ähnliche finden',
    similarProductButton: 'Ähnliche Produkte',
  },
  it: {
    widgetTitle: 'Potrebbe piacerti anche',
    searchBarButton: 'Mostra-mi',
    searchBarPlaceholder: 'Digita qui per affinare i tuoi risultati...',
    errorDescription: 'Spiacenti, qualcosa è andato storto',
    back: 'Indietro',
    triggerCTA: 'Trova simili',
    similarProductButton: 'Prodotti Simili',
  },
  pl: {
    widgetTitle: 'Może Ci się spodobać',
    searchBarButton: 'Pokaż mi',
    searchBarPlaceholder: 'Wpisz tutaj, aby doprecyzować wyniki...',
    errorDescription: 'Przepraszamy, coś poszło nie tak',
    back: 'Wstecz',
    triggerCTA: 'Znajdź podobne',
    similarProductButton: 'Produkty Podobne',
  },
  ko: {
    widgetTitle: '이 상품도 좋아하실 거예요',
    searchBarButton: '보여줘',
    searchBarPlaceholder: '결과를 구체화하려면 여기에 입력하세요...',
    errorDescription: '죄송합니다. 오류가 발생했습니다',
    back: '뒤로',
    triggerCTA: '비슷한 상품 찾기',
    similarProductButton: '비슷한 상품 찾기',
  },
  ja: {
    widgetTitle: 'こちらもおすすめです',
    searchBarButton: '表示する',
    searchBarPlaceholder: '検索結果を絞り込むには、ここに टाइपしてください...',
    errorDescription: '申し訳ありません。問題が発生しました',
    back: '戻る',
    triggerCTA: '類似商品を検索',
    similarProductButton: '類似商品を検索',
  },
  th: {
    widgetTitle: 'คุณอาจจะชอบสิ่งนี้ด้วย',
    searchBarButton: 'แสดงให้เห็น',
    searchBarPlaceholder: 'พิมพ์ที่นี่เพื่อปรับแต่งผลลัพธ์ของคุณ...',
    errorDescription: 'ขออภัย เกิดข้อผิดพลาดบางอย่าง',
    back: 'กลับ',
    triggerCTA: 'ค้นหาสินค้าที่คล้ายกัน',
    similarProductButton: 'ค้นหาสินค้าที่คล้ายกัน',
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
      marginVertical: 8,
      marginHorizontal: 16,
    },
    tablet: {
      productsPerRow: 4,
      marginVertical: 12,
      marginHorizontal: 8,
    },
    desktop: {
      productsPerRow: 2,
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
      iconActive: {
        color: '#000000',
        colorDark: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        backgroundColorDark: '#000000',
      },
      iconInactive: {
        color: '#000000',
        colorDark: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        backgroundColorDark: '#000000',
      },
    },
    findSimilar: {
      enable: false,
      position: 'bottom_right',
      icon: {
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
      fontColor: '#3d5385',
      fontColorDark: '#000000',
      backgroundColor: '#e8efff',
      backgroundColorDark: '#FFFFFF',
    },
    secondary: {
      fontColor: '#3d5385',
      fontColorDark: '#000000',
      backgroundColor: '#f7f9fc',
      backgroundColorDark: '#AAAAAA',
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
