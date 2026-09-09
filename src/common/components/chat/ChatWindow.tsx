import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import ChatRow from './ChatRow';
import { PRODUCT_IMAGE_MAX_HEIGHT_CLASS, USER_SCROLL_IDLE_MS } from './constants';
import { processMessageForDisplay } from './message-formatting';
import ProductGrid from './ProductGrid';
import type { Chat } from './use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import DownArrowIcon from '../../icons/DownArrowIcon';
import SparklesIcon from '../../icons/SparklesIcon';
import type { WidgetBreakpoint } from '../../types/constants';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../utils';
import useBreakpoint from '../hooks/use-breakpoint';

// i18n contract: this component calls `intl.formatMessage` for the following ids, so any widget
// consuming this shared component must provide all of them in its own DEFAULT_TEXTS/locale files
// (via IntlProvider), or the UI will render raw translation ids instead of text:
// a11yAssistantThinking, a11yChatMessages, a11yProductResultsShown, a11yScrollToLatestMessage,
// a11ySuggestedReplies, a11yUploadedImage, nowDescribing, showMore. When productDisplayMode is
// 'hint' (see below), hintResultsShown is required too.
interface ChatWindowProps {
  isWaiting: boolean;
  showAllSuggestions: boolean;
  setShowAllSuggestions: () => void;
  chats: Chat[];
  latestMessage: string;
  suggestions: string[];
  sendMessage: (message: string) => void;
  streamingProducts?: ProcessedProduct[];
  streamingRequestId?: string;
  focusedProductId?: string | null;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
  // Prefix forwarded to ProductCard's `pwPrefix`, so each consuming widget's product-view
  // tracking stays distinguishable (e.g. 'asl' for ai-search-launcher).
  pwPrefix: string;
  // Default 'grid' (today's behavior, unchanged): a 'products' chat renders its full product
  // grid inline. 'hint' renders a single "↳ N results shown" line instead — used by split-layout's
  // chat pane, where the grid itself lives in the separate products pane.
  productDisplayMode?: 'grid' | 'hint';
  // Only read when productDisplayMode === 'hint': the requestId whose hint line should render as
  // active (mirrors the matching breadcrumb's active state).
  activeRequestId?: string | null;
  // Only read when productDisplayMode === 'hint': fired with a chat's requestId when its hint line
  // is clicked. In split-layout usage this is literally `setActiveBreadcrumb` from use-chat.ts,
  // passed straight through with no wrapper.
  onSelectTurn?: (requestId: string) => void;
  // Hides only the very first chat row when it's the user's own initial query (idx === 0 &&
  // author === 'user') — e.g. ESA, which surfaces that same query as a separate UI element before
  // the chat surface ever mounts, so repeating it as the first bubble here would be redundant.
  // Deliberately narrower than a general "hide all user messages" toggle: every later row (any
  // idx > 0, or a non-'user' row at idx 0) always renders, regardless of this flag.
  hideInitialUserMessage?: boolean;
  // On the very first mount only, scroll to the top of the conversation instead of the bottom —
  // used when this ChatWindow expands with turns already in it (e.g. ESA's "See Results"), so the
  // shopper keeps reading from where they were instead of jumping to the latest message. Every
  // later content change still auto-scrolls to bottom as usual. Default false (today's behavior).
  initialScrollToTop?: boolean;
  // Overrides the internal useBreakpoint() result for the product grid's column count only.
  // Needed by widgets whose card renders at a fixed width regardless of the window (e.g.
  // shopping-assistant's floating layout), where the window's own breakpoint would otherwise pick
  // a column count too wide for the card.
  productGridBreakpoint?: WidgetBreakpoint;
}

// Matches ProductsPane's column breakpoints: a fixed 2-column grid looks fine on mobile widths,
// but at desktop widths it leaves cards wide enough that a portrait `imageAspectRatio` (the
// default is 3/4) renders taller than the chat surface, hiding the "Now Describing" badge during
// narration.
const PRODUCT_GRID_COLUMNS_CLASSES = 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

interface SuggestionChipsProps {
  suggestions: string[];
  showAll: boolean;
  onShowAll: () => void;
  onSelect: (suggestion: string) => void;
  scrollToBottom: () => void;
}

// Extracted verbatim from what used to be the single trailing suggestion row, so it can be
// attached per-turn (Task 5) in addition to the live in-flight row. `showAll` stays a single
// hook-level boolean shared across every rendered instance (a deliberate simplification): clicking
// "show more" under any one turn's chips expands every visible chip row at once, rather than each
// turn tracking its own independent toggle.
const SuggestionChips: FC<SuggestionChipsProps> = ({ suggestions, showAll, onShowAll, onSelect, scrollToBottom }) => {
  const intl = useIntl();
  const firstExtraSuggestionRef = useRef<HTMLButtonElement>(null);
  // Only the row whose own "show more" was clicked moves focus into its newly-revealed chips.
  // `showAll` is shared across every rendered row, so without this flag each row would race to
  // steal focus when any one of them expanded.
  const didExpandRef = useRef(false);

  useEffect(() => {
    if (showAll && didExpandRef.current) {
      didExpandRef.current = false;
      firstExtraSuggestionRef.current?.focus();
    }
  }, [showAll]);

  return (
    <div className='mt-2 flex items-end'>
      <div className='flex flex-wrap gap-2' role='group' aria-label={intl.formatMessage({ id: 'a11ySuggestedReplies' })}>
        {suggestions.map((suggestion, idx) => (
          <Fragment key={`suggestion-${idx}`}>
            {(showAll || idx <= 1) && (
              <button
                ref={idx === 2 ? firstExtraSuggestionRef : undefined}
                type='button'
                className={cn(
                    'w-fit bg-sky-100 dark:bg-stone-700 p-2 text-xs text-blue-900 dark:text-blue-50',
                    'rounded-lg border border-neutral-100 dark:border-neutral-800 cursor-pointer',
                    FOCUS_VISIBLE_CLASSES,
                )}
                onClick={() => onSelect(suggestion)}
              >
                {suggestion}
              </button>
            )}
          </Fragment>
        ))}
        {(!showAll && suggestions.length > 2) && (
          <button
            type='button'
            className={cn(
                'w-fit bg-sky-200 dark:bg-stone-700 p-2 text-xs text-blue-900 dark:text-blue-50',
                'rounded-lg border border-neutral-100 dark:border-neutral-800 cursor-pointer',
                FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => {
              didExpandRef.current = true;
              onShowAll();
              scrollToBottom();
            }}>
            {intl.formatMessage({ id: 'showMore' })}
          </button>
        )}
      </div>
    </div>
  );
};

const ChatWindow: FC<ChatWindowProps> = ({
  isWaiting, chats, latestMessage, suggestions, sendMessage, showAllSuggestions, setShowAllSuggestions,
  streamingProducts = [], streamingRequestId = '', focusedProductId = null, wishlistPids, setIsInWishlist, pwPrefix,
  productDisplayMode = 'grid', activeRequestId = null, onSelectTurn, hideInitialUserMessage = false,
  initialScrollToTop = false, productGridBreakpoint,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const chatbotConfig = customizations.chatbot;
  const intl = useIntl();
  const detectedBreakpoint = useBreakpoint();
  const breakpoint = productGridBreakpoint ?? detectedBreakpoint;
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  // Shared across every ProductGrid this ChatWindow renders (see ProductGrid's own comment on
  // this prop) — a per-instance ref wouldn't survive a card's remount from the live streaming
  // grid into its committed ChatRow.
  const viewedProductIdsRef = useRef<Set<string>>(new Set());
  // True while the user is actively scrolling (or within a short grace period after their last
  // gesture) — every automatic/streaming-driven scroll checks this and backs off, so the user's
  // own scroll always wins. Only real user gestures (wheel/touch) set it; the native `scroll`
  // event alone can't be trusted to mean "the user did this" since our own programmatic scrolls
  // fire it too (see `isProgrammaticScrollRef` below).
  const isUserScrollingRef = useRef(false);
  const userScrollIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True for a short window around a scroll WE triggered, so the `onScroll` handler below can
  // tell our own auto-scrolls apart from a genuine user gesture and not misreport them as one.
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the one-time initialScrollToTop handling below has already run, so it only
  // ever overrides the very first scroll and every later content change falls through to the
  // normal auto-scroll-to-bottom behavior.
  const hasAppliedInitialScrollRef = useRef(false);

  const PROGRAMMATIC_SCROLL_SETTLE_MS = 500;

  const markUserScrolling = (): void => {
    isUserScrollingRef.current = true;
    if (userScrollIdleTimeoutRef.current) {
      clearTimeout(userScrollIdleTimeoutRef.current);
    }
    userScrollIdleTimeoutRef.current = setTimeout((): void => {
      isUserScrollingRef.current = false;
      userScrollIdleTimeoutRef.current = null;
    }, USER_SCROLL_IDLE_MS);
  };

  const beginProgrammaticScroll = (): void => {
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
    }
    programmaticScrollTimeoutRef.current = setTimeout((): void => {
      isProgrammaticScrollRef.current = false;
      programmaticScrollTimeoutRef.current = null;
    }, PROGRAMMATIC_SCROLL_SETTLE_MS);
  };

  useEffect(() => (): void => {
    if (userScrollIdleTimeoutRef.current) {
      clearTimeout(userScrollIdleTimeoutRef.current);
    }
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
    }
  }, []);

  const handleScroll = (e: any): void => {
    const t = e.target;
    setShowBottomArrow(t.scrollHeight - t.scrollTop - t.clientHeight > 50);
    if (isProgrammaticScrollRef.current) {
      // This scroll event is the tail of one of our own auto-scrolls settling, not the user.
      return;
    }
    markUserScrolling();
  };

  // Unconditional — used both as the streaming-driven auto-scroll primitive (via
  // `autoScrollToBottom` below) and directly by explicit user actions (the down-arrow button,
  // "show more suggestions"), which should always jump to bottom regardless of any in-flight
  // user-scrolling grace period.
  const scrollToBottom = (): void => {
    const scrollContainer = messageScrollRef.current;
    if (scrollContainer) {
      beginProgrammaticScroll();
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      setShowBottomArrow(false);
    }
  };

  // Follows new content automatically only while the user isn't actively scrolling themselves —
  // any real scroll/touch gesture (see `markUserScrolling`) suppresses this until it settles.
  const autoScrollToBottom = (): void => {
    if (!isUserScrollingRef.current) {
      scrollToBottom();
    }
  };

  // While a product is being narrated AND this ChatWindow renders the product grid inline
  // (productDisplayMode === 'grid'), ProductGrid's own scroll-into-view effect owns scrolling
  // instead — otherwise this would snap to the bottom of the stream on every token/typewriter tick
  // and scroll the currently-narrated product (which is rarely the last one) out of view. In
  // 'hint' mode (split-layout's chat pane) there's no ProductGrid in this container at all — the
  // real grid lives in the separate ProductsPane — so nothing else would scroll this pane during
  // narration, leaving stale text on screen until narration ends and focusedProductId clears.
  const focusedProductOwnsScroll = productDisplayMode === 'grid' && !!focusedProductId;

  // Single effect covering every reason this pane's content can grow (a new chat turn, streamed
  // reply text, or streamed products) — merged from three near-identical effects so the scroll
  // guard above only has to be reasoned about in one place.
  useEffect(() => {
    if (!hasAppliedInitialScrollRef.current) {
      hasAppliedInitialScrollRef.current = true;
      if (initialScrollToTop) {
        const scrollContainer = messageScrollRef.current;
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
        return;
      }
    }
    if (!focusedProductOwnsScroll) {
      autoScrollToBottom();
    }
  }, [chats.length, latestMessage, streamingProducts.length, focusedProductOwnsScroll]);

  // Memoized so ProductGrid receives the same `className`/`style` reference across renders that
  // don't actually change these inputs — otherwise every ProductGrid instance would see a
  // "changed" style prop on every ChatWindow render (e.g. a streamed token elsewhere), defeating
  // its memo.
  const productGridClasses = useMemo(
    (): string => getProductGridCssClasses(customizations, breakpoint, PRODUCT_GRID_COLUMNS_CLASSES, 'gap-x-4', 'gap-y-4'),
    [customizations.productGrid, breakpoint],
  );

  const productGridCssConfig = useMemo(
    (): CSSProperties => getProductGridCssConfig(customizations, breakpoint),
    [customizations.productGrid, breakpoint],
  );

  const getAccessibleStatus = (): string => {
    if (isWaiting) {
      return intl.formatMessage({ id: 'a11yAssistantThinking' });
    }
    const lastChat = chats[chats.length - 1];
    const previousChat = chats[chats.length - 2];
    if (!lastChat) {
      return '';
    }
    const statusParts: string[] = [];
    if (lastChat.author === 'bot') {
      statusParts.push(lastChat.messages.join(' '));
    }
    if (lastChat.author === 'products') {
      if (previousChat?.author === 'bot') {
        statusParts.push(previousChat.messages.join(' '));
      }
      statusParts.push(intl.formatMessage({ id: 'a11yProductResultsShown' }, { count: lastChat.products?.length || 0 }));
    }
    return statusParts.join(' ').trim();
  };

  return (
      <>
        <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
          {getAccessibleStatus()}
        </div>
        <div role='log'
             className='overflow-y-auto h-full px-4 my-4 space-y-3'
             aria-label={intl.formatMessage({ id: 'a11yChatMessages' })}
             ref={messageScrollRef}
             onScroll={handleScroll}
             onWheel={markUserScrolling}
             onTouchStart={markUserScrolling}
             onTouchMove={markUserScrolling}>
          {chats.map((chat, idx) => {
            // Scoped to exactly the initial query bubble, per hideInitialUserMessage's contract
            // above — every other row always renders.
            if (idx === 0 && chat.author === 'user' && hideInitialUserMessage) {
              return null;
            }
            return (
              <ChatRow
                key={`chat-row-${idx}`}
                chat={chat}
                focusedProductId={focusedProductId}
                streamingRequestId={streamingRequestId}
                wishlistPids={wishlistPids}
                setIsInWishlist={setIsInWishlist}
                pwPrefix={pwPrefix}
                productDisplayMode={productDisplayMode}
                activeRequestId={activeRequestId}
                onSelectTurn={onSelectTurn}
                productGridClasses={productGridClasses}
                productGridCssConfig={productGridCssConfig}
                viewedProductIdsRef={viewedProductIdsRef}
              />
            );
          })}
          {(isWaiting || latestMessage || streamingProducts.length > 0) && (
              <>
                <div className={cn('chat-row flex gap-2', latestMessage ? 'items-start' : 'items-center')}>
                  {(isWaiting || latestMessage) && !chatbotConfig?.hideAvatar && (
                    <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
                      bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                      <SparklesIcon className='size-5' />
                    </div>
                  )}
                  {isWaiting && (
                    <div className='chat-typing-indicator flex items-center w-fit gap-1.5 px-3.5 py-2.5 rounded-full
                      bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                      <span className='sr-only'>{intl.formatMessage({ id: 'a11yAssistantThinking' })}</span>
                      {[0, 1, 2].map((i) => (
                          <div
                            key={`loading-dot-${i}`}
                            className='loading-dot rounded-full'
                            style={{ backgroundColor: darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor }}
                          />
                      ))}
                    </div>
                  )}
                  {latestMessage && (
                      <div
                        className={`
                          mb-2 min-w-0 max-w-7/10 break-words bg-gray-100 dark:bg-neutral-800 p-2 text-sm text-neutral-900 dark:text-neutral-100
                          rounded-lg border border-neutral-100 dark:border-neutral-800`}
                        dangerouslySetInnerHTML={{
                          __html: processMessageForDisplay(latestMessage),
                        }}
                      />
                  )}
                </div>
                {streamingRequestId && streamingProducts.length > 0 && productDisplayMode === 'grid' && (
                    <ProductGrid
                      products={streamingProducts}
                      requestId={streamingRequestId}
                      focusedProductId={focusedProductId}
                      focusedRequestId={streamingRequestId}
                      wishlistPids={wishlistPids}
                      setIsInWishlist={setIsInWishlist}
                      pwPrefix={pwPrefix}
                      streaming
                      imageClasses={PRODUCT_IMAGE_MAX_HEIGHT_CLASS}
                      className={cn('w-full grid', productGridClasses)}
                      style={productGridCssConfig}
                      viewedProductIdsRef={viewedProductIdsRef}
                    />
                )}
              </>
          )}
          {!isWaiting && suggestions.length > 0 && (
            <SuggestionChips
              suggestions={suggestions}
              showAll={showAllSuggestions}
              onShowAll={setShowAllSuggestions}
              onSelect={sendMessage}
              scrollToBottom={scrollToBottom}
            />
          )}
        </div>
        <div className='flex-grow'></div>
        <div className='relative'>
          {showBottomArrow && (
              <button
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yScrollToLatestMessage' })}
                title={intl.formatMessage({ id: 'a11yScrollToLatestMessage' })}
                className={cn(
                    'absolute bottom-2 end-2 cursor-pointer rounded-full shadow p-1 border-0',
                    'bg-white text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 transition-colors',
                    FOCUS_VISIBLE_CLASSES,
                )}
                onClick={scrollToBottom}>
                <DownArrowIcon />
              </button>
          )}
        </div>
      </>
  );
};

export default ChatWindow;
