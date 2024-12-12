import { fetchEventSource } from '@microsoft/fetch-event-source';
import { memo, type ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import CloseIcon from '../../common/icons/CloseIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import type { Chat } from './components/ChatWindow';
import ChatWindow from './components/ChatWindow';
import type { Product } from './components/ProductCard';
import CustomizableIcon from '../../common/icons/CustomizableIcon';

const defaultInitialMessages = [
    'Let\'s get started',
    'Tell us about what your styling needs and we will help you find the perfect item for you',
];

interface ChatAreaProps {
  message: string;
  onMessageChange: (message: string) => void;
  onOverflowChange: (overflow: boolean) => void;
  onEnter: () => void;
}

// Product line can look like one of these:
// [[pid]] **title** - ...
// 1. [[pid]] **title** - ...
const PRODUCT_LINE_REGEX = /^(?:\d+\.? )?\[\[(.*)]]/;

// Sometimes an image can be returned by the bot, in a markdown-compatible format:
//     ![title](im_url)
const IMAGE_LINE_REGEX = /^ *!\[/;

const ChatArea: React.FC<ChatAreaProps> = ({ message, onMessageChange, onOverflowChange, onEnter }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [overflow, setOverflow] = useState(false);
  const unitHeight = 24;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    onOverflowChange(overflow);
  }, [overflow]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0px';
      const maxHeight = Math.min(textareaRef.current.scrollHeight, 5 * unitHeight);

      textareaRef.current.style.height = `${maxHeight}px`;
      setOverflow(textareaRef.current.scrollHeight >= 5 * unitHeight);
    }
  }, [textareaRef, message]);

  return (
      <textarea value={message}
                placeholder='Type your message'
                ref={textareaRef}
                style={{ height: `${unitHeight}px` }}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.code === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onEnter();
                  }
                }}/>
  );
};

const ShoppingAssistant = memo((props: {
  config: WidgetConfig;
  productSearch: WidgetClient;
}) => {
  const { config, productSearch } = props;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [message, setMessage] = useState('');
  const root = useContext(RootContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState('');
  const [isWaiting, setIsWaiting] = useState(true);
  const [allowUserInput, setAllowUserInput] = useState(false);
  const [latestMessage, setLatestMessage] = useState('');
  const [chatBoxOverflow, setChatBoxOverflow] = useState(false);

  const startNewChat = (): void => {
    setChatId('');
    setChats([]);
    setMessage('');
    setIsWaiting(true);
    setAllowUserInput(false);
  };

  const onModalClose = useCallback((): void => {
    setDialogVisible(false);
    setTimeout(() => {
      startNewChat();
    }, 300);
  }, []);

  const sendMessage = async (
    messageToSend: string,
    chatIdParam = '',
  ): Promise<void> => {
    if (!messageToSend) {
      return;
    }
    if (!config.appSettings.appKey || !config.appSettings.placementId) {
      console.error('App Key or Placement ID not found');
      return;
    }
    setIsWaiting(true);
    setMessage('');
    setChats((chats1) => [
      ...chats1,
      {
        chatId: '',
        requestId: '',
        author: 'user',
        messages: [messageToSend],
      },
    ]);

    let chatIdFromResp = '';
    let reqIdFromResp = '';
    const tokens: string[] = [];
    let currentLine = 0;
    let latestPid = '';
    let lastLineWithProduct = 0;
    let messageToDisplay = '';
    let isFetchingProduct = false;
    let hasReceivedFirstToken = false;
    const chatIdToUse = chatIdParam || chatId;
    const products: Product[] = [];
    // Retrieve user id and session id from ViSearch client
    let uid = '';
    let sid = '';
    productSearch.visearch.getUid((uidResp) => {
      uid = uidResp;
    });
    productSearch.visearch.getSid((sidResp) => {
      sid = sidResp;
    });
    setAllowUserInput(false);
    const params = new URLSearchParams({
      app_key: config.appSettings.appKey,
      placement_id: config.appSettings.placementId.toString(),
      chat_id: chatIdToUse,
      q: messageToSend,
      va_uid: uid,
      va_sid: sid,
    });
    fetchEventSource(`${config.appSettings.endpoint}/v1/product/multisearch/chat/shopping-assistant?${params.toString()}`, {
      openWhenHidden: true,
      onmessage: (ev) => {
        if (ev.event === 'chat_id') {
          chatIdFromResp = JSON.parse(ev.data).value;
        } else if (ev.event === 'reqid') {
          reqIdFromResp = JSON.parse(ev.data).value;
        } else if (ev.event === 'chat_token') {
          setIsWaiting(false);
          if (!hasReceivedFirstToken) {
            hasReceivedFirstToken = true;
          }
          const token = JSON.parse(ev.data).value;
          tokens.push(token);
          const newlines = token.split('\n').length - 1;
          const currentTokens = tokens.join('');
          const currentTokensSplit = currentTokens.split('\n');
          if (newlines && currentLine === lastLineWithProduct) {
            currentLine += newlines;
            const productToDisplay = products.filter((prod) => prod.pid === latestPid);
            if (productToDisplay.length) {
              const parts = currentTokensSplit[lastLineWithProduct].match(
                  /\*\*.*\*\* - (.*)/,
              );
              if (parts?.length) {
                [, productToDisplay[0].description] = parts;
              }
              setChats((chats1) => {
                if (chats1[chats1.length - 1].author !== 'products') {
                  return [
                    ...chats1,
                    {
                      chatId: chatIdFromResp,
                      requestId: reqIdFromResp,
                      messages: [],
                      author: 'products',
                      products: [productToDisplay[0]],
                    },
                  ];
                }
                return chats1.map((ch, idx) => {
                  if (idx === chats1.length - 1) {
                    return {
                      ...ch,
                      products: (ch.products || []).concat(productToDisplay[0]),
                    };
                  }
                  return ch;
                });
              });
            }
          } else if (newlines) {
            currentLine += newlines;
          }
          const currentLineContent = currentTokensSplit[currentLine];
          const pidInCurrentLine = currentLineContent.match(PRODUCT_LINE_REGEX);
          if (pidInCurrentLine && lastLineWithProduct < currentLine) {
            [, latestPid] = pidInCurrentLine;
            lastLineWithProduct = currentLine;
            if (!isFetchingProduct) {
              isFetchingProduct = true;
              const tokensToDisplay: string[] = [];
              // Traverse the lines until the first PID line is found
              // eslint-disable-next-line no-restricted-syntax
              for (const tkn of currentTokensSplit) {
                if (tkn && tkn.match(PRODUCT_LINE_REGEX)) {
                  break;
                }
                tokensToDisplay.push(tkn);
              }
              setChats((chats1) => [...chats1, {
                chatId: chatIdFromResp,
                requestId: reqIdFromResp,
                messages: [tokensToDisplay.join('\n').trim()],
                author: 'bot',
                products: [],
              }]);
            }
          }
          if (isFetchingProduct) {
            messageToDisplay = currentTokensSplit.slice(currentLine).join('\n');
          } else {
            messageToDisplay = currentTokens;
          }
          setLatestMessage(messageToDisplay);
        } else if (ev.event === 'product') {
          const data = JSON.parse(ev.data);
          products.push({
            pid: data.product_id,
            title: data.data.title,
            description: '',
            image_url: data.main_image_url,
            price: data.data.price.currency + data.data.price.value,
            product_url: data.data.product_url,
            review_rating: data.data.review_rating,
            review_count: data.data.review_count,
          });
        }
      },
      onclose: () => {
        const constructedResponse = tokens.join('');
        const constructedResponseLines = constructedResponse.split('\n');
        if (products.length) {
          const tokensToDisplay: string[] = [];
          // Traverse the lines in reverse until the first PID line is found
          // eslint-disable-next-line no-restricted-syntax
          for (const tkn of [...constructedResponseLines].reverse()) {
            if (tkn && (tkn.match(PRODUCT_LINE_REGEX) || tkn.match(IMAGE_LINE_REGEX))) {
              break;
            }
            tokensToDisplay.push(tkn);
          }
          const afterText = tokensToDisplay.reverse().join('\n').trim();
          setChats((chats1) => [...chats1, {
            chatId: chatIdFromResp,
            requestId: reqIdFromResp,
            messages: [afterText],
            author: 'bot',
            products: [],
          }]);
        } else {
          setChats((chats1) => [...chats1, {
            chatId: chatIdFromResp,
            requestId: reqIdFromResp,
            messages: [constructedResponse],
            author: 'bot',
            products: [],
          }]);
        }
        setLatestMessage('');
        setAllowUserInput(true);
      },
      onerror: (err) => {
        console.error(err);
      },
    });
  };

  const openDialog = (initialMessages: string[]): void => {
    if (dialogVisible) {
      return;
    }
    const renderChat = (idx: number, cId: string): void => {
      if (idx > initialMessages.length) {
        setIsWaiting(false);
        setAllowUserInput(true);
        return;
      }
      setTimeout(() => {
        setChats(() => [{
          chatId: cId,
          requestId: '',
          author: 'bot',
          messages: initialMessages.slice(0, idx),
        }]);
        renderChat(idx + 1, cId);
      }, 2000);
    };
    setDialogVisible(true);
    productSearch.visearch.generateUuid((uuid) => {
      setChatId(uuid);
      renderChat(1, uuid);
    });
  };

  const onChatButtonClick = useCallback((): void => {
    openDialog(defaultInitialMessages);
  }, []);

  const getScreen = (): ReactElement => (
      <div className={`vi-shopping-assistant-container ${breakpoint}`}>
        <div className={`vi-shopping-assistant-header ${breakpoint}`}>
          <div className='close-icon' onClick={onModalClose}>
            <CloseIcon />
          </div>
        </div>
        <ChatWindow isWaiting={isWaiting} chats={chats} latestMessage={latestMessage} />
        <div className={`vi-shopping-assistant-chat ${breakpoint}`}>
          <div className={`vi-shopping-assistant-chatbox ${chatBoxOverflow ? 'compact-vertical-padding' : ''}`}>
            <ChatArea message={message}
                      onMessageChange={setMessage}
                      onOverflowChange={(overflow) => {
                        setChatBoxOverflow(overflow);
                      }}
                      onEnter={() => {
                        if (!allowUserInput) {
                          return;
                        }
                        sendMessage(message);
                      }} />
            <div className={`submit-icon ${allowUserInput ? '' : 'disabled'}`}>
              <SubmitChatIcon onClickHandler={() => {
                if (!allowUserInput) {
                  return;
                }
                sendMessage(message);
              }} />
            </div>
          </div>
        </div>
      </div>
  );

  // Accompanying logic to open the widget via the widget client's openWidget function
  useEffect(() => {
    const element = document.querySelector(config.displaySettings.cssSelector) as HTMLElement | null;
    const callback = (mutationList: MutationRecord[]): void => {
      mutationList.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-visenze-dialog-open') {
          if (element && element.dataset.visenzeDialogOpen === 'true') {
            const runtimeParamsString = element.dataset.visenzeRuntimeParams;
            let initialMessages = defaultInitialMessages;
            if (runtimeParamsString) {
              const runtimeParams = JSON.parse(runtimeParamsString);
              if (runtimeParams.initial_messages) {
                initialMessages = runtimeParams.initial_messages;
              }
            }
            openDialog(initialMessages);
          }
        }
      });
    };
    const observer = new MutationObserver(callback);
    if (element) {
      observer.observe(element, {
        attributes: true,
        childList: false,
        subtree: false,
      });
    }
    return (): void => {
      observer.disconnect();
    };
  }, []);

  if (!root) {
    return <></>;
  }

  return (
      <>
        {!config.hideTrigger && (
            <>
              <CustomizableIcon
                  height={28}
                  width={28}
                  url={config.customizations.popup?.triggerIcon?.url || 'https://cdn.visenze.com/images/new-chat-icon.svg'}
                  color={config.customizations.popup?.triggerIcon?.color || ''}
                  className='wigmix-popup-trigger-icon cursor-pointer'
                  onClickHandler={onChatButtonClick}
              />
            </>
        )}
        <ViSenzeModal open={dialogVisible} layout={breakpoint} onClose={onModalClose} position='center'
                      placementId={`${config.appSettings.placementId}`}>
          {getScreen()}
        </ViSenzeModal>
      </>
  );
});

export default ShoppingAssistant;
