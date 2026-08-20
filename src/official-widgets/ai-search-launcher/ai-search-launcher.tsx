import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import FullScreenContainer from './components/FullScreenContainer';
import ImageEntryScreen from './components/ImageEntryScreen';
import LauncherChatWindow from './components/LauncherChatWindow';
import MicEntryScreen from './components/MicEntryScreen';
import WebcamCapture from './components/WebcamCapture';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import useLauncherChat, { type UseLauncherChatResult } from './use-launcher-chat';
import FileDropzone from '../../common/components/FileDropzone';
import { RootContext } from '../../common/components/shadow-wrapper';
import { FOCUS_VISIBLE_CLASSES } from '../../common/constants';
import CameraIcon from '../../common/icons/CameraIcon';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import UploadIcon from '../../common/icons/UploadIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';

type EntryPointKey = Exclude<UseLauncherChatResult['activeEntryPoint'], null>;

interface AiSearchLauncherProps {
  // Test-only escape hatch, mirroring ShoppingAssistant's `renderModalWithoutPortal` — lets specs
  // bypass FullScreenContainer's Portal + Shadow DOM (hard to query directly in RTL/jsdom).
  renderWithoutPortal?: boolean;
}

const AiSearchLauncher: FC<AiSearchLauncherProps> = ({ renderWithoutPortal }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, appSettings } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const chat = useLauncherChat();
  const dialogTitleId = `wigmix-ai-search-launcher-title-${appSettings.placementId}`;
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const openChatCameraButtonRef = useRef<HTMLButtonElement>(null);
  // Camera/upload/mic controls on the main chat surface's input footer (mirroring
  // shopping-assistant's single-screen chat footer), distinct from the dedicated image/mic entry
  // points above: these feed an image or voice recording straight into the ongoing conversation
  // without leaving it.
  const [showChatCameraCapture, setShowChatCameraCapture] = useState(false);

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  const handleChatImage = (image: SearchImage): void => {
    chat.sendMessage(undefined, image);
  };

  const closeChatCameraCapture = useCallback((): void => {
    setShowChatCameraCapture(false);
    openChatCameraButtonRef.current?.focus();
  }, []);

  const handleSend = (): void => {
    if (!chat.allowUserInput) {
      return;
    }
    const messageToSend = chat.message;
    chat.sendMessage(messageToSend);
  };

  // Shared greeting-playback mechanism (B6a), implemented once and called from both places the
  // spec requires it: whenever an entry point opens (effect below, keyed on activeEntryPoint) and
  // whenever "new chat" is pressed (handleNewChat). `chat.playGreeting` always shows the greeting
  // as a text chat bubble (no-oping only when no greeting text is configured for the entry point)
  // and additionally speaks it when `voiceGreetingEnabled` is on and the session isn't muted, so
  // this just resolves which greeting string applies and calls it — no duplicated gating logic
  // here or in the entry screens.
  const getGreetingText = (entryPoint: EntryPointKey): string => customizations.launcher?.greetings?.[entryPoint] || '';

  useEffect(() => {
    if (chat.activeEntryPoint) {
      chat.playGreeting(getGreetingText(chat.activeEntryPoint));
    }
    // Deliberately keyed only on activeEntryPoint: chat.playGreeting/getGreetingText are
    // recreated every render (not memoized upstream), and this must fire exactly once per entry
    // point transition, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.activeEntryPoint]);

  const handleNewChat = (): void => {
    chat.newChat();
    if (chat.activeEntryPoint) {
      chat.playGreeting(getGreetingText(chat.activeEntryPoint));
    }
  };

  // Image/mic show a dedicated welcome screen until the first message is sent; Ask AI (spec
  // §5.3) has no welcome screen of its own, so it never matches either flag below and always
  // falls through to the normal chat surface, regardless of `hasStartedChat`.
  const showImageWelcome = chat.activeEntryPoint === 'image' && !chat.hasStartedChat;
  const showMicWelcome = chat.activeEntryPoint === 'mic' && !chat.hasStartedChat;

  useEffect(() => {
    if (customizations.chat?.startMuted) {
      chat.toggleVoiceReading();
    }
    // Mount-only: this is a one-time initial-mute preference, not something to re-apply whenever
    // chat.toggleVoiceReading is recreated (it isn't memoized upstream).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deferred focus onto the chat input whenever the chat surface becomes visible (i.e. either
  // welcome-screen flag flips to false) — mirrors shopping-assistant.tsx's own dialogVisible-keyed
  // effect. The setTimeout(..., 0) deferral matters even though this widget doesn't use
  // react-modal: focusing synchronously loses a race against the Shadow-DOM's own mount-time focus
  // handling, the same underlying timing issue react-modal's comment describes.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 0);
    return (): void => window.clearTimeout(timeoutId);
  }, [showImageWelcome, showMicWelcome]);

  // Focus restore on close (I6): read the entry point BEFORE closeEntryPoint clears it, so the
  // correct entry-bar button (mirrors shopping-assistant.tsx's closeDialog/triggerButtonRef
  // pattern) gets focus back once the full-screen surface unmounts.
  const handleClose = (): void => {
    const closingEntryPoint = chat.activeEntryPoint;
    chat.closeEntryPoint();
    if (closingEntryPoint === 'image') {
      imageButtonRef.current?.focus();
    } else if (closingEntryPoint === 'mic') {
      micButtonRef.current?.focus();
    } else if (closingEntryPoint === 'ai') {
      aiButtonRef.current?.focus();
    }
  };

  if (!root) {
    return <></>;
  }

  return (
    <>
      <div className='flex items-center gap-2 p-2'>
        {customizations.launcher?.cameraEntryEnabled !== false && (
          <button
            ref={imageButtonRef}
            type='button'
            aria-label={intl.formatMessage({ id: 'a11yOpenImageSearch' })}
            className={cn(
              'flex items-center justify-center rounded-lg border border-gray bg-white px-3 py-2 shadow-sm dark:bg-neutral-900',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => chat.openEntryPoint('image')}
          >
            <CameraIcon className='size-5 cursor-pointer' color={fontColor} />
          </button>
        )}
        {customizations.launcher?.micEntryEnabled !== false && (
          <button
            ref={micButtonRef}
            type='button'
            aria-label={intl.formatMessage({ id: 'a11yOpenVoiceSearch' })}
            className={cn(
              'flex items-center justify-center rounded-lg border border-gray bg-white px-3 py-2 shadow-sm dark:bg-neutral-900',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => chat.openEntryPoint('mic')}
          >
            <MicrophoneIcon className='size-5 cursor-pointer' color={fontColor} />
          </button>
        )}
        {customizations.launcher?.askAiEntryEnabled !== false && (
          <button
            ref={aiButtonRef}
            type='button'
            aria-label={intl.formatMessage({ id: 'a11yOpenAskAi' })}
            style={{ color: fontColor }}
            className={cn(
              'flex items-center justify-center rounded-lg border border-gray bg-white px-3 py-2 shadow-sm dark:bg-neutral-900',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => chat.openEntryPoint('ai')}
          >
            {intl.formatMessage({ id: 'triggerAskAi' })}
          </button>
        )}
      </div>
      <FullScreenContainer
        open={chat.activeEntryPoint !== null}
        onClose={handleClose}
        title={customizations.chat?.title || intl.formatMessage({ id: 'widgetTitle' })}
        isMuted={!chat.isVoiceReadingEnabled}
        onToggleMute={chat.toggleVoiceReading}
        showVoiceToggle={chat.speechOutputEnabled}
        onNewChat={handleNewChat}
        showNewChat={!showImageWelcome && !showMicWelcome}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        fontColor={customizations.generalLayout?.fontColor}
        fontColorDark={customizations.generalLayout?.fontColorDark}
        placementId={String(appSettings.placementId)}
        ariaLabelledBy={dialogTitleId}
        renderWithoutPortal={renderWithoutPortal}
      >
        {showImageWelcome && <ImageEntryScreen chat={chat} />}
        {showMicWelcome && <MicEntryScreen chat={chat} />}
        {!showImageWelcome && !showMicWelcome && (
          <>
            <LauncherChatWindow
              isWaiting={chat.isWaiting}
              chats={chat.chats}
              latestMessage={chat.typewriterText}
              suggestions={chat.suggestions}
              showAllSuggestions={chat.showAllSuggestions}
              setShowAllSuggestions={chat.setShowAllSuggestions}
              sendMessage={chat.sendMessage}
              streamingProducts={chat.streamingProducts}
              streamingRequestId={chat.streamingRequestId}
              focusedProductId={chat.focusedProductId}
              wishlistPids={chat.wishlistPids}
              setIsInWishlist={chat.setIsInWishlist}
            />
            <div className='relative flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
              {showChatCameraCapture && (
                <WebcamCapture
                  variant='drawer'
                  darkMode={darkMode}
                  fontColor={customizations.generalLayout?.fontColor}
                  fontColorDark={customizations.generalLayout?.fontColorDark}
                  onClose={closeChatCameraCapture}
                  onCapture={handleChatImage}
                />
              )}
              <div className='flex justify-end gap-2'>
                {customizations.launcher?.chatCameraEnabled !== false && (
                  <button
                    ref={openChatCameraButtonRef}
                    type='button'
                    aria-label={intl.formatMessage({ id: 'a11yOpenCamera' })}
                    title={intl.formatMessage({ id: 'a11yOpenCamera' })}
                    className={cn('rounded-md border border-gray bg-transparent p-2 dark:border-neutral-500', FOCUS_VISIBLE_CLASSES)}
                    onClick={() => setShowChatCameraCapture(true)}
                  >
                    <CameraIcon className='size-5 cursor-pointer' color={fontColor} />
                  </button>
                )}
                <FileDropzone onImageUpload={handleChatImage} name='asl-chat-upload' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
                  <div className='rounded-md border border-gray p-2 dark:border-neutral-500'>
                    {customizations.imageUpload?.icon?.url ? (
                      <CustomizableIcon
                        height={20}
                        width={20}
                        url={customizations.imageUpload.icon.url}
                        color={fontColor}
                      />
                    ) : (
                      <UploadIcon className='size-5' color={fontColor} />
                    )}
                  </div>
                </FileDropzone>
                {chat.voiceEnabled && (
                  <button
                    type='button'
                    aria-label={intl.formatMessage({ id: chat.voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yVoicePending' })}
                    aria-pressed={chat.voiceStatus === 'recording'}
                    title={chat.hasVoiceError ? intl.formatMessage({ id: 'voiceInputError' }) : intl.formatMessage({ id: 'holdMicToRecord' })}
                    disabled={(chat.voiceStatus === 'idle' && !chat.allowUserInput && !chat.isSpeechPlaying) || chat.voiceStatus === 'transcribing'}
                    className={cn('rounded-md border border-gray bg-transparent p-2 disabled:opacity-50 dark:border-neutral-500', FOCUS_VISIBLE_CLASSES)}
                    onMouseDown={chat.startVoiceRecording}
                    onMouseUp={chat.stopRecording}
                    onMouseLeave={chat.stopRecording}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      chat.startVoiceRecording();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      chat.stopRecording();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                        e.preventDefault();
                        chat.startVoiceRecording();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        chat.stopRecording();
                      }
                    }}
                  >
                    {chat.voiceStatus === 'recording'
                      ? <StopIcon className='size-5 cursor-pointer animate-pulse' color='#EF4444' />
                      : <MicrophoneIcon className='size-5 cursor-pointer' color={fontColor} />}
                  </button>
                )}
              </div>
              <Textarea
                ref={chatInputRef}
                aria-label={intl.formatMessage({ id: 'a11yChatInput' })}
                value={chat.message}
                placeholder={intl.formatMessage({ id: 'chatBoxPlaceholder' })}
                minRows={1}
                onChange={(e) => chat.setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.code === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!chat.allowUserInput) {
                      return;
                    }
                    handleSend();
                  }
                }}
                endContent={
                  <button
                    type='button'
                    aria-label={intl.formatMessage({ id: 'a11ySendMessage' })}
                    title={intl.formatMessage({ id: 'a11ySendMessage' })}
                    disabled={!chat.allowUserInput}
                    className={cn('p-0 bg-transparent border-0 disabled:opacity-50', FOCUS_VISIBLE_CLASSES)}
                    onClick={handleSend}
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
          </>
        )}
      </FullScreenContainer>
    </>
  );
};

export default AiSearchLauncher;
