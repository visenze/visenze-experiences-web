import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type FC, type ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { Product } from 'visearch-javascript-sdk';
import CameraCaptureDrawer from './components/CameraCaptureDrawer';
import type { Chat } from './components/ChatWindow';
import ChatWindow from './components/ChatWindow';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import NewChatIcon from './icons/NewChatIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import { extractActionTokens, extractSpeakableSentences, extractSuggestions, resolveProducts, stripTokensForDisplay, useVoiceReply } from '../../common/assistant';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../common/client/endpoint';
import FileDropzone from '../../common/components/FileDropzone';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import CameraIcon from '../../common/icons/CameraIcon';
import CloseIcon from '../../common/icons/CloseIcon';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import MicrophoneIcon from '../../common/icons/MicrophoneIcon';
import PlusCircleIcon from '../../common/icons/PlusCircleIcon';
import SpeakerIcon from '../../common/icons/SpeakerIcon';
import StopIcon from '../../common/icons/StopIcon';
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

// History-endpoint product tokens are `[[pid - Title]]`, unlike the live stream's bare `[[pid]]`
// — strip the title suffix so stripTokensForDisplay/resolveProducts can still match them.
const normalizeHistoryProductTokens = (text: string): string => (
  text.replace(/\[\[([^\]]+)]]/g, (_match, tokenContent: string) => `[[${tokenContent.trim().split(/\s/)[0]}]]`)
);

const CHAT_ID_STORAGE_PREFIX = 'visenze_shopping_assistant_chat_id_';
// Default for customizations.chatbot.persistChatTtlMinutes when unset.
const DEFAULT_CHAT_ID_TTL_MINUTES = 30;

interface StoredChatId {
  chatId: string;
  timestamp: number;
}

// Only the chat id (plus a sliding TTL) is stored client-side; messages are always re-fetched
// from the backend on restore (see fetchChatHistory) so the UI can't drift from the server.
const loadStoredChatId = (key: string, ttlMs: number): string | undefined => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }
  try {
    const stored = JSON.parse(raw) as StoredChatId;
    if (stored.chatId && stored.timestamp && Date.now() - stored.timestamp <= ttlMs) {
      return stored.chatId;
    }
  } catch {
    // Ignore a malformed value and fall back to a fresh session.
  }
  return undefined;
};

// Called on open/send/close to slide the TTL forward instead of expiring mid-conversation.
const persistChatId = (key: string, chatId: string): void => {
  const snapshot: StoredChatId = { chatId, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(snapshot));
};

interface ChatHistoryMessage {
  reqid: string;
  type: string;
  message: string;
  products?: Product[];
}

interface RestoredChatSession {
  chats: Chat[];
  suggestions: string[];
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
  const persistChatEnabled = customizations.chatbot?.persistChatEnabled === true;
  const persistChatTtlMs = (customizations.chatbot?.persistChatTtlMinutes ?? DEFAULT_CHAT_ID_TTL_MINUTES) * 60 * 1000;
  const chatIdStorageKey = `${CHAT_ID_STORAGE_PREFIX}${appSettings.placementId}`;
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
  // Bridges closeDialog to the one-time registerWidgetCloser registration below: closeDialog is a
  // useCallback keyed on chatId, so a directly-captured reference would freeze at whatever chatId
  // was current on mount and never see later sessions when persisting the close-time TTL slide.
  const closeDialogRef = useRef<() => void>(() => {});

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
    voiceModelId: customizations.chatbot?.voiceModelId,
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
    // Slides the resumable-session TTL forward, same as openDialog()/closeDialog().
    if (persistChatEnabled && chatId) {
      persistChatId(chatIdStorageKey, chatId);
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
      ? '/v1/chat/shopping-assistant'
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

  // Re-fetches a previous conversation from the backend, given a chat id recovered from
  // localStorage. Rebuilds `chats` with the same helpers the live stream uses, so the two paths
  // can't drift apart on how a response is displayed.
  const fetchChatHistory = async (chatIdToRestore: string): Promise<RestoredChatSession | null> => {
    let uid = '';
    let sid = '';
    widgetClient.visearch.getUid((uidResp) => { uid = uidResp; });
    widgetClient.visearch.getSid((sidResp) => { sid = sidResp; });
    const params = new URLSearchParams({
      app_key: appSettings.appKey,
      placement_id: appSettings.placementId.toString(),
      chat_id: chatIdToRestore,
      va_uid: uid,
      va_sid: sid,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
    });
    const historyPath = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/chat/history'
      : '/v1/multisearch/chat/history';
    const res = await fetch(`${apiBase}${historyPath}?${params.toString()}`);
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const messages = (json?.result?.messages || []) as ChatHistoryMessage[];
    if (messages.length === 0) {
      return null;
    }

    const restoredChats: Chat[] = [];
    // Mirrors the live path: the LAST message wins — a trailing human turn leaves none, a
    // trailing ai reply's own ((suggestion)) chips apply.
    let restoredSuggestions: string[] = [];

    messages.forEach((historyMessage) => {
      if (historyMessage.type === 'human') {
        restoredSuggestions = [];
        restoredChats.push({
          chatId: chatIdToRestore,
          requestId: historyMessage.reqid,
          author: 'user',
          messages: [historyMessage.message],
        });
        return;
      }

      const normalizedText = normalizeHistoryProductTokens(historyMessage.message);
      const historyProducts = (historyMessage.products || []).map((p) => getFlattenProduct(p));
      const resolvedProducts = resolveProducts(normalizedText, historyProducts);
      const text = stripTokensForDisplay(normalizedText).trim();
      if (text) {
        restoredChats.push({
          chatId: chatIdToRestore,
          requestId: historyMessage.reqid,
          author: 'bot',
          messages: [text],
          products: [],
        });
      }
      if (resolvedProducts.length) {
        restoredChats.push({
          chatId: chatIdToRestore,
          requestId: historyMessage.reqid,
          author: 'products',
          messages: [],
          products: resolvedProducts,
        });
      }
      restoredSuggestions = extractSuggestions(normalizedText);
    });

    return {
      chats: restoredChats,
      suggestions: restoredSuggestions,
    };
  };

  // Clears isWaiting/allowUserInput regardless of outcome, so a failed or empty fetch doesn't get
  // stuck looking like a reply is still streaming in.
  const restoreChatHistory = (chatIdToRestore: string): void => {
    fetchChatHistory(chatIdToRestore)
      .then((restored) => {
        if (restored) {
          setChats(restored.chats);
          setSuggestions(restored.suggestions);
          return;
        }
        // Nothing to resume (e.g. opened but never messaged, so no backend history) — clear the
        // id so openDialog's "chatId truthy -> resume" check doesn't keep resuming a blank
        // surface.
        setChatId('');
        localStorage.removeItem(chatIdStorageKey);
      })
      .catch((err: unknown) => {
        console.error(err);
        setChatId('');
        localStorage.removeItem(chatIdStorageKey);
      })
      .finally(() => {
        setIsWaiting(false);
        setAllowUserInput(true);
      });
  };

  // Runs once on mount so a returning visitor's chatId (and chats, once fetched) is already in
  // place by the time they open the dialog. No valid stored id just leaves this untouched.
  useEffect(() => {
    if (!persistChatEnabled) {
      return;
    }
    const storedChatId = loadStoredChatId(chatIdStorageKey, persistChatTtlMs);
    if (!storedChatId) {
      return;
    }
    setChatId(storedChatId);
    persistChatId(chatIdStorageKey, storedChatId);
    setIsWaiting(true);
    setAllowUserInput(false);
    restoreChatHistory(storedChatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Slides the resumable-session TTL forward so a reopened session is still within the window.
    if (persistChatEnabled && chatId) {
      persistChatId(chatIdStorageKey, chatId);
    }
  }, [persistChatEnabled, chatId, chatIdStorageKey]);

  useEffect(() => {
    closeDialogRef.current = closeDialog;
  }, [closeDialog]);

  const openDialog = (): void => {
    if (dialogVisible) {
      return;
    }
    // A truthy chatId means there's a session to resume (from earlier this instance, or restored
    // from localStorage on mount) — reuse it instead of minting a fresh one and replaying the
    // opening greeting.
    if (chatId) {
      setDialogVisible(true);
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
      if (persistChatEnabled) {
        persistChatId(chatIdStorageKey, uuid);
      }
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
      if (persistChatEnabled) {
        persistChatId(chatIdStorageKey, uuid);
      }
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
      closeDialogRef.current();
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
