import { cn } from '@heroui/theme';
import { type FC, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import ChatInputFooter from './components/ChatInputFooter';
import ImageEntryScreen from './components/ImageEntryScreen';
import MicEntryScreen from './components/MicEntryScreen';
import SplitLayout from './components/SplitLayout';
import MicrophoneIcon from './icons/MicrophoneIcon';
import ChatWindow from '../../common/components/chat/ChatWindow';
import FullScreenChatContainer from '../../common/components/chat/FullScreenChatContainer';
import useChat from '../../common/components/chat/use-chat';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { RootContext } from '../../common/components/shadow-wrapper';
import { FOCUS_VISIBLE_CLASSES } from '../../common/constants';
import CameraIcon from '../../common/icons/CameraIcon';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';

type EntryPointKey = 'image' | 'mic' | 'ai';

interface AiSearchLauncherProps {
  // Test-only escape hatch, mirroring ShoppingAssistant's `renderModalWithoutPortal` — lets specs
  // bypass FullScreenChatContainer's Portal + Shadow DOM (hard to query directly in RTL/jsdom).
  renderWithoutPortal?: boolean;
}

const AiSearchLauncher: FC<AiSearchLauncherProps> = ({ renderWithoutPortal }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, appSettings } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const chat = useChat();
  const breakpoint = useBreakpoint();
  const [activeEntryPoint, setActiveEntryPoint] = useState<EntryPointKey | null>(null);
  const dialogTitleId = `wigmix-ai-search-launcher-title-${appSettings.placementId}`;
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const openChatCameraButtonRef = useRef<HTMLButtonElement>(null);
  // Camera/upload/mic controls on the main chat surface's input footer (mirroring
  // shopping-assistant's single-screen chat footer), distinct from the dedicated image/mic entry
  // points above: these feed an image or voice recording straight into the ongoing conversation
  // without leaving it.
  const [showChatCameraCapture, setShowChatCameraCapture] = useState(false);

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  const openEntryPoint = (entryPoint: EntryPointKey): void => {
    setActiveEntryPoint(entryPoint);
    chat.open();
  };

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
    if (activeEntryPoint) {
      chat.playGreeting(getGreetingText(activeEntryPoint));
    }
    // Deliberately keyed only on activeEntryPoint: chat.playGreeting/getGreetingText are
    // recreated every render (not memoized upstream), and this must fire exactly once per entry
    // point transition, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntryPoint]);

  const handleNewChat = (): void => {
    chat.newChat();
    if (activeEntryPoint) {
      chat.playGreeting(getGreetingText(activeEntryPoint));
    }
  };

  // Image/mic show a dedicated welcome screen until the first message is sent; Ask AI (spec
  // §5.3) has no welcome screen of its own, so it never matches either flag below and always
  // falls through to the normal chat surface, regardless of `hasStartedChat`.
  const showImageWelcome = activeEntryPoint === 'image' && !chat.hasStartedChat;
  const showMicWelcome = activeEntryPoint === 'mic' && !chat.hasStartedChat;

  // The single place the layout switch lives (see the responsive-redesign design doc §3):
  // `splitlayout` engages only above the mobile breakpoint AND once the conversation actually has
  // results to show. Until then — and always on mobile, and always for `chatlayout` — the same
  // single-column chat surface renders instead, so there's no empty products pane to design.
  const showSplit = customizations.chat?.layout === 'splitlayout'
    && breakpoint !== WidgetBreakpoint.MOBILE
    && (chat.breadcrumbs.length > 0 || chat.streamingProducts.length > 0);

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

  // Focus restore on close (I6): read the entry point BEFORE setActiveEntryPoint(null) clears it,
  // so the correct entry-bar button (mirrors shopping-assistant.tsx's closeDialog/triggerButtonRef
  // pattern) gets focus back once the full-screen surface unmounts.
  const handleClose = (): void => {
    const closingEntryPoint = activeEntryPoint;
    chat.close();
    setActiveEntryPoint(null);
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
              'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-white px-3 py-2 shadow-sm dark:bg-neutral-900',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => openEntryPoint('image')}
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
              'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-white px-3 py-2 shadow-sm dark:bg-neutral-900',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => openEntryPoint('mic')}
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
              'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-white px-3 py-2 shadow-sm dark:bg-neutral-900',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => openEntryPoint('ai')}
          >
            {intl.formatMessage({ id: 'triggerAskAi' })}
          </button>
        )}
      </div>
      <FullScreenChatContainer
        open={chat.isOpen}
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
        widgetName='ai-search-launcher'
        ariaLabelledBy={dialogTitleId}
        renderWithoutPortal={renderWithoutPortal}
        fullWidth={showSplit}
      >
        {showImageWelcome && <ImageEntryScreen chat={chat} />}
        {showMicWelcome && <MicEntryScreen chat={chat} />}
        {!showImageWelcome && !showMicWelcome && showSplit && (
          <SplitLayout
            chat={chat}
            darkMode={darkMode}
            fontColorLight={customizations.generalLayout?.fontColor}
            fontColorDark={customizations.generalLayout?.fontColorDark}
            chatCameraEnabled={customizations.launcher?.chatCameraEnabled !== false}
            imageUploadIconUrl={customizations.imageUpload?.icon?.url}
            chatInputRef={chatInputRef}
            openChatCameraButtonRef={openChatCameraButtonRef}
            showChatCameraCapture={showChatCameraCapture}
            setShowChatCameraCapture={setShowChatCameraCapture}
            closeChatCameraCapture={closeChatCameraCapture}
            handleChatImage={handleChatImage}
            handleSend={handleSend}
          />
        )}
        {!showImageWelcome && !showMicWelcome && !showSplit && (
          <>
            <ChatWindow
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
              pwPrefix='asl'
            />
            <ChatInputFooter
              chat={chat}
              darkMode={darkMode}
              fontColorLight={customizations.generalLayout?.fontColor}
              fontColorDark={customizations.generalLayout?.fontColorDark}
              chatCameraEnabled={customizations.launcher?.chatCameraEnabled !== false}
              imageUploadIconUrl={customizations.imageUpload?.icon?.url}
              chatInputRef={chatInputRef}
              openChatCameraButtonRef={openChatCameraButtonRef}
              showChatCameraCapture={showChatCameraCapture}
              setShowChatCameraCapture={setShowChatCameraCapture}
              closeChatCameraCapture={closeChatCameraCapture}
              handleChatImage={handleChatImage}
              handleSend={handleSend}
            />
          </>
        )}
      </FullScreenChatContainer>
    </>
  );
};

export default AiSearchLauncher;
