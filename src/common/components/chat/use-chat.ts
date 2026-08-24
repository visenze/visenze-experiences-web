import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  extractActionTokens,
  extractSpeakableSentences,
  extractSuggestions,
  resolveProducts,
  stripTokensForDisplay,
  useVoiceReply,
  type VoiceStatus,
} from '../../assistant';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../client/endpoint';
import { WidgetDataContext } from '../../types/contexts';
import { isImageFile, isImageUrl, type SearchImageOrPid } from '../../types/image';
import type { ProcessedProduct } from '../../types/product';
import { Actions, Category } from '../../types/tracking-constants';
import { getFlattenProduct } from '../../utils';

export interface Chat {
  chatId: string;
  requestId: string;
  author: 'user' | 'bot' | 'products';
  messages: string[];
  products?: ProcessedProduct[];
  image?: SearchImageOrPid;
}

interface CompletedResponse {
  chatId: string;
  requestId: string;
  text: string;
  products: ProcessedProduct[];
  userMessage: string;
}

export interface BreadcrumbTurn {
  requestId: string;
  label: string;
  products: ProcessedProduct[];
}

const MAX_BREADCRUMB_LABEL_LENGTH = 40;

const truncateLabel = (text: string): string => (
  text.length > MAX_BREADCRUMB_LABEL_LENGTH ? `${text.slice(0, MAX_BREADCRUMB_LABEL_LENGTH - 1)}…` : text
);

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
  open: () => void;
  close: () => void;
  newChat: () => void;
  sendMessage: (message?: string, image?: SearchImageOrPid) => Promise<void>;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
  voiceEnabled: boolean;
  speechOutputEnabled: boolean;
  voiceStatus: VoiceStatus;
  liveTranscript: string;
  hasVoiceError: boolean;
  isVoiceReadingEnabled: boolean;
  toggleVoiceReading: () => void;
  isSpeechPlaying: boolean;
  startVoiceRecording: () => void;
  stopRecording: () => void;
  hasPendingSpeech: () => boolean;
  playGreeting: (text: string) => void;
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  setActiveBreadcrumb: (requestId: string) => void;
}

// Orchestrates a widget's full-screen chat surface: the SSE call to the backend chat endpoint,
// token-stream parsing (product/action-token/suggestion extraction), and the voice-reply
// integration (typewriter reveal + spoken narration) from `useVoiceReply`. Shared by any widget
// that mounts the chat surface (ChatWindow + FullScreenChatContainer) behind its own trigger —
// `isOpen`/`open`/`close` are deliberately generic (no baked-in entry-point concept) so each
// widget can layer its own trigger/entry-point state on top. Modeled closely on
// shopping-assistant.tsx's `sendMessage`/`commitResponse`/`openDialog` (see that file for the
// original) but with its own trimmed-down state shape and without the scripted two-part opening
// message — greetings are a single string played by callers via `playGreeting`.
const useChat = (): UseChatResult => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  // Resolve the API base, honouring manual endpoint > cloud > API endpoint > default; shared by
  // the chat SSE call below and the voice proxy call in useVoice.
  const manualEndpoint = getManualEndpoint(appSettings.placementId);
  const apiBase = resolveBaseEndpoint(appSettings, manualEndpoint);

  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [showAllSuggestions, setShowAllSuggestionsState] = useState(false);
  const [allowUserInput, setAllowUserInput] = useState(false);
  const [showResponseExtras, setShowResponseExtras] = useState(true);
  const [streamingProducts, setStreamingProducts] = useState<ProcessedProduct[]>([]);
  const [streamingRequestId, setStreamingRequestId] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [wishlistPids, setWishlistPids] = useState<string[]>(widgetConfig.initState?.wishlistProductIds || []);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbTurn[]>([]);
  const [activeBreadcrumbId, setActiveBreadcrumb] = useState<string | null>(null);

  // Bridges sendMessage (declared below) to onTranscript, since useVoiceReply is instantiated
  // before sendMessage exists (sendMessage itself needs the reply helpers useVoiceReply returns).
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  // Aborts the in-flight SSE call (see resetChatState) so a late onclose/onmessage from a
  // previous session can't bleed a stale reply into the freshly-reset chat log.
  const activeStreamControllerRef = useRef<AbortController | null>(null);

  // Identifies the optimistically-added breadcrumb for the in-flight query (see sendMessage)
  // so commitResponse can reconcile it in place once the real requestId/products are known,
  // rather than appending a second entry.
  const pendingBreadcrumbIdRef = useRef<string | null>(null);
  const pendingBreadcrumbCounterRef = useRef(0);
  // Captured right before a pending breadcrumb is added, so it can be restored if that turn
  // ends up producing no products (matching the pre-existing rule that text-only turns never
  // get a breadcrumb).
  const preBreadcrumbActiveIdRef = useRef<string | null>(null);

  const {
    voiceEnabled,
    speechOutputEnabled,
    voiceStatus,
    liveTranscript,
    hasVoiceError,
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
    // Mirrors shopping-assistant's chatbot.voiceEnabled master switch, but defaults to enabled
    // (unset or anything but explicit `false`) to preserve the default always-on behavior.
    // Actual availability additionally gates on browser support via
    // `voiceEnabled`/`speechOutputEnabled`, returned below.
    enabled: customizations.chat?.voiceEnabled !== false,
    appKey: appSettings.appKey,
    placementId: appSettings.placementId,
    baseUrl: apiBase,
    voiceId: customizations.chat?.voiceId,
    voiceModelId: customizations.chat?.voiceModelId,
    voiceStability: customizations.chat?.voiceSettings?.stability,
    voiceSimilarityBoost: customizations.chat?.voiceSettings?.similarityBoost,
    onTranscript: (text): void => sendMessageRef.current(text),
    setIsWaiting,
  });

  const setShowAllSuggestions = (): void => setShowAllSuggestionsState(true);

  const setIsInWishlist = (pid: string, isInWishlist: boolean): void => {
    setWishlistPids((prev) => {
      const newPids = [...prev];
      if (isInWishlist && !newPids.includes(pid)) {
        newPids.push(pid);
      }
      if (!isInWishlist && newPids.includes(pid)) {
        newPids.splice(newPids.indexOf(pid), 1);
      }
      return newPids;
    });
  };

  const commitResponse = ({
    chatId: responseChatId, requestId, text, products, userMessage,
  }: CompletedResponse): void => {
    if (products.length) {
      const requestMetadata = {
        queryId: requestId,
        cat: Category.RESULT,
      };
      widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
      widgetClient.setLastTrackingMeta(requestMetadata);
    }
    setChats((prevChats) => {
      const newChats = [...prevChats];
      if (text) {
        newChats.push({
          chatId: responseChatId,
          requestId,
          messages: [text],
          author: 'bot',
          products: [],
        });
      }
      if (products.length) {
        newChats.push({
          chatId: responseChatId,
          requestId,
          messages: [],
          author: 'products',
          products,
        });
      }
      return newChats;
    });
    const pendingId = pendingBreadcrumbIdRef.current;
    pendingBreadcrumbIdRef.current = null;
    if (products.length) {
      // Append-only: every turn with results becomes a new breadcrumb. There is no
      // refinement-vs-new-search classification — an earlier keyword-overlap heuristic was tried
      // and removed after real usage showed it misclassified ordinary category switches as
      // "unrelated," silently wiping the trail (and any hint line still pointing at a pruned
      // breadcrumb rendered a blank products pane). The trail now only ever resets via "New Chat".
      const newTurn: BreadcrumbTurn = {
        requestId,
        label: truncateLabel(userMessage),
        products,
      };
      setBreadcrumbs((prevBreadcrumbs) => {
        // Reconcile the optimistic placeholder sendMessage added in place, rather than appending
        // a second entry for the same turn. Falls back to appending if the placeholder is gone
        // (e.g. the user truncated the trail past it while the response was still streaming).
        const pendingIndex = pendingId ? prevBreadcrumbs.findIndex((crumb) => crumb.requestId === pendingId) : -1;
        if (pendingIndex === -1) {
          return [...prevBreadcrumbs, newTurn];
        }
        const reconciled = [...prevBreadcrumbs];
        reconciled[pendingIndex] = newTurn;
        return reconciled;
      });
      setActiveBreadcrumb(requestId);
    } else if (pendingId) {
      // This turn produced no products, so it never earns a breadcrumb — drop the placeholder
      // and restore whichever breadcrumb was active before the query was sent.
      setBreadcrumbs((prevBreadcrumbs) => prevBreadcrumbs.filter((crumb) => crumb.requestId !== pendingId));
      setActiveBreadcrumb(preBreadcrumbActiveIdRef.current);
    }
    setStreamingProducts([]);
    setStreamingRequestId('');
    resetReplyState();
    setAllowUserInput(true);
    setShowResponseExtras(true);
  };

  const sendMessage = async (messageToSend?: string, imageToSend?: SearchImageOrPid): Promise<void> => {
    if (!messageToSend && !imageToSend) {
      return;
    }
    setIsWaiting(true);
    setShowAllSuggestionsState(false);
    setMessage('');
    setSuggestions([]);
    setStreamingProducts([]);
    setStreamingRequestId('');
    const willSpeakReply = beginReply();
    setShowResponseExtras(false);
    setHasStartedChat(true);
    setChats((prevChats) => [
      ...prevChats,
      {
        chatId: '',
        requestId: '',
        author: 'user',
        messages: messageToSend ? [messageToSend] : [],
        image: imageToSend,
      },
    ]);

    // Adds the query to the breadcrumb trail immediately, rather than waiting for the response to
    // finish streaming. Uses a locally-generated placeholder id (the real requestId only arrives
    // via the 'reqid' SSE event below) so commitResponse can find and reconcile this exact entry
    // once the turn completes — see pendingBreadcrumbIdRef.
    pendingBreadcrumbCounterRef.current += 1;
    const pendingBreadcrumbId = `pending-${pendingBreadcrumbCounterRef.current}`;
    pendingBreadcrumbIdRef.current = pendingBreadcrumbId;
    preBreadcrumbActiveIdRef.current = activeBreadcrumbId;
    setBreadcrumbs((prevBreadcrumbs) => [
      ...prevBreadcrumbs,
      { requestId: pendingBreadcrumbId, label: truncateLabel(messageToSend || ''), products: [] },
    ]);
    setActiveBreadcrumb(pendingBreadcrumbId);

    let chatIdFromResp = '';
    let reqIdFromResp = '';
    let spokenLength = 0;
    const tokens: string[] = [];
    const handledActionTokens = new Set<string>();
    const products: ProcessedProduct[] = [];
    // Retrieve user id and session id from ViSearch client
    let uid = '';
    let sid = '';
    widgetClient.visearch.getUid((uidResp) => {
      uid = uidResp;
    });
    widgetClient.visearch.getSid((sidResp) => {
      sid = sidResp;
    });
    setAllowUserInput(false);
    const params = new URLSearchParams({
      ...widgetConfig.searchSettings,
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: chatId,
      q: messageToSend || 'Find me products that look like the main product in this image and are the same color as the main product',
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
      chat_agent: customizations.chat?.chatAgent || 'shopping_closer_voice_v2',
    });
    // A gallery/preset image only ever reaches here as a URL (see ImageEntryScreen's gallery
    // tiles), never as bytes the browser already has — sending it as `im_url` lets the backend
    // fetch it itself, the same mechanism the multisearch endpoints use (see
    // use-image-multisearch.ts), rather than requiring the browser to fetch cross-origin bytes
    // that the image host may not have CORS-enabled for (it only needs to serve plain <img> tags).
    if (imageToSend && isImageUrl(imageToSend)) {
      params.append('im_url', imageToSend.imgUrl);
    }

    const formData = new FormData();
    if (imageToSend && isImageFile(imageToSend)) {
      formData.append('image', imageToSend.files[0]);
    }

    const chatPath = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/chat/shopping-assistant'
      : '/v1/product/multisearch/chat/shopping-assistant';

    const controller = new AbortController();
    activeStreamControllerRef.current = controller;

    await fetchEventSource(`${apiBase}${chatPath}?${params.toString()}`, {
      method: 'POST',
      body: formData,
      openWhenHidden: true,
      signal: controller.signal,
      onmessage: (ev) => {
        if (ev.event === 'chat_id') {
          chatIdFromResp = JSON.parse(ev.data).value;
        } else if (ev.event === 'reqid') {
          reqIdFromResp = JSON.parse(ev.data).value;
          setStreamingRequestId(reqIdFromResp);
        } else if (ev.event === 'chat_token') {
          if (!willSpeakReply || !isVoiceReadingEnabledNow()) {
            setIsWaiting(false);
          }
          tokens.push(JSON.parse(ev.data).value);
          const currentText = tokens.join('');
          extractActionTokens(currentText).forEach(({ action, productId, key }) => {
            if (handledActionTokens.has(key)) {
              return;
            }
            handledActionTokens.add(key);
            const callback = action === 'ADD_TO_CART'
              ? widgetConfig.callbacks.onAddToCartToggle
              : widgetConfig.callbacks.onAddToWishlistToggle;
            if (callback) {
              try {
                const callbackResult = callback(true, productId);
                Promise.resolve(callbackResult).catch((err: unknown) => console.error(err));
              } catch (err) {
                console.error(err);
              }
            }
          });
          setSuggestions(extractSuggestions(currentText));
          const displayText = stripTokensForDisplay(currentText).trim();
          updateLatestMessage(displayText);
          setStreamingProducts(resolveProducts(currentText, products));
          if (willSpeakReply && isVoiceReadingEnabledNow()) {
            const { sentences, spokenLength: newSpokenLength } = extractSpeakableSentences(currentText, spokenLength);
            sentences.forEach(({ chunk, revealTarget, productId }) => {
              speak(chunk, revealTarget, productId);
            });
            spokenLength = newSpokenLength;
          }
        } else if (ev.event === 'product') {
          products.push(getFlattenProduct(JSON.parse(ev.data)));
          setStreamingProducts(resolveProducts(tokens.join(''), products));
        }
      },
      onclose: () => {
        const currentText = tokens.join('');
        setSuggestions(extractSuggestions(currentText));
        const finalText = stripTokensForDisplay(currentText).trim();
        const finalProducts = resolveProducts(currentText, products);
        updateLatestMessage(finalText);
        setStreamingProducts(finalProducts);
        const completedResponse = {
          chatId: chatIdFromResp,
          requestId: reqIdFromResp,
          text: finalText,
          products: finalProducts,
          userMessage: messageToSend || '',
        };
        if (willSpeakReply && isVoiceReadingEnabledNow()) {
          const { sentences } = extractSpeakableSentences(currentText, spokenLength, { includeTrailing: true });
          sentences.forEach(({ chunk, revealTarget, productId }) => {
            speak(chunk, revealTarget, productId);
          });
          if (hasPendingSpeech()) {
            deferCommit(() => commitResponse(completedResponse));
          } else {
            setIsWaiting(false);
            forceRevealTypewriter(finalText);
            commitResponse(completedResponse);
          }
        } else if (finalText && getTypewriterLength() < finalText.length) {
          deferCommit(() => commitResponse(completedResponse));
        } else {
          commitResponse(completedResponse);
        }
      },
      onerror: (err) => {
        console.error(err);
      },
    });
  };

  useEffect(() => {
    // Guards against a voice transcript that finalizes after the full-screen container has
    // closed: without this, a late onTranscript callback would fire a request into a closed UI
    // and speak a reply aloud with nothing visible. No dependency array — this re-runs every
    // render and recaptures the latest `isOpen` value in its closure.
    sendMessageRef.current = (text: string): void => {
      if (!isOpen) {
        return;
      }
      sendMessage(text);
    };
  });

  const resetChatState = (): void => {
    activeStreamControllerRef.current?.abort();
    activeStreamControllerRef.current = null;
    stopAudio();
    resetReplyState();
    pendingBreadcrumbIdRef.current = null;
    preBreadcrumbActiveIdRef.current = null;
    setChats([]);
    setBreadcrumbs([]);
    setActiveBreadcrumb(null);
    setStreamingProducts([]);
    setStreamingRequestId('');
    setSuggestions([]);
    setShowAllSuggestionsState(false);
    setShowResponseExtras(true);
    setIsWaiting(false);
    setAllowUserInput(true);
    setHasStartedChat(false);
  };

  const open = (): void => {
    setIsOpen(true);
    resetChatState();
    widgetClient.visearch.generateUuid((uuid) => {
      setChatId(uuid);
    });
  };

  const close = (): void => {
    // Deliberately does NOT call resetChatState() — by design, closing the full-screen surface
    // does not clear chat history/state (only opening or starting a new chat does, both via
    // resetChatState()). But a stream still in flight must still be aborted here, otherwise a
    // late onclose/onmessage would append the old conversation's reply after the user has
    // already navigated away, and fire RESULT_LOAD/setLastTrackingMeta for a session the UI no
    // longer shows.
    activeStreamControllerRef.current?.abort();
    activeStreamControllerRef.current = null;
    interruptSpeech();
    setIsOpen(false);
  };

  const newChat = (): void => {
    resetChatState();
    widgetClient.visearch.generateUuid((uuid) => {
      setChatId(uuid);
    });
  };

  const playGreeting = (text: string): void => {
    if (!text) {
      return;
    }
    // Always show the greeting as a visible chat bubble first (mirrors shopping-assistant's
    // openDialog/newChat opening messages) — speech below is additional narration on top, never a
    // replacement for the text.
    setChats((prevChats) => [
      ...prevChats,
      {
        chatId: '',
        requestId: '',
        author: 'bot',
        messages: [text],
        products: [],
      },
    ]);
    if (customizations.chat?.voiceGreetingEnabled && shouldSpeakReply()) {
      resetReplyState();
      speak(text, text.length, null);
    }
  };

  return {
    chats,
    isWaiting,
    allowUserInput,
    message,
    setMessage,
    showAllSuggestions,
    setShowAllSuggestions,
    suggestions: showResponseExtras ? suggestions : [],
    streamingProducts,
    streamingRequestId,
    focusedProductId,
    typewriterText,
    hasStartedChat,
    isOpen,
    open,
    close,
    newChat,
    sendMessage,
    wishlistPids,
    setIsInWishlist,
    voiceEnabled,
    speechOutputEnabled,
    voiceStatus,
    liveTranscript,
    hasVoiceError,
    isVoiceReadingEnabled,
    toggleVoiceReading,
    isSpeechPlaying,
    startVoiceRecording,
    stopRecording,
    hasPendingSpeech,
    playGreeting,
    breadcrumbs,
    activeBreadcrumbId,
    setActiveBreadcrumb,
  };
};

export default useChat;
