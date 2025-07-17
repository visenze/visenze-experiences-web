import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type FC, type ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Webcam from 'react-webcam';
import type { Chat } from './components/ChatWindow';
import ChatWindow from './components/ChatWindow';
import NewChatIcon from './icons/NewChatIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import FileDropzone from '../../common/components/FileDropzone';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import { DEFAULT_ENDPOINT } from '../../common/constants';
import CameraIcon from '../../common/icons/CameraIcon';
import CloseIcon from '../../common/icons/CloseIcon';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import PlusCircleIcon from '../../common/icons/PlusCircleIcon';
import UploadIcon from '../../common/icons/UploadIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import { isImageFile, type SearchImage, type SearchImageOrPid } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';
import { Actions, Category } from '../../common/types/tracking-constants';
import { getFlattenProduct } from '../../common/utils';

// Product line can look like one of these:
// [[pid]] **title** - ...
// - [[pid]] **title** - ...
// 1. [[pid]] **title** - ...
const PRODUCT_LINE_REGEX = /^(?:\d+\.? |- )?\[\[(.*)]]/;
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;

// Sometimes an image can be returned by the bot, in a markdown-compatible format:
//     ![title](im_url)
const IMAGE_LINE_REGEX = /^ *!\[/;

interface ShoppingAssistantProps {
  renderModalWithoutPortal?: boolean;
}

const ShoppingAssistant: FC<ShoppingAssistantProps> = () => {
  const webcamRef = useRef<Webcam>(null);
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const [dialogVisible, setDialogVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<SearchImageOrPid | undefined>();
  const root = useContext(RootContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState('');
  const [isWaiting, setIsWaiting] = useState(true);
  const [allowUserInput, setAllowUserInput] = useState(false);
  const [latestMessage, setLatestMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCameraDrawer, setShowCameraDrawer] = useState(false);
  const intl = useIntl();
  const openingMessages = [
    intl.formatMessage({ id: 'openingMessage1' }),
    intl.formatMessage({ id: 'openingMessage2' }),
  ];

  const sendMessage = async (
    messageToSend?: string,
    imageToSend?: SearchImageOrPid,
    chatIdParam = '',
  ): Promise<void> => {
    if (!messageToSend && !imageToSend) {
      return;
    }
    setIsWaiting(true);
    setMessage('');
    setSuggestions([]);
    setChats((chats1) => [
      ...chats1,
      {
        chatId: '',
        requestId: '',
        author: 'user',
        messages: messageToSend ? [messageToSend] : [],
        image: imageToSend,
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
      q: messageToSend || 'Find me products that look like the main product in this image and are the same color as the main product',
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
      chat_agent: 'shopping_assistant_v2',
    });

    const formData = new FormData();
    if (imageToSend && isImageFile(imageToSend)) {
      formData.append('image', imageToSend.files[0]);
    }

    fetchEventSource(`${appSettings.endpoint || DEFAULT_ENDPOINT}/v1/product/multisearch/chat/shopping-assistant?${params.toString()}`, {
      method: 'POST',
      body: formData,
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
          const suggestionInCurrentLine = currentLineContent.match(SUGGESTION_LINE_REGEX);
          if (suggestionInCurrentLine) {
            const currentSuggestion = suggestionInCurrentLine[0];
            const currentSuggestionSplit = currentSuggestion.replace('((', '').replace('))', '').trim();
            setSuggestions((prevSuggestions) => [...prevSuggestions, currentSuggestionSplit]);
          }
          if (isFetchingProduct) {
            messageToDisplay = currentTokensSplit.slice(currentLine).join('\n');
          } else {
            messageToDisplay = currentTokens;
          }

          const messageToDisplayWithoutSuggestions = messageToDisplay.replace(SUGGESTION_LINE_REGEX, '').trim();
          setLatestMessage(messageToDisplayWithoutSuggestions);
        } else if (ev.event === 'product') {
          const data = JSON.parse(ev.data);
          products.push(getFlattenProduct(data));
        }
      },
      onclose: () => {
        const constructedResponse = tokens.join('');
        const constructedResponseWithoutSuggestions = constructedResponse.replace(SUGGESTION_LINE_REGEX, '').trim();
        const constructedResponseLines = constructedResponseWithoutSuggestions.split('\n');
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
          const requestMetadata = {
            queryId: reqIdFromResp,
            cat: Category.RESULT,
          };
          widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
          widgetClient.setLastTrackingMeta(requestMetadata);
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

  const onImageUpload = (data: SearchImage): void => {
    setImage(data);
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], `${Date.now()}`, { type: 'image/png' });
            const imageFile = { files: [file], file: imageSrc };

            onImageUpload(imageFile);
            setShowCameraDrawer(false);
          });
      }
    }
  }, [webcamRef]);

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

  const newChat = (): void => {
    setIsWaiting(true);
    setAllowUserInput(false);
    setChats([]);
    setLatestMessage('');
    setSuggestions([]);

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
      });
    };
    widgetClient.visearch.generateUuid((uuid) => {
      setChatId(uuid);
      renderChat(1, uuid);
    });
  };

  const onChatButtonClick = useCallback((): void => {
    openDialog();
  }, []);

  const getScreen = (): ReactElement => (
      <div className='flex h-full flex-col bg-white dark:bg-neutral-700 border-x border-neutral-300 dark:border-neutral-800'>
        <div className='flex w-full py-4 justify-between shadow'>
          <div className='wigmix-widget-title flex items-center gap-2 px-4'
            style={{ color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor }}
          >
            {intl.formatMessage({ id: 'widgetTitle' })}
          </div>

          <div className='flex items-center gap-2 pr-4'>
            <div onClick={() => newChat()}>
              <PlusCircleIcon className='size-6 cursor-pointer'
                color={darkMode
                  ? (customizations.generalLayout?.fontColorDark || '')
                  : (customizations.generalLayout?.fontColor || '')} />
            </div>
            <div onClick={() => setDialogVisible(false)}>
              <CloseIcon className='size-6 cursor-pointer'
                color={darkMode
                  ? (customizations.generalLayout?.fontColorDark || '')
                  : (customizations.generalLayout?.fontColor || '')} />
            </div>
          </div>
        </div>
        <ChatWindow isWaiting={isWaiting} chats={chats} latestMessage={latestMessage} suggestions={suggestions} sendMessage={sendMessage} />
        <div className='relative flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
          {showCameraDrawer && (
            <div
              className='absolute inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-800 shadow-lg flex flex-col items-center p-4 animate-slideup'
              style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, minHeight: 340 }}
            >
              <div className='flex w-full justify-between items-center mb-2'>
                <span className='font-semibold text-lg'>Camera Capture</span>
                <button onClick={() => setShowCameraDrawer(false)}>
                  <CloseIcon
                    className='size-6 cursor-pointer'
                    color={darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '')}
                  />
                </button>
              </div>
              <div className='w-full flex justify-center'>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat='image/jpeg'
                  className='rounded-lg max-w-full'
                  videoConstraints={{ facingMode: 'user' }}
                />
              </div>
              <button onClick={capture} className='w-full flex items-center justify-center gap-2 mt-4 bg-blue-400 text-white px-4 py-2 rounded'>
                <CameraIcon
                  className='size-5 cursor-pointer'
                  color={darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '')}
                />
                <span
                  style={{ color: darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '') }}
                >
                  Capture photo
                </span>
              </button>
            </div>
          )}
          <div className='flex justify-end gap-2'>
            <div className={cn('p-2 border border-gray dark:border-neutral-500 rounded-md')} onClick={() => setShowCameraDrawer(true)}>
              <CameraIcon
                className='size-5 cursor-pointer'
                color={darkMode
                  ? (customizations.generalLayout?.fontColorDark || '')
                  : (customizations.generalLayout?.fontColor || '')}
              />
            </div>
            <FileDropzone onImageUpload={onImageUpload} name='cs-upload-icon'>
              <div className={cn('p-2 border border-gray dark:border-neutral-500 rounded-md')}>
                {customizations.imageUpload?.icon?.url ? (
                    <CustomizableIcon
                        height={80}
                        width={80}
                        url={customizations.imageUpload.icon.url}
                        color={darkMode
                          ? (customizations.generalLayout?.fontColorDark || '')
                          : (customizations.generalLayout?.fontColor || '')}
                    />
                ) : (
                    <UploadIcon className='size-5'
                                color={darkMode
                                    ? (customizations.generalLayout?.fontColorDark || '')
                                    : (customizations.generalLayout?.fontColor || '')} />
                )}
              </div>
            </FileDropzone>
          </div>
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
                      <SubmitChatIcon
                        onClickHandler={() => {
                        if (!allowUserInput) {
                          return;
                        }
                        sendMessage(message);
                      }}
                      color={darkMode
                        ? (customizations.generalLayout?.fontColorDark || '')
                        : (customizations.generalLayout?.fontColor || '')}
                      />
                    }
          />
        </div>
      </div>
  );

  useEffect(() => {
    sendMessage(undefined, image);
  }, [image]);

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
        <PopupTriggerButton config={customizations.popup}
                            text={intl.formatMessage({ id: 'triggerCTA' })}
                            darkMode={darkMode}
                            onClick={onChatButtonClick}
                            defaultIcon={
                              <NewChatIcon
                                  color={darkMode
                                      ? customizations.popup?.triggerIcon?.colorDark || ''
                                      : customizations.popup?.triggerIcon?.color || ''}
                                  className='wigmix-popup-trigger-icon default size-6'
                              />
                            } />
        {dialogVisible && (
          <div className={cn(
            'fixed inset-y-0 w-full md:w-1/4 bg-white',
            widgetConfig.customizations.popup?.position === 'right' ? 'right-0' : 'left-0',
          )}>
            {getScreen()}
          </div>
        )}
      </>
  );
};

export default ShoppingAssistant;
