import { cn } from '@heroui/theme';
import { type FC, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import ImageEntryScreen from './components/ImageEntryScreen';
import MicEntryScreen from './components/MicEntryScreen';
import SplitLayout from './components/SplitLayout';
import ChatComposer from '../../common/components/chat/ChatComposer';
import ChatWindow from '../../common/components/chat/ChatWindow';
import FullScreenChatContainer from '../../common/components/chat/FullScreenChatContainer';
import useChat from '../../common/components/chat/use-chat';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { RootContext } from '../../common/components/shadow-wrapper';
import { FOCUS_VISIBLE_CLASSES } from '../../common/constants';
import CameraIcon from '../../common/icons/CameraIcon';
import MicrophoneIcon from '../../common/icons/MicrophoneIcon';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';

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

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  const openEntryPoint = (entryPoint: EntryPointKey): void => {
    setActiveEntryPoint(entryPoint);
    chat.open();
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
  const showSplit = customizations.chatbot?.layout === 'splitlayout'
    && breakpoint !== WidgetBreakpoint.MOBILE
    && (chat.breadcrumbs.length > 0 || chat.streamingProducts.length > 0);

  useEffect(() => {
    if (customizations.chatbot?.startMuted) {
      chat.toggleVoiceReading();
    }
    // Mount-only: this is a one-time initial-mute preference, not something to re-apply whenever
    // chat.toggleVoiceReading is recreated (it isn't memoized upstream).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focuses the chat input once the chat surface (not a welcome screen) is visible — covers both
  // Ask AI opening straight into chat and a welcome screen flipping off after the first message.
  useEffect(() => {
    if (showImageWelcome || showMicWelcome) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 0);
    return (): void => window.clearTimeout(timeoutId);
  }, [activeEntryPoint, showImageWelcome, showMicWelcome]);

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
              'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
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
              'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
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
              'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
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
        title={customizations.chatbot?.title || intl.formatMessage({ id: 'widgetTitle' })}
        isMuted={!chat.isVoiceReadingEnabled}
        onToggleMute={chat.toggleVoiceReading}
        showVoiceToggle={chat.speechOutputEnabled}
        onNewChat={handleNewChat}
        showNewChat={!showImageWelcome && !showMicWelcome}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        fontColor={customizations.generalLayout?.fontColor}
        fontColorDark={customizations.generalLayout?.fontColorDark}
        backgroundColor={customizations.generalLayout?.backgroundColor}
        backgroundColorDark={customizations.generalLayout?.backgroundColorDark}
        borderWidth={customizations.generalLayout?.border?.width}
        borderColor={customizations.generalLayout?.border?.color}
        borderColorDark={customizations.generalLayout?.border?.colorDark}
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
            chatCameraEnabled={customizations.launcher?.chatCameraEnabled !== false}
            chatInputRef={chatInputRef}
          />
        )}
        {!showImageWelcome && !showMicWelcome && !showSplit && (
          <>
            <div className='mx-auto flex min-h-0 w-full max-w-[820px] flex-1 flex-col'>
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
            </div>
            <ChatComposer
              chat={chat}
              chatInputRef={chatInputRef}
              chatCameraEnabled={customizations.launcher?.chatCameraEnabled !== false}
            />
          </>
        )}
      </FullScreenChatContainer>
    </>
  );
};

export default AiSearchLauncher;
