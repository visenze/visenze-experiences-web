import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useVoiceReply, type VoiceStatus } from '../../assistant';
import { getManualEndpoint, resolveBaseEndpoint } from '../../client/endpoint';
import { WidgetDataContext } from '../../types/contexts';
import { isPid, type SearchImageOrPid } from '../../types/image';
import type { ProcessedProduct } from '../../types/product';
import { getChatSessionStore } from './session/chat-session-registry';

export interface Chat {
  chatId: string;
  requestId: string;
  author: 'user' | 'bot' | 'products';
  messages: string[];
  products?: ProcessedProduct[];
  image?: SearchImageOrPid;
}

export interface BreadcrumbTurn {
  requestId: string;
  label: string;
  products: ProcessedProduct[];
}

export interface UseChatResult {
  chats: Chat[];
  isWaiting: boolean;
  allowUserInput: boolean;
  message: string;
  setMessage: (message: string) => void;
  showAllSuggestions: boolean;
  setShowAllSuggestions: () => void;
  suggestions: string[];
  streamingProducts: ProcessedProduct[];
  streamingRequestId: string;
  focusedProductId: string | null;
  typewriterText: string;
  hasStartedChat: boolean;
  isOpen: boolean;
  // Truthy once a session has started — via open()/newChat(), or restored on mount. Callers use
  // this to tell "resume via reopen()" apart from "first-ever open, go through open()".
  chatId: string;
  // Same value as `chatId`, but read live rather than snapshotted — see its own doc comment.
  getChatId: () => string;
  open: () => void;
  close: () => void;
  reopen: () => void;
  newChat: () => void;
  sendMessage: (message?: string, image?: SearchImageOrPid) => Promise<void>;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
  voiceEnabled: boolean;
  speechOutputEnabled: boolean;
  voiceStatus: VoiceStatus;
  liveTranscript: string;
  hasVoiceError: boolean;
  hasSpeechOutputError: boolean;
  isVoiceReadingEnabled: boolean;
  toggleVoiceReading: () => void;
  isSpeechPlaying: boolean;
  startVoiceRecording: () => void;
  stopRecording: () => void;
  hasPendingSpeech: () => boolean;
  playGreeting: (text: string) => void;
  speakText: (text: string) => void;
  pushAssistantMessage: (text: string, nextSteps?: string[]) => void;
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  setActiveBreadcrumb: (requestId: string) => void;
}

export interface UseChatOptions {
  // Selects WHICH chat session this hook reads. Unset = the widgetClient's shared session (the default
  // every existing widget uses). A distinct key gives an independent session on the same client — e.g.
  // each ai_assistant `embedded` element has its own. sessionScopeKey/pid never select the store.
  storeKey?: string;
  // Skips firing widgetConfig.callbacks.onAddToCartToggle/onAddToWishlistToggle for AI-embedded
  // <<ADD_TO_CART:pid>>/<<ADD_TO_WISHLIST:pid>> action tokens, without touching the callbacks a
  // caller's own rendered UI (e.g. ProductCard's onProductClick/onAddToWishlistToggle/
  // onAddToCartToggle, read off the same WidgetDataContext) sees. Exists specifically so a caller
  // that wants this hook's own action-token handling isolated doesn't have to reach for
  // overriding widgetConfig.callbacks to `{}` in a nested context Provider around its whole
  // subtree — that blunter approach also strips callbacks from every other consumer reading the
  // same context, breaking real product-card interactions it was never meant to touch.
  suppressActionTokenCallbacks?: boolean;
  // Scopes persistChatEnabled's stored session to more than just the placement id — e.g.
  // embedded-shopping-assistant passes its `query` prop so a conversation only resumes while the
  // visitor stays on the same product; a different query lands on its own, separate storage slot
  // (no stored id yet) and starts fresh rather than resuming a different product's conversation.
  // Ignored when unset (the placement id alone is the scope, as for shopping-assistant/
  // ai-search-launcher, where there's exactly one conversation per placement).
  sessionScopeKey?: string;
  // A fixed product id sent to the chat endpoint as the `pid` query param with every message, for
  // callers whose whole conversation is about one product. Unused by the built-in widgets
  // (ai_assistant sends its product id per message instead). Omitted from the request entirely
  // when unset. Callers that want one conversation per product should also pass it as
  // `sessionScopeKey`.
  pid?: string;
  // Set to false to opt this instance out of saving/restoring the conversation even when
  // `customizations.chatbot.persistChatEnabled` is on. It cannot turn persistence on by itself.
  persistChatEnabled?: boolean;
  // Defaults to true. Every useChat on the same widgetClient shares ONE chat session (see
  // getChatSessionStore), but only one hook's voice-reply helpers can drive that session's spoken
  // replies/typewriter. Exactly ONE hook per widgetClient should attach voice: if several do, the
  // last one to render wins the bridge, so replies may narrate/type out on an unexpected surface.
  // Set to false on every secondary surface so it never takes the voice bridge over from the
  // surface that owns it (it still runs useVoiceReply and renders its own, idle, voice state).
  attachVoice?: boolean;
}

// Orchestrates a widget's full-screen chat surface. The session itself (the SSE call to the
// backend chat endpoint, token-stream parsing, history restore, and all conversation state) lives
// in the per-widgetClient ChatSessionStore, so every useChat on the same widgetClient shares ONE
// conversation; this hook is a thin React adapter over it. What stays per hook: the composer text
// (`message`), the voice-reply integration (typewriter reveal + spoken narration) from
// `useVoiceReply`, which reaches the store through an attached VoiceBridge, and `speakText`.
// `isOpen`/`open`/`close` are deliberately generic (no baked-in entry-point concept) so each
// widget can layer its own trigger/entry-point state on top. Greetings are a single string played
// by callers via `playGreeting`.
const useChat = (options: UseChatOptions = {}): UseChatResult => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  // Resolve the API base, honouring manual endpoint > cloud > API endpoint > default; used by the
  // voice proxy call in useVoice (the store resolves its own for the chat/history calls).
  const apiBase = resolveBaseEndpoint(appSettings, getManualEndpoint(appSettings.placementId));
  // Defaults to disabled — only a widget's own default-config.ts turning this on opts in.
  // A caller can turn it off (never true when the customization is off); unset follows the customization.
  const persistChatEnabled = customizations.chatbot?.persistChatEnabled === true && options.persistChatEnabled !== false;

  // Keyed by widgetClient and storeKey — never by sessionScopeKey/pid, which only change the storage key /
  // request param (a live conversation must continue when e.g. the prompt-box entry's pid changes).
  // The registry is already idempotent per client (a WeakMap), so the memo is only an
  // optimisation that also pins this mount to the store it started with (a
  // resetChatSessionStore() during rerender() only affects the remounted tree). The wishlist pids
  // are deliberately left out of the deps: the registry reads them only when it first creates
  // the client's store.
  const store = useMemo(
    () => getChatSessionStore(widgetClient, widgetConfig.initState?.wishlistProductIds || [], options.storeKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgetClient, options.storeKey],
  );
  // A layout effect, not a render-phase write: it commits before any passive effect (the restore and
  // voice-attach effects below), so the store's actions always see this render's config, and a render
  // that React discards or replays never leaks its config into the shared store. With several hooks on
  // one store, the last one to commit wins.
  useLayoutEffect(() => {
    store.configure({
      widgetClient,
      widgetConfig,
      persistChatEnabled,
      storageScopeKey: options.sessionScopeKey,
      pid: options.pid,
      suppressActionTokenCallbacks: options.suppressActionTokenCallbacks,
    });
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // The composer text is local to each hook, so two surfaces never share a half-typed draft.
  const [message, setMessage] = useState('');

  // Bridges sendMessage (declared below) to onTranscript, since useVoiceReply is instantiated
  // before sendMessage exists.
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  const setIsWaiting = useCallback((isWaiting: boolean): void => store.setState({ isWaiting }), [store]);

  const {
    voiceEnabled,
    speechOutputEnabled,
    voiceStatus,
    liveTranscript,
    hasVoiceError,
    hasSpeechOutputError,
    isVoiceReadingEnabled,
    typewriterText,
    isSpeechPlaying,
    focusedProductId,
    startVoiceRecording,
    stopRecording,
    stopAudio,
    toggleVoiceReading,
    interruptSpeech,
    shouldSpeakReply,
    isVoiceReadingEnabledNow,
    beginReply,
    updateLatestMessage,
    speak,
    hasPendingSpeech,
    deferCommit,
    forceRevealTypewriter,
    getTypewriterLength,
    resetReplyState,
  } = useVoiceReply({
    // Mirrors shopping-assistant's chatbot.voiceEnabled master switch: unset (or false) means
    // voice is off. Actual availability additionally gates on browser support via
    // `voiceEnabled`/`speechOutputEnabled`, returned below.
    enabled: customizations.chatbot?.voiceEnabled,
    appKey: appSettings.appKey,
    placementId: appSettings.placementId,
    baseUrl: apiBase,
    voiceId: customizations.chatbot?.voiceId,
    voiceModelId: customizations.chatbot?.voiceModelId,
    voiceStability: customizations.chatbot?.voiceSettings?.stability,
    voiceSimilarityBoost: customizations.chatbot?.voiceSettings?.similarityBoost,
    onTranscript: (text): void => sendMessageRef.current(text),
    setIsWaiting,
  });

  const shouldAttachVoice = options.attachVoice !== false;
  // Re-attached after every render (no dependency array) so the store always calls this render's
  // voice helpers; the cleanup only detaches if this hook's bridge is still the attached one.
  // Declared before the restore effect so the bridge is in place before any store action runs.
  useEffect(() => {
    if (!shouldAttachVoice) {
      return undefined;
    }
    return store.attachVoice({
      beginReply,
      updateLatestMessage,
      speak,
      hasPendingSpeech,
      deferCommit,
      forceRevealTypewriter,
      getTypewriterLength,
      resetReplyState,
      stopAudio,
      interruptSpeech,
      shouldSpeakReply,
      isVoiceReadingEnabledNow,
    });
  });

  // Mirrors shopping-assistant's own (pre-extraction) live-transcript behavior: reflect the
  // in-progress transcript into the chat input as the user speaks, so it's visible in the chatbox
  // the same way a typed message would be, rather than only appearing once recording stops.
  useEffect(() => {
    if (voiceStatus === 'recording' || voiceStatus === 'transcribing') {
      setMessage(liveTranscript);
    }
  }, [liveTranscript, voiceStatus]);

  // The store's sendMessage, plus clearing this hook's composer — but only when the store will
  // actually send (mirrors its early return: no text and no image, a bare pid included, is a no-op).
  const sendMessage = useCallback((messageToSend?: string, secondArg?: SearchImageOrPid): Promise<void> => {
    const imageToSend = secondArg && isPid(secondArg) ? undefined : secondArg;
    if (messageToSend || imageToSend) {
      setMessage('');
    }
    return store.sendMessage(messageToSend, secondArg);
  }, [store]);

  useEffect(() => {
    // Guards against a voice transcript that finalizes after the full-screen container has
    // closed: without this, a late onTranscript callback would fire a request into a closed UI
    // and speak a reply aloud with nothing visible. Reads the store's live isOpen.
    sendMessageRef.current = (text: string): void => {
      if (!store.getSnapshot().isOpen) {
        return;
      }
      sendMessage(text);
    };
  });

  // Runs on mount so a returning visitor's chatId (and chats, once fetched) is already in place by
  // the time they open the dialog. The store latches it, so a second hook never re-runs it.
  useEffect(() => {
    store.restoreIfStored();
  }, [store]);

  // Stable per store, so e.g. ProductGrid's memoization isn't defeated by a fresh function
  // identity on every render.
  const actions = useMemo(() => ({
    open: (): void => store.open(),
    close: (): void => store.close(),
    reopen: (): void => store.reopen(),
    newChat: (): void => store.newChat(),
    setShowAllSuggestions: (): void => store.setShowAllSuggestions(),
    setIsInWishlist: (pid: string, isInWishlist: boolean): void => store.setIsInWishlist(pid, isInWishlist),
    playGreeting: (text: string): void => store.playGreeting(text),
    pushAssistantMessage: (text: string, nextSteps?: string[]): void => store.pushAssistantMessage(text, nextSteps),
    setActiveBreadcrumb: (requestId: string): void => store.setActiveBreadcrumb(requestId),
  }), [store]);

  // Narrates `text` under the same conditions as playGreeting (voiceGreetingEnabled, not muted,
  // no reply already in flight), but — deliberately — never touches `chats`. For a caller whose
  // prompt (e.g. ai-search-launcher's camera/mic entry copy) must never become part of the
  // conversation's real, persisted history: an abandoned camera/mic screen must leave no trace,
  // and re-opening the same entry point must narrate its prompt again every time, not just once.
  const speakText = (text: string): void => {
    if (!text) {
      return;
    }
    if (customizations.chatbot?.voiceGreetingEnabled && shouldSpeakReply()) {
      resetReplyState();
      speak(text, text.length, null, true);
    }
  };

  // An explicit field list — never `...state` — so no internal store field leaks into the API.
  return {
    chats: state.chats,
    isWaiting: state.isWaiting,
    allowUserInput: state.allowUserInput,
    message,
    setMessage,
    showAllSuggestions: state.showAllSuggestions,
    setShowAllSuggestions: actions.setShowAllSuggestions,
    suggestions: state.suggestions,
    streamingProducts: state.streamingProducts,
    streamingRequestId: state.streamingRequestId,
    focusedProductId,
    typewriterText,
    hasStartedChat: state.hasStartedChat,
    isOpen: state.isOpen,
    // Read at render; re-renders on change because the store keeps state.chatId in sync.
    chatId: store.getChatId(),
    getChatId: store.getChatId,
    open: actions.open,
    close: actions.close,
    reopen: actions.reopen,
    newChat: actions.newChat,
    sendMessage,
    wishlistPids: state.wishlistPids,
    setIsInWishlist: actions.setIsInWishlist,
    voiceEnabled,
    speechOutputEnabled,
    voiceStatus,
    liveTranscript,
    hasVoiceError,
    hasSpeechOutputError,
    isVoiceReadingEnabled,
    toggleVoiceReading,
    isSpeechPlaying,
    startVoiceRecording,
    stopRecording,
    hasPendingSpeech,
    playGreeting: actions.playGreeting,
    speakText,
    pushAssistantMessage: actions.pushAssistantMessage,
    breadcrumbs: state.breadcrumbs,
    activeBreadcrumbId: state.activeBreadcrumbId,
    setActiveBreadcrumb: actions.setActiveBreadcrumb,
  };
};

export default useChat;
