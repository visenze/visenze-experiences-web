import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Product } from 'visearch-javascript-sdk';
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
import { getBestImageSysAttrsToGet, getFlattenProduct } from '../../utils';

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
  suggestions: string[];
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

// History-endpoint product tokens are `[[pid - Title]]`, unlike the live stream's bare `[[pid]]`
// — strip the title suffix so stripTokensForDisplay/resolveProducts can still match them.
const normalizeHistoryProductTokens = (text: string): string => (
  text.replace(/\[\[([^\]]+)]]/g, (_match, tokenContent: string) => `[[${tokenContent.trim().split(/\s/)[0]}]]`)
);

const CHAT_ID_STORAGE_PREFIX = 'visenze_shopping_assistant_chat_id_';
// Default for customizations.chatbot.persistChatTtlMinutes when unset.
const DEFAULT_CHAT_ID_TTL_MINUTES = 30;

interface StoredChatId {
  chatId: string;
  timestamp: number;
}

// Only the chat id (plus a sliding TTL) is stored client-side; messages are always re-fetched
// from the backend on restore (see fetchChatHistory) so the UI can't drift from the server.
const loadStoredChatId = (key: string, ttlMs: number): string | undefined => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }
  try {
    const stored = JSON.parse(raw) as StoredChatId;
    if (stored.chatId && stored.timestamp && Date.now() - stored.timestamp <= ttlMs) {
      return stored.chatId;
    }
  } catch {
    // Ignore a malformed value and fall back to a fresh session.
  }
  return undefined;
};

// Called on open/send/close to slide the TTL forward instead of expiring mid-conversation.
const persistChatId = (key: string, chatId: string): void => {
  const snapshot: StoredChatId = { chatId, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(snapshot));
};

interface ChatHistoryMessage {
  reqid: string;
  type: string;
  message: string;
  products?: Product[];
}

interface RestoredChatSession {
  chats: Chat[];
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  suggestions: string[];
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
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  setActiveBreadcrumb: (requestId: string) => void;
}

export interface UseChatOptions {
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
const useChat = (options: UseChatOptions = {}): UseChatResult => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  // Resolve the API base, honouring manual endpoint > cloud > API endpoint > default; shared by
  // the chat SSE call below and the voice proxy call in useVoice.
  const manualEndpoint = getManualEndpoint(appSettings.placementId);
  const apiBase = resolveBaseEndpoint(appSettings, manualEndpoint);
  // Defaults to disabled — only a widget's own default-config.ts turning this on opts in.
  const persistChatEnabled = customizations.chatbot?.persistChatEnabled === true;
  const persistChatTtlMs = (customizations.chatbot?.persistChatTtlMinutes ?? DEFAULT_CHAT_ID_TTL_MINUTES) * 60 * 1000;
  // See sessionScopeKey's own doc comment: appended so a caller can scope the stored session to
  // more than just the placement id.
  const chatIdStorageKey = `${CHAT_ID_STORAGE_PREFIX}${appSettings.placementId}${options.sessionScopeKey ? `__${options.sessionScopeKey}` : ''}`;

  const [chats, setChats] = useState<Chat[]>([]);
  // The session/conversation chatId sendMessage sends as `chat_id`. A ref, not state: it was
  // state until a deferred caller (e.g. a setTimeout(0) queued right after open()/newChat())
  // turned out to always close over the render's chatId *value* at the time that particular
  // sendMessage/closure was created — open()/newChat()'s setChatId call only takes effect on a
  // later render, which the already-created closure has no way to observe, so the deferred send
  // fired with the stale pre-open/pre-newChat id forever, no matter how long it waited.
  const chatIdRef = useRef('');
  // Bumped whenever chatIdRef changes, purely to force a re-render so the exposed `chatId`
  // (which reads off chatIdRef.current) reflects it — never read back out itself.
  const [, setChatIdVersion] = useState(0);
  // Reads chatIdRef.current live, unlike the exposed `chatId` field (a plain string snapshotted
  // at render time). Needed by a caller that must know synchronously, in its own mount effect,
  // whether the hook's *own* mount-time restore effect (below) already found a resumable session
  // — since both effects fire in the same initial flush, a caller reading the snapshotted `chatId`
  // there would still see this render's pre-restore value, even though the restore effect (which
  // runs first) already mutated the ref by the time the caller's own effect runs.
  const getChatId = useCallback((): string => chatIdRef.current, []);
  const [message, setMessage] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [showAllSuggestions, setShowAllSuggestionsState] = useState(false);
  const [allowUserInput, setAllowUserInput] = useState(false);
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

  const setShowAllSuggestions = (): void => setShowAllSuggestionsState(true);

  // Mirrors shopping-assistant's own (pre-extraction) live-transcript behavior: reflect the
  // in-progress transcript into the chat input as the user speaks, so it's visible in the chatbox
  // the same way a typed message would be, rather than only appearing once recording stops.
  useEffect(() => {
    if (voiceStatus === 'recording' || voiceStatus === 'transcribing') {
      setMessage(liveTranscript);
    }
  }, [liveTranscript, voiceStatus]);

  // Stable across renders (no dependencies — uses the functional setState form) so ProductGrid's
  // memoization isn't defeated by a fresh function identity on every ChatWindow render.
  const setIsInWishlist = useCallback((pid: string, isInWishlist: boolean): void => {
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
  }, []);

  const commitResponse = ({
    chatId: responseChatId, requestId, text, products, userMessage, suggestions: newSuggestions,
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
    // Suggestion chips are only ever set here, once the full response is committed — never
    // mid-stream — so they can't flash on screen before the response they belong to is visible.
    setSuggestions(newSuggestions);
  };

  const sendMessage = async (messageToSend?: string, imageToSend?: SearchImageOrPid): Promise<void> => {
    if (!messageToSend && !imageToSend) {
      return;
    }
    // Abort any still-in-flight stream before starting a new one — otherwise the old controller
    // is silently orphaned (never aborted) and its onclose can land a second, overlapping reply
    // after this one, e.g. if a voice transcript finalizes while a typed message is already
    // streaming.
    activeStreamControllerRef.current?.abort();
    // Lazily mints the session's chat id on its first real message. A caller can leave chatIdRef
    // unset going into this call — ai-search-launcher's camera/mic entry points deliberately do
    // (see openEntryPoint) so that merely opening one, without the user ever submitting anything,
    // never mints or persists an id at all. Without this, that first send would go out with an
    // empty chat_id and every later message in the same conversation would too, since chatIdRef is
    // never re-derived from the backend's own response (see chatIdRef's own comment) — the server
    // would treat each one as an unrelated new conversation.
    if (!chatIdRef.current) {
      widgetClient.visearch.generateUuid((uuid) => {
        chatIdRef.current = uuid;
        setChatIdVersion((v) => v + 1);
      });
    }
    // Slides the resumable-session TTL forward, same as open()/close().
    if (persistChatEnabled && chatIdRef.current) {
      persistChatId(chatIdStorageKey, chatIdRef.current);
    }
    setIsWaiting(true);
    setShowAllSuggestionsState(false);
    setMessage('');
    setSuggestions([]);
    setStreamingProducts([]);
    setStreamingRequestId('');
    const willSpeakReply = beginReply();
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
      chat_id: chatIdRef.current,
      q: messageToSend || 'Find me products that look like the main product in this image and are the same color as the main product',
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
      sys_attrs_to_get: getBestImageSysAttrsToGet(customizations),
      chat_agent: customizations.chatbot?.chatAgent || 'shopping_closer_voice_v2',
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

    try {
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
              if (callback && !options.suppressActionTokenCallbacks) {
                try {
                  const callbackResult = callback(true, productId);
                  Promise.resolve(callbackResult).catch((err: unknown) => console.error(err));
                } catch (err) {
                  console.error(err);
                }
              }
            });
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
            suggestions: extractSuggestions(currentText),
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
          // fetchEventSource swallows a thrown-less onerror as "keep retrying forever, silently,
          // with no onclose and no UI feedback" (see its retry loop). Since isWaiting has usually
          // already been cleared by the first chat_token by this point, that left the chat looking
          // permanently stuck after a transient network drop: no loading indicator, no reply, and
          // input still blocked. Rethrowing turns it into a single failure the catch below recovers
          // from immediately instead of an invisible infinite retry loop.
          throw err;
        },
      });
      // fetchEventSource resolves (rather than rejects) its promise when the signal it was given
      // aborts — it never reaches the catch block below on its own. Without this, a call superseded
      // by a newer sendMessage (see the abort() above) would resolve normally and skip the pending
      // breadcrumb cleanup in the catch block, leaving that call's optimistic breadcrumb stranded.
      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }
    } catch (err) {
      // Drop this call's own optimistic breadcrumb placeholder unconditionally — covers both a
      // genuine error below and being superseded by a newer sendMessage (whose abort() call is
      // what lands us here with controller.signal.aborted already true). Keyed off the
      // locally-captured pendingBreadcrumbId rather than the ref, since a superseding call has
      // already overwritten pendingBreadcrumbIdRef.current with its own id by the time this runs.
      if (pendingBreadcrumbIdRef.current === pendingBreadcrumbId) {
        pendingBreadcrumbIdRef.current = null;
      }
      setBreadcrumbs((prevBreadcrumbs) => prevBreadcrumbs.filter((crumb) => crumb.requestId !== pendingBreadcrumbId));
      if (!controller.signal.aborted) {
        console.error(err);
        setIsWaiting(false);
        setStreamingProducts([]);
        setStreamingRequestId('');
        resetReplyState();
        setAllowUserInput(true);
        setActiveBreadcrumb(preBreadcrumbActiveIdRef.current);
      }
    }
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

  // Re-fetches a previous conversation from the backend, given a chat id recovered from
  // localStorage. Rebuilds chats/breadcrumbs with the same helpers the live stream uses, so the
  // two paths can't drift apart on how a response is displayed.
  const fetchChatHistory = async (chatIdToRestore: string): Promise<RestoredChatSession | null> => {
    let uid = '';
    let sid = '';
    widgetClient.visearch.getUid((uidResp) => { uid = uidResp; });
    widgetClient.visearch.getSid((sidResp) => { sid = sidResp; });
    const params = new URLSearchParams({
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: chatIdToRestore,
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
      sys_attrs_to_get: getBestImageSysAttrsToGet(customizations),
    });
    const historyPath = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/chat/history'
      : '/v1/multisearch/chat/history';
    const res = await fetch(`${apiBase}${historyPath}?${params.toString()}`);
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const messages = (json?.result?.messages || []) as ChatHistoryMessage[];
    if (messages.length === 0) {
      return null;
    }

    const restoredChats: Chat[] = [];
    const restoredBreadcrumbs: BreadcrumbTurn[] = [];
    let restoredActiveBreadcrumbId: string | null = null;
    let lastUserMessage = '';
    // Mirrors the live path: the LAST message wins — a trailing human turn leaves none, a
    // trailing ai reply's own ((suggestion)) chips apply.
    let restoredSuggestions: string[] = [];

    messages.forEach((historyMessage) => {
      if (historyMessage.type === 'human') {
        lastUserMessage = historyMessage.message;
        restoredSuggestions = [];
        restoredChats.push({
          chatId: chatIdToRestore,
          requestId: historyMessage.reqid,
          author: 'user',
          messages: [historyMessage.message],
        });
        return;
      }

      const normalizedText = normalizeHistoryProductTokens(historyMessage.message);
      const historyProducts = (historyMessage.products || []).map((p) => getFlattenProduct(p));
      const resolvedProducts = resolveProducts(normalizedText, historyProducts);
      const text = stripTokensForDisplay(normalizedText).trim();
      if (text) {
        restoredChats.push({
          chatId: chatIdToRestore,
          requestId: historyMessage.reqid,
          author: 'bot',
          messages: [text],
          products: [],
        });
      }
      if (resolvedProducts.length) {
        restoredChats.push({
          chatId: chatIdToRestore,
          requestId: historyMessage.reqid,
          author: 'products',
          messages: [],
          products: resolvedProducts,
        });
        restoredBreadcrumbs.push({
          requestId: historyMessage.reqid,
          label: truncateLabel(lastUserMessage),
          products: resolvedProducts,
        });
        restoredActiveBreadcrumbId = historyMessage.reqid;
      }
      restoredSuggestions = extractSuggestions(normalizedText);
    });

    return {
      chats: restoredChats,
      breadcrumbs: restoredBreadcrumbs,
      activeBreadcrumbId: restoredActiveBreadcrumbId,
      suggestions: restoredSuggestions,
    };
  };

  // Clears isWaiting/allowUserInput regardless of outcome, so a failed or empty fetch doesn't
  // get stuck looking like a reply is still streaming in.
  const restoreChatHistory = (chatIdToRestore: string): void => {
    fetchChatHistory(chatIdToRestore)
      .then((restored) => {
        if (restored) {
          setChats(restored.chats);
          setBreadcrumbs(restored.breadcrumbs);
          setActiveBreadcrumb(restored.activeBreadcrumbId);
          setSuggestions(restored.suggestions);
          setHasStartedChat(true);
          return;
        }
        // Nothing to resume (e.g. opened but never messaged, so no backend history) — clear the
        // id so callers' `chatId truthy → reopen()` doesn't keep resuming a blank surface.
        chatIdRef.current = '';
        setChatIdVersion((v) => v + 1);
        localStorage.removeItem(chatIdStorageKey);
      })
      .catch((err: unknown) => {
        console.error(err);
        chatIdRef.current = '';
        setChatIdVersion((v) => v + 1);
        localStorage.removeItem(chatIdStorageKey);
      })
      .finally(() => {
        setIsWaiting(false);
        setAllowUserInput(true);
      });
  };

  // Runs once on mount so a returning visitor's chatId (and chats, once fetched) is already in
  // place by the time they open the dialog. No valid stored id just leaves this untouched.
  useEffect(() => {
    if (!persistChatEnabled) {
      return;
    }
    const storedChatId = loadStoredChatId(chatIdStorageKey, persistChatTtlMs);
    if (!storedChatId) {
      return;
    }
    chatIdRef.current = storedChatId;
    setChatIdVersion((v) => v + 1);
    persistChatId(chatIdStorageKey, storedChatId);
    setIsWaiting(true);
    setAllowUserInput(false);
    restoreChatHistory(storedChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setIsWaiting(false);
    setAllowUserInput(true);
    setHasStartedChat(false);
  };

  const open = (): void => {
    setIsOpen(true);
    resetChatState();
    widgetClient.visearch.generateUuid((uuid) => {
      chatIdRef.current = uuid;
      setChatIdVersion((v) => v + 1);
      if (persistChatEnabled) {
        persistChatId(chatIdStorageKey, uuid);
      }
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
    // Slides the resumable-session TTL forward so a reopened session is still within the window.
    if (persistChatEnabled && chatIdRef.current) {
      persistChatId(chatIdStorageKey, chatIdRef.current);
    }
  };

  // For a caller that re-shows an already-live conversation after close() (e.g. re-expanding a
  // collapsed summary view) — sets isOpen back to true without open()'s resetChatState()/fresh-
  // chatId side effects, which would wrongly discard the conversation this call is meant to
  // resume. Needed because isOpen isn't just a visibility flag: sendMessageRef's onTranscript
  // handler (below) gates on it, so leaving it false after such a re-show would silently drop
  // any voice transcript that finalizes from then on, for the rest of the session.
  const reopen = (): void => {
    setIsOpen(true);
  };

  const newChat = (): void => {
    resetChatState();
    widgetClient.visearch.generateUuid((uuid) => {
      chatIdRef.current = uuid;
      setChatIdVersion((v) => v + 1);
      if (persistChatEnabled) {
        persistChatId(chatIdStorageKey, uuid);
      }
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
    if (customizations.chatbot?.voiceGreetingEnabled && shouldSpeakReply()) {
      resetReplyState();
      speak(text, text.length, null, true);
    }
  };

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

  return {
    chats,
    isWaiting,
    allowUserInput,
    message,
    setMessage,
    showAllSuggestions,
    setShowAllSuggestions,
    suggestions,
    streamingProducts,
    streamingRequestId,
    focusedProductId,
    typewriterText,
    hasStartedChat,
    isOpen,
    chatId: chatIdRef.current,
    getChatId,
    open,
    close,
    reopen,
    newChat,
    sendMessage,
    wishlistPids,
    setIsInWishlist,
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
    playGreeting,
    speakText,
    breadcrumbs,
    activeBreadcrumbId,
    setActiveBreadcrumb,
  };
};

export default useChat;
