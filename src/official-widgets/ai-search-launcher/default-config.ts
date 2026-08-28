import type { WidgetConfig } from '../../common/wigmix-core';
import type { LanguagePack } from '../../common/locales/locale';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'AI Search Assistant',
    a11yOpenImageSearch: 'Search by image',
    a11yOpenVoiceSearch: 'Search by voice',
    a11yOpenAskAi: 'AI Mode',
    triggerAskAi: 'AI Mode',
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
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
    addToCart: 'Add to Cart',
    hintResultsShown: '↳ {count} results shown',
    a11yBreadcrumbTrail: 'Search refinement steps',
    imageSearchLabel: 'Image search',
    a11ySelectResultSet: 'Show results for: {label}',
    a11yShowMoreBreadcrumbs: 'Show {count} more searches',
    a11yHiddenBreadcrumbs: 'Hidden searches',
    a11yChatMessages: 'AI search assistant messages',
    a11ySuggestedReplies: 'Suggested replies',
    showMore: 'Show more...',
    nowDescribing: 'Now Describing',
    imageEntryPrompt: 'Take a photo or upload an image and I\'ll find similar products.',
    a11yTakePhoto: 'Take photo',
    a11yUploadImage: 'Upload image',
    a11yOpenCamera: 'Open camera',
    a11yAddImage: 'Add image',
    holdMicToRecord: 'Hold the mic to record',
    dragImageToSearch: 'Drag an image or click to browse',
    tapToSearchImage: 'tap here to search an image',
    browsePhotos: 'Browse photos',
    useCamera: 'Use camera',
    tapProductGallery: 'Or tap a trending look',
    a11yCameraDrawer: 'Camera',
    a11yCameraPreview: 'Camera preview — point at the item to search',
    a11yCloseCamera: 'Close camera',
    a11ySwitchCamera: 'Switch camera',
    a11yStopVoiceInput: 'Stop recording and send',
    a11yVoicePending: 'Preparing to listen',
    a11yTapToRecord: 'Tap to record',
    a11yTranscribingVoice: 'Transcribing voice message',
    a11yListening: 'Listening',
    voiceInputError: 'Voice input unavailable',
    a11yCameraError: 'Camera unavailable — check permissions or try switching cameras',
    a11yHoldMicInstructions: 'Press and hold, or press and hold Space or Enter, to record. Release to send.',
    a11yLoadingResults: 'Loading results',
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
      marginVertical: 0,
      marginHorizontal: 8,
    },
    tablet: {
      productsPerRow: 3,
      marginVertical: 0,
      marginHorizontal: 8,
    },
    desktop: {
      productsPerRow: 4,
      marginVertical: 0,
      marginHorizontal: 8,
    },
  },
  productCard: {
    imageAspectRatio: '3 / 4',
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
      backgroundColor: '#FFFFFF',
      backgroundColorDark: '#FFFFFF',
    },
    secondary: {
      fontColor: '#FFFFFF',
      fontColorDark: '#000000',
      backgroundColor: '#FFFFFF',
      backgroundColorDark: '#FFFFFF',
    },
    icon: {
      fontColor: '#000000',
      fontColorDark: '#FFFFFF',
      backgroundColor: 'transparent',
      backgroundColorDark: 'transparent',
    },
  },
  breadcrumbTrail: {
    active: {
      fontColor: '#FFFFFF',
      fontColorDark: '#FFFFFF',
      backgroundColor: '#0D9488',
      backgroundColorDark: '#14B8A6',
    },
    // Matches Tailwind neutral-600/neutral-300 (text) and transparent (background), the previous
    // hardcoded inactive-pill colors — keeps the default look unchanged now that they're wired.
    inactive: {
      fontColor: '#525252',
      fontColorDark: '#D4D4D4',
      backgroundColor: 'transparent',
      backgroundColorDark: 'transparent',
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
    // Matches Tailwind neutral-900, the previous hardcoded dark-mode background of
    // FullScreenChatContainer's dialog — this field was unused (unwired) before, so this value
    // keeps the default look unchanged now that it's actually applied.
    backgroundColorDark: '#171717',
    showWidgetTitle: true,
    showViSenzeLogo: true,
    darkModeDefault: false,
  },
  chatbot: {
    title: 'AI Search Assistant',
    voiceEnabled: true,
    voiceGreetingEnabled: false,
    startMuted: false,
    layout: 'chatlayout',
    inputBar: {
      border: {
        width: 1,
        color: '#D4D4D4',
        colorDark: '#262626',
      },
      menuPanel: {
        fontColor: '#000000',
        fontColorDark: '#FFFFFF',
        backgroundColor: '#FFFFFF',
        backgroundColorDark: '#171717',
        border: {
          width: 1,
          color: '#D4D4D4',
          colorDark: '#404040',
        },
      },
      voiceRecordingColor: '#EF4444',
      voiceRecordingColorDark: '#EF4444',
    },
  },
  launcher: {
    voiceRecordingMaxDurationSeconds: 5,
    greetings: {
      image: 'Show me a photo and I\'ll find similar products for you.',
      mic: 'Tell me what you\'re looking for and I\'ll find it for you.',
      ai: 'Hi! How can I help you find what you\'re looking for today?',
    },
  },
};
