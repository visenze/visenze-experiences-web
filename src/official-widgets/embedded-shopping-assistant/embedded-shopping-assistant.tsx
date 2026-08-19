import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type FC, Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import BottomBar from './components/BottomBar';
import SearchBar from './components/SearchBar';
import TopBar from './components/TopBar';
import TurnSection from './components/TurnSection';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../common/client/endpoint';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import { RootContext } from '../../common/components/shadow-wrapper';
import SparklesIcon from '../../common/icons/SparklesIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import type { ImageFile } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';
import { Actions, Category } from '../../common/types/tracking-constants';
import { getFlattenProduct } from '../../common/utils';

// ── Token parsers ─────────────────────────────────────────────────────────────
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;
const LEADING_PRODUCT_REGEX = /^(?:\d+\.? |- )?\[\[[^\]]+]]/;
const INCOMPLETE_PRODUCT_TOKEN_REGEX = /\[\[[^\]]*$/;

const stripTokensForDisplay = (text: string): string => text
  .split('\n')
  .map((line): string | null => {
    if (LEADING_PRODUCT_REGEX.test(line)) return null;
    return line.replace(/\[\[[^\]]+]]/g, '');
  })
  .filter((line): line is string => line !== null)
  .join('\n')
  .replace(SUGGESTION_LINE_REGEX, '')
  .replace(INCOMPLETE_PRODUCT_TOKEN_REGEX, '');

const resolveProducts = (text: string, productList: ProcessedProduct[]): ProcessedProduct[] => {
  const tokenRegex = /\[\[([^\]]+)]]/g;
  const seen = new Set<string>();
  const ordered: ProcessedProduct[] = [];
  let match = tokenRegex.exec(text);
  while (match) {
    const pid = match[1];
    if (!seen.has(pid)) {
      const product = productList.find((p) => p.product_id === pid);
      if (product) {
        seen.add(pid);
        ordered.push(product);
      }
    }
    match = tokenRegex.exec(text);
  }
  return ordered;
};

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_AI_TEXT = 'Running shoes are **designed for cushioning, support, and breathability** during a run. Most runners choose based on foot strike and terrain.';
const MOCK_SUGGESTIONS = ['Filter by size', 'Show sustainable options', 'Compare cushioning levels'];
const MOCK_PRODUCTS: ProcessedProduct[] = [
  {
    product_id: 'mock-001',
    im_url: 'https://picsum.photos/seed/shoe1/300/300',
    product_url: '#',
    title: 'Cushioned trail runner',
    price: { value: 118, currency: 'USD' },
    rating: 5,
  },
  {
    product_id: 'mock-002',
    im_url: 'https://picsum.photos/seed/shoe2/300/300',
    product_url: '#',
    title: 'Lightweight road runner',
    price: { value: 96, currency: 'USD' },
    rating: 4,
  },
  {
    product_id: 'mock-003',
    im_url: 'https://picsum.photos/seed/shoe3/300/300',
    product_url: '#',
    title: 'Breathable knit trainer',
    price: { value: 104, currency: 'USD' },
    rating: 4,
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ConversationTurn {
  id: string;
  title: string;
  queryImageUrl?: string;
  aiText: string;
  products: ProcessedProduct[];
  reqId?: string;
  isLoading: boolean;
  isInitial: boolean;
  productsExpanded: boolean;
  // `isLoading` flips to false as soon as the first chat_token arrives (to reveal streaming text),
  // which is often before any `product` SSE events have arrived — so `products` can still be
  // legitimately empty at that point. This tracks whether the product stream has actually finished,
  // so "No matching products found" only shows once that's really true, not mid-stream.
  productsSettled: boolean;
}

interface EmbeddedShoppingAssistantProps {
  query: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
const EmbeddedShoppingAssistant: FC<EmbeddedShoppingAssistantProps> = ({ query }) => {
  const { widgetConfig, widgetClient, darkMode, locale } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();

  // Same customization fields (and the same inline-style pattern) the shopping-assistant widget
  // uses for its icon/CTA colors, so hosts can rebrand this widget's accents the same way.
  const iconColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) || undefined;
  const primaryButtonBg = (darkMode ? customizations.buttons?.primary?.backgroundColorDark : customizations.buttons?.primary?.backgroundColor) || undefined;
  const primaryButtonText = (darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor) || undefined;

  const [inputQuery, setInputQuery] = useState(query || '');
  const [hasSearched, setHasSearched] = useState(false);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [bottomInput, setBottomInput] = useState('');
  const [pendingImage, setPendingImage] = useState<ImageFile | undefined>(undefined);
  // Suggestions are a single "next steps" footer for the whole conversation (matching
  // shopping-assistant), not something attached to a past turn — cleared the instant a new
  // turn starts, and repopulated once that turn's own response arrives, so old chips never
  // linger once results are shown.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Wishlist state lives here (not per-turn) so a product marked in one turn still shows as
  // wishlisted if it reappears in a later turn — same lifting pattern as shopping-assistant's
  // ChatWindow.tsx.
  const [wishlistPids, setWishlistPids] = useState<string[]>(widgetConfig.initState?.wishlistProductIds || []);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatIdRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingImageTurnIdRef = useRef('');

  // Image search is a real, separate API call (visearch multisearch) — the shopping-assistant
  // chat endpoint doesn't accept image input, so an uploaded image bypasses the chat/SSE flow
  // entirely and goes straight to the standard product-multisearch API.
  const { productResults: imageSearchResults, error: imageSearchError } = useImageMultisearch({
    image: pendingImage,
    boxData: undefined,
  });

  const scrollToBottom = (): void => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    if (!pendingImageTurnIdRef.current) return;
    if (imageSearchResults.length === 0 && !imageSearchError) return;
    const turnId = pendingImageTurnIdRef.current;
    pendingImageTurnIdRef.current = '';
    setTurns((prev) => prev.map((t) => (
      t.id === turnId ? { ...t, isLoading: false, products: imageSearchResults, productsSettled: true } : t
    )));
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSearchResults, imageSearchError]);

  const handleImageSelect = (file: File): void => {
    const turnId = `turn-${Date.now()}`;
    pendingImageTurnIdRef.current = turnId;

    setSuggestions([]);
    setTurns((prev) => [...prev, {
      id: turnId,
      title: intl.formatMessage({ id: 'imageSearchTurnLabel' }),
      queryImageUrl: URL.createObjectURL(file),
      aiText: '',
      products: [],
      isLoading: true,
      isInitial: false,
      productsExpanded: true,
      productsSettled: false,
    }]);
    scrollToBottom();

    setPendingImage({ files: [file] });
  };

  const addTurn = (title: string, queryToSend: string, chatIdOverride?: string, isInitial = false): void => {
    const turnId = `turn-${Date.now()}`;

    setSuggestions([]);
    setTurns((prev) => [...prev, {
      id: turnId,
      title,
      aiText: '',
      products: [],
      isLoading: true,
      isInitial,
      // Only the very first turn gates behind a "Show products" click; follow-up
      // turns (from chips or the bottom bar) reveal their products immediately.
      productsExpanded: !isInitial,
      productsSettled: false,
    }]);

    scrollToBottom();

    const updateTurn = (update: Partial<ConversationTurn>): void => {
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, ...update } : t)));
    };

    if (!appSettings.appKey) {
      setTimeout(() => {
        updateTurn({
          isLoading: false,
          aiText: MOCK_AI_TEXT,
          products: MOCK_PRODUCTS,
          productsSettled: true,
        });
        setSuggestions(MOCK_SUGGESTIONS);
        scrollToBottom();
      }, 1500);
      return;
    }

    let uid = '';
    let sid = '';
    widgetClient.visearch.getUid((u) => { uid = u; });
    widgetClient.visearch.getSid((s) => { sid = s; });

    const params = new URLSearchParams({
      ...widgetConfig.searchSettings,
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: chatIdOverride ?? chatIdRef.current,
      q: queryToSend,
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: (widgetConfig.searchSettings['attrs_to_get'] ?? []).join(','),
      chat_agent: widgetConfig.customizations.chatbot?.chatAgent || 'shopping_closer_voice_v2',
    });

    const manualEndpoint = getManualEndpoint(appSettings.placementId);
    const base = resolveBaseEndpoint(appSettings, manualEndpoint);
    const path = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/search/chat/shopping-assistant'
      : '/v1/product/multisearch/chat/shopping-assistant';

    const tokens: string[] = [];
    const streamProducts: ProcessedProduct[] = [];
    let reqId = '';

    fetchEventSource(`${base}${path}?${params.toString()}`, {
      method: 'POST',
      body: new FormData(),
      openWhenHidden: true,
      onmessage: (ev) => {
        if (ev.event === 'chat_id') {
          chatIdRef.current = JSON.parse(ev.data).value;
        } else if (ev.event === 'reqid') {
          reqId = JSON.parse(ev.data).value;
          updateTurn({ reqId });
        } else if (ev.event === 'chat_token') {
          tokens.push(JSON.parse(ev.data).value);
          const currentText = tokens.join('');
          updateTurn({
            isLoading: false,
            aiText: stripTokensForDisplay(currentText).trim(),
            products: resolveProducts(currentText, streamProducts),
          });
          setSuggestions([...currentText.matchAll(SUGGESTION_LINE_REGEX)].map((m) => m[1].trim()));
        } else if (ev.event === 'product') {
          streamProducts.push(getFlattenProduct(JSON.parse(ev.data)));
          updateTurn({ products: resolveProducts(tokens.join(''), streamProducts) });
        }
      },
      onclose: () => {
        const currentText = tokens.join('');
        const finalProducts = resolveProducts(currentText, streamProducts);
        updateTurn({
          isLoading: false,
          aiText: stripTokensForDisplay(currentText).trim(),
          products: finalProducts,
          productsSettled: true,
        });
        setSuggestions([...currentText.matchAll(SUGGESTION_LINE_REGEX)].map((m) => m[1].trim()));
        if (finalProducts.length) {
          const md = { queryId: reqId, cat: Category.RESULT };
          widgetClient.sendEvent(Actions.RESULT_LOAD, md);
          widgetClient.setLastTrackingMeta(md);
        }
        scrollToBottom();
      },
      onerror: (err) => {
        console.error(err);
        updateTurn({ isLoading: false, productsSettled: true });
        throw err;
      },
    });
  };

  const handleInitialSearch = (): void => {
    const q = inputQuery.trim();
    if (!q) return;
    setHasSearched(true);
    widgetClient.sendEvent(Actions.LOAD, {});
    widgetClient.visearch.generateUuid((uuid) => {
      chatIdRef.current = uuid;
      addTurn(q, q, uuid, true);
    });
  };

  const handleShowProducts = (turnId: string): void => {
    setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, productsExpanded: true } : t)));
    scrollToBottom();
  };

  const handleChipClick = (suggestion: string): void => {
    addTurn(suggestion, suggestion);
  };

  // Client-side only (Web Speech API) — reads the initial turn's AI overview text aloud. There's no
  // backend support for translating/localizing the AI response itself (only this widget's own UI
  // chrome is localized via react-intl), so this always speaks the text in whatever language the
  // backend returned it in.
  const handleToggleReadAloud = (): void => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const overviewText = turns.find((t) => t.isInitial)?.aiText.replace(/\*\*/g, '');
    if (!overviewText) return;
    const utterance = new SpeechSynthesisUtterance(overviewText);
    utterance.lang = locale.replace('_', '-');
    utterance.onend = (): void => setIsSpeaking(false);
    utterance.onerror = (): void => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // "Start over" — this widget is a full-page embedded view, not a dismissible popup, so closing
  // means resetting back to the home search screen rather than hiding/unmounting anything.
  const handleReset = (): void => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setTurns([]);
    setSuggestions([]);
    setInputQuery('');
    setBottomInput('');
    setPendingImage(undefined);
    pendingImageTurnIdRef.current = '';
    chatIdRef.current = '';
    setHasSearched(false);
  };

  const handleBottomAsk = (): void => {
    const q = bottomInput.trim();
    if (!q) return;
    setBottomInput('');
    addTurn(q, q);
  };

  useEffect(() => {
    if (query) {
      setHasSearched(true);
      widgetClient.sendEvent(Actions.LOAD, {});
      widgetClient.visearch.generateUuid((uuid) => {
        chatIdRef.current = uuid;
        addTurn(query, query, uuid, true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!root) return <></>;

  // ── Initial state: Google homepage ────────────────────────────────────────
  if (!hasSearched) {
    return (
      <div className='size-full bg-white dark:bg-neutral-900 flex flex-col items-center justify-center px-4 gap-8'>

        {/* Logo */}
        <div className='flex flex-col items-center gap-3'>
          <SparklesIcon className='size-12' color={iconColor} />
          <h1 className='text-5xl font-normal text-gray-700 dark:text-neutral-100 tracking-tight'>
            Embedded Shopping <span className='font-medium' style={{ color: iconColor }}>Assistant</span>
          </h1>
        </div>

        {/* Search bar */}
        <div className='w-full max-w-xl'>
          <SearchBar value={inputQuery} onChange={setInputQuery} onSubmit={handleInitialSearch} iconColor={iconColor} />
        </div>

        {/* Search button */}
        <button
          type='button'
          onClick={handleInitialSearch}
          className='px-6 py-2 text-sm text-gray-700 dark:text-neutral-100 bg-gray-100 dark:bg-neutral-800
            hover:bg-gray-200 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 rounded-md transition-colors'
        >
          {intl.formatMessage({ id: 'searchButton' })}
        </button>

      </div>
    );
  }

  // ── Results state ─────────────────────────────────────────────────────────
  const resultsExpanded = turns.some((t) => t.productsExpanded);
  // Suggestions parse out of the AI text stream as soon as the markers arrive — often well before
  // the initial turn's "See Results" gate is opened. Hold them back until the latest turn has
  // actually revealed its products, so "next steps" never appears ahead of the results it follows.
  const latestTurn = turns[turns.length - 1];
  const showSuggestions = suggestions.length > 0 && !!latestTurn?.productsExpanded;

  return (
    <div className='size-full bg-white dark:bg-neutral-900 flex flex-col'>

      {/* Only shown once results are actually revealed (post "See Results"/auto-expanded follow-ups) —
          not during the initial loading/clamped-preview phase, so it doesn't appear ahead of content. */}
      {resultsExpanded && (
        <TopBar
          iconColor={iconColor}
          isSpeaking={isSpeaking}
          onToggleReadAloud={handleToggleReadAloud}
          onClose={handleReset}
        />
      )}

      <div ref={scrollRef} className='flex-1 overflow-y-auto thin-scrollbar'>
        <div className='max-w-3xl mx-auto p-6'>
          {turns.map((turn, idx) => (
            <Fragment key={turn.id}>
              <TurnSection
                turn={turn}
                showDivider={idx > 0}
                onShowProducts={() => handleShowProducts(turn.id)}
                primaryButtonBg={primaryButtonBg}
                wishlistPids={wishlistPids}
                setWishlistPids={setWishlistPids}
              />
            </Fragment>
          ))}

          {/* "Next steps" for the whole conversation — a single footer tied to the latest turn's
              response, not the past turn it came from. Cleared the instant a new turn starts
              (see addTurn/handleImageSelect), so it always renders directly below the newest
              results and never lingers once a chip has been acted on. */}
          {showSuggestions && (
            <div className='flex flex-wrap gap-2 mt-2'>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type='button'
                  onClick={() => handleChipClick(suggestion)}
                  className='px-4 py-1.5 text-sm rounded-full border bg-white dark:bg-neutral-800 border-gray-300
                    dark:border-neutral-700 text-gray-700 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-neutral-700
                    hover:border-gray-400 dark:hover:border-neutral-600 cursor-pointer transition-colors'
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {resultsExpanded && (
        <BottomBar
          value={bottomInput}
          onChange={setBottomInput}
          onSubmit={handleBottomAsk}
          onImageSelect={handleImageSelect}
          iconColor={iconColor}
          primaryButtonBg={primaryButtonBg}
          primaryButtonText={primaryButtonText}
        />
      )}

    </div>
  );
};

export default EmbeddedShoppingAssistant;
