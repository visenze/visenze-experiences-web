import { type FC, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useIntl } from 'react-intl';
import ChatTitle from './components/ChatTitle';
import ChatComposer from '../../common/components/chat/ChatComposer';
import ChatDrawerScreen from '../../common/components/chat/ChatDrawerScreen';
import ChatWindow from '../../common/components/chat/ChatWindow';
import ImageEntryScreen from '../../common/components/chat/entry-screens/ImageEntryScreen';
import MicEntryScreen from '../../common/components/chat/entry-screens/MicEntryScreen';
import FullScreenChatContainer from '../../common/components/chat/FullScreenChatContainer';
import { getChatSessionStore } from '../../common/components/chat/session/chat-session-registry';
import type { EntryPointKey } from '../../common/components/chat/session/chat-session-store';
import SplitLayout from '../../common/components/chat/SplitLayout';
import useChat, { type Chat } from '../../common/components/chat/use-chat';
import { getWelcomeSpokenGreeting, isWelcomeEnabled } from '../../common/components/chat/WelcomeBlock';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { useHidePageBehindModal, useReturnFocusOnClose } from '../../common/components/hooks/use-modal-a11y';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';

export interface AssistantSurfaceProps {
  // Test-only escape hatch (Portal + Shadow DOM is hard to query in RTL/jsdom); never set in production.
  renderWithoutPortal?: boolean;
}

const countUserMessages = (chats: Chat[]): number => chats.filter((c) => c.author === 'user').length;

// The one chat surface shared by every entry trigger of the ai_assistant widget, mounted by the init
// flow in its own root on document.body (once per client), independent of the entry roots. The store's
// surfaceMode picks the container: the side drawer (launcher / prompt-box entries) or the full-screen
// chat with its split view (search-bar entry). Entry points open it through the shared ChatSessionStore.
const AssistantSurface: FC<AssistantSurfaceProps> = ({ renderWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  // Persistence follows customizations.chatbot.persistChatEnabled, like EntryHost's useChat on the same shared store.
  const chat = useChat();
  // useChat does not expose hide()/closeSurface() or the surface mode, hence the direct registry lookup.
  const store = useMemo(
    () => getChatSessionStore(widgetClient, widgetConfig.initState?.wishlistProductIds || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgetClient],
  );
  const { surfaceMode, activation } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const isFullscreenOpen = surfaceMode === 'fullscreen' && chat.isOpen;
  const isDrawerOpen = surfaceMode === 'drawer' && chat.isOpen;
  const titleId = `wigmix-ai-assistant-title-${appSettings.placementId}`;
  const fullscreenTitleId = `wigmix-ai-assistant-fullscreen-title-${appSettings.placementId}`;
  // Both containers are modal: the host page is hidden from assistive technology while one is open, and focus
  // goes back to what opened it (a launcher or search-bar button) when it closes.
  useHidePageBehindModal(isDrawerOpen, titleId, root);
  useHidePageBehindModal(isFullscreenOpen, fullscreenTitleId, root);
  useReturnFocusOnClose(chat.isOpen);

  useEffect(() => {
    if (customizations.chatbot?.startMuted) {
      chat.toggleVoiceReading();
    }
    // Mount-only: a one-time initial-mute preference. Applied here, by the voice-owning surface, and
    // nowhere else — the voice-reading state belongs to this surface's useChat (the one whose voice
    // bridge the store uses); toggling it from an entry root would not mute the drawer's narration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared greeting resolver — the same customizations.aiAssistant.searchBar.greetings[entryPoint]
  // string is both narrated (see the effect below) and shown by the entry screens themselves, so the
  // shown and narrated copy never disagree.
  const getGreetingText = (entryPoint: EntryPointKey): string => customizations.aiAssistant?.searchBar?.greetings?.[entryPoint] || '';

  // With the structured welcome (customizations.chatbot.welcomeScreen) on, ChatWindow renders it instead
  // of the canned 'ai' greeting; the welcome's own optional message is narration only (speakText
  // never touches chat history).
  const playAiGreeting = (): void => {
    const welcome = customizations.chatbot?.welcomeScreen;
    if (isWelcomeEnabled(welcome)) {
      chat.speakText(getWelcomeSpokenGreeting(welcome));
    } else {
      chat.playGreeting(getGreetingText('ai'));
    }
  };

  // The activation already in the store when this surface mounted (e.g. the surface moved to a fresh
  // root while a full-screen chat was open) was greeted by the previous mount; it is not replayed.
  const mountActivationRef = useRef(activation);

  useEffect(() => {
    if (!activation || activation === mountActivationRef.current) {
      return;
    }
    if (activation.entryPoint === 'ai') {
      // Ask AI's greeting genuinely opens the conversation (a real bot bubble), skipped on resume so a
      // restored conversation doesn't get a duplicate greeting appended to it.
      if (!activation.isResumed) {
        playAiGreeting();
      }
      return;
    }
    // Camera/mic's prompt is narration only: it never enters chat.chats, and is spoken on every
    // opening (new session or resumed).
    chat.speakText(getGreetingText(activation.entryPoint));
    // Keyed only on the entry point: it must fire once per entry point opening, not on every render
    // (chat.playGreeting/chat.speakText are not memoized upstream).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activation?.entryPoint]);

  const handleNewChat = (): void => {
    chat.newChat();
    store.resetActivation(0);
    const entryPoint = activation?.entryPoint;
    if (!entryPoint) {
      return;
    }
    if (entryPoint === 'ai') {
      playAiGreeting();
      return;
    }
    chat.speakText(getGreetingText(entryPoint));
  };

  // Image/mic show their welcome screen (camera capture / voice recording) until a real message is
  // sent during THIS activation — compared against the user-turn count captured when it opened, so a
  // resumed conversation shows it again. Ask AI has no welcome screen.
  const hasSentInThisActivation = countUserMessages(chat.chats) > (activation?.userMessageBaseline ?? 0);
  const showImageWelcome = activation?.entryPoint === 'image' && !hasSentInThisActivation;
  const showMicWelcome = activation?.entryPoint === 'mic' && !hasSentInThisActivation;

  // `splitlayout` engages only above the mobile breakpoint AND once the conversation has results to
  // show; otherwise (and always for `chatlayout`) the single-column chat renders.
  const showSplit = customizations.chatbot?.layout === 'splitlayout'
    && breakpoint !== WidgetBreakpoint.MOBILE
    && (chat.breadcrumbs.length > 0 || chat.streamingProducts.length > 0);

  // Focuses the full-screen chat input once the chat (not a welcome screen) is visible — covers Ask AI
  // opening straight into chat and a welcome screen flipping off after the first message.
  useEffect(() => {
    if (!isFullscreenOpen || showImageWelcome || showMicWelcome) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      chatInputRef.current?.focus();
    }, 0);
    return (): void => window.clearTimeout(timeoutId);
  }, [isFullscreenOpen, activation?.entryPoint, showImageWelcome, showMicWelcome]);

  if (!root) return <></>;

  const chatCameraEnabled = customizations.aiAssistant?.searchBar?.chatCameraEnabled !== false;
  // One title for both containers (drawer and full screen): aiAssistant.chatTitle, then chatbot.title,
  // then the widget's default widgetTitle text.
  const titleText = customizations.aiAssistant?.chatTitle?.trim() || customizations.chatbot?.title || intl.formatMessage({ id: 'widgetTitle' });
  const titleIcon = customizations.aiAssistant?.chatTitleIcon;
  const title = (
    <ChatTitle
      text={titleText}
      logoUrl={titleIcon?.url}
      logoColor={darkMode ? titleIcon?.colorDark : titleIcon?.color}
      logoHeight={titleIcon?.height}
      logoWidth={titleIcon?.width}
      layout={titleIcon?.layout}
      fontSize={customizations.aiAssistant?.chatTitleFontSize}
    />
  );
  const fullscreen = surfaceMode === 'fullscreen' && (
    <FullScreenChatContainer
      open={chat.isOpen}
      // Unlike the drawer's hide(), closing the full screen aborts the in-flight stream (as the
      // standalone launcher did) and runs the opening entry's onClosed; the chats are kept.
      onClose={() => store.closeSurface()}
      title={title}
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
      widgetName='ai-assistant'
      ariaLabelledBy={fullscreenTitleId}
      renderWithoutPortal={renderWithoutPortal}
      fullWidth={showSplit}
    >
      {showImageWelcome && <ImageEntryScreen chat={chat} greetingText={getGreetingText('image')} />}
      {showMicWelcome && (
        <MicEntryScreen
          chat={chat}
          greetingText={getGreetingText('mic')}
          maxDurationSeconds={customizations.aiAssistant?.searchBar?.voiceRecordingMaxDurationSeconds}
        />
      )}
      {!showImageWelcome && !showMicWelcome && showSplit && (
        <SplitLayout
          chat={chat}
          chatCameraEnabled={chatCameraEnabled}
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
            chatCameraEnabled={chatCameraEnabled}
          />
        </>
      )}
    </FullScreenChatContainer>
  );

  const iconColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) || undefined;
  const backgroundColor = (darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor) || undefined;
  // Hide, don't chat.close(): closing aborts the in-flight stream, and reopening continues the same conversation.
  const hide = (): void => store.hide();

  // The drawer stays mounted in both modes and is only opened in drawer mode: ViSenzeModal writes its
  // own saved body overflow when it mounts, so remounting it on every mode switch would clobber the host
  // page's inline overflow that the full screen just restored.
  // The full screen comes AFTER the drawer: effect setups run in tree order, so on a drawer -> full screen
  // switch the drawer first restores the host's overflow, and only then does the full screen save it and
  // lock the page (both are portaled in production, so this order does not affect the DOM).
  return (
    <>
      <ViSenzeModal
        open={chat.isOpen && surfaceMode === 'drawer'}
        layout={breakpoint}
        onClose={hide}
        position={customizations.aiAssistant?.chatPosition || customizations.popup?.position || 'right'}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        placementId={`${appSettings.placementId}`}
        idSuffix='ai-assistant'
        ariaLabelledBy={titleId}
        shouldReturnFocusAfterClose={false}
        renderWithoutPortal={!!renderWithoutPortal}
      >
        <ChatDrawerScreen
          chat={chat}
          chatInputRef={chatInputRef}
          title={title}
          titleId={titleId}
          onClose={hide}
          iconColor={iconColor}
          backgroundColor={backgroundColor}
        />
      </ViSenzeModal>
      {fullscreen}
    </>
  );
};

export default AssistantSurface;
