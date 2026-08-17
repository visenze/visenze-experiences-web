import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'AI Search Assistant',
    a11yOpenImageSearch: 'Search by image',
    a11yOpenVoiceSearch: 'Search by voice',
    a11yOpenAskAi: 'Ask AI',
    triggerAskAi: 'Ask AI',
    a11yToggleMute: 'Mute voice output',
    a11yEnableMute: 'Unmute voice output',
    a11yStartNewChat: 'Start new chat',
    a11yCloseFullScreen: 'Close full screen',
    chatBoxPlaceholder: 'Type your message',
    a11ySendMessage: 'Send message',
    a11yScrollToLatestMessage: 'Scroll to latest message',
    a11yChatInput: 'Type your message to the AI search assistant',
    a11yUploadedImage: 'Uploaded image',
    a11yAssistantThinking: 'Assistant is thinking',
    a11yProductResultsShown: 'Product results shown: {count}',
    a11yChatMessages: 'AI search assistant messages',
    a11ySuggestedReplies: 'Suggested replies',
    showMore: 'Show more...',
    nowDescribing: 'Now Describing',
    imageEntryPrompt: 'Take a photo or upload an image and I\'ll find similar products.',
    a11yTakePhoto: 'Take photo',
    a11yUploadImage: 'Upload image',
    a11yCameraDrawer: 'Camera',
    a11yCameraPreview: 'Camera preview — point at the item to search',
    a11yCloseCamera: 'Close camera',
    a11ySwitchCamera: 'Switch camera',
    a11yStopVoiceInput: 'Stop recording and send',
    a11yVoicePending: 'Preparing to listen',
    a11yTranscribingVoice: 'Transcribing voice message',
    a11yListening: 'Listening',
    voiceInputError: 'Voice input unavailable',
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
      fontColor: '#B91C1C',
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
      fontColor: '#6B7280',
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
  launcher: {
    title: 'AI Search Assistant',
    voiceGreetingEnabled: false,
    startMuted: false,
    greetings: {
      image: 'Show me a picture and I\'ll find similar products.',
      mic: 'Tell me what you\'re looking for.',
      ai: 'Hi! How can I help you find the perfect product today?',
    },
  },
};
