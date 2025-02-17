import { type CSSProperties, type FC, useContext, useEffect, useState } from 'react';
import { cn } from '@heroui/theme';
import DownArrowIcon from '../icons/DownArrowIcon';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import type { ProcessedProduct } from '../../../common/types/product';
import ProductCard from '../../../common/components/product-card/ProductCard';
import { WidgetDataContext } from '../../../common/types/contexts';

export interface Chat {
  chatId: string;
  requestId: string;
  author: 'user' | 'bot' | 'products';
  messages: string[];
  products?: ProcessedProduct[];
}

interface ChatWindowProps {
  isWaiting: boolean;
  chats: Chat[];
  latestMessage: string;
}

const ChatWindow: FC<ChatWindowProps> = ({ isWaiting, chats, latestMessage }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const [messageBottomRef, setMessageBottomRef] = useState<HTMLDivElement>();

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
        <div className='overflow-scroll' onScroll={handleScroll}>
          {chats.map((chat, idx) => (
              <div className={cn(
                  'w-full mb-2',
                  chat.author === 'products' ? `grid grid-cols-3 md:max-w-9/10 lg:max-w-7/10 ${getProductGridCssClasses('gap-x-1')}` : 'flex flex-col',
                  chat.author === 'user' ? 'items-end' : '',
              )}
                   style={getProductGridCssConfig(chat.author === 'products')}
                   key={`chat-row-${idx}`}>
                {chat.author === 'user' && chat.messages.map((message, cidx) => (
                    <div className='bg-buttonPrimary text-buttonPrimary w-fit max-w-7/10 px-4 py-2 mb-1' tabIndex={0} key={`chat-user-message-${cidx}`}>
                      {message}
                    </div>
                ))}
                {chat.author === 'bot' && chat.messages.map((message, cidx) => (
                    <div className='bg-buttonPrimary text-buttonPrimary w-fit max-w-7/10 px-4 py-2 mb-1' tabIndex={0} key={`chat-bot-message-${cidx}`}
                         dangerouslySetInnerHTML={{
                           __html: processMessageForDisplay(message),
                         }} />
                ))}
                {chat.author === 'products' && (chat.products || []).map((product, pidx) => (
                    <>
                      <div key={`product-${pidx}`}>
                        <ProductCard key={`product-card-${pidx}`}
                                     result={product}
                                     metadata={{}}
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
              <div className='chat-row'>
                {isWaiting && (
                    <div className='p-3 flex gap-2 bg-buttonPrimary w-fit'>
                      {[0, 1, 2].map((i) => (
                          <div key={`loading-dot-${i}`}
                               className='loading-dot rounded-full'
                               style={{ backgroundColor: darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor }} />
                      ))}
                    </div>
                )}
                {latestMessage && (
                    <div className='bg-buttonPrimary text-buttonPrimary w-fit max-w-7/10 px-4 py-2 mb-1'
                         dangerouslySetInnerHTML={{
                           __html: processMessageForDisplay(latestMessage),
                         }} />
                )}
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
              <div className='absolute bottom-1 right-1 cursor-pointer' onClick={scrollToBottom}>
                <DownArrowIcon />
              </div>
          )}
        </div>
      </>
  );
};

export default ChatWindow;
