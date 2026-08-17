import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, useContext, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import FullScreenContainer from './components/FullScreenContainer';
import ImageEntryScreen from './components/ImageEntryScreen';
import LauncherChatWindow from './components/LauncherChatWindow';
import MicEntryScreen from './components/MicEntryScreen';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import useLauncherChat, { type UseLauncherChatResult } from './use-launcher-chat';
import { RootContext } from '../../common/components/shadow-wrapper';
import CameraIcon from '../../common/icons/CameraIcon';
import { WidgetDataContext } from '../../common/types/contexts';

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

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

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
    if (customizations.launcher?.startMuted) {
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
        <button
          ref={imageButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenImageSearch' })}
          className={cn('rounded-md border border-gray bg-transparent p-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => chat.openEntryPoint('image')}
        >
          <CameraIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
        <button
          ref={micButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenVoiceSearch' })}
          className={cn('rounded-md border border-gray bg-transparent p-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => chat.openEntryPoint('mic')}
        >
          <MicrophoneIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
        <button
          ref={aiButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenAskAi' })}
          style={{ color: fontColor }}
          className={cn('rounded-md border border-gray bg-transparent px-3 py-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => chat.openEntryPoint('ai')}
        >
          {customizations.launcher?.title || intl.formatMessage({ id: 'triggerAskAi' })}
        </button>
      </div>
      <FullScreenContainer
        open={chat.activeEntryPoint !== null}
        onClose={handleClose}
        title={customizations.launcher?.title || intl.formatMessage({ id: 'widgetTitle' })}
        isMuted={!chat.isVoiceReadingEnabled}
        onToggleMute={chat.toggleVoiceReading}
        onNewChat={handleNewChat}
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
            <div className='flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
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
