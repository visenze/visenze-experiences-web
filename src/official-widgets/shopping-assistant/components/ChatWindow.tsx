import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, Fragment, type ReactElement, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import SparklesIcon from '../../../common/icons/SparklesIcon';
import UserIcon from '../../../common/icons/UserIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import { isImageDataUrl, isImageUrl, type SearchImageOrPid } from '../../../common/types/image';
import type { ProcessedProduct } from '../../../common/types/product';
import DownArrowIcon from '../icons/DownArrowIcon';

const FOCUS_VISIBLE_CLASSES = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';

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
}

const ChatWindow: FC<ChatWindowProps> = ({
  isWaiting, chats, latestMessage, suggestions, sendMessage, showAllSuggestions, setShowAllSuggestions,
  streamingProducts = [], streamingRequestId = '',
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const intl = useIntl();
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const breakpoint = useBreakpoint();
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const [messageBottomRef, setMessageBottomRef] = useState<HTMLDivElement>();
  // Tracks `${requestId}:${productId}` pairs that have already fired a PRODUCT_VIEW, so a card
  // that streams in live and is later re-mounted as a committed row (a different DOM subtree)
  // doesn't count a second view. Keyed by request too, so the same product in a later response
  // still gets its own view.
  const viewedProductIdsRef = useRef<Set<string>>(new Set());

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
  };

  const scrollToBottom = (): void => {
    if (messageBottomRef) {
      messageBottomRef.scrollIntoView({ behavior: 'instant' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats.length]);

  useEffect(() => {
    scrollToBottom();
  }, [latestMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [streamingProducts.length]);

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

  const renderProductCard = (product: ProcessedProduct, pidx: number, requestId: string): ReactElement => {
    const viewedKey = `${requestId}:${product.product_id}`;
    return (
      <ProductCard
          result={product}
          key={`${product.product_id}-${pidx}`}
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
    );
  };

  return (
      <>
        <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
          {getAccessibleStatus()}
        </div>
        <div className='overflow-y-auto h-full px-4 my-4 space-y-3'
             aria-label={intl.formatMessage({ id: 'a11yChatMessages' })}
             onScroll={handleScroll}>
          {chats.map((chat, idx) => (
              <div className={cn(
                  'w-full',
                  chat.author === 'products' ? `grid grid-cols-2 ${getProductGridCssClasses('gap-x-4')}` : 'flex flex-col',
                  chat.author === 'user' ? 'items-end' : '',
              )}
                   style={getProductGridCssConfig(chat.author === 'products')}
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
                      className={cn('w-full grid grid-cols-2', getProductGridCssClasses('gap-x-4'))}
                      style={getProductGridCssConfig(true)}>
                      {streamingProducts.map((product, pidx) => renderProductCard(product, pidx, streamingRequestId))}
                    </div>
                )}
              </>
          )}
          {!isWaiting && suggestions.length > 0 && (
            <div className='mt-2 flex items-end'>
              <div className='flex flex-wrap gap-2'>
                {suggestions.map((suggestion, idx) => (
                  <Fragment key={`suggestion-${idx}`}>
                    {(showAllSuggestions || idx <= 1) && (
                      <button
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
                {(!showAllSuggestions && suggestions.length >= 2) && (
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
          <div ref={(el) => {
            if (el) {
              setMessageBottomRef(el);
            }
          }}></div>
        </div>
        <div className='flex-grow'></div>
        <div className='relative'>
          {showBottomArrow && (
              <button
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yScrollToLatestMessage' })}
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
