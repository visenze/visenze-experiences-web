import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { USER_SCROLL_IDLE_MS } from './constants';
import ProductGrid from './ProductGrid';
import type { Chat } from './use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import DownArrowIcon from '../../icons/DownArrowIcon';
import SparklesIcon from '../../icons/SparklesIcon';
import UserIcon from '../../icons/UserIcon';
import { WidgetDataContext } from '../../types/contexts';
import { isImageDataUrl, isImageUrl, type SearchImageOrPid } from '../../types/image';
import type { ProcessedProduct } from '../../types/product';
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
}

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
  productDisplayMode = 'grid', activeRequestId = null, onSelectTurn,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const messageScrollRef = useRef<HTMLDivElement>(null);
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

  // While a product is being narrated, ProductGrid's own scroll-into-view effect owns scrolling
  // instead — otherwise this would snap to the bottom of the stream on every token/typewriter tick
  // and scroll the currently-narrated product (which is rarely the last one) out of view.
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

  const processMessageForDisplay = (message: string): string => message
      // quick sanitization
      .replaceAll(/</g, '&lt;')
      .replaceAll(/>/g, '&gt;')
      // bold texts wrapped **like this**
      .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replaceAll(/\n/g, '<br>');

  const getProductGridCssClasses = (defaultGapX: string): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push(defaultGapX);
      }
      return classes.join(' ');
    }
    return [defaultGapX].join(' ');
  };

  const getProductGridCssConfig = (needed = false): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    if (!needed) {
      return cssConfig;
    }
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.columnGap = `${cssConfigSrc.marginHorizontal}px`;
      }
    }
    return cssConfig;
  };

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
             aria-live='polite'
             aria-relevant='additions'
             ref={messageScrollRef}
             onScroll={handleScroll}
             onWheel={markUserScrolling}
             onTouchStart={markUserScrolling}
             onTouchMove={markUserScrolling}>
          {chats.map((chat, idx) => (
              <Fragment key={`chat-row-${idx}`}>
                <div className={cn(
                    'w-full',
                    chat.author === 'products' && productDisplayMode === 'grid' ? `grid grid-cols-2 ${getProductGridCssClasses('gap-x-4')}` : 'flex flex-col',
                    chat.author === 'user' ? 'items-end' : '',
                )}
                     style={getProductGridCssConfig(chat.author === 'products' && productDisplayMode === 'grid')}>
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
                  {chat.author === 'products' && (
                    productDisplayMode === 'hint' ? (
                      <button
                        type='button'
                        onClick={() => onSelectTurn?.(chat.requestId)}
                        className={cn(
                            'w-fit text-left text-sm underline decoration-dotted cursor-pointer bg-transparent border-0 p-0',
                            chat.requestId === activeRequestId ? 'font-semibold text-blue-900 dark:text-blue-50' : 'text-neutral-600 dark:text-neutral-400',
                            FOCUS_VISIBLE_CLASSES,
                        )}
                      >
                        {intl.formatMessage({ id: 'hintResultsShown' }, { count: (chat.products || []).length })}
                      </button>
                    ) : (
                      <ProductGrid
                        products={chat.products || []}
                        requestId={chat.requestId}
                        focusedProductId={focusedProductId}
                        wishlistPids={wishlistPids}
                        setIsInWishlist={setIsInWishlist}
                        pwPrefix={pwPrefix}
                        className={cn('grid grid-cols-2', getProductGridCssClasses('gap-x-4'))}
                        style={getProductGridCssConfig(true)}
                      />
                    )
                  )}
                </div>
              </Fragment>
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
                {streamingRequestId && streamingProducts.length > 0 && productDisplayMode === 'grid' && (
                    <div
                      className={cn('w-full grid grid-cols-2', getProductGridCssClasses('gap-x-4'))}
                      style={getProductGridCssConfig(true)}>
                      <ProductGrid
                        products={streamingProducts}
                        requestId={streamingRequestId}
                        focusedProductId={focusedProductId}
                        wishlistPids={wishlistPids}
                        setIsInWishlist={setIsInWishlist}
                        pwPrefix={pwPrefix}
                        streaming
                      />
                    </div>
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
