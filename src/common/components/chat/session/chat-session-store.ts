import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { Product } from 'visearch-javascript-sdk';
import {
  extractActionTokens,
  extractSpeakableSentences,
  extractSuggestions,
  resolveProducts,
  stripTokensForDisplay,
} from '../../../assistant';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../../client/endpoint';
import { isImageFile, isImageUrl, isPid, type SearchImageOrPid } from '../../../types/image';
import type { ProcessedProduct } from '../../../types/product';
import { Actions, Category } from '../../../types/tracking-constants';
import { getBestImageSysAttrsToGet, getFlattenProduct } from '../../../utils';
import type { WidgetClient, WidgetConfig } from '../../../wigmix-core';
import { getActiveOptionFields, resolveOptionFields } from '../../add-to-cart-options/add-to-cart-options';
import type { BreadcrumbTurn, Chat } from '../use-chat';
import {
  buildChatIdStorageKey,
  buildInjectedStorageKey,
  type InjectedMessage,
  loadInjectedMessages,
  loadStoredChatId,
  mergeInjectedMessages,
  persistChatId,
  persistInjectedMessages,
  removeStoredItem,
} from './chat-session-storage';
import type { VoiceBridge } from './voice-bridge';
import { NULL_VOICE_BRIDGE } from './voice-bridge';

export interface CompletedResponse {
  chatId: string;
  requestId: string;
  text: string;
  products: ProcessedProduct[];
  userMessage: string;
  suggestions: string[];
  // Products the AI asked to add to cart that still need add-to-cart options chosen.
  addToCartOptionsProducts: ProcessedProduct[];
}

export interface ChatHistoryMessage {
  reqid: string;
  type: string;
  message: string;
  products?: Product[];
}

export interface RestoredChatSession {
  chats: Chat[];
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  suggestions: string[];
}

const MAX_BREADCRUMB_LABEL_LENGTH = 40;

export const truncateLabel = (text: string): string => (
  text.length > MAX_BREADCRUMB_LABEL_LENGTH ? `${text.slice(0, MAX_BREADCRUMB_LABEL_LENGTH - 1)}…` : text
);

// History-endpoint product tokens are `[[pid - Title]]`, unlike the live stream's bare `[[pid]]`
// — strip the title suffix so stripTokensForDisplay/resolveProducts can still match them.
export const normalizeHistoryProductTokens = (text: string): string => (
  text.replace(/\[\[([^\]]+)]]/g, (_match, tokenContent: string) => `[[${tokenContent.trim().split(/\s/)[0]}]]`)
);

// Which container the shared session is shown in: the side drawer (launcher / prompt-box entries) or
// the full-screen chat (search-bar entry). The entry that opens the chat decides; the conversation is
// the same either way.
export type SurfaceMode = 'drawer' | 'fullscreen';

// The search-bar entry's three entry points.
export type EntryPointKey = 'image' | 'mic' | 'ai';

// One opening of the full-screen chat from an entry point.
export interface SurfaceActivation {
  entryPoint: EntryPointKey;
  // The conversation already existed when this entry point opened (so the canned greeting is not replayed).
  isResumed: boolean;
  // Count of user-authored turns when it opened: image/mic show their welcome screen until a real
  // message is sent during THIS activation.
  userMessageBaseline: number;
}

// Default for customizations.chatbot.persistChatTtlMinutes when unset.
export const DEFAULT_CHAT_ID_TTL_MINUTES = 30;

export interface ChatSessionState {
  chats: Chat[];
  chatId: string;
  isWaiting: boolean;
  allowUserInput: boolean;
  showAllSuggestions: boolean;
  streamingProducts: ProcessedProduct[];
  streamingRequestId: string;
  suggestions: string[];
  isOpen: boolean;
  hasStartedChat: boolean;
  wishlistPids: string[];
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  surfaceMode: SurfaceMode;
  activation: SurfaceActivation | null;
}

export const initialChatSessionState = (wishlistPids: string[] = []): ChatSessionState => ({
  chats: [],
  chatId: '',
  isWaiting: false,
  allowUserInput: false,
  showAllSuggestions: false,
  streamingProducts: [],
  streamingRequestId: '',
  suggestions: [],
  isOpen: false,
  hasStartedChat: false,
  wishlistPids,
  breadcrumbs: [],
  activeBreadcrumbId: null,
  surfaceMode: 'drawer',
  activation: null,
});

// The live inputs the store needs from the hook that drives it. `useChat` calls configure() on
// every render (a plain field assignment, no notify), so actions always see the latest config.
export interface ChatSessionDeps {
  widgetClient: WidgetClient;
  widgetConfig: WidgetConfig;
  // Already resolved: customizations.chatbot.persistChatEnabled && the caller's own opt-out.
  persistChatEnabled: boolean;
  // UseChatOptions.sessionScopeKey — only changes the storage key, never the store identity.
  storageScopeKey?: string;
  // UseChatOptions.pid — sent as `pid` unless a message carries its own.
  pid?: string;
  suppressActionTokenCallbacks?: boolean;
}

type Listener = () => void;
type Patch = Partial<ChatSessionState> | ((state: ChatSessionState) => Partial<ChatSessionState>);

// Owns one chat session's state and actions (the SSE call to the backend chat endpoint,
// token-stream parsing, history restore), moved verbatim from use-chat.ts so several hooks/surfaces
// can share one conversation. Voice-reply helpers stay in React (useVoiceReply) and reach the store
// through the attached VoiceBridge.
export class ChatSessionStore {
  protected state: ChatSessionState;
  protected voice: VoiceBridge = NULL_VOICE_BRIDGE;
  private listeners = new Set<Listener>();
  private configuredDeps: ChatSessionDeps | null = null;

  // Same value as state.chatId, but assigned synchronously wherever use-chat.ts assigned
  // chatIdRef.current, so a deferred caller (e.g. a setTimeout(0) queued right after open()/newChat())
  // always reads the live id — see use-chat.ts's chatIdRef comment.
  private liveChatId = '';

  // Frontend-injected bot messages (greeting, openWithMessage) of the live conversation, mirrored in
  // localStorage beside the chat id (same lifecycle) so a reload can restore them. Mirrored here so
  // consecutive injections (state updates are async) append correctly.
  private injectedMessages: InjectedMessage[] = [];
  // requestId of the last backend message in the live conversation — the marker for injections.
  private lastRequestId = '';

  // Guards restoreIfStored() so a second mount (or a second hook on the same store) never re-runs
  // the stored-session restore.
  private restoreStarted = false;
  // Set by dispose(): a history restore still in flight must then leave storage and state alone.
  private disposed = false;

  // Aborts the in-flight SSE call (see resetChatState) so a late onclose/onmessage from a
  // previous session can't bleed a stale reply into the freshly-reset chat log.
  private activeStreamController: AbortController | null = null;

  // Identifies the optimistically-added breadcrumb for the in-flight query (see sendMessage)
  // so commitResponse can reconcile it in place once the real requestId/products are known,
  // rather than appending a second entry.
  private pendingBreadcrumbId: string | null = null;
  private pendingBreadcrumbCounter = 0;
  // Counts sendMessage calls that actually started a request, so a history restore can tell whether
  // a send took over the isWaiting/allowUserInput flags while its fetch was pending.
  private sendCount = 0;
  // Captured right before a pending breadcrumb is added, so it can be restored if that turn
  // ends up producing no products (matching the pre-existing rule that text-only turns never
  // get a breadcrumb).
  private preBreadcrumbActiveId: string | null = null;

  // The entry trigger (e.g. ai_assistant's 'launcher' / 'prompt-box') the shopper last used; sent
  // as `entry` with RESULT_LOAD. Empty (and then omitted) for widgets that have no entries.
  private activeEntry = '';

  // The product id of the entry the shopper last used (e.g. the prompt box's data-pid), sent as `pid`
  // with messages that carry none — drawer follow-ups, suggestion chips, voice — so the product
  // context outlives the entry's own send. Replaced (or cleared) by every setActiveEntry().
  private activeProductId: string | undefined;

  // Registered by the entry that opened the full-screen chat (openSurface); run once by closeSurface,
  // e.g. to give focus back to the entry-bar button that opened it.
  private onSurfaceClosed: (() => void) | undefined;

  constructor(wishlistPids: string[] = []) {
    this.state = initialChatSessionState(wishlistPids);
  }

  // Arrow properties so they can be passed straight to useSyncExternalStore.
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ChatSessionState => this.state;

  // Reads the live chat id, unlike a snapshotted `chatId` value.
  getChatId = (): string => this.liveChatId;

  setState(patch: Patch): void {
    const partial = typeof patch === 'function' ? patch(this.state) : patch;
    const changed = (Object.keys(partial) as (keyof ChatSessionState)[]).some((key) => !Object.is(this.state[key], partial[key]));
    if (!changed) {
      return;
    }
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  attachVoice(bridge: VoiceBridge): () => void {
    this.voice = bridge;
    return (): void => {
      if (this.voice === bridge) {
        this.voice = NULL_VOICE_BRIDGE;
      }
    };
  }

  configure(deps: ChatSessionDeps): void {
    this.configuredDeps = deps;
  }

  private get deps(): ChatSessionDeps {
    if (!this.configuredDeps) {
      throw new Error('ChatSessionStore used before configure()');
    }
    return this.configuredDeps;
  }

  private get widgetClient(): WidgetClient {
    return this.deps.widgetClient;
  }

  private get widgetConfig(): WidgetConfig {
    return this.deps.widgetConfig;
  }

  private get persistChatEnabled(): boolean {
    return this.deps.persistChatEnabled;
  }

  // Resolve the API base, honouring manual endpoint > cloud > API endpoint > default.
  private get manualEndpoint(): ReturnType<typeof getManualEndpoint> {
    return getManualEndpoint(this.widgetConfig.appSettings.placementId);
  }

  private get apiBase(): string {
    return resolveBaseEndpoint(this.widgetConfig.appSettings, this.manualEndpoint);
  }

  private get persistChatTtlMs(): number {
    return (this.widgetConfig.customizations.chatbot?.persistChatTtlMinutes ?? DEFAULT_CHAT_ID_TTL_MINUTES) * 60 * 1000;
  }

  // See UseChatOptions.sessionScopeKey: appended so a caller can scope the stored session to
  // more than just the placement id.
  private get chatIdStorageKey(): string {
    return buildChatIdStorageKey(this.widgetConfig.appSettings.placementId, this.deps.storageScopeKey);
  }

  private get injectedStorageKey(): string {
    return buildInjectedStorageKey(this.chatIdStorageKey);
  }

  // Replaces use-chat.ts's `chatIdRef.current = id; setChatIdVersion(...)` pair.
  private setChatId(chatId: string): void {
    this.liveChatId = chatId;
    this.setState({ chatId });
  }

  setActiveEntry(entry: string, pid?: string): void {
    this.activeEntry = entry;
    this.activeProductId = pid || undefined;
  }

  getActiveEntry = (): string => this.activeEntry;

  getActiveProductId = (): string | undefined => this.activeProductId;

  setShowAllSuggestions(): void {
    this.setState({ showAllSuggestions: true });
  }

  setActiveBreadcrumb(requestId: string | null): void {
    this.setState({ activeBreadcrumbId: requestId });
  }

  setIsInWishlist(pid: string, isInWishlist: boolean): void {
    this.setState((s) => {
      const newPids = [...s.wishlistPids];
      if (isInWishlist && !newPids.includes(pid)) {
        newPids.push(pid);
      }
      if (!isInWishlist && newPids.includes(pid)) {
        newPids.splice(newPids.indexOf(pid), 1);
      }
      return { wishlistPids: newPids };
    });
  }

  // The AI often refers back to a product shown in an earlier turn (e.g. "add the first one to my
  // cart") without streaming it again, so fall back to the products of earlier turns, newest first.
  private findProductForAddToCart(pid: string, streamedProducts: ProcessedProduct[]): ProcessedProduct | undefined {
    const streamed = streamedProducts.find((p) => p.product_id === pid);
    if (streamed) {
      return streamed;
    }
    const { chats } = this.state;
    for (let i = chats.length - 1; i >= 0; i -= 1) {
      const earlier = chats[i].products?.find((p) => p.product_id === pid);
      if (earlier) {
        return earlier;
      }
    }
    return undefined;
  }

  // Splits held-back <<ADD_TO_CART>> product ids into products that need add-to-cart options chosen
  // (returned, to be shown as an options bubble) and products that can be added directly, the same
  // way as without options (no option values for the product, or the product isn't known at all).
  private resolvePendingAddToCarts(pids: string[], streamedProducts: ProcessedProduct[]): ProcessedProduct[] {
    const { widgetConfig } = this;
    const { productDetails } = widgetConfig.displaySettings;
    const addToCartOptions = widgetConfig.customizations.productCard?.addToCart?.options;
    const optionsProducts: ProcessedProduct[] = [];
    pids.forEach((pid) => {
      const product = this.findProductForAddToCart(pid, streamedProducts);
      if (product && resolveOptionFields(product, productDetails, addToCartOptions).length > 0) {
        if (!optionsProducts.includes(product)) {
          optionsProducts.push(product);
        }
        return;
      }
      if (!product) {
        console.warn(`Product ${pid} to add to cart was not found in this conversation; adding it to cart without options.`);
      }
      const callback = widgetConfig.callbacks.onAddToCartToggle;
      if (!callback) {
        return;
      }
      try {
        Promise.resolve(callback(true, pid, product)).catch((err: unknown) => console.error(err));
      } catch (err) {
        console.error(err);
      }
    });
    return optionsProducts;
  }

  private commitResponse({
    chatId: responseChatId, requestId, text, products, userMessage, suggestions: newSuggestions, addToCartOptionsProducts,
  }: CompletedResponse): void {
    if (products.length) {
      const requestMetadata = {
        queryId: requestId,
        cat: Category.RESULT,
        // Only once an entry was set, so widgets without entries keep their exact metadata.
        ...(this.activeEntry ? { entry: this.activeEntry } : {}),
      };
      this.widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
      this.widgetClient.setLastTrackingMeta(requestMetadata);
    }
    if (requestId) {
      this.lastRequestId = requestId;
    }
    this.setState((s) => {
      const newChats = [...s.chats];
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
      if (addToCartOptionsProducts.length) {
        newChats.push({
          chatId: responseChatId,
          requestId,
          messages: [],
          author: 'options',
          products: addToCartOptionsProducts,
        });
      }
      return { chats: newChats };
    });
    const pendingId = this.pendingBreadcrumbId;
    this.pendingBreadcrumbId = null;
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
      this.setState((s) => {
        const prevBreadcrumbs = s.breadcrumbs;
        // Reconcile the optimistic placeholder sendMessage added in place, rather than appending
        // a second entry for the same turn. Falls back to appending if the placeholder is gone
        // (e.g. the user truncated the trail past it while the response was still streaming).
        const pendingIndex = pendingId ? prevBreadcrumbs.findIndex((crumb) => crumb.requestId === pendingId) : -1;
        if (pendingIndex === -1) {
          return { breadcrumbs: [...prevBreadcrumbs, newTurn] };
        }
        const reconciled = [...prevBreadcrumbs];
        reconciled[pendingIndex] = newTurn;
        return { breadcrumbs: reconciled };
      });
      this.setState({ activeBreadcrumbId: requestId });
    } else if (pendingId) {
      // This turn produced no products, so it never earns a breadcrumb — drop the placeholder
      // and restore whichever breadcrumb was active before the query was sent.
      this.setState((s) => ({ breadcrumbs: s.breadcrumbs.filter((crumb) => crumb.requestId !== pendingId) }));
      this.setState({ activeBreadcrumbId: this.preBreadcrumbActiveId });
    }
    this.setState({ streamingProducts: [] });
    this.setState({ streamingRequestId: '' });
    this.voice.resetReplyState();
    this.setState({ allowUserInput: true });
    // Suggestion chips are only ever set here, once the full response is committed — never
    // mid-stream — so they can't flash on screen before the response they belong to is visible.
    this.setState({ suggestions: newSuggestions });
  }

  // The original also cleared the composer text here (`setMessage('')`); that text is hook-local
  // state, so clearing it stays with the hook that calls this.
  async sendMessage(messageToSend?: string, secondArg?: SearchImageOrPid): Promise<void> {
    const { widgetClient, widgetConfig, manualEndpoint, apiBase } = this;
    const { appSettings, customizations } = widgetConfig;
    // A product id passed with a message is that request's `pid` (overriding the `pid` option, e.g.
    // the page's product changed, or another widget hands over a message about it); it is not an
    // image, so it is never drawn in the chat or uploaded.
    const messagePid = secondArg && isPid(secondArg) ? secondArg.pid : undefined;
    const imageToSend = messagePid ? undefined : secondArg;
    if (!messageToSend && !imageToSend) {
      return;
    }
    this.sendCount += 1;
    // Abort any still-in-flight stream before starting a new one — otherwise the old controller
    // is silently orphaned (never aborted) and its onclose can land a second, overlapping reply
    // after this one, e.g. if a voice transcript finalizes while a typed message is already
    // streaming.
    this.activeStreamController?.abort();
    // Lazily mints the session's chat id on its first real message. A caller can leave the chat id
    // unset going into this call — ai-search-launcher's camera/mic entry points deliberately do
    // (see openEntryPoint) so that merely opening one, without the user ever submitting anything,
    // never mints or persists an id at all. Without this, that first send would go out with an
    // empty chat_id and every later message in the same conversation would too, since the chat id
    // is never re-derived from the backend's own response — the server would treat each one as an
    // unrelated new conversation.
    if (!this.liveChatId) {
      widgetClient.visearch.generateUuid((uuid) => {
        this.setChatId(uuid);
      });
    }
    // Slides the resumable-session TTL forward, same as open()/close().
    if (this.persistChatEnabled && this.liveChatId) {
      persistChatId(this.chatIdStorageKey, this.liveChatId);
    }
    this.setState({ isWaiting: true });
    this.setState({ showAllSuggestions: false });
    this.setState({ suggestions: [] });
    this.setState({ streamingProducts: [] });
    this.setState({ streamingRequestId: '' });
    const willSpeakReply = this.voice.beginReply();
    this.setState({ hasStartedChat: true });
    this.setState((s) => ({
      chats: [
        ...s.chats,
        {
          chatId: '',
          requestId: '',
          author: 'user',
          messages: messageToSend ? [messageToSend] : [],
          image: imageToSend,
        },
      ],
    }));

    // Adds the query to the breadcrumb trail immediately, rather than waiting for the response to
    // finish streaming. Uses a locally-generated placeholder id (the real requestId only arrives
    // via the 'reqid' SSE event below) so commitResponse can find and reconcile this exact entry
    // once the turn completes — see pendingBreadcrumbId.
    this.pendingBreadcrumbCounter += 1;
    const pendingBreadcrumbId = `pending-${this.pendingBreadcrumbCounter}`;
    this.pendingBreadcrumbId = pendingBreadcrumbId;
    this.preBreadcrumbActiveId = this.state.activeBreadcrumbId;
    this.setState((s) => ({
      breadcrumbs: [
        ...s.breadcrumbs,
        { requestId: pendingBreadcrumbId, label: truncateLabel(messageToSend || ''), products: [] },
      ],
    }));
    this.setState({ activeBreadcrumbId: pendingBreadcrumbId });

    let chatIdFromResp = '';
    let reqIdFromResp = '';
    let spokenLength = 0;
    const tokens: string[] = [];
    const handledActionTokens = new Set<string>();
    const products: ProcessedProduct[] = [];
    // <<ADD_TO_CART>> product ids held back until the stream closes, because the shopper must first
    // choose the add-to-cart options (the product itself may also not have streamed in yet).
    const pendingAddToCartPids: string[] = [];
    const addToCartOptions = customizations.productCard?.addToCart?.options;
    const hasAddToCartOptions = getActiveOptionFields(addToCartOptions).length > 0;
    // Retrieve user id and session id from ViSearch client
    let uid = '';
    let sid = '';
    widgetClient.visearch.getUid((uidResp) => {
      uid = uidResp;
    });
    widgetClient.visearch.getSid((sidResp) => {
      sid = sidResp;
    });
    this.setState({ allowUserInput: false });
    const attrsToUse = (customizations.chatbot?.attrsToUse || []).map((attr) => attr.trim()).filter(Boolean);
    const params = new URLSearchParams({
      ...widgetConfig.searchSettings,
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: this.liveChatId,
      q: messageToSend || 'Find me products that look like the main product in this image and are the same color as the main product',
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
      sys_attrs_to_get: getBestImageSysAttrsToGet(customizations),
      chat_agent: customizations.chatbot?.chatAgent || 'shopping_closer_voice_v2',
      // Unset/empty sends nothing, so the backend keeps its default LLM fields.
      ...(attrsToUse.length > 0 ? { attrs_to_use: attrsToUse.join(',') } : {}),
    });
    // Per-message pid > the hook's `pid` option (existing widgets) > the active entry's product id.
    const pidToSend = messagePid || this.deps.pid || this.activeProductId;
    if (pidToSend) {
      params.append('pid', pidToSend);
    }
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
    this.activeStreamController = controller;

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
            this.setState({ streamingRequestId: reqIdFromResp });
          } else if (ev.event === 'chat_token') {
            if (!willSpeakReply || !this.voice.isVoiceReadingEnabledNow()) {
              this.setState({ isWaiting: false });
            }
            tokens.push(JSON.parse(ev.data).value);
            const currentText = tokens.join('');
            extractActionTokens(currentText).forEach(({ action, productId, key }) => {
              if (handledActionTokens.has(key)) {
                return;
              }
              handledActionTokens.add(key);
              if (action === 'ADD_TO_CART' && hasAddToCartOptions) {
                if (!this.deps.suppressActionTokenCallbacks) {
                  pendingAddToCartPids.push(productId);
                }
                return;
              }
              const callback = action === 'ADD_TO_CART'
                ? widgetConfig.callbacks.onAddToCartToggle
                : widgetConfig.callbacks.onAddToWishlistToggle;
              if (callback && !this.deps.suppressActionTokenCallbacks) {
                try {
                  const callbackResult = callback(true, productId);
                  Promise.resolve(callbackResult).catch((err: unknown) => console.error(err));
                } catch (err) {
                  console.error(err);
                }
              }
            });
            const displayText = stripTokensForDisplay(currentText).trim();
            this.voice.updateLatestMessage(displayText);
            this.setState({ streamingProducts: resolveProducts(currentText, products) });
            if (willSpeakReply && this.voice.isVoiceReadingEnabledNow()) {
              const { sentences, spokenLength: newSpokenLength } = extractSpeakableSentences(currentText, spokenLength);
              sentences.forEach(({ chunk, revealTarget, productId }) => {
                this.voice.speak(chunk, revealTarget, productId);
              });
              spokenLength = newSpokenLength;
            }
          } else if (ev.event === 'product') {
            products.push(getFlattenProduct(JSON.parse(ev.data)));
            this.setState({ streamingProducts: resolveProducts(tokens.join(''), products) });
          }
        },
        onclose: () => {
          const currentText = tokens.join('');
          const finalText = stripTokensForDisplay(currentText).trim();
          const finalProducts = resolveProducts(currentText, products);
          this.voice.updateLatestMessage(finalText);
          this.setState({ streamingProducts: finalProducts });
          const completedResponse = {
            chatId: chatIdFromResp,
            requestId: reqIdFromResp,
            text: finalText,
            products: finalProducts,
            userMessage: messageToSend || '',
            suggestions: extractSuggestions(currentText),
            addToCartOptionsProducts: this.resolvePendingAddToCarts(pendingAddToCartPids.splice(0), products),
          };
          if (willSpeakReply && this.voice.isVoiceReadingEnabledNow()) {
            const { sentences } = extractSpeakableSentences(currentText, spokenLength, { includeTrailing: true });
            sentences.forEach(({ chunk, revealTarget, productId }) => {
              this.voice.speak(chunk, revealTarget, productId);
            });
            if (this.voice.hasPendingSpeech()) {
              this.voice.deferCommit(() => this.commitResponse(completedResponse));
            } else {
              this.setState({ isWaiting: false });
              this.voice.forceRevealTypewriter(finalText);
              this.commitResponse(completedResponse);
            }
          } else if (finalText && this.voice.getTypewriterLength() < finalText.length) {
            this.voice.deferCommit(() => this.commitResponse(completedResponse));
          } else {
            this.commitResponse(completedResponse);
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
      // locally-captured pendingBreadcrumbId rather than the field, since a superseding call has
      // already overwritten this.pendingBreadcrumbId with its own id by the time this runs.
      if (this.pendingBreadcrumbId === pendingBreadcrumbId) {
        this.pendingBreadcrumbId = null;
      }
      this.setState((s) => ({ breadcrumbs: s.breadcrumbs.filter((crumb) => crumb.requestId !== pendingBreadcrumbId) }));
      if (!controller.signal.aborted) {
        console.error(err);
        // The AI may already have asked to add products to cart before the stream failed; don't
        // silently drop those — show their options bubble (or add them directly) as on success.
        const optionsProducts = this.resolvePendingAddToCarts(pendingAddToCartPids.splice(0), products);
        if (optionsProducts.length) {
          this.setState((s) => ({
            chats: [...s.chats, {
              chatId: chatIdFromResp,
              requestId: reqIdFromResp,
              messages: [],
              author: 'options',
              products: optionsProducts,
            }],
          }));
        }
        this.setState({ isWaiting: false });
        this.setState({ streamingProducts: [] });
        this.setState({ streamingRequestId: '' });
        this.voice.resetReplyState();
        this.setState({ allowUserInput: true });
        this.setState({ activeBreadcrumbId: this.preBreadcrumbActiveId });
      }
    }
  }

  // Re-fetches a previous conversation from the backend, given a chat id recovered from
  // localStorage. Rebuilds chats/breadcrumbs with the same helpers the live stream uses, so the
  // two paths can't drift apart on how a response is displayed.
  private async fetchChatHistory(chatIdToRestore: string, injected: InjectedMessage[]): Promise<RestoredChatSession | null> {
    const { widgetClient, widgetConfig, manualEndpoint, apiBase } = this;
    const { appSettings, customizations } = widgetConfig;
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

    const merged = mergeInjectedMessages(restoredChats, injected, chatIdToRestore);
    this.lastRequestId = messages[messages.length - 1]?.reqid ?? '';

    return {
      chats: merged.chats,
      breadcrumbs: restoredBreadcrumbs,
      activeBreadcrumbId: restoredActiveBreadcrumbId,
      suggestions: merged.trailingNextSteps ?? restoredSuggestions,
    };
  }

  // Clears isWaiting/allowUserInput regardless of outcome (unless the session was replaced or a
  // message was sent meanwhile), so a failed or empty fetch doesn't get stuck looking like a reply
  // is still streaming in.
  private restoreChatHistory(chatIdToRestore: string): void {
    const { chatIdStorageKey } = this;
    // The fetch is asynchronous: open()/newChat() may have replaced the session meanwhile. A stale
    // restore must not touch the new session at all (history, id, storage, or the waiting flags,
    // which the replacement's resetChatState() already set correctly for the new session).
    // Decided once, by the first handler to run: the .then/.catch below clear this restore's own id,
    // which would otherwise look stale to a later check (e.g. the .catch after a throwing .then, or
    // the .finally) and leave isWaiting/allowUserInput stuck.
    let superseded: boolean | null = null;
    const isStale = (): boolean => {
      if (superseded === null) {
        superseded = this.disposed || this.liveChatId !== chatIdToRestore;
      }
      return superseded;
    };
    // A message sent while the fetch is pending owns the waiting flags from then on (its first
    // chat_token clears isWaiting, commitResponse re-enables input), so the restore must not reset
    // them mid-reply.
    const sendCountAtStart = this.sendCount;
    // Read before the fetch: a message injected while it is pending is already in the chat log (and
    // appended to this.injectedMessages), so it must not be merged in a second time.
    const storedInjected = loadInjectedMessages(this.injectedStorageKey, chatIdToRestore);
    this.injectedMessages = storedInjected;
    this.fetchChatHistory(chatIdToRestore, storedInjected)
      .then((restored) => {
        if (isStale()) {
          return;
        }
        if (restored) {
          // The restore is asynchronous, so a message may already have been sent meanwhile (e.g.
          // handed over by another widget right after a reload). Put the earlier conversation in front
          // of it instead of replacing it, which would drop that message.
          const sentMeanwhile = this.state.chats.length > 0;
          this.setState((s) => ({ chats: [...restored.chats, ...s.chats] }));
          this.setState((s) => ({ breadcrumbs: [...restored.breadcrumbs, ...s.breadcrumbs] }));
          if (!sentMeanwhile) {
            this.setState({ activeBreadcrumbId: restored.activeBreadcrumbId });
            this.setState({ suggestions: restored.suggestions });
          }
          this.setState({ hasStartedChat: true });
          return;
        }
        // Nothing to resume (e.g. opened but never messaged, so no backend history) — clear the
        // id so callers' `chatId truthy → reopen()` doesn't keep resuming a blank surface.
        this.setChatId('');
        removeStoredItem(chatIdStorageKey);
        removeStoredItem(this.injectedStorageKey);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (isStale()) {
          return;
        }
        this.setChatId('');
        removeStoredItem(chatIdStorageKey);
        removeStoredItem(this.injectedStorageKey);
      })
      .finally(() => {
        if (isStale() || this.sendCount !== sendCountAtStart) {
          return;
        }
        this.setState({ isWaiting: false });
        this.setState({ allowUserInput: true });
      });
  }

  // Replaces use-chat.ts's mount effect: runs once per store (guarded by restoreStarted) so a
  // returning visitor's chatId (and chats, once fetched) is already in place by the time they
  // open the dialog. No valid stored id just leaves this untouched. The latch is only set once the
  // store is configured with persistence on, so an earlier caller that opted out (or ran before
  // configure()) never blocks a later persistent caller's restore.
  restoreIfStored(): void {
    if (this.restoreStarted || !this.configuredDeps || !this.persistChatEnabled) {
      return;
    }
    this.restoreStarted = true;
    const { chatIdStorageKey } = this;
    const storedChatId = loadStoredChatId(chatIdStorageKey, this.persistChatTtlMs);
    if (!storedChatId) {
      return;
    }
    this.setChatId(storedChatId);
    persistChatId(chatIdStorageKey, storedChatId);
    this.setState({ isWaiting: true });
    this.setState({ allowUserInput: false });
    this.restoreChatHistory(storedChatId);
  }

  private resetChatState(): void {
    this.activeStreamController?.abort();
    this.activeStreamController = null;
    this.voice.stopAudio();
    this.voice.resetReplyState();
    this.pendingBreadcrumbId = null;
    this.preBreadcrumbActiveId = null;
    // A fresh conversation starts with no injected messages of its own.
    this.injectedMessages = [];
    this.lastRequestId = '';
    if (this.persistChatEnabled) {
      removeStoredItem(this.injectedStorageKey);
    }
    this.setState({ chats: [] });
    this.setState({ breadcrumbs: [] });
    this.setState({ activeBreadcrumbId: null });
    this.setState({ streamingProducts: [] });
    this.setState({ streamingRequestId: '' });
    this.setState({ suggestions: [] });
    this.setState({ showAllSuggestions: false });
    this.setState({ isWaiting: false });
    this.setState({ allowUserInput: true });
    this.setState({ hasStartedChat: false });
  }

  open(): void {
    this.setState({ isOpen: true });
    this.resetChatState();
    this.widgetClient.visearch.generateUuid((uuid) => {
      this.setChatId(uuid);
      if (this.persistChatEnabled) {
        persistChatId(this.chatIdStorageKey, uuid);
      }
    });
  }

  // Aborts the in-flight reply and puts the composer back: sendMessage's abort path deliberately skips
  // its own state reset (a superseding message owns the flags), so without this a reply cut off by
  // close() would leave isWaiting set and input blocked when the conversation is shown again.
  private abortActiveStream(): void {
    const controller = this.activeStreamController;
    if (!controller) {
      return;
    }
    controller.abort();
    this.activeStreamController = null;
    this.setState({ isWaiting: false });
    this.setState({ streamingProducts: [] });
    this.setState({ streamingRequestId: '' });
    this.setState({ allowUserInput: true });
    this.setState({ activeBreadcrumbId: this.preBreadcrumbActiveId });
  }

  close(): void {
    // Deliberately does NOT call resetChatState() — by design, closing the full-screen surface
    // does not clear chat history/state (only opening or starting a new chat does, both via
    // resetChatState()). But a stream still in flight must still be aborted here, otherwise a
    // late onclose/onmessage would append the old conversation's reply after the user has
    // already navigated away, and fire RESULT_LOAD/setLastTrackingMeta for a session the UI no
    // longer shows.
    this.abortActiveStream();
    this.voice.interruptSpeech();
    this.setState({ isOpen: false });
    // Slides the resumable-session TTL forward so a reopened session is still within the window.
    if (this.persistChatEnabled && this.liveChatId) {
      persistChatId(this.chatIdStorageKey, this.liveChatId);
    }
  }

  // Hides the surface like close() but leaves the session running: the in-flight stream and any
  // narration continue, and reopen() brings the same conversation back.
  hide(): void {
    this.setState({ isOpen: false });
    if (this.persistChatEnabled && this.liveChatId) {
      persistChatId(this.chatIdStorageKey, this.liveChatId);
    }
    // A hidden drawer ends its activation and runs the opening entry's onClosed, like closeSurface()
    // does for the full screen: otherwise opening it again with the same entry point is not seen as a
    // new activation (no greeting) and the callback goes stale.
    if (this.state.surfaceMode === 'drawer') {
      this.setState({ activation: null });
      const onClosed = this.onSurfaceClosed;
      this.onSurfaceClosed = undefined;
      onClosed?.();
    }
  }

  // Leaving the full screen for the drawer ends its activation (the drawer has no entry points) and
  // forgets the opening entry's onClosed: a full screen that never opened must not have its callback
  // run by a later drawer close (closeSurface).
  setSurfaceMode(mode: SurfaceMode): void {
    if (mode === 'drawer') {
      this.onSurfaceClosed = undefined;
      this.setState({ surfaceMode: mode, activation: null });
      return;
    }
    this.setState({ surfaceMode: mode });
  }

  // Picks the container (and, for the full screen, the entry point's activation) for the next
  // open()/reopen(); it does not open anything itself. onClosed replaces any earlier callback.
  openSurface(options: { mode: SurfaceMode; activation?: SurfaceActivation; onClosed?: () => void }): void {
    this.onSurfaceClosed = options.onClosed;
    this.setState({ surfaceMode: options.mode, activation: options.activation ?? null });
  }

  // Closes the full-screen chat like the standalone launcher did (close(): the in-flight stream is
  // aborted and narration interrupted, the chats are kept), ends the activation and runs the opening
  // entry's onClosed once. The surface then rests in drawer mode, so programmatic openers
  // (openWithMessage, sendChatMessage, ensureOpen) show the drawer; an entry that wants the full screen
  // sets it again with openSurface(). Called from a click handler, these updates batch into one render
  // that unmounts the full-screen container without it ever seeing open=false; its scroll-lock effect's
  // own cleanup restores the page's previous overflow on that unmount.
  closeSurface(): void {
    this.close();
    this.setState({ activation: null });
    this.setState({ surfaceMode: 'drawer' });
    const onClosed = this.onSurfaceClosed;
    this.onSurfaceClosed = undefined;
    onClosed?.();
  }

  // "New chat" inside an activation: the fresh conversation has no history and no user turns yet.
  resetActivation(baseline: number): void {
    this.setState((s) => (s.activation ? { activation: { ...s.activation, isResumed: false, userMessageBaseline: baseline } } : {}));
  }

  // For a caller that re-shows an already-live conversation after close() (e.g. re-expanding a
  // collapsed summary view) — sets isOpen back to true without open()'s resetChatState()/fresh-
  // chatId side effects, which would wrongly discard the conversation this call is meant to
  // resume. Needed because isOpen isn't just a visibility flag: useChat's onTranscript handler
  // gates on it, so leaving it false after such a re-show would silently drop any voice
  // transcript that finalizes from then on, for the rest of the session.
  reopen(): void {
    this.setState({ isOpen: true });
  }

  // Tears the session down before its store is dropped from the registry (see
  // resetChatSessionStore): aborts the in-flight SSE call, so a late reply can't land in a
  // conversation nobody shows any more, and interrupts any narration still playing.
  dispose(): void {
    this.disposed = true;
    this.activeStreamController?.abort();
    this.activeStreamController = null;
    this.voice.interruptSpeech();
  }

  newChat(): void {
    this.resetChatState();
    this.widgetClient.visearch.generateUuid((uuid) => {
      this.setChatId(uuid);
      if (this.persistChatEnabled) {
        persistChatId(this.chatIdStorageKey, uuid);
      }
    });
  }

  // Remembers a frontend-injected bot message against the current chat id so a refresh can
  // restore it alongside the backend history (which never contains it).
  private recordInjectedMessage(text: string, nextSteps?: string[]): void {
    if (!this.persistChatEnabled || !this.liveChatId) {
      return;
    }
    this.injectedMessages = [...this.injectedMessages, { text, nextSteps, afterRequestId: this.lastRequestId }];
    persistInjectedMessages(this.injectedStorageKey, this.liveChatId, this.injectedMessages);
  }

  playGreeting(text: string): void {
    if (!text) {
      return;
    }
    this.recordInjectedMessage(text);
    // Always show the greeting as a visible chat bubble first (mirrors shopping-assistant's
    // openDialog/newChat opening messages) — speech below is additional narration on top, never a
    // replacement for the text.
    this.setState((s) => ({
      chats: [
        ...s.chats,
        {
          chatId: '',
          requestId: '',
          author: 'bot',
          messages: [text],
          products: [],
        },
      ],
    }));
    if (this.widgetConfig.customizations.chatbot?.voiceGreetingEnabled && this.voice.shouldSpeakReply()) {
      this.voice.resetReplyState();
      this.voice.speak(text, text.length, null, true);
    }
  }

  // Injects a bot-authored message the caller supplies directly (e.g. openWithMessage), rather
  // than one streamed from the backend — same Chat shape playGreeting pushes, plus attaching the
  // given nextSteps as this turn's suggestion chips (clicking one goes through the normal
  // sendMessage flow, same as any other suggestion chip). This message is never sent to the
  // backend, so it's stored client-side (recordInjectedMessage) and merged back on restore.
  pushAssistantMessage(text: string, nextSteps: string[] = []): void {
    this.recordInjectedMessage(text, nextSteps);
    this.setState((s) => ({
      chats: [
        ...s.chats,
        {
          chatId: '',
          requestId: '',
          author: 'bot',
          messages: [text],
          products: [],
        },
      ],
    }));
    this.setState({ suggestions: nextSteps });
  }

  // Mirrors shopping-assistant's openWithMessage trigger: { newChat } starts a completely new chat;
  // with no session yet it mints one via open() (no opening greeting, so only the caller's own
  // message shows); otherwise it resumes the existing conversation. Then the message is appended.
  openWithMessage(message: string, nextSteps?: string[], options?: { newChat?: boolean }): void {
    if (options?.newChat) {
      this.newChat();
      // newChat() does not call open(), hence the reopen(): it resets the conversation but not isOpen.
      this.reopen();
    } else if (!this.liveChatId) {
      this.open();
    } else {
      this.reopen();
    }
    this.pushAssistantMessage(message, nextSteps);
  }

  // Mirrors shopping-assistant's sendChatMessage trigger, plus minting a session when none exists
  // yet. liveChatId is assigned synchronously by open(), so no deferral is needed before sending.
  sendChatMessage(message: string, image?: SearchImageOrPid): void {
    if (this.liveChatId) {
      this.reopen();
    } else {
      this.open();
    }
    this.sendMessage(message, image);
  }
}
