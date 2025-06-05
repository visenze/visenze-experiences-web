import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Personalize your recommendations',
    searchBarButton: 'Recommend Me',
    searchBarPlaceholder: 'an outfit to go with this',
    resultLoading1: 'Searching the latest trends...',
    resultLoading2: 'Finding the perfect look...',
    resultLoading3: 'Almost there...',
    resultRendering: 'Here\'s what I found for you',
    resultCarouselTitle: 'Results for',
  },
  es: {
    widgetTitle: 'Personaliza tus recomendaciones',
    searchBarButton: 'Recomiéndame',
    searchBarPlaceholder: 'un conjunto para combinar con esto',
    resultLoading1: 'Buscando las últimas tendencias...',
    resultLoading2: 'Encontrando el look perfecto...',
    resultLoading3: 'Casi listo...',
    resultRendering: 'Esto es lo que encontré para ti',
    resultCarouselTitle: 'Resultados para',
  },
  fr: {
    widgetTitle: 'Personnalisez vos recommandations',
    searchBarButton: 'Recommandez-moi',
    searchBarPlaceholder: 'une tenue pour aller avec ça',
    resultLoading1: 'Recherche des dernières tendances...',
    resultLoading2: 'Trouver le look parfait...',
    resultLoading3: 'Presque là...',
    resultRendering: 'Voici ce que j\'ai trouvé pour vous',
    resultCarouselTitle: 'Résultats pour',
  },
  pt: {
    widgetTitle: 'Personalize suas recomendações',
    searchBarButton: 'Recomende-me',
    searchBarPlaceholder: 'uma roupa para combinar com isto',
    resultLoading1: 'Buscando as últimas tendências...',
    resultLoading2: 'Encontrando o look perfeito...',
    resultLoading3: 'Quase lá...',
    resultRendering: 'Isto é o que encontrei para você',
    resultCarouselTitle: 'Resultados para',
  },
  de: {
    widgetTitle: 'Personalisiere deine Empfehlungen',
    searchBarButton: 'Empfiehl mir',
    searchBarPlaceholder: 'ein Outfit passend dazu',
    resultLoading1: 'Suche nach den neuesten Trends...',
    resultLoading2: 'Finde den perfekten Look...',
    resultLoading3: 'Fast fertig...',
    resultRendering: 'Das habe ich für dich gefunden',
    resultCarouselTitle: 'Ergebnisse für',
  },
  it: {
    widgetTitle: 'Personalizza i tuoi suggerimenti',
    searchBarButton: 'Consigliami',
    searchBarPlaceholder: 'un outfit da abbinare a questo',
    resultLoading1: 'Ricerca delle ultime tendenze...',
    resultLoading2: 'Trovare il look perfetto...',
    resultLoading3: 'Quasi pronto...',
    resultRendering: 'Ecco cosa ho trovato per te',
    resultCarouselTitle: 'Risultati per',
  },
  ko: {
    widgetTitle: '추천 맞춤 설정',
    searchBarButton: '추천해 주세요',
    searchBarPlaceholder: '이 상품에 어울리는 의상',
    resultLoading1: '최신 트렌드 검색 중...',
    resultLoading2: '완벽한 스타일 찾는 중...',
    resultLoading3: '거의 다 왔어요...',
    resultRendering: '찾은 결과입니다',
    resultCarouselTitle: '검색 결과',
  },
  ja: {
    widgetTitle: 'おすすめをパーソナライズ',
    searchBarButton: 'おすすめ',
    searchBarPlaceholder: 'これに合う服装',
    resultLoading1: '最新トレンドを検索中...',
    resultLoading2: '完璧なルックを検索中...',
    resultLoading3: 'まもなく完了...',
    resultRendering: 'あなたへのおすすめはこちらです',
    resultCarouselTitle: '検索結果',
  },
  th: {
    widgetTitle: 'ปรับแต่งคำแนะนำของคุณ',
    searchBarButton: 'แนะนำฉัน',
    searchBarPlaceholder: 'ชุดที่จะเข้ากับสิ่งนี้',
    resultLoading1: 'กำลังค้นหาเทรนด์ล่าสุด...',
    resultLoading2: 'กำลังค้นหาสไตล์ที่สมบูรณ์แบบ...',
    resultLoading3: 'อีกไม่นาน...',
    resultRendering: 'นี่คือสิ่งที่ฉันพบสำหรับคุณ',
    resultCarouselTitle: 'ผลลัพธ์สำหรับ',
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
      marginHorizontal: 16,
      marginVertical: 0,
    },
    tablet: {
      productsPerRow: 3,
      marginHorizontal: 8,
      marginVertical: 0,
    },
    desktop: {
      productsPerRow: 3,
      marginHorizontal: 8,
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
    showViSenzeLogo: false,
    darkModeDefault: false,
  },
};
