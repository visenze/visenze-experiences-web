import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    errorDescription: 'Sorry, something went wrong',
    errorResolution: 'Please refresh to try again',
    hotspotRecommendationsTitle: 'In this photo',
    noResults: 'There are no results for this hotspot',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
    addToCart: 'Add to Cart',
  },
  es: {
    errorDescription: 'Lo sentimos, algo salió mal',
    errorResolution: 'Por favor, actualiza para intentar de nuevo',
    hotspotRecommendationsTitle: 'En esta foto',
    noResults: 'No hay resultados para este punto de interés',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
    addToCart: 'Agregar al carrito',
  },
  fr: {
    errorDescription: 'Désolé, quelque chose s\'est mal passé',
    errorResolution: 'Veuillez actualiser pour réessayer',
    hotspotRecommendationsTitle: 'Sur cette photo',
    noResults: 'Il n\'y a aucun résultat pour ce point d\'intérêt',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
    addToCart: 'Ajouter au panier',
  },
  pt: {
    errorDescription: 'Desculpe, algo deu errado',
    errorResolution: 'Por favor, atualize para tentar novamente',
    hotspotRecommendationsTitle: 'Nesta foto',
    noResults: 'Não há resultados para este ponto de interesse',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
    addToCart: 'Adicionar ao carrinho',
  },
  de: {
    errorDescription: 'Entschuldigung, etwas ist schiefgelaufen',
    errorResolution: 'Bitte aktualisiere die Seite, um es erneut zu versuchen',
    hotspotRecommendationsTitle: 'Auf diesem Foto',
    noResults: 'Es gibt keine Ergebnisse für diesen Hotspot',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
    addToCart: 'In den Warenkorb',
  },
  it: {
    errorDescription: 'Spiacenti, qualcosa è andato storto',
    errorResolution: 'Per favore, aggiorna per riprovare',
    hotspotRecommendationsTitle: 'In questa foto',
    noResults: 'Non ci sono risultati per questo hotspot',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
    addToCart: 'Aggiungi al carrello',
  },
  pl: {
    errorDescription: 'Przepraszamy, coś poszło nie tak',
    errorResolution: 'Odśwież stronę, aby spróbować ponownie',
    hotspotRecommendationsTitle: 'Na tym zdjęciu',
    noResults: 'Brak wyników dla tego punktu',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
    addToCart: 'Dodaj do koszyka',
  },
  ko: {
    errorDescription: '죄송합니다. 오류가 발생했습니다',
    errorResolution: '새로고침하여 다시 시도해주세요',
    hotspotRecommendationsTitle: '이 사진에서',
    noResults: '이 핫스팟에 대한 결과가 없습니다',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
    addToCart: '장바구니에 추가',
  },
  ja: {
    errorDescription: '申し訳ありません。問題が発生しました',
    errorResolution: '再読み込みしてもう一度お試しください',
    hotspotRecommendationsTitle: 'この写真で',
    noResults: 'このホットスポットの結果はありません',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
    addToCart: 'カートに追加',
  },
  th: {
    errorDescription: 'ขออภัย เกิดข้อผิดพลาดบางอย่าง',
    errorResolution: 'โปรดรีเฟรชเพื่อลองอีกครั้ง',
    hotspotRecommendationsTitle: 'ในรูปภาพนี้',
    noResults: 'ไม่มีผลลัพธ์สำหรับฮอตสปอตนี้',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: 'ลดราคา {discount}',
    addToCart: 'เพิ่มสินค้าลงตะกร้า',
  },
  zh: {
    errorDescription: '抱歉，出现了一些问题',
    errorResolution: '请刷新后重试',
    hotspotRecommendationsTitle: '这张照片中的商品',
    noResults: '此热点没有结果',
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
      productsPerRow: 2,
      marginVertical: 12,
      marginHorizontal: 12,
    },
    tablet: {
      productsPerRow: 3,
      marginVertical: 12,
      marginHorizontal: 12,
    },
    desktop: {
      productsPerRow: 4,
      marginVertical: 12,
      marginHorizontal: 12,
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
