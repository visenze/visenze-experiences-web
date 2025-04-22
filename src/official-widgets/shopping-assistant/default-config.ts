import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    openingMessage1: 'Let\'s get started',
    openingMessage2: 'Tell us about what your styling needs and we will help you find the perfect item for you',
    chatBoxPlaceholder: 'Type your message',
  },
  es: {
    openingMessage1: 'Empecemos',
    openingMessage2: 'Cuéntanos sobre tus necesidades de estilo y te ayudaremos a encontrar el artículo perfecto para ti',
    chatBoxPlaceholder: 'Escribe tu mensaje',
  },
  fr: {
    openingMessage1: 'Commençons',
    openingMessage2: 'Parlez-nous de vos besoins en matière de style et nous vous aiderons à trouver l\'article parfait pour vous',
    chatBoxPlaceholder: 'Tapez votre message',
  },
  pt: {
    openingMessage1: 'Vamos começar',
    openingMessage2: 'Conte-nos sobre suas necessidades de estilo e nós o ajudaremos a encontrar o item perfeito para você',
    chatBoxPlaceholder: 'Digite sua mensagem',
  },
  de: {
    openingMessage1: 'Los geht\'s',
    openingMessage2: 'Erzähl uns von deinen Styling-Bedürfnissen und wir helfen dir, das perfekte Teil für dich zu finden',
    chatBoxPlaceholder: 'Gib deine Nachricht ein',
  },
  it: {
    openingMessage1: 'Iniziamo',
    openingMessage2: 'Parlaci delle tue esigenze di stile e ti aiuteremo a trovare l\'articolo perfetto per te',
    chatBoxPlaceholder: 'Digita il tuo messaggio',
  },
  ko: {
    openingMessage1: '시작해 볼까요?',
    openingMessage2: '스타일링에 필요한 것을 알려주시면 딱 맞는 상품을 찾아드릴게요',
    chatBoxPlaceholder: '메시지를 입력하세요',
  },
  ja: {
    openingMessage1: '始めましょう',
    openingMessage2: 'スタイリングのニーズについて教えてください。あなたにぴったりのアイテムを見つけるお手伝いをします',
    chatBoxPlaceholder: 'メッセージを入力してください',
  },
  th: {
    openingMessage1: 'มาเริ่มกันเลย',
    openingMessage2: 'บอกเราเกี่ยวกับความต้องการด้านสไตล์ของคุณ แล้วเราจะช่วยคุณค้นหาสินค้าที่สมบูรณ์แบบสำหรับคุณ',
    chatBoxPlaceholder: 'พิมพ์ข้อความของคุณ',
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
      marginVertical: 0,
      marginHorizontal: 8,
    },
    tablet: {
      productsPerRow: 3,
      marginVertical: 0,
      marginHorizontal: 8,
    },
    desktop: {
      productsPerRow: 3,
      marginVertical: 0,
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
  popup: {
    position: 'center',
    triggerIcon: {
      color: '#000000',
      colorDark: '#FFFFFF',
      hide: false,
    },
  },
};
