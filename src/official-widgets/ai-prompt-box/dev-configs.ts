import type { RecursivePartial, WidgetConfig } from '../../common/wigmix-core';

const customCss = `
/* Insert the custom CSS here */
`;

export const devConfigs: RecursivePartial<WidgetConfig> = {
  appSettings: {
    appKey: '',
    placementId: '',
    endpoint: '',
    // cloud: 'aws', // remove this if you are testing in staging environment
  },
  displaySettings: {
    cssSelector: '.ai-prompt-box-widget',
    productDetails: {},
  },
  customizations: {
    customCss,
    generalLayout: {
      // Background of the panel and the chat drawer; the text input and chips stay white on top of it.
      backgroundColor: '#EFEFEF', // light gray
      // backgroundColorDark: '#171717', // dark-mode background (default)
    },
    aiPromptBox: {
      title: '', // title shown next to the logo and in the maximized chat header
      chatTitle: 'Fitzy', // chat drawer header text when `title` is empty
      // Short line between the title row and the chips (optional).
      message: 'Need a hand?',
      // Colors shared by the send button (inside the input) and the Find Similar button (optional; defaults to the widget accent).
      buttonColors: { backgroundColor: '#1B1B8F', fontColor: '#FFFFFF', backgroundColorDark: '#1B1B8F', fontColorDark: '#FFFFFF' }, // dark blue
      // Icon inside the text input (optional).
      inputIcon: {
        url: 'https://res.cloudinary.com/dicldxhya/image/upload/c_crop,x_0,y_0,w_294,h_338/v1791180526/Firefly_RemoveBackground_zuvpfn.png',
        // height: 20,
      },
      suggestedQuestions: [
        'What running shoes suit me?',
        'I need shoes for all-day comfort',
        'Show me stylish everyday sneakers',
        'Which shoes come in a wide fit?',
        'Help me find school shoes',
      ],
      // "Find Similar" button beside the input; sends `message` when clicked.
      findSimilar: {
        enabled: true,
        // label: 'Find Similar', // defaults to the aiPromptBoxFindSimilar text
        // message: 'find similar products',
      },
      // restoreChat: false, // default true: restore the earlier conversation after a reload (false: always start fresh)
      // chatPosition: 'left', // side the maximized chat drawer slides in from (default 'right')
      // Brand logo in the title row. layout: ICON (default) | TEXT | ICON_TEXT | TEXT_ICON
      titleIcon: {
        url: 'https://res.cloudinary.com/dicldxhya/image/upload/c_crop,x_0,y_0,w_294,h_338/v1791180526/Firefly_RemoveBackground_zuvpfn.png', // same image as inputIcon
        // layout: 'ICON_TEXT',
        height: 48,
      },
    },
    chatbot: {
      title: 'AI Search Assistant - Fitzy', // header title of the maximized chat
      botIcon: {
        // Just the Fitzy face, so it reads well in the small round chat avatar.
        url: 'https://res.cloudinary.com/dicldxhya/image/upload/c_crop,x_0,y_0,w_294,h_338/v1791180526/Firefly_RemoveBackground_zuvpfn.png',
      },
      headerIcon:{
      url: 'https://res.cloudinary.com/dicldxhya/image/upload/c_crop,x_0,y_0,w_294,h_338/v1791180526/Firefly_RemoveBackground_zuvpfn.png', 
      },
      // persistChatEnabled: false, // default true: the conversation is restored after a reload
      // persistChatTtlMinutes: 30, // how long it stays restorable after the last activity

    },
    // Lay product cards out in one horizontally scrollable row instead of a grid.
productGrid: {
  mobile:  { horizontalScroll: true, productsPerRow: 2, cardsPerScroll: 2 },
  tablet:  { horizontalScroll: true, productsPerRow: 2, cardsPerScroll: 2 },
  desktop: { horizontalScroll: true, productsPerRow: 2, cardsPerScroll: 2 },
},

  },
  callbacks: {
    trackingCallback: (action: string, params: Record<string, any>) => {
      console.warn(`Successfully send event: ${action}`, params);
    },
  },
  disableAnalytics: true,
};

// Set to true to retrieve the fields mappings from the backend (requires a valid appKey).
export const shouldRetrieveFieldsMapping = true;

// Update according to your catalog's field mappings
export const devFieldMappings: Record<string, string> = {
  main_image_url: 'main_image_url',
  product_url: 'product_url',
  title: 'title',
  price: 'price',
  original_price: 'original_price',
};
