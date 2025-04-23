import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    'widgetTitle': 'You may also like',
    'errorDescription': 'Sorry, something went wrong',
    'triggerCTA': 'Find Similar',
  },
  es: {
    'widgetTitle': 'También te puede gustar',
    'errorDescription': 'Lo sentimos, algo salió mal',
  },
  fr: {
    'widgetTitle': 'Vous aimerez peut-être aussi',
    'errorDescription': 'Désolé, quelque chose s\'est mal passé',
  },
  pt: {
    'widgetTitle': 'Você também pode gostar',
    'errorDescription': 'Desculpe, algo deu errado',
  },
  de: {
    'widgetTitle': 'Das könnte dir auch gefallen',
    'errorDescription': 'Entschuldigung, etwas ist schiefgelaufen',
  },
  it: {
    'widgetTitle': 'Potrebbe piacerti anche',
    'errorDescription': 'Spiacenti, qualcosa è andato storto',
  },
  ko: {
    'widgetTitle': '이 상품도 좋아하실 거예요',
    'errorDescription': '죄송합니다. 오류가 발생했습니다',
  },
  ja: {
    'widgetTitle': 'こちらもおすすめです',
    'errorDescription': '申し訳ありません。問題が発生しました',
  },
  th: {
    'widgetTitle': 'คุณอาจจะชอบสิ่งนี้ด้วย',
    'errorDescription': 'ขออภัย เกิดข้อผิดพลาดบางอย่าง',
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
