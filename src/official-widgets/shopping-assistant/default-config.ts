import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Shopping Assistant',
    openingMessage1: 'Let\'s get started',
    openingMessage2: 'Tell us about what your styling needs and we will help you find the perfect item for you',
    chatBoxPlaceholder: 'Type your message',
    triggerCTA: 'Style Assistant',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
    addToCart: 'Add to Cart',
  },
  es: {
    widgetTitle: 'Asistente de estilo',
    openingMessage1: 'Empecemos',
    openingMessage2: 'Cuéntanos sobre tus necesidades de estilo y te ayudaremos a encontrar el artículo perfecto para ti',
    chatBoxPlaceholder: 'Escribe tu mensaje',
    triggerCTA: 'Asistente de estilo',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de descuento',
    addToCart: 'Agregar al carrito',
  },
  fr: {
    widgetTitle: 'Assistant de style',
    openingMessage1: 'Commençons',
    openingMessage2: 'Parlez-nous de vos besoins en matière de style et nous vous aiderons à trouver l\'article parfait pour vous',
    chatBoxPlaceholder: 'Tapez votre message',
    triggerCTA: 'Assistant de style',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de réduction',
    addToCart: 'Ajouter au panier',
  },
  pt: {
    widgetTitle: 'Assistente de estilo',
    openingMessage1: 'Vamos começar',
    openingMessage2: 'Conte-nos sobre suas necessidades de estilo e nós o ajudaremos a encontrar o item perfeito para você',
    chatBoxPlaceholder: 'Digite sua mensagem',
    triggerCTA: 'Assistente de estilo',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} de desconto',
    addToCart: 'Adicionar ao carrinho',
  },
  de: {
    widgetTitle: 'Stil-Assistent',
    openingMessage1: 'Los geht\'s',
    openingMessage2: 'Erzähl uns von deinen Styling-Bedürfnissen und wir helfen dir, das perfekte Teil für dich zu finden',
    chatBoxPlaceholder: 'Gib deine Nachricht ein',
    triggerCTA: 'Stil-Assistent',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} Rabatt',
    addToCart: 'In den Warenkorb',
  },
  it: {
    widgetTitle: 'Assistente di stile',
    openingMessage1: 'Iniziamo',
    openingMessage2: 'Parlaci delle tue esigenze di stile e ti aiuteremo a trovare l\'articolo perfetto per te',
    chatBoxPlaceholder: 'Digita il tuo messaggio',
    triggerCTA: 'Assistente di stile',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} di sconto',
    addToCart: 'Aggiungi al carrello',
  },
  pl: {
    widgetTitle: 'Asystent Stylu',
    openingMessage1: 'Zacznijmy',
    openingMessage2: 'Powiedz nam, jakie masz potrzeby stylizacyjne, a pomożemy Ci znaleźć idealny produkt',
    chatBoxPlaceholder: 'Wpisz swoją wiadomość',
    triggerCTA: 'Asystent Stylu',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} zniżki',
    addToCart: 'Dodaj do koszyka',
  },
  ko: {
    widgetTitle: '쇼핑 어시스턴트',
    openingMessage1: '시작해 볼까요?',
    openingMessage2: '스타일링에 필요한 것을 알려주시면 딱 맞는 상품을 찾아드릴게요',
    chatBoxPlaceholder: '메시지를 입력하세요',
    triggerCTA: '스타일 어시스턴트',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 할인',
    addToCart: '장바구니에 추가',
  },
  ja: {
    widgetTitle: 'スタイルアシスタント',
    openingMessage1: '始めましょう',
    openingMessage2: 'スタイリングのニーズについて教えてください。あなたにぴったりのアイテムを見つけるお手伝いをします',
    chatBoxPlaceholder: 'メッセージを入力してください',
    triggerCTA: 'スタイルアシスタント',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} 割引',
    addToCart: 'カートに追加',
  },
  th: {
    widgetTitle: 'ช่วยเหลือสินค้า',
    openingMessage1: 'มาเริ่มกันเลย',
    openingMessage2: 'บอกเราเกี่ยวกับความต้องการด้านสไตล์ของคุณ แล้วเราจะช่วยคุณค้นหาสินค้าที่สมบูรณ์แบบสำหรับคุณ',
    chatBoxPlaceholder: 'พิมพ์ข้อความของคุณ',
    triggerCTA: 'ผู้ช่วยด้านสไตล์',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: 'ลดราคา {discount}',
    addToCart: 'เพิ่มสินค้าลงตะกร้า',
  },
  zh: {
    widgetTitle: '购物助手',
    openingMessage1: '我们开始吧',
    openingMessage2: '告诉我们您的造型需求，我们会帮您找到合适的商品',
    chatBoxPlaceholder: '输入您的消息',
    triggerCTA: '聊天',
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
  buttons: {
    primary: {
      fontColor: '#000000',
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
        size: 16,
        weight: 400,
      },
      tablet: {
        size: 16,
        weight: 400,
      },
      desktop: {
        size: 16,
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
    position: 'left',
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
