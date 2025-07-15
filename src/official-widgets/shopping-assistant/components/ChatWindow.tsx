import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, useContext, useEffect, useState } from 'react';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import { WidgetDataContext } from '../../../common/types/contexts';
import { isImageDataUrl, type SearchImageOrPid } from '../../../common/types/image';
import type { ProcessedProduct } from '../../../common/types/product';
import DownArrowIcon from '../icons/DownArrowIcon';

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
  chats: Chat[];
  latestMessage: string;
  suggestions: string[];
  sendMessage: (message: string) => void;
}

const ChatWindow: FC<ChatWindowProps> = ({ isWaiting, chats, latestMessage, suggestions, sendMessage }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const [messageBottomRef, setMessageBottomRef] = useState<HTMLDivElement>();

  const getFile = (image: SearchImageOrPid | undefined): string => {
    if (!image) {
      return '';
    }
    if (isImageDataUrl(image)) {
      return image.file;
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

  const processMessageForDisplay = (message: string): string => message
      // quick sanitization
      .replaceAll(/</g, '&lt;')
      .replaceAll(/>/g, '&gt;')
      // bold texts wrapped **like this**
      .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>');

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

  return (
      <>
        <div className='overflow-y-auto h-full px-4 my-4 space-y-3' onScroll={handleScroll}>
          {chats.map((chat, idx) => (
              <div className={cn(
                  'w-full mb-4',
                  chat.author === 'products' ? `grid grid-cols-3 md:max-w-9/10 lg:max-w-7/10 ${getProductGridCssClasses('gap-x-4')}` : 'flex flex-col',
                  chat.author === 'user' ? 'items-end' : '',
              )}
                   style={getProductGridCssConfig(chat.author === 'products')}
                   key={`chat-row-${idx}`}>
                {chat.author === 'user' && chat.image && (
                  <div
                    className='mb-2 w-fit max-w-9/10 bg-sky-900 p-2 text-sm text-white rounded-lg border border-neutral-100 dark:border-neutral-800'
                    tabIndex={0} key={`chat-user-message-${idx}`}
                  >
                    <img
                      alt='Uploaded image'
                      className='max-w-full h-auto rounded-lg shadow-sm border'
                      style={{ maxHeight: '200px' }}
                      src={getFile(chat.image)}
                    />
                  </div>
                )}
                {chat.author === 'user' && chat.messages.map((message, cidx) => (
                    <div
                      className={cn(
                        'mb-2 w-fit max-w-9/10 bg-sky-900 p-2 text-sm text-white rounded-lg border border-neutral-100 dark:border-neutral-800',
                        darkMode ? 'bg-neutral-800' : 'bg-sky-900',
                      )}
                      tabIndex={0} key={`chat-user-message-${cidx}`}
                    >
                      {message}
                    </div>
                ))}
                {chat.author === 'bot' && chat.messages.map((message, cidx) => (
                    <div
                      className={cn(
                        `mb-2 w-fit max-w-9/10 bg-gray-100 dark:bg-neutral-800 p-2 text-sm
                        text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-100 dark:border-neutral-800`,
                        darkMode ? 'bg-neutral-800' : 'bg-gray-100',
                      )}
                      tabIndex={0} key={`chat-bot-message-${cidx}`}
                      dangerouslySetInnerHTML={{
                        __html: processMessageForDisplay(message),
                      }} />
                ))}
                {chat.author === 'products' && (chat.products || []).map((product, pidx) => (
                    <>
                      <div key={`product-${pidx}`}>
                        <ProductCard key={`${product.product_id}-${pidx}`}
                                     result={product}
                                     metadata={{
                                       queryId: chat.requestId,
                                     }}
                                     index={pidx}
                                     pwPrefix='sa'
                                     isRecommendation={false}
                                     hasFindSimilar={false} />
                      </div>
                    </>
                ))}
              </div>
          ))}
          {(isWaiting || latestMessage) && (
              <div className='chat-row mt-2 flex gap-2 items-end'>
                {isWaiting && (
                    <div className='flex w-fit gap-2 bg-gray-100 p-2 rounded-lg dark:border-neutral-800'>
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
                        mb-2 w-fit max-w-7/10 bg-gray-100 dark:bg-neutral-800 p-2 text-sm text-neutral-900 dark:text-neutral-100
                        rounded-lg border border-neutral-100 dark:border-neutral-800`}
                      dangerouslySetInnerHTML={{
                        __html: processMessageForDisplay(latestMessage),
                      }}
                    />
                )}
              </div>
          )}
          {!isWaiting && suggestions.length > 0 && (
            <div className='mt-2 flex items-end'>
              <div className='flex flex-col gap-2'>
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={`suggestion-${idx}`}
                    className='w-fit bg-blue-100 dark:bg-blue-300 p-2 text-xs text-blue-900 dark:text-blue-900
                    rounded-lg border border-neutral-100 dark:border-neutral-800 cursor-pointer'
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
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
        <div className='relative h-8'>
          {showBottomArrow && (
              <div className='absolute bottom-2 right-2 cursor-pointer rounded-full shadow p-1 bg-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors'
                   onClick={scrollToBottom}>
                <DownArrowIcon />
              </div>
          )}
        </div>
      </>
  );
};

export default ChatWindow;
