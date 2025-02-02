import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type FC, type ReactElement, useCallback, useContext, useEffect, useState } from 'react';
import { Textarea } from '@heroui/input';
import { useIntl } from 'react-intl';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { WidgetDataContext } from '../../common/types/contexts';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import CloseIcon from '../../common/icons/CloseIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import type { Chat } from './components/ChatWindow';
import ChatWindow from './components/ChatWindow';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import { DEFAULT_ENDPOINT } from '../../common/constants';
import type { ProcessedProduct } from '../../common/types/product';
import NewChatIcon from './icons/NewChatIcon';
import { getFlattenProduct } from '../../common/utils';

// Product line can look like one of these:
// [[pid]] **title** - ...
// - [[pid]] **title** - ...
// 1. [[pid]] **title** - ...
const PRODUCT_LINE_REGEX = /^(?:\d+\.? |- )?\[\[(.*)]]/;

// Sometimes an image can be returned by the bot, in a markdown-compatible format:
//     ![title](im_url)
const IMAGE_LINE_REGEX = /^ *!\[/;

interface ShoppingAssistantProps {
  // no properties at the moment
}

const ShoppingAssistant: FC<ShoppingAssistantProps> = () => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [message, setMessage] = useState('');
  const root = useContext(RootContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState('');
  const [isWaiting, setIsWaiting] = useState(true);
  const [allowUserInput, setAllowUserInput] = useState(false);
  const [latestMessage, setLatestMessage] = useState('');
  const intl = useIntl();
  const openingMessages = [
    intl.formatMessage({ id: 'openingMessage1' }),
    intl.formatMessage({ id: 'openingMessage2' }),
  ];

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
    const products: ProcessedProduct[] = [];
    // Retrieve user id and session id from ViSearch client
    let uid = '';
    let sid = '';
    widgetClient.visearch.getUid((uidResp) => {
      uid = uidResp;
    });
    widgetClient.visearch.getSid((sidResp) => {
      sid = sidResp;
    });
    setAllowUserInput(false);
    const params = new URLSearchParams({
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: chatIdToUse,
      q: messageToSend,
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
    });
    fetchEventSource(`${appSettings.endpoint || DEFAULT_ENDPOINT}/v1/product/multisearch/chat/shopping-assistant?${params.toString()}`, {
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
            const productToDisplay = products.filter((prod) => prod.product_id === latestPid);
            if (productToDisplay.length) {
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
          products.push(getFlattenProduct(data));
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

  const openDialog = (): void => {
    if (dialogVisible) {
      return;
    }
    const renderChat = (idx: number, cId: string): void => {
      if (idx > openingMessages.length) {
        setIsWaiting(false);
        setAllowUserInput(true);
        return;
      }
      setTimeout(() => {
        setChats(() => [{
          chatId: cId,
          requestId: '',
          author: 'bot',
          messages: openingMessages.slice(0, idx),
        }]);
        renderChat(idx + 1, cId);
      }, 2000);
    };
    setDialogVisible(true);
    widgetClient.visearch.generateUuid((uuid) => {
      setChatId(uuid);
      renderChat(1, uuid);
    });
  };

  const onChatButtonClick = useCallback((): void => {
    openDialog();
  }, []);

  const getScreen = (): ReactElement => (
      <div className='p-6 flex flex-col h-full'>
        <div className='flex w-full justify-end'>
          <div onClick={() => setDialogVisible(false)}>
            <CloseIcon className='size-6 cursor-pointer' />
          </div>
        </div>
        <ChatWindow isWaiting={isWaiting} chats={chats} latestMessage={latestMessage} />
        <div className='mt-2'>
          <Textarea value={message}
                    placeholder={intl.formatMessage({ id: 'chatBoxPlaceholder' })}
                    minRows={1}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.code === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!allowUserInput) {
                          return;
                        }
                        sendMessage(message);
                      }
                    }}
                    endContent={
                      <SubmitChatIcon onClickHandler={() => {
                        if (!allowUserInput) {
                          return;
                        }
                        sendMessage(message);
                      }} />
                    }
          />
        </div>
      </div>
  );

  useEffect(() => {
    widgetClient.registerWidgetOpener(() => {
      openDialog();
    });
  }, []);

  if (!root) {
    return <></>;
  }

  return (
      <>
        {!customizations.popup?.triggerIcon?.hide && (
            <div className='wigmix-popup-trigger-button w-fit cursor-pointer'
                 onClick={onChatButtonClick}>
              {customizations.popup?.triggerIcon?.url ? (
                  <CustomizableIcon
                      height={24}
                      width={24}
                      url={customizations.popup.triggerIcon.url}
                      color={customizations.popup?.triggerIcon?.color || ''}
                      className='wigmix-popup-trigger-icon'
                  />
              ) : (
                  <NewChatIcon color={customizations.popup?.triggerIcon?.color || ''}
                               className='wigmix-popup-trigger-icon size-6' />
              )}
            </div>
        )}
        <ViSenzeModal open={dialogVisible} layout={breakpoint} onClose={onModalClose}
                      position={customizations.popup?.position || 'center'}
                      fontFamily={customizations.generalLayout?.fontFamily}
                      placementId={`${appSettings.placementId}`}>
          {getScreen()}
        </ViSenzeModal>
      </>
  );
};

export default ShoppingAssistant;
