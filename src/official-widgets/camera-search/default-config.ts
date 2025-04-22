import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    uploadScreenTitle: "SHOW US WHAT YOU'RE LOOKING FOR",
    resultScreenTitle: "HERE'S WHAT WE FOUND",
    dragImageToSearch: 'drag an image to search or click to browse',
    tapToSearchImage: 'tap here to search an image',
    tapProductGallery: 'or tap our trending product gallery below',
    searchBarPlaceholder: 'Type here to refine your results...',
    previousViews: 'Previous views',
    errorDescription: 'Sorry, something went wrong',
    back: 'Back',
  },
  es: {
    uploadScreenTitle: 'MUESTRANOS QUÉ ESTÁS BUSCANDO',
    resultScreenTitle: 'ESTO ES LO QUE ENCONTRAMOS',
    dragImageToSearch: 'arrastra una imagen para buscar o haz clic para navegar',
    tapToSearchImage: 'toca aquí para buscar una imagen',
    tapProductGallery: 'o toca nuestra galería de productos de tendencia a continuación',
    searchBarPlaceholder: 'Escribe aquí para refinar tus resultados...',
    previousViews: 'Vistas previas',
    errorDescription: 'Lo sentimos, algo salió mal',
    back: 'Atrás',
  },
  fr: {
    uploadScreenTitle: 'MONTREZ-NOUS CE QUE VOUS RECHERCHEZ',
    resultScreenTitle: 'VOICI CE QUE NOUS AVONS TROUVÉ',
    dragImageToSearch: 'faites glisser une image pour rechercher ou cliquez pour parcourir',
    tapToSearchImage: 'appuyez ici pour rechercher une image',
    tapProductGallery: 'ou appuyez sur notre galerie de produits tendance ci-dessous',
    searchBarPlaceholder: 'Tapez ici pour affiner vos résultats...',
    previousViews: 'Vues précédentes',
    errorDescription: "Désolé, quelque chose s'est mal passé",
    back: 'Retour',
  },
  pt: {
    uploadScreenTitle: 'MOSTRE-NOS O QUE VOCÊ ESTÁ PROCURANDO',
    resultScreenTitle: 'ISTO É O QUE ENCONTRAMOS',
    dragImageToSearch: 'arraste uma imagem para pesquisar ou clique para navegar',
    tapToSearchImage: 'toque aqui para pesquisar uma imagem',
    tapProductGallery: 'ou toque na nossa galeria de produtos em alta abaixo',
    searchBarPlaceholder: 'Digite aqui para refinar seus resultados...',
    previousViews: 'Visualizações anteriores',
    errorDescription: 'Desculpe, algo deu errado',
    back: 'Voltar',
  },
  de: {
    uploadScreenTitle: 'ZEIG UNS, WAS DU SUCHST',
    resultScreenTitle: 'DAS HABEN WIR GEFUNDEN',
    dragImageToSearch: 'ziehe ein Bild zum Suchen oder klicke zum Durchsuchen',
    tapToSearchImage: 'hier tippen, um ein Bild zu suchen',
    tapProductGallery: 'oder tippe unten auf unsere Trend-Produktgalerie',
    searchBarPlaceholder: 'Gib hier ein, um deine Ergebnisse zu verfeinern...',
    previousViews: 'Vorherige Ansichten',
    errorDescription: 'Entschuldigung, etwas ist schiefgelaufen',
    back: 'Zurück',
  },
  it: {
    uploadScreenTitle: 'MOSTRACI COSA STAI CERCANDO',
    resultScreenTitle: 'ECCO COSA ABBIAMO TROVATO',
    dragImageToSearch: "trascina un'immagine per cercare o fai clic per navigare",
    tapToSearchImage: "tocca qui per cercare un'immagine",
    tapProductGallery: 'oppure tocca la nostra galleria di prodotti di tendenza qui sotto',
    searchBarPlaceholder: 'Digita qui per affinare i tuoi risultati...',
    previousViews: 'Visualizzazioni precedenti',
    errorDescription: 'Spiacenti, qualcosa è andato storto',
    back: 'Indietro',
  },
  ko: {
    uploadScreenTitle: '찾고 있는 것을 보여주세요',
    resultScreenTitle: '찾은 결과입니다',
    dragImageToSearch: '이미지를 드래그하여 검색하거나 클릭하여 찾아보세요',
    tapToSearchImage: '이미지를 검색하려면 여기를 탭하세요',
    tapProductGallery: '또는 아래의 인기 상품 갤러리를 탭하세요',
    searchBarPlaceholder: '결과를 구체화하려면 여기에 입력하세요...',
    previousViews: '이전 조회',
    errorDescription: '죄송합니다. 오류가 발생했습니다',
    back: '뒤로',
  },
  ja: {
    uploadScreenTitle: '探しているものを見せてください',
    resultScreenTitle: '見つかりました',
    dragImageToSearch: '画像をドラッグして検索するか、クリックして参照',
    tapToSearchImage: '画像を検索するには、ここをタップ',
    tapProductGallery: 'または、下のトレンド商品ギャラリーをタップ',
    searchBarPlaceholder: '検索結果を絞り込むには、ここに टाइपしてください...',
    previousViews: '以前の表示',
    errorDescription: '申し訳ありません。問題が発生しました',
    back: '戻る',
  },
  th: {
    uploadScreenTitle: 'แสดงให้เราเห็นสิ่งที่คุณกำลังมองหา',
    resultScreenTitle: 'นี่คือสิ่งที่เราพบ',
    dragImageToSearch: 'ลากรูปภาพเพื่อค้นหาหรือคลิกเพื่อเรียกดู',
    tapToSearchImage: 'แตะที่นี่เพื่อค้นหารูปภาพ',
    tapProductGallery: 'หรือแตะแกลเลอรีผลิตภัณฑ์ยอดนิยมของเราด้านล่าง',
    searchBarPlaceholder: 'พิมพ์ที่นี่เพื่อปรับแต่งผลลัพธ์ของคุณ...',
    previousViews: 'การดูครั้งก่อน',
    errorDescription: 'ขออภัย เกิดข้อผิดพลาดบางอย่าง',
    back: 'กลับ',
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
  imageUpload: {
    enable: true,
    icon: {
      color: '#929292',
      colorDark: '#929292',
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
      color: '#000000',
      colorDark: '#FFFFFF',
      hide: false,
    },
  },
};
