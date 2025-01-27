import { useEffect, useState } from 'react';
import DownArrowIcon from '../icons/DownArrowIcon';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import type { Product } from './ProductCard';
import ProductCard from './ProductCard';

export interface Chat {
  chatId: string;
  requestId: string;
  author: 'user' | 'bot' | 'products';
  messages: string[];
  products?: Product[];
}

interface ChatWindowProps {
  isWaiting: boolean;
  chats: Chat[];
  latestMessage: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ isWaiting, chats, latestMessage }) => {
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

  return (
      <>
        <div onScroll={handleScroll} className={`vi-shopping-assistant-messages ${breakpoint}`}>
          {chats.map((chat, idx) => (
              <div className={`chat-row ${chat.author}`}
                   key={`chat-row-${idx}`}>
                {chat.author === 'user' && chat.messages.map((message, cidx) => (
                    <div className='chat-message user' tabIndex={0} key={`chat-user-message-${cidx}`}>
                      {message}
                    </div>
                ))}
                {chat.author === 'bot' && chat.messages.map((message, cidx) => (
                    <div className='chat-message bot' tabIndex={0} key={`chat-bot-message-${cidx}`}
                         dangerouslySetInnerHTML={{
                           __html: processMessageForDisplay(message),
                         }} />
                ))}
                {chat.author === 'products' && (chat.products || []).map((product, pidx) => (
                    <>
                      <div className='product' key={`product-${pidx}`}>
                        <ProductCard key={`product-card-${pidx}`} product={product} index={pidx}
                                     queryId={chat.requestId}/>
                      </div>
                      {pidx !== (chat.products || []).length - 1 && (
                          <hr />
                      )}
                    </>
                ))}
              </div>
          ))}
          {(isWaiting || latestMessage) && (
              <div className='chat-row'>
                {isWaiting && (
                    <div className='loading-container'>
                      <div className='loading-dot' />
                      <div className='loading-dot' />
                      <div className='loading-dot' />
                    </div>
                )}
                {latestMessage && (
                    <div className='chat-message bot'
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
        <div style={{ flexGrow: 1 }}></div>
        <div className={`vi-shopping-assistant-arrow-container ${breakpoint}`} style={{ position: 'relative' }}>
          {showBottomArrow && (
              <div className='arrow' onClick={scrollToBottom}>
                <DownArrowIcon />
              </div>
          )}
        </div>
      </>
  );
};

export default ChatWindow;
