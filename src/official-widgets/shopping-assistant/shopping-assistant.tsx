import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type FC, type ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import CameraCaptureDrawer from './components/CameraCaptureDrawer';
import type { Chat } from './components/ChatWindow';
import ChatWindow from './components/ChatWindow';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import NewChatIcon from './icons/NewChatIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import StopIcon from './icons/StopIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import { extractActionTokens, extractSpeakableSentences, extractSuggestions, resolveProducts, stripTokensForDisplay } from './token-parsing';
import useVoiceReply from './use-voice-reply';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../common/client/endpoint';
import FileDropzone from '../../common/components/FileDropzone';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
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

interface CompletedResponse {
  chatId: string;
  requestId: string;
  text: string;
  products: ProcessedProduct[];
}

interface ShoppingAssistantProps {
  renderModalWithoutPortal?: boolean;
}

const ShoppingAssistant: FC<ShoppingAssistantProps> = ({ renderModalWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  // Resolve the API base, honouring manual endpoint > cloud > API endpoint > default; shared by
  // the chat SSE call below and the voice proxy call in useVoice.
  const manualEndpoint = getManualEndpoint(appSettings.placementId);
  const apiBase = resolveBaseEndpoint(appSettings, manualEndpoint);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<SearchImageOrPid | undefined>();
  const root = useContext(RootContext);
  const breakpoint = useBreakpoint();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState('');
  const [isWaiting, setIsWaiting] = useState(true);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [allowUserInput, setAllowUserInput] = useState(false);
  const [showResponseExtras, setShowResponseExtras] = useState(true);
  const [streamingProducts, setStreamingProducts] = useState<ProcessedProduct[]>([]);
  const [streamingRequestId, setStreamingRequestId] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCameraDrawer, setShowCameraDrawer] = useState(false);
  const [widgetOpenTrigger, setWidgetOpenTrigger] = useState(0);
  const [sendChatTrigger, setSendChatTrigger] = useState<[string, SearchImageOrPid | undefined]>();
  const openCameraButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const intl = useIntl();
  const dialogTitleId = `wigmix-shopping-assistant-title-${appSettings.placementId}`;
  const openingMessages = [
    intl.formatMessage({ id: 'openingMessage1' }),
    intl.formatMessage({ id: 'openingMessage2' }),
  ];
  // Bridges sendMessage (declared below) to onTranscript, since useVoiceReply is instantiated
  // before sendMessage exists (sendMessage itself needs the reply helpers useVoiceReply returns).
  const sendMessageRef = useRef<(text: string) => void>(() => {});

  const {
    voiceEnabled,
    speechOutputEnabled,
    voiceStatus,
    liveTranscript,
    hasVoiceError,
    isVoiceReadingEnabled,
    typewriterText,
    isSpeechPlaying,
    focusedProductId,
    startVoiceRecording,
    stopRecording,
    stopAudio,
    toggleVoiceReading,
    interruptSpeech,
    shouldSpeakReply,
    isVoiceReadingEnabledNow,
    beginReply,
    updateLatestMessage,
    speak,
    hasPendingSpeech,
    deferCommit,
    forceRevealTypewriter,
    getTypewriterLength,
    resetReplyState,
  } = useVoiceReply({
    enabled: customizations.chatbot?.voiceEnabled,
    appKey: appSettings.appKey,
    placementId: appSettings.placementId,
    baseUrl: apiBase,
    voiceId: customizations.chatbot?.voiceId,
    modelId: customizations.chatbot?.modelId,
    voiceStability: customizations.chatbot?.voiceSettings?.stability,
    voiceSimilarityBoost: customizations.chatbot?.voiceSettings?.similarityBoost,
    onTranscript: (text): void => sendMessageRef.current(text),
    setIsWaiting,
  });

  const commitResponse = ({ chatId: responseChatId, requestId, text, products }: CompletedResponse): void => {
    if (products.length) {
      const requestMetadata = {
        queryId: requestId,
        cat: Category.RESULT,
      };
      widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
      widgetClient.setLastTrackingMeta(requestMetadata);
    }
    setChats((chats1) => {
      const newChats = [...chats1];
      if (text) {
        newChats.push({
          chatId: responseChatId,
          requestId,
          messages: [text],
          author: 'bot',
          products: [],
        });
      }
      if (products.length) {
        newChats.push({
          chatId: responseChatId,
          requestId,
          messages: [],
          author: 'products',
          products,
        });
      }
      return newChats;
    });
    setStreamingProducts([]);
    setStreamingRequestId('');
    resetReplyState();
    setAllowUserInput(true);
    setShowResponseExtras(true);
  };

  const sendMessage = async (
    messageToSend?: string,
    imageToSend?: SearchImageOrPid,
    chatIdParam = '',
  ): Promise<void> => {
    if (!messageToSend && !imageToSend) {
      return;
    }
    setIsWaiting(true);
    setShowAllSuggestions(false);
    setMessage('');
    setSuggestions([]);
    setStreamingProducts([]);
    setStreamingRequestId('');
    const willSpeakReply = beginReply();
    setShowResponseExtras(false);
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
    let spokenLength = 0;
    const tokens: string[] = [];
    const handledActionTokens = new Set<string>();
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
      ...widgetConfig.searchSettings,
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: chatIdToUse,
      q: messageToSend || 'Find me products that look like the main product in this image and are the same color as the main product',
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
      chat_agent: customizations.chatbot?.chatAgent || 'shopping_closer_voice_v2',
    });

    const formData = new FormData();
    if (imageToSend && isImageFile(imageToSend)) {
      formData.append('image', imageToSend.files[0]);
    }

    const shoppingAssistantPath = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/search/chat/shopping-assistant'
      : '/v1/product/multisearch/chat/shopping-assistant';

    fetchEventSource(`${apiBase}${shoppingAssistantPath}?${params.toString()}`, {
      method: 'POST',
      body: formData,
      openWhenHidden: true,
      onmessage: (ev) => {
        if (ev.event === 'chat_id') {
          chatIdFromResp = JSON.parse(ev.data).value;
        } else if (ev.event === 'reqid') {
          reqIdFromResp = JSON.parse(ev.data).value;
          setStreamingRequestId(reqIdFromResp);
        } else if (ev.event === 'chat_token') {
          if (!willSpeakReply || !isVoiceReadingEnabledNow()) {
            setIsWaiting(false);
          }
          tokens.push(JSON.parse(ev.data).value);
          const currentText = tokens.join('');
          extractActionTokens(currentText).forEach(({ action, productId, key }) => {
            if (handledActionTokens.has(key)) {
              return;
            }
            handledActionTokens.add(key);
            const callback = action === 'ADD_TO_CART'
              ? widgetConfig.callbacks.onAddToCartToggle
              : widgetConfig.callbacks.onAddToWishlistToggle;
            if (callback) {
              try {
                const callbackResult = callback(true, productId);
                Promise.resolve(callbackResult).catch((err: unknown) => console.error(err));
              } catch (err) {
                console.error(err);
              }
            }
          });
          setSuggestions(extractSuggestions(currentText));
          const displayText = stripTokensForDisplay(currentText).trim();
          updateLatestMessage(displayText);
          setStreamingProducts(resolveProducts(currentText, products));
          if (willSpeakReply && isVoiceReadingEnabledNow()) {
            const { sentences, spokenLength: newSpokenLength } = extractSpeakableSentences(currentText, spokenLength);
            sentences.forEach(({ chunk, revealTarget, productId }) => {
              speak(chunk, revealTarget, productId);
            });
            spokenLength = newSpokenLength;
          }
        } else if (ev.event === 'product') {
          products.push(getFlattenProduct(JSON.parse(ev.data)));
          setStreamingProducts(resolveProducts(tokens.join(''), products));
        }
      },
      onclose: () => {
        const currentText = tokens.join('');
        setSuggestions(extractSuggestions(currentText));
        const finalText = stripTokensForDisplay(currentText).trim();
        const finalProducts = resolveProducts(currentText, products);
        updateLatestMessage(finalText);
        setStreamingProducts(finalProducts);
        const completedResponse = {
          chatId: chatIdFromResp,
          requestId: reqIdFromResp,
          text: finalText,
          products: finalProducts,
        };
        if (willSpeakReply && isVoiceReadingEnabledNow()) {
          const { sentences } = extractSpeakableSentences(currentText, spokenLength, { includeTrailing: true });
          sentences.forEach(({ chunk, revealTarget, productId }) => {
            speak(chunk, revealTarget, productId);
          });
          if (hasPendingSpeech()) {
            deferCommit(() => commitResponse(completedResponse));
          } else {
            setIsWaiting(false);
            forceRevealTypewriter(finalText);
            commitResponse(completedResponse);
          }
        } else if (finalText && getTypewriterLength() < finalText.length) {
          deferCommit(() => commitResponse(completedResponse));
        } else {
          commitResponse(completedResponse);
        }
      },
      onerror: (err) => {
        console.error(err);
      },
    });
  };

  useEffect(() => {
    sendMessageRef.current = (text: string): void => {
      sendMessage(text);
    };
  });

  useEffect(() => {
    if (voiceStatus === 'recording' || voiceStatus === 'transcribing') {
      setMessage(liveTranscript);
    }
  }, [liveTranscript, voiceStatus]);

  const renderVoiceButtonIcon = (): ReactElement => {
    if (voiceStatus === 'transcribing') {
      return <MicrophoneIcon
        className='size-5 cursor-pointer' color={darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '')} />;
    }
    if (voiceStatus === 'recording') {
      return <StopIcon className='size-5 cursor-pointer animate-pulse' color='#EF4444' />;
    }
    return (
      <MicrophoneIcon
        className='size-5 cursor-pointer'
        color={darkMode
          ? (customizations.generalLayout?.fontColorDark || '')
          : (customizations.generalLayout?.fontColor || '')}
      />
    );
  };

  const onImageUpload = (data: SearchImage): void => {
    setImage(data);
  };

  const closeCameraDrawer = useCallback((): void => {
    setShowCameraDrawer(false);
    openCameraButtonRef.current?.focus();
  }, []);

  const closeDialog = useCallback((): void => {
    setDialogVisible(false);
    triggerButtonRef.current?.focus();
  }, []);

  const openDialog = (): void => {
    if (dialogVisible) {
      return;
    }
    const shouldSpeakOpening = shouldSpeakReply();
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
        if (shouldSpeakOpening) {
          speak(openingMessages[idx - 1], 0, null);
        }
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
    stopAudio();
    resetReplyState();
    setIsWaiting(true);
    setShowAllSuggestions(false);
    setAllowUserInput(false);
    setChats([]);
    setSuggestions([]);
    setStreamingProducts([]);
    setStreamingRequestId('');

    const shouldSpeakOpening = shouldSpeakReply();
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
        if (shouldSpeakOpening) {
          speak(openingMessages[idx - 1], 0, null);
        }
        renderChat(idx + 1, cId);
      });
    };
    widgetClient.visearch.generateUuid((uuid) => {
      setChatId(uuid);
      renderChat(1, uuid);
    });
  };

  const onChatButtonClick = useCallback((): void => {
    setWidgetOpenTrigger(Math.random());
  }, []);

  const getScreen = (): ReactElement => (
      <div aria-label={intl.formatMessage({ id: 'widgetTitle' })} className='flex h-full flex-col bg-white dark:bg-neutral-700 border-x border-neutral-300 dark:border-neutral-800'>
        <div className='flex w-full py-4 justify-between shadow'>
          <h2 id={dialogTitleId}
            className='wigmix-widget-title flex items-center gap-2 px-4 m-0'
            style={{ color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor }}
          >
            {intl.formatMessage({ id: 'widgetTitle' })}
          </h2>

          <div className='flex items-center gap-2 pe-4'>
            {speechOutputEnabled && (
              <button
                type='button'
                aria-label={intl.formatMessage({
                  id: isVoiceReadingEnabled ? 'a11yDisableVoiceReading' : 'a11yEnableVoiceReading',
                })}
                aria-pressed={isVoiceReadingEnabled}
                className={cn(
                  'p-0 bg-transparent border-0',
                  FOCUS_VISIBLE_CLASSES,
                )}
                onClick={toggleVoiceReading}
              >
                <SpeakerIcon
                  muted={!isVoiceReadingEnabled}
                  className='size-6 cursor-pointer'
                  color={darkMode
                    ? (customizations.generalLayout?.fontColorDark || '')
                    : (customizations.generalLayout?.fontColor || '')}
                />
              </button>
            )}
            <button
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yStartNewChat' })}
              title={intl.formatMessage({ id: 'a11yStartNewChat' })}
              className={cn('p-0 bg-transparent border-0', FOCUS_VISIBLE_CLASSES)}
              onClick={() => newChat()}>
              <PlusCircleIcon className='size-6 cursor-pointer'
                color={darkMode
                  ? (customizations.generalLayout?.fontColorDark || '')
                  : (customizations.generalLayout?.fontColor || '')} />
            </button>
            <button
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yCloseShoppingAssistant' })}
              title={intl.formatMessage({ id: 'a11yCloseShoppingAssistant' })}
              className={cn('p-0 bg-transparent border-0', FOCUS_VISIBLE_CLASSES)}
              onClick={closeDialog}>
              <CloseIcon className='size-6 cursor-pointer'
                color={darkMode
                  ? (customizations.generalLayout?.fontColorDark || '')
                  : (customizations.generalLayout?.fontColor || '')} />
            </button>
          </div>
        </div>
        <ChatWindow isWaiting={isWaiting}
                    chats={chats}
                    latestMessage={typewriterText}
                    suggestions={showResponseExtras ? suggestions : []}
                    streamingProducts={streamingProducts}
                    streamingRequestId={streamingRequestId}
                    focusedProductId={focusedProductId}
                    showAllSuggestions={showAllSuggestions}
                    setShowAllSuggestions={() => setShowAllSuggestions(true)}
                    sendMessage={sendMessage} />
        <div className='relative flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
          {showCameraDrawer && (
            <CameraCaptureDrawer
              darkMode={darkMode}
              fontColor={customizations.generalLayout?.fontColor}
              fontColorDark={customizations.generalLayout?.fontColorDark}
              onClose={closeCameraDrawer}
              onCapture={onImageUpload}
            />
          )}
          <div className='flex justify-end gap-2'>
            <button
              ref={openCameraButtonRef}
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yOpenCamera' })}
              title={intl.formatMessage({ id: 'a11yOpenCamera' })}
              className={cn('p-2 border border-gray dark:border-neutral-500 rounded-md bg-transparent', FOCUS_VISIBLE_CLASSES)}
              onClick={() => setShowCameraDrawer(true)}>
              <CameraIcon
                className='size-5 cursor-pointer'
                color={darkMode
                  ? (customizations.generalLayout?.fontColorDark || '')
                  : (customizations.generalLayout?.fontColor || '')}
              />
            </button>
            <FileDropzone onImageUpload={onImageUpload} name='cs-upload-icon' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
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
            {voiceEnabled && (
                <button
                  type='button'
                  aria-label={intl.formatMessage({
                    id: voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yStartVoiceInput',
                  })}
                  aria-pressed={voiceStatus === 'recording'}
                  title={hasVoiceError ? intl.formatMessage({ id: 'voiceInputError' }) : intl.formatMessage({ id: 'holdMicToRecord' })}
                  disabled={(voiceStatus === 'idle' && !allowUserInput && !isSpeechPlaying) || voiceStatus === 'transcribing'}
                  className={cn('p-2 border border-gray dark:border-neutral-500 rounded-md bg-transparent disabled:opacity-50', FOCUS_VISIBLE_CLASSES)}
                  onMouseDown={startVoiceRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startVoiceRecording();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopRecording();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                      e.preventDefault();
                      startVoiceRecording();
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      stopRecording();
                    }
                  }}
                >
                  {renderVoiceButtonIcon()}
                </button>
            )}
          </div>
          <Textarea ref={chatInputRef}
                    aria-label={intl.formatMessage({ id: 'a11yChatInput' })}
                    value={message}
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
                      <button
                        type='button'
                        aria-label={intl.formatMessage({ id: 'a11ySendMessage' })}
                        title={intl.formatMessage({ id: 'a11ySendMessage' })}
                        disabled={!allowUserInput}
                        className={cn('p-0 bg-transparent border-0 disabled:opacity-50', FOCUS_VISIBLE_CLASSES)}
                        onClick={() => {
                          if (!allowUserInput) {
                            return;
                          }
                          sendMessage(message);
                        }}
                      >
                        <SubmitChatIcon
                          color={darkMode
                            ? (customizations.generalLayout?.fontColorDark || '')
                            : (customizations.generalLayout?.fontColor || '')}
                        />
                      </button>
                    }
          />
        </div>
      </div>
  );

  useEffect(() => {
    sendMessage(undefined, image);
  }, [image]);

  useEffect(() => {
    if (!dialogVisible) {
      interruptSpeech();
    }
    // react-modal grabs focus onto its own content wrapper right after mount (based on
    // document.activeElement, which can't see into the widget's Shadow DOM so it always thinks
    // nothing is focused yet). A same-tick focus call here loses that race. Deferring to a
    // macrotask runs after react-modal's own focus handling has settled, so this call wins.
    const timeoutId = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 0);
    return (): void => window.clearTimeout(timeoutId);
  }, [dialogVisible]);

  useEffect(() => {
    if (widgetOpenTrigger) {
      openDialog();
    }
  }, [widgetOpenTrigger]);

  useEffect(() => {
    if (sendChatTrigger) {
      setDialogVisible(true);
      sendMessage(sendChatTrigger[0], sendChatTrigger[1]);
    }
  }, [sendChatTrigger]);

  useEffect(() => {
    widgetClient.registerWidgetOpener(() => {
      setWidgetOpenTrigger(Math.random());
    });
    widgetClient.registerWidgetCloser(() => {
      closeDialog();
    });
    widgetClient.sendChatMessage = ((msg, img): void => {
      setSendChatTrigger([msg, img]);
    });
  }, []);

  if (!root) {
    return <></>;
  }

  return (
      <>
        <PopupTriggerButton ref={triggerButtonRef}
                            config={customizations.popup}
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
        <ViSenzeModal
            open={dialogVisible}
            layout={breakpoint}
            onClose={closeDialog}
            position={customizations.popup?.position || 'left'}
            darkMode={darkMode}
            fontFamily={customizations.generalLayout?.fontFamily}
            placementId={`${appSettings.placementId}`}
            ariaLabelledBy={dialogTitleId}
            renderWithoutPortal={!!renderModalWithoutPortal}>
          {getScreen()}
        </ViSenzeModal>
      </>
  );
};

export default ShoppingAssistant;
