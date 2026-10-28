import { DEFAULT_CUSTOMIZATIONS as AI_SEARCH_LAUNCHER_CUSTOMIZATIONS } from '../ai-search-launcher/default-config';
import {
  DEFAULT_CUSTOMIZATIONS as ESA_DEFAULT_CUSTOMIZATIONS,
  DEFAULT_TEXTS as ESA_TEXTS,
} from '../embedded-shopping-assistant/default-config';
import {
  DEFAULT_CUSTOMIZATIONS as SHOPPING_ASSISTANT_CUSTOMIZATIONS,
  DEFAULT_TEXTS as SHOPPING_ASSISTANT_TEXTS,
} from '../shopping-assistant/default-config';
import type { LanguagePack } from '../../common/locales/locale';
import type { WidgetConfig } from '../../common/wigmix-core';

// Merges language packs locale by locale; a later pack's keys win.
const mergeLanguagePacks = (...packs: LanguagePack[]): LanguagePack => packs.reduce<LanguagePack>((merged, pack) => {
  Object.entries(pack).forEach(([locale, texts]) => {
    merged[locale] = { ...merged[locale], ...texts };
  });
  return merged;
}, {});

// Texts of the prompt-box entry and the chat drawer.
const PROMPT_BOX_TEXTS: LanguagePack = {
  en: {
    promptBoxTitle: 'Ask AI about this product',
    promptBoxPlaceholder: 'Ask a question',
    a11yCloseChat: 'Close chat',
    promptBoxFindSimilar: 'Find Similar',
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

// Texts of the search-bar entry (its entry-bar buttons) and of the full-screen chat it opens: welcome
// screens, split layout, breadcrumb trail. Same copy as ai-search-launcher; only keys the other packs
// don't define (shared keys keep this widget's own copy).
const SEARCH_BAR_TEXTS: LanguagePack = {
  en: {
    triggerAskAi: 'AI Mode',
    a11yOpenImageSearch: 'Search by image',
    a11yOpenVoiceSearch: 'Search by voice',
    a11yOpenAskAi: 'AI Mode',
    imageEntryPrompt: 'Take a photo or upload an image and I\'ll find similar products.',
    dragImageToSearch: 'Drag an image or click to browse',
    tapToSearchImage: 'tap here to search an image',
    browsePhotos: 'Browse photos',
    useCamera: 'Use camera',
    tapProductGallery: 'Or tap a trending look',
    a11yGalleryImageOption: 'Trending look {index}',
    imageSearchLabel: 'Image search',
    hintResultsShown: '↳ {count} results shown',
    a11yLoadingResults: 'Loading results',
    a11yBreadcrumbTrail: 'Search refinement steps',
    a11ySelectResultSet: 'Show results for: {label}',
    a11yShowMoreBreadcrumbs: 'Show {count} more searches',
    a11yHiddenBreadcrumbs: 'Hidden searches',
    a11yVoicePending: 'Preparing to listen',
    a11yTapToRecord: 'Tap to record',
  },
};

// The launcher's texts (triggerCTA, widgetTitle, ...) come from shopping-assistant; the prompt box's and
// the chat drawer's from PROMPT_BOX_TEXTS, which wins where both define a key. SEARCH_BAR_TEXTS only adds
// keys neither defines, so its order does not matter.
// getLocaleTexts picks a whole locale pack (no per-key fallback), so every locale gets the English text of
// any key it lacks (this widget's own texts are English only) instead of showing raw ids. Returns new packs;
// a locale's own keys are never overwritten.
export const withEnglishFallback = (packs: LanguagePack): LanguagePack => {
  const english = packs['en'];
  if (!english) {
    return packs;
  }
  return Object.fromEntries(Object.entries(packs).map(([locale, texts]) => [locale, { ...english, ...texts }]));
};

const WIDGET_TEXTS: LanguagePack = mergeLanguagePacks(SHOPPING_ASSISTANT_TEXTS, SEARCH_BAR_TEXTS, PROMPT_BOX_TEXTS);

// Adds another widget's texts to `widgetTexts`, never replacing an id a locale already defines. For an id the
// widget defines in English only, the other widget's translation is taken only when both widgets' English
// texts are the same (the same source string); otherwise the locale keeps the widget's English fallback.
// Returns new packs; neither input is mutated.
export const addTextsFrom = (widgetTexts: LanguagePack, otherTexts: LanguagePack): LanguagePack => {
  const widgetEnglish = widgetTexts['en'] ?? {};
  const otherEnglish = otherTexts['en'] ?? {};
  const additions = Object.fromEntries(Object.entries(otherTexts).map(([locale, texts]) => [
    locale,
    Object.fromEntries(Object.entries(texts).filter(([id]) => !(id in (widgetTexts[locale] ?? {}))
      && (!(id in widgetEnglish) || widgetEnglish[id] === otherEnglish[id]))),
  ]));
  return mergeLanguagePacks(widgetTexts, additions);
};

// The embedded entry's texts come from embedded-shopping-assistant, with its translations: the ids this
// widget lacks (seeResults, noQueryProvided, aiOverviewLabel) and the translations of the English-only ids
// both widgets word the same (a11yCloseFullScreen, a11yEnableMute, a11yToggleMute, gettingOverview,
// findingProducts), which the other entries then show too.
export const DEFAULT_TEXTS: LanguagePack = withEnglishFallback(addTextsFrom(WIDGET_TEXTS, ESA_TEXTS));

// Reuses embedded-shopping-assistant's fully-populated customizations (product card, buttons,
// generalLayout colors, chat defaults) so the prompt box and the chat drawer look the same as that
// widget out of the box, plus shopping-assistant's `popup` for the launcher trigger.
export const DEFAULT_CUSTOMIZATIONS: WidgetConfig['customizations'] = {
  ...ESA_DEFAULT_CUSTOMIZATIONS,
  // The search-bar entry's buttons (and the image-entry screen's) paint `bg-buttonSecondary` and draw their icons in
  // generalLayout.fontColor. embedded-shopping-assistant's secondary background is black, which swallows the black icons,
  // so take the standalone search launcher's background instead. Only the BACKGROUND changes: embedded's "See Results"
  // button reads buttons.secondary.fontColor, which stays embedded's.
  buttons: {
    ...ESA_DEFAULT_CUSTOMIZATIONS.buttons,
    primary: ESA_DEFAULT_CUSTOMIZATIONS.buttons?.primary ?? {
      fontColor: '#000000',
      fontColorDark: '#616161',
      backgroundColor: '#FFFFFF',
      backgroundColorDark: '#FFFFFF',
    },
    secondary: {
      fontColor: ESA_DEFAULT_CUSTOMIZATIONS.buttons?.secondary?.fontColor ?? '#374151',
      fontColorDark: ESA_DEFAULT_CUSTOMIZATIONS.buttons?.secondary?.fontColorDark ?? '#F5F5F5',
      backgroundColor: AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.buttons?.secondary?.backgroundColor ?? '#FFFFFF',
      backgroundColorDark: AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.buttons?.secondary?.backgroundColorDark ?? '#FFFFFF',
    },
  },
  aiAssistant: {
    chatPosition: 'right',
    promptBox: {
      suggestedQuestions: [],
      maxSuggestedQuestions: 5,
      findSimilar: {
        enabled: false,
        message: 'find similar products',
      },
    },
    // The search-bar entry: same defaults as ai-search-launcher's `launcher`.
    searchBar: AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.launcher,
  },
  // Used by the search-bar entry's full-screen chat (breadcrumb pills, image entry screen gallery).
  breadcrumbTrail: AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.breadcrumbTrail,
  imageUpload: AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.imageUpload,
  // shopping-assistant's launcher button, except that a logo (`triggerIcon.url`) is shown as-is: its black/white tint
  // would paint an opaque image or GIF as a solid box. Set `color`/`colorDark` to tint a mono logo on purpose; they
  // also colour the default icon, which falls back to the generalLayout font colours while they are unset.
  popup: {
    position: SHOPPING_ASSISTANT_CUSTOMIZATIONS.popup?.position ?? 'left',
    triggerIcon: {
      ...SHOPPING_ASSISTANT_CUSTOMIZATIONS.popup?.triggerIcon,
      hide: SHOPPING_ASSISTANT_CUSTOMIZATIONS.popup?.triggerIcon?.hide ?? false,
      layout: SHOPPING_ASSISTANT_CUSTOMIZATIONS.popup?.triggerIcon?.layout ?? 'ICON',
      color: 'DEFAULT_ICON_COLOR',
      colorDark: 'DEFAULT_ICON_COLOR',
    },
  },
  chatbot: {
    ...SHOPPING_ASSISTANT_CUSTOMIZATIONS.chatbot,
    ...ESA_DEFAULT_CUSTOMIZATIONS.chatbot,
    // One conversation per placement, restored after a reload whichever entry it was started from
    // (reachable from the launcher or search bar, or by asking something in the prompt box). Turn off with chatbot.persistChatEnabled: false.
    persistChatEnabled: true,
    voiceEnabled: false,
    startMuted: true,
    // The search-bar entry's full screen: single-column chat ('splitlayout' adds the products pane).
    layout: 'chatlayout',
  },
};
