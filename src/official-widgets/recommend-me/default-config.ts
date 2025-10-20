import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Alternate Picks',
    widgetDescription: 'Or type your own recommendation query below',
    searchBarButton: 'Show Me',
    searchBarPlaceholder: 'an outfit to go with this',
    similarItemsTabButton: 'Similar Items',
    outfitRecommendationsTabButton: 'Outfit Recommendations',
    systemError: 'Something went wrong. Please try again later.',
    imageOrQueryNotFound: 'The image or query was not found. Please try again later.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
  },
  es: {
    widgetTitle: 'Personaliza tus recomendaciones',
    searchBarButton: 'Recomiéndame',
    searchBarPlaceholder: 'un conjunto para combinar con esto',
    similarItemsTabButton: 'Artículos Similares',
    outfitRecommendationsTabButton: 'Recomendaciones para Outfits',
    systemError: 'Algo salió mal. Por favor, inténtelo más tarde.',
    imageOrQueryNotFound: 'La imagen o la consulta no se encontraron. Por favor, inténtelo más tarde.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
  },
  fr: {
    widgetTitle: 'Personnalisez vos recommandations',
    searchBarButton: 'Recommandez-moi',
    searchBarPlaceholder: 'une tenue pour aller avec ça',
    similarItemsTabButton: 'Articles Similaires',
    outfitRecommendationsTabButton: 'Recommandations pour Outfits',
    systemError: 'Une erreur est survenue. Veuillez réessayer plus tard.',
    imageOrQueryNotFound: 'L\'image ou la requête n\'a pas été trouvée. Veuillez réessayer plus tard.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
  },
  pt: {
    widgetTitle: 'Personalize suas recomendações',
    searchBarButton: 'Recomende-me',
    searchBarPlaceholder: 'uma roupa para combinar com isto',
    similarItemsTabButton: 'Artigos Semelhantes',
    outfitRecommendationsTabButton: 'Recomendações de Roupas',
    systemError: 'Algo deu errado. Por favor, tente novamente mais tarde.',
    imageOrQueryNotFound: 'A imagem ou a consulta não foi encontrada. Por favor, tente novamente mais tarde.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
  },
  de: {
    widgetTitle: 'Personalisiere deine Empfehlungen',
    searchBarButton: 'Empfiehl mir',
    searchBarPlaceholder: 'ein Outfit passend dazu',
    similarItemsTabButton: 'Ähnliche Artikel',
    outfitRecommendationsTabButton: 'Empfehlungen für Outfits',
    systemError: 'Etwas ist schief gelaufen. Bitte versuchen Sie es später erneut.',
    imageOrQueryNotFound: 'Die Bild oder die Abfrage wurde nicht gefunden. Bitte versuchen Sie es später erneut.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
  },
  it: {
    widgetTitle: 'Personalizza i tuoi suggerimenti',
    searchBarButton: 'Consigliami',
    searchBarPlaceholder: 'un outfit da abbinare a questo',
    similarItemsTabButton: 'Articoli Simili',
    outfitRecommendationsTabButton: 'Consigli per Outfit',
    systemError: 'Si è verificato un errore. Riprova più tardi.',
    imageOrQueryNotFound: 'L\'immagine o la query non sono state trovate. Riprova più tardi.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
  },
  pl: {
    widgetTitle: 'Spersonalizuj swoje rekomendacje',
    searchBarButton: 'Zarekomenduj mi',
    searchBarPlaceholder: 'stylizacja pasująca do tego',
    similarItemsTabButton: 'Artikli Podobne',
    outfitRecommendationsTabButton: 'Rekomendacje dla Outfitów',
    systemError: 'Wystąpił błąd. Spróbuj ponownie później.',
    imageOrQueryNotFound: 'Obraz lub zapytanie nie zostały znalezione. Spróbuj ponownie później.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
  },
  ko: {
    widgetTitle: '추천 맞춤 설정',
    searchBarButton: '추천해 주세요',
    searchBarPlaceholder: '이 상품에 어울리는 의상',
    similarItemsTabButton: '유사 상품',
    outfitRecommendationsTabButton: '추천 상품',
    systemError: '오류가 발생했습니다. 나중에 다시 시도해주세요.',
    imageOrQueryNotFound: '이미지 또는 쿼리가 찾을 수 없습니다. 나중에 다시 시도해주세요.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
  },
  ja: {
    widgetTitle: 'おすすめをパーソナライズ',
    searchBarButton: 'おすすめ',
    searchBarPlaceholder: 'これに合う服装',
    similarItemsTabButton: '類似商品',
    outfitRecommendationsTabButton: 'おすすめ商品',
    systemError: 'システムエラーが発生しました。後で再試してください。',
    imageOrQueryNotFound: '画像またはクエリが見つかりませんでした。後で再試してください。',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
  },
  th: {
    widgetTitle: 'ปรับแต่งคำแนะนำของคุณ',
    searchBarButton: 'แนะนำฉัน',
    searchBarPlaceholder: 'ชุดที่จะเข้ากับสิ่งนี้',
    similarItemsTabButton: 'สินค้าที่คล้ายกัน',
    outfitRecommendationsTabButton: 'แนะนำชุด',
    systemError: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
    imageOrQueryNotFound: 'ไม่พบภาพหรือคำค้น กรุณาลองอีกครั้ง',
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
    images: {
      mainImage: 'main',
      hoverImage: 'additional',
      showAlternatives: false,
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
    addToWishlist: {
      enable: false,
      position: 'top_right',
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
