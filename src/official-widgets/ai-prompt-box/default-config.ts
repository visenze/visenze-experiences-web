import { DEFAULT_CUSTOMIZATIONS as ESA_DEFAULT_CUSTOMIZATIONS } from '../embedded-shopping-assistant/default-config';
import type { LanguagePack } from '../../common/locales/locale';
import type { WidgetConfig } from '../../common/wigmix-core';

export const DEFAULT_TEXTS: LanguagePack = {
  en: {
    aiPromptBoxTitle: 'Ask AI about this product',
    aiPromptBoxPlaceholder: 'Ask a question',
    a11yMaximizeChat: 'Open chat panel',
    a11yCloseChat: 'Close chat',
    aiPromptBoxFindSimilar: 'Find Similar',
    gettingOverview: 'Thinking...',
    findingProducts: 'Finding products...',
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
    addToCart: 'Add to Cart',
    a11yProductResultsShown: '{count} products found',
    a11yAssistantThinking: 'Assistant is thinking',
    a11yChatMessages: 'Shopping assistant messages',
    a11yScrollToLatestMessage: 'Scroll to latest message',
    a11ySuggestedReplies: 'Suggested replies',
    a11yUploadedImage: 'Uploaded image',
    nowDescribing: 'Now Describing',
    showMore: 'Show more...',
    a11yCloseFullScreen: 'Close full screen',
    a11yEnableMute: 'Unmute voice output',
    a11yToggleMute: 'Mute voice output',
    a11yStartNewChat: 'Start new chat',
    a11yAddImage: 'Add image',
    a11yUploadImage: 'Upload an image to search',
    a11yOpenCamera: 'Open camera',
    a11yCameraDrawer: 'Camera',
    a11yCameraPreview: 'Camera preview — point at the item to search',
    a11yCloseCamera: 'Close camera',
    a11yTakePhoto: 'Take photo',
    a11ySwitchCamera: 'Switch camera',
    a11yCameraError: 'Camera unavailable — check permissions or try switching cameras',
    a11yStopVoiceInput: 'Stop recording and send',
    holdMicToRecord: 'Hold the mic to record',
    voiceInputError: 'Voice input unavailable',
    voiceOutputError: 'Voice narration is temporarily unavailable',
    a11yChatInput: 'Type your question',
    chatBoxPlaceholder: 'Type your message',
    a11yTranscribingVoice: 'Transcribing voice message',
    a11yListening: 'Listening',
    a11yHoldMicInstructions: 'Press and hold, or press and hold Space or Enter, to record. Release to send.',
    a11ySendMessage: 'Send message',
    a11yScrollProductsPrev: 'Previous products',
    a11yScrollProductsNext: 'Next products',
  },
};

// Reuses embedded-shopping-assistant's fully-populated customizations (product card, buttons,
// generalLayout colors, chat defaults) so the panel and the chat drawer look the same
// as that widget out of the box; only the ai-prompt-box specifics are overridden here.
export const DEFAULT_CUSTOMIZATIONS: WidgetConfig['customizations'] = {
  ...ESA_DEFAULT_CUSTOMIZATIONS,
  aiPromptBox: {
    suggestedQuestions: [],
    maxSuggestedQuestions: 5,
    findSimilar: {
      enabled: false,
      message: 'find similar products',
    },
    chatPosition: 'right',
    restoreChat: true,
  },
  chatbot: {
    ...ESA_DEFAULT_CUSTOMIZATIONS.chatbot,
    // Keep the conversation across page loads (per product): a returning shopper finds it restored, behind
    // the chat drawer's maximize icon. Set false to turn it off.
    persistChatEnabled: true,
    voiceEnabled: false,
    startMuted: true,
  },
};
