import { Textarea } from '@heroui/input';
import { Spinner } from '@heroui/spinner';
import { cn } from '@heroui/theme';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { type FC, type KeyboardEvent, type ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Webcam from 'react-webcam';
import type { Chat } from './components/ChatWindow';
import ChatWindow from './components/ChatWindow';
import MicrophoneIcon from './icons/MicrophoneIcon';
import NewChatIcon from './icons/NewChatIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import StopIcon from './icons/StopIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import useVoice from './use-voice';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../common/client/endpoint';
import FileDropzone from '../../common/components/FileDropzone';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import ArrowPathIcon from '../../common/icons/ArrowPathIcon';
import CameraIcon from '../../common/icons/CameraIcon';
import CloseIcon from '../../common/icons/CloseIcon';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import PlusCircleIcon from '../../common/icons/PlusCircleIcon';
import UploadIcon from '../../common/icons/UploadIcon';
import UturnLeftIcon from '../../common/icons/UturnLeftIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import { isImageFile, type SearchImage, type SearchImageOrPid } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';
import { Actions, Category } from '../../common/types/tracking-constants';
import { getFlattenProduct } from '../../common/utils';

// A product reference is a token that can appear anywhere in the assistant's text:
//   [[<product_id>]]
// Old format put the token at the START of the line (e.g. "- [[pid]] **title** ...");
// the new format puts it at the END (e.g. "- <description> ... [[pid]]").
// LEADING_PRODUCT_REGEX detects the old, line-leading form so its whole line can be dropped.
const LEADING_PRODUCT_REGEX = /^(?:\d+\.? |- )?\[\[[^\]]+]]/;
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;
const RESERVED_ACTION_TOKEN_REGEX = /<<\s*(ADD_TO_CART|ADD_TO_LIKE|ADD_TO_WISHLIST)\s*:\s*([^>\s]+)\s*>>/g;
const INCOMPLETE_RESERVED_ACTION_TOKEN_REGEX = /<<(?:ADD_TO(?:_[A-Z]+)?(?::[^>]*)?)$/;
const INCOMPLETE_PRODUCT_TOKEN_REGEX = /\[\[[^\]]*$/;
const FOCUS_VISIBLE_CLASSES = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';

// Clean the accumulated text for display:
// - Old format (token leads the line): drop the whole line; the product card replaces it.
// - New format (token inline/trailing): strip only the token, keep the surrounding description.
// Also removes ((suggestion)) tokens and any trailing, not-yet-closed "[[..." fragment
// that is still mid-stream, so partial tokens never flash in the bubble.
const stripTokensForDisplay = (text: string): string => text
  .split('\n')
  .map((line): string | null => {
    if (LEADING_PRODUCT_REGEX.test(line)) {
      return null;
    }
    return line.replace(/\[\[[^\]]+]]/g, '');
  })
  .filter((line): line is string => line !== null)
  .join('\n')
  .replace(SUGGESTION_LINE_REGEX, '')
  .replace(RESERVED_ACTION_TOKEN_REGEX, '')
  .replace(INCOMPLETE_RESERVED_ACTION_TOKEN_REGEX, '')
  .replace(INCOMPLETE_PRODUCT_TOKEN_REGEX, '');

// Resolve referenced products in first-appearance order. A product is included only when
// its token is present in the text AND its payload has arrived via a `product` event.
const resolveProducts = (text: string, products: ProcessedProduct[]): ProcessedProduct[] => {
  const tokenRegex = /\[\[([^\]]+)]]/g;
  const seen = new Set<string>();
  const ordered: ProcessedProduct[] = [];
  let match = tokenRegex.exec(text);
  while (match) {
    const pid = match[1];
    if (!seen.has(pid)) {
      const product = products.find((p) => p.product_id === pid);
      if (product) {
        seen.add(pid);
        ordered.push(product);
      }
    }
    match = tokenRegex.exec(text);
  }
  return ordered;
};

// Sentence-ending punctuation followed by whitespace/end-of-string, but not a bare digit
// (so numbered list markers like "1." don't get mistaken for a sentence boundary).
const SENTENCE_BOUNDARY_REGEX = /(?<![0-9])[.!?](?=\s|$)/g;

interface SpeakableChunkResult {
  chunk: string;
  spokenLength: number;
}

interface CompletedResponse {
  chatId: string;
  requestId: string;
  text: string;
  products: ProcessedProduct[];
}

// Given the raw, monotonically-growing token text streamed so far (tokens.join('') — NOT the
// stripped display text, whose length can shrink/shift as product tokens resolve or an
// incomplete trailing "[[" gets trimmed) and how much of it has already been sent to speech,
// returns the next complete-sentence chunk that's safe to speak now (cleaned of [[pid]]/
// ((suggestion)) markers) — or '' if the reply hasn't finished a full sentence yet — and the
// new spokenLength to remember.
const extractSpeakableChunk = (rawText: string, spokenLength: number): SpeakableChunkResult => {
  const unspoken = rawText.slice(spokenLength);
  let lastEnd = -1;
  const regex = new RegExp(SENTENCE_BOUNDARY_REGEX);
  let match = regex.exec(unspoken);
  while (match) {
    lastEnd = match.index + 1;
    match = regex.exec(unspoken);
  }
  if (lastEnd === -1) {
    return { chunk: '', spokenLength };
  }
  const chunk = stripTokensForDisplay(unspoken.slice(0, lastEnd)).trim();
  return { chunk, spokenLength: spokenLength + lastEnd };
};

interface ShoppingAssistantProps {
  renderModalWithoutPortal?: boolean;
}

const ShoppingAssistant: FC<ShoppingAssistantProps> = ({ renderModalWithoutPortal }) => {
  const webcamRef = useRef<Webcam>(null);
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
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
  const [latestMessage, setLatestMessage] = useState('');
  const [typewriterText, setTypewriterText] = useState('');
  const [isVoiceReply, setIsVoiceReply] = useState(false);
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);
  const [isVoiceReadingEnabled, setIsVoiceReadingEnabled] = useState(true);
  const [showResponseExtras, setShowResponseExtras] = useState(true);
  const [voiceRevealTarget, setVoiceRevealTarget] = useState(0);
  const [voiceRevealDelayMs, setVoiceRevealDelayMs] = useState(30);
  const [streamingProducts, setStreamingProducts] = useState<ProcessedProduct[]>([]);
  const [streamingRequestId, setStreamingRequestId] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCameraDrawer, setShowCameraDrawer] = useState(false);
  const [widgetOpenTrigger, setWidgetOpenTrigger] = useState(0);
  const [sendChatTrigger, setSendChatTrigger] = useState<[string, SearchImageOrPid | undefined]>();
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const openCameraButtonRef = useRef<HTMLButtonElement>(null);
  const closeCameraButtonRef = useRef<HTMLButtonElement>(null);
  const takePhotoButtonRef = useRef<HTMLButtonElement>(null);
  const switchCameraButtonRef = useRef<HTMLButtonElement>(null);
  const intl = useIntl();
  const dialogTitleId = `wigmix-shopping-assistant-title-${appSettings.placementId}`;
  const openingMessages = [
    intl.formatMessage({ id: 'openingMessage1' }),
    intl.formatMessage({ id: 'openingMessage2' }),
  ];
  // Bridges sendMessage (declared below) to the speak() implementation from useVoice
  // (instantiated after sendMessage, since its onTranscript callback calls sendMessage).
  const speakRef = useRef<(text: string, revealTarget: number) => boolean>(() => false);
  const hasPendingSpeechRef = useRef<() => boolean>(() => false);
  const latestMessageRef = useRef('');
  const typewriterTextRef = useRef('');
  const pendingResponseCommitRef = useRef<(() => void) | null>(null);
  const voiceReadingEnabledRef = useRef(true);

  useEffect(() => {
    latestMessageRef.current = latestMessage;
  }, [latestMessage]);

  useEffect(() => {
    typewriterTextRef.current = typewriterText;
  }, [typewriterText]);

  // Typed replies reveal as soon as tokens arrive. Voice replies reveal only while their
  // corresponding audio item is actually playing, and never beyond that item's text boundary.
  // Keeping one monotonically-growing cursor avoids restarting from the beginning whenever a
  // new SSE token extends latestMessage.
  useEffect((): (() => void) | undefined => {
    if (isVoiceReply && !isSpeechPlaying) {
      return undefined;
    }
    const revealTarget = isVoiceReply
      ? Math.min(voiceRevealTarget, latestMessage.length)
      : latestMessage.length;
    if (typewriterTextRef.current.length >= revealTarget) {
      return undefined;
    }
    const interval = setInterval((): void => {
      const currentLength = typewriterTextRef.current.length;
      if (currentLength >= revealTarget) {
        clearInterval(interval);
        return;
      }
      const next = latestMessage.slice(0, currentLength + 1);
      typewriterTextRef.current = next;
      setTypewriterText(next);
      if (next.length >= revealTarget) {
        clearInterval(interval);
      }
    }, isVoiceReply ? voiceRevealDelayMs : 30);
    return (): void => clearInterval(interval);
  }, [isSpeechPlaying, isVoiceReply, latestMessage, voiceRevealDelayMs, voiceRevealTarget]);

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
    latestMessageRef.current = '';
    typewriterTextRef.current = '';
    setLatestMessage('');
    setTypewriterText('');
    setStreamingProducts([]);
    setStreamingRequestId('');
    setIsSpeechPlaying(false);
    setIsVoiceReply(false);
    setVoiceRevealTarget(0);
    setAllowUserInput(true);
    setShowResponseExtras(true);
  };

  useEffect(() => {
    if (!isVoiceReply && latestMessage && typewriterText.length >= latestMessage.length) {
      const pendingCommit = pendingResponseCommitRef.current;
      if (pendingCommit) {
        pendingResponseCommitRef.current = null;
        pendingCommit();
      }
    }
  }, [isVoiceReply, latestMessage, typewriterText]);

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
    pendingResponseCommitRef.current = null;
    latestMessageRef.current = '';
    typewriterTextRef.current = '';
    const shouldSpeakReply = !!appSettings.elevenLabsApiKey && voiceReadingEnabledRef.current;
    setIsVoiceReply(shouldSpeakReply);
    setIsSpeechPlaying(false);
    setVoiceRevealTarget(0);
    setTypewriterText('');
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

    // Resolve the API base + path, honouring manual endpoint > cloud > API endpoint > default
    const manualEndpoint = getManualEndpoint(appSettings.placementId);
    const base = resolveBaseEndpoint(appSettings, manualEndpoint);
    const shoppingAssistantPath = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/search/chat/shopping-assistant'
      : '/v1/product/multisearch/chat/shopping-assistant';

    fetchEventSource(`${base}${shoppingAssistantPath}?${params.toString()}`, {
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
          if (!shouldSpeakReply || !voiceReadingEnabledRef.current) {
            setIsWaiting(false);
          }
          tokens.push(JSON.parse(ev.data).value);
          const currentText = tokens.join('');
          let actionMatch = RESERVED_ACTION_TOKEN_REGEX.exec(currentText);
          while (actionMatch) {
            const actionKey = `${actionMatch[1]}:${actionMatch[2]}:${actionMatch.index}`;
            if (!handledActionTokens.has(actionKey)) {
              handledActionTokens.add(actionKey);
              const callback = actionMatch[1] === 'ADD_TO_CART'
                ? widgetConfig.callbacks.onAddToCartToggle
                : widgetConfig.callbacks.onAddToWishlistToggle;
              if (callback) {
                try {
                  const callbackResult = callback(true, actionMatch[2]);
                  Promise.resolve(callbackResult).catch((err: unknown) => console.error(err));
                } catch (err) {
                  console.error(err);
                }
              }
            }
            actionMatch = RESERVED_ACTION_TOKEN_REGEX.exec(currentText);
          }
          RESERVED_ACTION_TOKEN_REGEX.lastIndex = 0;
          const allSuggestions = currentText.match(SUGGESTION_LINE_REGEX);
          setSuggestions((allSuggestions || []).map((s) => s.replace('((', '').replace('))', '').trim()));
          const displayText = stripTokensForDisplay(currentText).trim();
          latestMessageRef.current = displayText;
          setLatestMessage(displayText);
          setStreamingProducts(resolveProducts(currentText, products));
          if (shouldSpeakReply && voiceReadingEnabledRef.current) {
            const { chunk, spokenLength: newSpokenLength } = extractSpeakableChunk(currentText, spokenLength);
            if (chunk) {
              const revealTarget = stripTokensForDisplay(currentText.slice(0, newSpokenLength)).trim().length;
              speakRef.current(chunk, revealTarget);
              spokenLength = newSpokenLength;
            }
          }
        } else if (ev.event === 'product') {
          products.push(getFlattenProduct(JSON.parse(ev.data)));
          setStreamingProducts(resolveProducts(tokens.join(''), products));
        }
      },
      onclose: () => {
        const currentText = tokens.join('');
        const allSuggestions = currentText.match(SUGGESTION_LINE_REGEX);
        setSuggestions((allSuggestions || []).map((s) => s.replace('((', '').replace('))', '').trim()));
        const finalText = stripTokensForDisplay(currentText).trim();
        const finalProducts = resolveProducts(currentText, products);
        latestMessageRef.current = finalText;
        setLatestMessage(finalText);
        setStreamingProducts(finalProducts);
        const completedResponse = {
          chatId: chatIdFromResp,
          requestId: reqIdFromResp,
          text: finalText,
          products: finalProducts,
        };
        if (shouldSpeakReply && voiceReadingEnabledRef.current) {
          const remaining = stripTokensForDisplay(currentText.slice(spokenLength)).trim();
          if (remaining) {
            speakRef.current(remaining, finalText.length);
          }
          if (hasPendingSpeechRef.current()) {
            pendingResponseCommitRef.current = (): void => commitResponse(completedResponse);
          } else {
            setIsWaiting(false);
            typewriterTextRef.current = finalText;
            setTypewriterText(finalText);
            commitResponse(completedResponse);
          }
        } else if (finalText && typewriterTextRef.current.length < finalText.length) {
          pendingResponseCommitRef.current = (): void => commitResponse(completedResponse);
        } else {
          commitResponse(completedResponse);
        }
      },
      onerror: (err) => {
        console.error(err);
      },
    });
  };

  const {
    voiceEnabled,
    speechOutputEnabled,
    status: voiceStatus,
    liveTranscript,
    hasError: hasVoiceError,
    startRecording,
    stopRecording,
    speak,
    hasPendingSpeech,
    stopAudio,
  } = useVoice({
    apiKey: appSettings.elevenLabsApiKey,
    voiceId: customizations.chatbot?.voiceId,
    onTranscript: (text): void => {
      sendMessage(text);
    },
    onSpeechStart: (revealTarget, durationMs): void => {
      const remainingCharacters = Math.max(1, revealTarget - typewriterTextRef.current.length);
      const delay = durationMs
        ? Math.max(15, Math.min(80, durationMs / remainingCharacters))
        : 30;
      setVoiceRevealDelayMs(delay);
      setVoiceRevealTarget(revealTarget);
      setIsWaiting(false);
      setIsSpeechPlaying(true);
    },
    onSpeechEnd: (revealTarget): void => {
      const revealed = latestMessageRef.current.slice(0, revealTarget);
      typewriterTextRef.current = revealed;
      setTypewriterText(revealed);
      setIsSpeechPlaying(false);
    },
    onSpeechQueueEnd: (): void => {
      setIsSpeechPlaying(false);
      const pendingCommit = pendingResponseCommitRef.current;
      if (pendingCommit) {
        pendingResponseCommitRef.current = null;
        pendingCommit();
      }
    },
  });

  useEffect(() => {
    speakRef.current = speak;
    hasPendingSpeechRef.current = hasPendingSpeech;
  });

  const startVoiceRecording = (): void => {
    const pendingCommit = pendingResponseCommitRef.current;
    pendingResponseCommitRef.current = null;
    stopAudio();
    pendingCommit?.();
    startRecording();
  };

  const toggleVoiceReading = (): void => {
    const nextEnabled = !voiceReadingEnabledRef.current;
    voiceReadingEnabledRef.current = nextEnabled;
    setIsVoiceReadingEnabled(nextEnabled);
    if (!nextEnabled) {
      const pendingCommit = pendingResponseCommitRef.current;
      pendingResponseCommitRef.current = null;
      stopAudio();
      setIsSpeechPlaying(false);
      setIsVoiceReply(false);
      setIsWaiting(false);
      pendingCommit?.();
    }
  };

  useEffect(() => {
    if (voiceStatus === 'recording' || voiceStatus === 'transcribing') {
      setMessage(liveTranscript);
    }
  }, [liveTranscript, voiceStatus]);

  const renderVoiceButtonIcon = (): ReactElement => {
    if (voiceStatus === 'transcribing') {
      return <Spinner size='sm' aria-label={intl.formatMessage({ id: 'a11yTranscribingVoice' })} />;
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

  const handleCameraDrawerKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeCameraDrawer();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusableControls = [
      closeCameraButtonRef.current,
      takePhotoButtonRef.current,
      switchCameraButtonRef.current,
    ].filter((control): control is HTMLButtonElement => !!control && !control.disabled);
    if (!focusableControls.length) {
      return;
    }
    const activeIndex = focusableControls.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = activeIndex + 1;
    if (event.shiftKey) {
      nextIndex = activeIndex - 1;
    }
    if (nextIndex < 0) {
      nextIndex = focusableControls.length - 1;
    }
    if (nextIndex >= focusableControls.length) {
      nextIndex = 0;
    }

    event.preventDefault();
    focusableControls[nextIndex].focus();
  }, [closeCameraDrawer]);

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
            closeCameraDrawer();
          });
      }
    }
  }, [closeCameraDrawer, webcamRef]);

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
    pendingResponseCommitRef.current = null;
    stopAudio();
    setIsWaiting(true);
    setShowAllSuggestions(false);
    setAllowUserInput(false);
    setChats([]);
    setLatestMessage('');
    setTypewriterText('');
    latestMessageRef.current = '';
    typewriterTextRef.current = '';
    setIsVoiceReply(false);
    setIsSpeechPlaying(false);
    setVoiceRevealTarget(0);
    setSuggestions([]);
    setStreamingProducts([]);
    setStreamingRequestId('');

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
    setWidgetOpenTrigger(Math.random());
  }, []);

  const getScreen = (): ReactElement => (
      <div className='flex h-full flex-col bg-white dark:bg-neutral-700 border-x border-neutral-300 dark:border-neutral-800'>
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
              className={cn('p-0 bg-transparent border-0', FOCUS_VISIBLE_CLASSES)}
              onClick={() => setDialogVisible(false)}>
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
                    streamingProducts={showResponseExtras ? streamingProducts : []}
                    streamingRequestId={streamingRequestId}
                    showAllSuggestions={showAllSuggestions}
                    setShowAllSuggestions={() => setShowAllSuggestions(true)}
                    sendMessage={sendMessage} />
        <div className='relative flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
          {showCameraDrawer && (
            <div
              role='dialog'
              aria-modal='true'
              aria-label={intl.formatMessage({ id: 'a11yCameraDrawer' })}
              tabIndex={-1}
              className='wigmix-camera-drawer absolute inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-800 shadow-lg flex flex-col items-center p-4 animate-slideup'
              style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, minHeight: 340 }}
              onKeyDown={handleCameraDrawerKeyDown}
            >
              <div className='w-full flex justify-center'>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat='image/jpeg'
                  className='rounded-lg max-w-full'
                  videoConstraints={{ facingMode }}
                  aria-label={intl.formatMessage({ id: 'a11yCameraPreview' })}
                />
              </div>
              <div className='w-full flex gap-2 mt-2'>
                <button ref={closeCameraButtonRef}
                        className={cn(
                            'w-full p-2 rounded flex justify-center bg-gray-100 dark:bg-neutral-800 dark:border-1',
                            'text-neutral-900 dark:text-neutral-100',
                            FOCUS_VISIBLE_CLASSES,
                        )}
                        type='button'
                        aria-label={intl.formatMessage({ id: 'a11yCloseCamera' })}
                        onClick={closeCameraDrawer}>
                  <UturnLeftIcon
                      className='size-5 cursor-pointer'
                      color={darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '')}
                  />
                </button>
                <button ref={takePhotoButtonRef}
                        className={cn(
                            'w-full p-2 rounded flex justify-center bg-gray-100 dark:bg-neutral-800 dark:border-1',
                            'text-neutral-900 dark:text-neutral-100',
                            FOCUS_VISIBLE_CLASSES,
                        )}
                        type='button'
                        aria-label={intl.formatMessage({ id: 'a11yTakePhoto' })}
                        onClick={capture}>
                  <CameraIcon
                      className='size-5 cursor-pointer'
                      color={darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '')}
                  />
                </button>
                <button ref={switchCameraButtonRef}
                        className={cn(
                            'w-full p-2 rounded flex justify-center bg-gray-100 dark:bg-neutral-800 dark:border-1',
                            'text-neutral-900 dark:text-neutral-100',
                            FOCUS_VISIBLE_CLASSES,
                        )}
                        type='button'
                        aria-label={intl.formatMessage({ id: 'a11ySwitchCamera' })}
                        onClick={() => {
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                }}>
                  <ArrowPathIcon
                      className='size-5 cursor-pointer'
                      color={darkMode ? (customizations.generalLayout?.fontColorDark || '') : (customizations.generalLayout?.fontColor || '')}
                  />
                </button>
              </div>
            </div>
          )}
          <div className='flex justify-end gap-2'>
            <button
              ref={openCameraButtonRef}
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yOpenCamera' })}
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
                title={hasVoiceError ? intl.formatMessage({ id: 'voiceInputError' }) : undefined}
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
          <Textarea aria-label={intl.formatMessage({ id: 'a11yChatInput' })}
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
    if (showCameraDrawer) {
      closeCameraButtonRef.current?.focus();
    }
  }, [showCameraDrawer]);

  useEffect(() => {
    if (!dialogVisible) {
      const pendingCommit = pendingResponseCommitRef.current;
      pendingResponseCommitRef.current = null;
      stopAudio();
      pendingCommit?.();
    }
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
      setDialogVisible(false);
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
        <ViSenzeModal
            open={dialogVisible}
            layout={breakpoint}
            onClose={() => setDialogVisible(false)}
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
