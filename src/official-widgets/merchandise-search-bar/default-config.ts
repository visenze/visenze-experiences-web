import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    searchBarPlaceholder: 'What are you looking for?',
    uploadScreenTitle: 'SHOW US WHAT YOU\'RE LOOKING FOR',
    dragImageToSearch: 'drag an image to search or click to browse',
    tapToSearchImage: 'tap here to search an image',
    imageUploadTitle: 'Search by Image',
    suggestions: 'Suggestions',
    popularChoices: 'Popular Choices',
    trending: 'Trending',
    errorMessage: 'You have entered an invalid query or image, please try again.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
  },
  es: {
    searchBarPlaceholder: '¿Qué estás buscando?',
    uploadScreenTitle: 'MUESTRANOS QUÉ ESTÁS BUSCANDO',
    dragImageToSearch: 'arrastra una imagen para buscar o haz clic para navegar',
    tapToSearchImage: 'toca aquí para buscar una imagen',
    imageUploadTitle: 'Buscar por Imagen',
    suggestions: 'Sugerencias',
    popularChoices: 'Opciones populares',
    trending: 'Tendencias',
    errorMessage: 'Has introducido una consulta o imagen no válida, por favor, inténtalo de nuevo.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
  },
  fr: {
    searchBarPlaceholder: 'Que recherchez-vous ?',
    uploadScreenTitle: 'MONTREZ-NOUS CE QUE VOUS RECHERCHEZ',
    dragImageToSearch: 'faites glisser une image pour rechercher ou cliquez pour parcourir',
    tapToSearchImage: 'appuyez ici pour rechercher une image',
    imageUploadTitle: 'Rechercher par Image',
    suggestions: 'Suggestions',
    popularChoices: 'Choix populaires',
    trending: 'Tendances',
    errorMessage: 'Vous avez saisi une requête ou une image non valide, veuillez réessayer.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
  },
  pt: {
    searchBarPlaceholder: 'O que você está procurando?',
    uploadScreenTitle: 'MOSTRE-NOS O QUE VOCÊ ESTÁ PROCURANDO',
    dragImageToSearch: 'arraste uma imagem para pesquisar ou clique para navegar',
    tapToSearchImage: 'toque aqui para pesquisar uma imagem',
    imageUploadTitle: 'Procurar por Imagem',
    suggestions: 'Sugestões',
    popularChoices: 'Escolhas populares',
    trending: 'Tendências',
    errorMessage: 'Você inseriu uma consulta ou imagem inválida, tente novamente.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
  },
  de: {
    searchBarPlaceholder: 'Wonach suchst du?',
    uploadScreenTitle: 'ZEIG UNS, WAS DU SUCHST',
    dragImageToSearch: 'ziehe ein Bild zum Suchen oder klicke zum Durchsuchen',
    tapToSearchImage: 'hier tippen, um ein Bild zu suchen',
    imageUploadTitle: 'Suche nach Bild',
    relatedProducts: 'Verwandte Produkte',
    suggestions: 'Vorschläge',
    popularChoices: 'Beliebte Auswahl',
    trending: 'Im Trend',
    errorMessage: 'Du hast eine ungültige Anfrage oder ein ungültiges Bild eingegeben. Bitte versuche es erneut.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
  },
  it: {
    searchBarPlaceholder: 'Cosa stai cercando?',
    uploadScreenTitle: 'MOSTRACI COSA STAI CERCANDO',
    dragImageToSearch: 'trascina un\'immagine per cercare o fai clic per navigare',
    tapToSearchImage: 'tocca qui per cercare un\'immagine',
    imageUploadTitle: 'Cerca per Immagine',
    suggestions: 'Suggerimenti',
    popularChoices: 'Scelte popolari',
    trending: 'Di tendenza',
    errorMessage: 'Hai inserito una query o un\'immagine non valida, riprova.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
  },
  pl: {
    searchBarPlaceholder: 'Czego szukasz?',
    uploadScreenTitle: 'POKAŻ NAM, CZEGO SZUKASZ',
    dragImageToSearch: 'przeciągnij obraz, aby wyszukać, lub kliknij, aby przeglądać',
    tapToSearchImage: 'stuknij tutaj, aby wyszukać obraz',
    imageUploadTitle: 'Szukaj po zdjęciu',
    suggestions: 'Sugestie',
    popularChoices: 'Popularne wybory',
    trending: 'Na czasie',
    errorMessage: 'Wprowadziłeś nieprawidłowe zapytanie lub obraz. Spróbuj ponownie.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
  },
  ko: {
    searchBarPlaceholder: '무엇을 찾고 계신가요?',
    uploadScreenTitle: '찾고 있는 것을 보여주세요',
    dragImageToSearch: '이미지를 드래그하여 검색하거나 클릭하여 찾아보세요',
    tapToSearchImage: '이미지를 검색하려면 여기를 탭하세요',
    imageUploadTitle: '이미지로 검색',
    suggestions: '추천',
    popularChoices: '인기 상품',
    trending: '트렌드',
    errorMessage: '유효하지 않은 검색어 또는 이미지를 입력했습니다. 다시 시도해주세요.',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
  },
  ja: {
    searchBarPlaceholder: '何をお探しですか？',
    uploadScreenTitle: '探しているものを見せてください',
    dragImageToSearch: '画像をドラッグして検索するか、クリックして参照',
    tapToSearchImage: '画像を検索するには、ここをタップ',
    imageUploadTitle: '画像で検索',
    suggestions: '提案',
    popularChoices: '人気の選択',
    trending: 'トレンド',
    errorMessage: '無効なクエリまたは画像を入力しました。もう一度お試しください。',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
  },
  th: {
    searchBarPlaceholder: 'คุณกำลังมองหาอะไร?',
    uploadScreenTitle: 'แสดงให้เราเห็นสิ่งที่คุณกำลังมองหา',
    dragImageToSearch: 'ลากรูปภาพเพื่อค้นหาหรือคลิกเพื่อเรียกดู',
    tapToSearchImage: 'แตะที่นี่เพื่อค้นหารูปภาพ',
    imageUploadTitle: 'รูปภาพเพื่อค้นหา',
    suggestions: 'คำแนะนำ',
    popularChoices: 'ตัวเลือกยอดนิยม',
    trending: 'กำลังมาแรง',
    errorMessage: 'คุณได้ป้อนคำค้นหาหรือรูปภาพที่ไม่ถูกต้อง โปรดลองอีกครั้ง',
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
      marginVertical: 16,
      marginHorizontal: 8,
    },
    tablet: {
      productsPerRow: 3,
      marginVertical: 16,
      marginHorizontal: 8,
    },
    desktop: {
      productsPerRow: 4,
      marginVertical: 16,
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
    images: {
      mainImage: 'main',
      hoverImage: 'additional',
      showAlternatives: false,
    },
  },
  imageUpload: {
    enable: true,
    icon: {
      color: '#929292',
      colorDark: '#929292',
    },
    images: [
      {
        url: 'https://cdn.visenze.com/sample/street_shot.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/sample/suit.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/sample/sunset.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/sample/sport.jpg',
        label: '',
      },
      {
        url: 'https://cdn.visenze.com/sample/dance.jpg',
        label: '',
      },
    ],
  },
  popularTerms: {
    enable: true,
    terms: [],
  },
  trendingProducts: {
    enable: true,
    products: [],
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
};
