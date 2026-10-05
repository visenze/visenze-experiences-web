import { cn } from '@heroui/theme';
import { type FC, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import EntryLogo from './components/EntryLogo';
import ImageEntryScreen from './components/ImageEntryScreen';
import MicEntryScreen from './components/MicEntryScreen';
import SplitLayout from './components/SplitLayout';
import ChatComposer from '../../common/components/chat/ChatComposer';
import ChatWindow from '../../common/components/chat/ChatWindow';
import FullScreenChatContainer from '../../common/components/chat/FullScreenChatContainer';
import useChat, { type Chat } from '../../common/components/chat/use-chat';
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

  // Set synchronously by openEntryPoint — a resumed session already has its real history restored,
  // so replaying the canned entry greeting into that history as another bot bubble would look like
  // a duplicate/non-sequitur message. The welcome screens still show their own greeting text
  // regardless (see greetingText below) — only the "add it to chat.chats" part is skipped here.
  const [isResumedActivation, setIsResumedActivation] = useState(false);

  const countUserMessages = (chats: Chat[]): number => chats.filter((c) => c.author === 'user').length;

  // Baseline count of real, user-authored turns captured at the moment this entry point opened —
  // see showImageWelcome/showMicWelcome below. Counting only 'user' turns (not chats.length
  // generally) because the greeting bubble that lands shortly after opening is 'bot'-authored and
  // must not itself count as "the user already did something".
  const activationUserMessageBaselineRef = useRef(0);

  const openEntryPoint = (entryPoint: EntryPointKey): void => {
    // A truthy chatId means there's a session to resume (from earlier this instance, or restored
    // from localStorage on mount) — reuse it instead of minting a fresh one. Deliberately not
    // scoped per entry point: the three entry points share one underlying conversation, so
    // resuming after closing one and opening another continues that same conversation by design.
    const resuming = Boolean(chat.chatId);
    setIsResumedActivation(resuming);
    activationUserMessageBaselineRef.current = countUserMessages(chat.chats);
    setActiveEntryPoint(entryPoint);

    // Camera/mic never mint (or persist) a chat id just for opening — only Ask AI's greeting is
    // real chat history; camera/mic's own prompt is narration-only (see the greeting effect below)
    // and a session for them shouldn't exist at all until the user actually submits a photo or
    // voice query (use-chat.ts's sendMessage mints the id lazily at that point instead). reopen()
    // is safe to call unconditionally here, resumed or not: it only ever flips isOpen, never
    // chatId/chats.
    if (entryPoint !== 'ai') {
      chat.reopen();
      return;
    }
    if (resuming) {
      chat.reopen();
      return;
    }
    chat.open();
  };

  // Shared greeting resolver — the same customizations.launcher.greetings[entryPoint] string is
  // both narrated (see the effect below) and shown by the entry screens themselves (ImageEntryScreen/
  // MicEntryScreen's own greetingText prop) — this is the single source of truth for which text
  // applies, so there's no risk of the shown and narrated copy ever disagreeing.
  const getGreetingText = (entryPoint: EntryPointKey): string => customizations.launcher?.greetings?.[entryPoint] || '';

  useEffect(() => {
    if (!activeEntryPoint) {
      return;
    }
    if (activeEntryPoint === 'ai') {
      // Ask AI's greeting genuinely opens the conversation — chat.playGreeting shows it as a real
      // bot bubble (and speaks it) exactly once, skipped on resume so a real, already-restored
      // conversation doesn't get a duplicate/non-sequitur greeting appended to it.
      if (!isResumedActivation) {
        chat.playGreeting(getGreetingText('ai'));
      }
      return;
    }
    // Camera/mic's prompt must never become part of chat.chats/persisted history — an abandoned
    // camera or mic screen (opened, nothing submitted, closed) must leave no trace of ever having
    // happened. speakText narrates it without touching chats, and unconditionally (new session or
    // resumed) since this is narration tied to the entry point opening, not to the conversation.
    chat.speakText(getGreetingText(activeEntryPoint));
    // Deliberately keyed only on activeEntryPoint: chat.playGreeting/chat.speakText/getGreetingText
    // are recreated every render (not memoized upstream), and this must fire exactly once per entry
    // point transition, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEntryPoint]);

  const handleNewChat = (): void => {
    chat.newChat();
    activationUserMessageBaselineRef.current = 0;
    setIsResumedActivation(false);
    if (!activeEntryPoint) {
      return;
    }
    if (activeEntryPoint === 'ai') {
      chat.playGreeting(getGreetingText('ai'));
      return;
    }
    chat.speakText(getGreetingText(activeEntryPoint));
  };

  // Image/mic show a dedicated welcome screen — camera capture or voice recording — until a real
  // message has actually been sent *during this activation*. Comparing against the baseline
  // captured in openEntryPoint (not the conversation's all-time `chat.hasStartedChat`) is what lets
  // this screen show again for a resumed session: hasStartedChat is already permanently true once
  // any conversation has ever produced a message, but the point of showing it here is to let the
  // user immediately snap a photo or say something that sends into the resumed conversation,
  // exactly as the fresh-session flow already does, rather than dropping them straight into the
  // full chat surface with no direct capture affordance. Ask AI (spec §5.3) has no dedicated
  // welcome screen and always falls through to the normal chat surface regardless.
  const hasSentInThisActivation = countUserMessages(chat.chats) > activationUserMessageBaselineRef.current;
  const showImageWelcome = activeEntryPoint === 'image' && !hasSentInThisActivation;
  const showMicWelcome = activeEntryPoint === 'mic' && !hasSentInThisActivation;

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

  // The "Ask AI" button shows its text unless a logo is configured; with a logo, `layout`
  // (default ICON) decides whether the text is dropped or placed before/after it. A logo-only
  // button keeps the camera button's 38px height (a 32px-tall logo, a 2px inset and the 1px
  // border); its width follows the logo's aspect ratio, so the inset is even on all sides.
  const askAiEntryIcon = customizations.launcher?.askAiEntryIcon;
  const askAiLayout = askAiEntryIcon?.url ? (askAiEntryIcon.layout || 'ICON') : 'TEXT';
  const isAskAiLogoOnly = askAiLayout === 'ICON';
  const askAiText = intl.formatMessage({ id: 'triggerAskAi' });
  // Configured padding overrides the button's default inset, only when a logo is shown, so the
  // text-only button always keeps the camera/mic buttons' styling.
  const askAiPadding = askAiEntryIcon?.url && askAiLayout !== 'TEXT' ? askAiEntryIcon.padding : undefined;
  const askAiLogo = askAiEntryIcon?.url && askAiLayout !== 'TEXT' && (
    <EntryLogo
      url={askAiEntryIcon.url}
      color={darkMode ? askAiEntryIcon.colorDark : askAiEntryIcon.color}
      height={askAiEntryIcon.height || (isAskAiLogoOnly ? 32 : 22)}
      width={askAiEntryIcon.width}
      className={cn('object-contain', !askAiEntryIcon.width && 'w-auto max-w-[240px]')}
    />
  );

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
            style={{
              color: fontColor,
              paddingLeft: askAiPadding?.x,
              paddingRight: askAiPadding?.x,
              paddingTop: askAiPadding?.y,
              paddingBottom: askAiPadding?.y,
            }}
            className={cn(
              // Same border, background and height as the camera/mic buttons; a logo-only button only
              // swaps the padding for a thin inset so the logo can fill it.
              isAskAiLogoOnly
                ? 'flex min-h-[38px] min-w-[38px] items-center justify-center overflow-hidden rounded-lg border border-gray bg-buttonSecondary p-0.5 shadow-sm'
                : 'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
              askAiLayout === 'ICON_TEXT' || askAiLayout === 'TEXT_ICON' ? 'gap-2' : '',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => openEntryPoint('ai')}
          >
            {askAiLayout === 'TEXT_ICON' && askAiText}
            {askAiLogo}
            {(askAiLayout === 'TEXT' || askAiLayout === 'ICON_TEXT') && askAiText}
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
        {showImageWelcome && <ImageEntryScreen chat={chat} greetingText={getGreetingText('image')} />}
        {showMicWelcome && <MicEntryScreen chat={chat} greetingText={getGreetingText('mic')} />}
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
