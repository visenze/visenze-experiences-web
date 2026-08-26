import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, Fragment, type ReactElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import DownArrowIcon from '../../../common/icons/DownArrowIcon';
import SparklesIcon from '../../../common/icons/SparklesIcon';
import UserIcon from '../../../common/icons/UserIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import { isImageDataUrl, isImageUrl, type SearchImageOrPid } from '../../../common/types/image';
import type { ProcessedProduct } from '../../../common/types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../../common/utils';
import { FOCUS_VISIBLE_CLASSES, FOCUSED_SCALE, PRODUCT_REVEAL_DELAY_MS, USER_SCROLL_IDLE_MS } from '../constants';

export interface Chat {
  chatId: string;
  requestId: string;
  author: 'user' | 'bot' | 'products';
  messages: string[];
  products?: ProcessedProduct[];
  image?: SearchImageOrPid;
}

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
}

interface RevealedProductsProps {
  products: ProcessedProduct[];
  requestId: string;
  renderCard: (product: ProcessedProduct, pidx: number, requestId: string) => ReactElement;
}

const RevealedProducts: FC<RevealedProductsProps> = ({ products, requestId, renderCard }) => {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect((): (() => void) | undefined => {
    const interval = setInterval((): void => {
      setRevealedCount((count) => {
        if (count >= products.length) {
          clearInterval(interval);
          return count;
        }
        const next = count + 1;
        if (next >= products.length) {
          clearInterval(interval);
        }
        return next;
      });
    }, PRODUCT_REVEAL_DELAY_MS);
    return (): void => clearInterval(interval);
  }, [products.length]);

  return (
    <>
      {products.slice(0, revealedCount).map((product, pidx) => renderCard(product, pidx, requestId))}
    </>
  );
};

const ChatWindow: FC<ChatWindowProps> = ({
  isWaiting, chats, latestMessage, suggestions, sendMessage, showAllSuggestions, setShowAllSuggestions,
  streamingProducts = [], streamingRequestId = '', focusedProductId = null,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const intl = useIntl();
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const breakpoint = useBreakpoint();
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const firstExtraSuggestionRef = useRef<HTMLButtonElement>(null);
  // Tracks `${requestId}:${productId}` pairs that have already fired a PRODUCT_VIEW, so a card
  // that streams in live and is later re-mounted as a committed row (a different DOM subtree)
  // doesn't count a second view. Keyed by request too, so the same product in a later response
  // still gets its own view.
  const viewedProductIdsRef = useRef<Set<string>>(new Set());
  // The card whose sentence is currently being narrated gets this ref, so it can be scrolled
  // into view; only one card carries it at a time (see `renderProductCard` below). Mirrors the
  // "active item" pattern in embedded-search-results/components/SearchHistory.tsx.
  const focusedCardRef = useRef<HTMLDivElement>(null);
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

  const autoScrollToFocusedCard = (): void => {
    if (isUserScrollingRef.current || !focusedCardRef.current) {
      return;
    }
    beginProgrammaticScroll();
    // `block: 'center'` rather than 'nearest' — the browser clamps automatically when the card
    // is close enough to the end of the scrollable content that centering isn't reachable (it
    // scrolls as far as the container allows instead), so this also degrades correctly near the
    // bottom of the chat log.
    focusedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  };

  useEffect(() => {
    if (focusedProductId) {
      autoScrollToFocusedCard();
    }
  }, [focusedProductId]);

  const getFile = (image: SearchImageOrPid | undefined): string => {
    if (!image) {
      return '';
    }
    if (isImageDataUrl(image)) {
      return image.file;
    }
    if (isImageUrl(image)) {
      return image.imgUrl;
    }
    return '';
  };

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

  useEffect(() => {
    autoScrollToBottom();
  }, [chats.length]);

  // While a product is being narrated, `autoScrollToFocusedCard` (above) owns scrolling instead —
  // otherwise this would snap to the bottom of the stream on every token/typewriter tick and
  // scroll the currently-narrated product (which is rarely the last one) out of view.
  useEffect(() => {
    if (!focusedProductId) {
      autoScrollToBottom();
    }
  }, [latestMessage, focusedProductId]);

  useEffect(() => {
    if (!focusedProductId) {
      autoScrollToBottom();
    }
  }, [streamingProducts.length, focusedProductId]);

  useEffect(() => {
    if (showAllSuggestions) {
      firstExtraSuggestionRef.current?.focus();
    }
  }, [showAllSuggestions]);

  useEffect(() => {
    if (showAllSuggestions) {
      firstExtraSuggestionRef.current?.focus();
    }
  }, [showAllSuggestions]);

  const processMessageForDisplay = (message: string): string => message
      // quick sanitization
      .replaceAll(/</g, '&lt;')
      .replaceAll(/>/g, '&gt;')
      // bold texts wrapped **like this**
      .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replaceAll(/\n/g, '<br>');

  // Memoized so the grid containers below (and ProductCard/RevealedProducts underneath) receive
  // the same `className`/`style` reference across renders that don't actually change these inputs.
  const productGridClasses = useMemo(
    (): string => getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2', 'gap-x-4', 'gap-y-4'),
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

  // The focused card's ring is folded into the same box-shadow as the lift shadow (rather than a
  // Tailwind `ring-*` class) because an inline `boxShadow` would otherwise clobber it —
  // box-shadow is a single CSS property. See FOCUSED_SCALE in ../constants for why the scale
  // itself is kept small.
  const getCardWrapperStyle = (isFocused: boolean): CSSProperties => ({
    transformOrigin: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: isFocused ? 2 : 1,
    transform: isFocused ? `scale(${FOCUSED_SCALE})` : undefined,
    boxShadow: isFocused
      ? '0 8px 20px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)'
      : undefined,
  });

  const renderProductCard = (product: ProcessedProduct, pidx: number, requestId: string): ReactElement => {
    const viewedKey = `${requestId}:${product.product_id}`;
    const isFocused = !!focusedProductId && product.product_id === focusedProductId;
    return (
      <div
          key={`${product.product_id}-${pidx}`}
          ref={isFocused ? focusedCardRef : undefined}
          className='relative'
          style={getCardWrapperStyle(isFocused)}
      >
        {isFocused && (
          <span
            className='absolute top-1 right-1 z-10 rounded-md bg-black/70 dark:bg-white/80
              px-1.5 py-0.5 text-[10px] font-medium leading-none text-white dark:text-black'
          >
            {intl.formatMessage({ id: 'nowDescribing' })}
          </span>
        )}
        <ProductCard
            result={product}
            metadata={{
              queryId: requestId,
            }}
            isInWishlist={wishlistPids.includes(product.product_id)}
            setIsInWishlist={(pid, isInWishlist) => {
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
            }}
            index={pidx}
            pwPrefix='sa'
            isRecommendation={false}
            hasFindSimilar={false}
            skipViewTracking={viewedProductIdsRef.current.has(viewedKey)}
            onProductViewed={() => {
              viewedProductIdsRef.current.add(viewedKey);
            }} />
      </div>
    );
  };

  return (
      <>
        <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
          {getAccessibleStatus()}
        </div>
        <div role='log'
             className='overflow-y-auto h-full px-4 my-4 space-y-3'
             aria-label={intl.formatMessage({ id: 'a11yChatMessages' })}
             aria-live='polite'
             aria-relevant='additions'
             ref={messageScrollRef}
             onScroll={handleScroll}
             onWheel={markUserScrolling}
             onTouchStart={markUserScrolling}
             onTouchMove={markUserScrolling}>
          {chats.map((chat, idx) => (
              <div className={cn(
                  'w-full',
                  chat.author === 'products' ? `grid ${productGridClasses}` : 'flex flex-col',
                  chat.author === 'user' ? 'items-end' : '',
              )}
                   style={chat.author === 'products' ? productGridCssConfig : undefined}
                   key={`chat-row-${idx}`}>
                {chat.author === 'user' && chat.image && (
                  <div className='flex gap-1 max-w-9/10'>
                    <div
                      className='mb-2 w-fit bg-sky-900 dark:bg-sky-100 p-2 text-sm text-white dark:text-neutral-800
                        rounded-lg border border-neutral-100 dark:border-neutral-800'
                      key={`chat-user-message-${idx}`}
                    >
                      <img
                        alt={intl.formatMessage({ id: 'a11yUploadedImage' })}
                        className='max-w-full h-auto rounded-lg shadow-sm border'
                        style={{ maxHeight: '200px' }}
                        src={getFile(chat.image)}
                      />
                    </div>
                    <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
                      bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                      <UserIcon className='size-6' />
                    </div>
                  </div>
                )}
                {chat.author === 'user' && chat.messages.map((message, cidx) => (
                  <div
                    className='flex gap-1 max-w-9/10'
                    key={`chat-user-message-${cidx}`}>
                    <div
                      className='mb-2 w-fit bg-sky-900 dark:bg-sky-100 p-2 text-sm text-white dark:text-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-800'
                    >
                      {message}
                    </div>
                    <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
                      bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                      <UserIcon className='size-6' />
                    </div>
                  </div>
                ))}
                {chat.author === 'bot' && chat.messages.map((message, cidx) => (
                  <div
                    className='flex gap-1 max-w-9/10'
                    key={`chat-bot-message-${cidx}`}>
                    <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
                      bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                      <SparklesIcon className='size-5' />
                    </div>
                    <div
                      className='mb-2 w-fit max-w-9/10 bg-gray-100 dark:bg-neutral-800 p-2 text-sm
                        text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-100 dark:border-neutral-800'
                      dangerouslySetInnerHTML={{
                        __html: processMessageForDisplay(message),
                      }}
                    />
                  </div>
                ))}
                {chat.author === 'products' && (chat.products || []).map((product, pidx) => renderProductCard(product, pidx, chat.requestId))}
              </div>
          ))}
          {(isWaiting || latestMessage || streamingProducts.length > 0) && (
              <>
                <div className='chat-row flex gap-2 items-end'>
                  {isWaiting && (
                    <div className='flex gap-1 max-w-9/10'>
                      <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0
                        bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
                        <SparklesIcon className='size-5' />
                      </div>
                      <div className='flex items-center w-fit gap-2 p-2 rounded-lg dark:border-neutral-800
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
                      </div>
                  )}
                  {latestMessage && (
                      <div
                        className={`
                          mb-2 w-fit max-w-7/10 bg-gray-100 dark:bg-neutral-800 p-2 text-sm text-neutral-900 dark:text-neutral-100
                          rounded-lg border border-neutral-100 dark:border-neutral-800`}
                        dangerouslySetInnerHTML={{
                          __html: processMessageForDisplay(latestMessage),
                        }}
                      />
                  )}
                </div>
                {streamingRequestId && streamingProducts.length > 0 && (
                    <div
                      className={cn('w-full grid', productGridClasses)}
                      style={productGridCssConfig}>
                      <RevealedProducts
                        key={streamingRequestId}
                        products={streamingProducts}
                        requestId={streamingRequestId}
                        renderCard={renderProductCard} />
                    </div>
                )}
              </>
          )}
          {!isWaiting && suggestions.length > 0 && (
            <div className='mt-2 flex items-end'>
              <div className='flex flex-wrap gap-2'
                   role='group'
                   aria-label={intl.formatMessage({ id: 'a11ySuggestedReplies' })}>
                {suggestions.map((suggestion, idx) => (
                  <Fragment key={`suggestion-${idx}`}>
                    {(showAllSuggestions || idx <= 1) && (
                      <button
                        ref={idx === 2 ? firstExtraSuggestionRef : undefined}
                        type='button'
                        className={cn(
                            'w-fit bg-sky-100 dark:bg-stone-700 p-2 text-xs text-blue-900 dark:text-blue-50',
                            'rounded-lg border border-neutral-100 dark:border-neutral-800 cursor-pointer',
                            FOCUS_VISIBLE_CLASSES,
                        )}
                        onClick={() => sendMessage(suggestion)}
                      >
                        {suggestion}
                      </button>
                    )}
                  </Fragment>
                ))}
                {(!showAllSuggestions && suggestions.length > 2) && (
                  <button
                    type='button'
                    className={cn(
                        'w-fit bg-sky-200 dark:bg-stone-700 p-2 text-xs text-blue-900 dark:text-blue-50',
                        'rounded-lg border border-neutral-100 dark:border-neutral-800 cursor-pointer',
                        FOCUS_VISIBLE_CLASSES,
                    )}
                    onClick={() => {
                      setShowAllSuggestions();
                      scrollToBottom();
                    }}>
                    {intl.formatMessage({ id: 'showMore' })}
                  </button>
                )}
              </div>
            </div>
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
