import { type FC, Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import TurnSection from './components/TurnSection';
import { deriveTurns } from './derive-turns';
import type { EmbeddedShoppingAssistantProps } from './embedded-shopping-assistant';
import ChatComposer from '../../common/components/chat/ChatComposer';
import ChatWindow from '../../common/components/chat/ChatWindow';
import FullScreenChatContainer from '../../common/components/chat/FullScreenChatContainer';
import useChat from '../../common/components/chat/use-chat';
import Footer from '../../common/components/Footer';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import { Actions } from '../../common/types/tracking-constants';

// ── Component ─────────────────────────────────────────────────────────────────
// Rendered by EmbeddedShoppingAssistant inside a nested WidgetDataContext.Provider with
// `callbacks` overridden to `{}` (see that file's Step 2 comment) — this component's own
// useContext(WidgetDataContext) reads see that neutered value too, which is safe: nothing here
// reads widgetConfig.callbacks directly, only useChat() does internally.
const EmbeddedShoppingAssistantChat: FC<EmbeddedShoppingAssistantProps> = ({ query, renderWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const dialogTitleId = `wigmix-embedded-shopping-assistant-title-${appSettings.placementId}`;

  // Same customization fields (and the same inline-style pattern) the shopping-assistant widget
  // uses for its icon/CTA colors, so hosts can rebrand this widget's accents the same way.
  const iconColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) || undefined;
  // Still needed for TurnSection's own loading-dots color below — ChatComposer's send button no
  // longer reads this (see the ChatComposer wiring note further down).
  const primaryButtonBg = (darkMode ? customizations.buttons?.primary?.backgroundColorDark : customizations.buttons?.primary?.backgroundColor) || undefined;
  // Replaces the previous hardcoded bg-white/dark:bg-neutral-900 on ESA's own page containers —
  // default-config.ts's values were already set to match those exact colors, so this is a pure
  // wiring change with no visible difference unless a host overrides them.
  const backgroundColor = (darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor) || undefined;

  // Mounted here, inside the Step 2 isolation boundary — now ESA's real send path (Step 4) and
  // the source for ChatComposer (Step 5) below.
  const chat = useChat();

  // Permanently disables useChat's backend-narration path (paced typewriter reveal +
  // per-sentence TTS synthesis) so simply mounting the hook doesn't introduce any new automatic
  // reply narration ESA never had. Mirrors ai-search-launcher's own startMuted pattern
  // (`chat.toggleVoiceReading()`), but unconditional rather than config-gated, since ESA's
  // read-aloud stays entirely on its own separate window.speechSynthesis path (untouched).
  // Verified: `isVoiceReadingEnabled`/`voiceReadingEnabledRef` (use-voice-reply.ts) are written
  // to nowhere else but toggleVoiceReading() itself, so this one mount-time call keeps narration
  // inert for the component's whole lifetime.
  useEffect(() => {
    chat.toggleVoiceReading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populates useChat's internal chatId once, at mount, before any send can possibly fire —
  // chat.sendMessage always reads this closed-over state; there's no override param and no way
  // to set it from outside the hook. Every interactive send path below (search button, chips,
  // bottom bar, voice) is triggered by a later, separate user event, well after this mount
  // commit has settled, so none of them need special handling. Only the query-prop auto-search
  // effect further down does — see its comment for why.
  useEffect(() => {
    chat.open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESA's own local UI state for the "See Results" gate, pre-expansion only — no UseChatResult
  // equivalent. Keyed by deriveTurns' own stable, position-based turn ids. Also doubles as the
  // memory of "has this conversation already been revealed" so that closing back out of the
  // full-screen view (see handleCollapse below) doesn't re-hide products TurnSection already
  // showed once — deriveTurns re-derives from the same live chat.chats either way.
  const [expandedTurnIds, setExpandedTurnIds] = useState<Set<string>>(new Set());
  // "See Results" now enters ChatWindow inside FullScreenChatContainer directly (Option A — the
  // only pattern ai-search-launcher itself actually uses; there's no inline/non-modal ChatWindow
  // usage anywhere to mirror instead).
  const [isExpanded, setIsExpanded] = useState(false);

  const turns = deriveTurns(
    chat.chats,
    {
      isWaiting: chat.isWaiting,
      streamingProducts: chat.streamingProducts,
      streamingRequestId: chat.streamingRequestId,
      typewriterText: chat.typewriterText,
    },
    expandedTurnIds,
  );

  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleShowProducts = (turnId: string): void => {
    setExpandedTurnIds((prev) => new Set(prev).add(turnId));
    setIsExpanded(true);
  };

  // Full-screen header's close button — collapses back to the pre-expansion TurnSection view
  // without touching chat state at all (no chat.close()/chat.newChat()), so the conversation
  // stays live exactly as ai-search-launcher's own close() does for its dialog (use-chat.ts's
  // close() deliberately skips resetChatState() for the same reason).
  const handleCollapse = (): void => {
    setIsExpanded(false);
  };

  // Full-screen header's "new chat" button — the only remaining reset entry point now that
  // TopBar.tsx (and its close/reset button) is gone. Mirrors ai-search-launcher's own
  // handleNewChat (chat.newChat() + replay), except ESA replays the original query instead of a
  // configured greeting, matching this widget's previous handleReset behavior exactly.
  const handleNewChat = (): void => {
    // Clears turn-position-keyed expanded state too — without this, a stale id (e.g. '0') left
    // over from the previous conversation would make the new conversation's first turn render as
    // already-expanded if the user later collapses back to TurnSection, since deriveTurns numbers
    // turns positionally starting from 0 again.
    setExpandedTurnIds(new Set());
    // Resets chat.chats/breadcrumbs/etc AND regenerates a fresh internal chatId for the next
    // conversation — the useChat-side equivalent of the old chatIdRef.current = '' reset. Note
    // chat.newChat() does not clear chat.message itself (matches ai-search-launcher's own
    // handleNewChat, which has the same characteristic) — not something introduced here.
    chat.newChat();
    if (query) {
      widgetClient.sendEvent(Actions.LOAD, {});
      // Same chatId race as the mount effect below (newChat() populates chatId via the identical
      // async generateUuid->setChatId path as open()) — deferred for the same reason: sendMessage
      // must not close over the stale, pre-newChat chatId.
      setTimeout(() => {
        chat.sendMessage(query);
      }, 0);
    }
  };

  useEffect(() => {
    if (query) {
      widgetClient.sendEvent(Actions.LOAD, {});
      // Deferred to a separate macrotask, guaranteed to run only after the chat.open() mount
      // effect above has committed its setChatId update. generateUuid itself resolves
      // synchronously (verified by reading the SDK: visenze-tracking-javascript's
      // session-manager.ts generateUUID() is a plain Date+Math.random() computation, no network
      // call, no promise) — but that doesn't help here: React doesn't re-render mid-effect-flush,
      // so if this ran in the SAME commit as open()'s effect, chat.sendMessage would still close
      // over the stale, pre-open chatId (and that empty value would then persist silently for the
      // rest of the conversation, since useChat never re-derives chatId from the backend's own
      // response). The interactive send paths above don't need this — they're all triggered by
      // later, separate user events, well after the mount commit has settled.
      setTimeout(() => {
        chat.sendMessage(query);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!root) return <></>;

  // ESA always receives `query` from the host page in practice, but nothing enforces that at
  // runtime (app.tsx falls back to '' when the placement element has no data-query attribute) —
  // this is the explicit, visible fallback for that case rather than an empty/dead screen (no
  // turns ever get created, so nothing below would ever render either).
  if (!query) {
    return (
      <div className='size-full flex items-center justify-center px-4' style={{ backgroundColor }}>
        <p className='text-sm text-gray-500 dark:text-neutral-400'>
          {intl.formatMessage({ id: 'noQueryProvided' })}
        </p>
      </div>
    );
  }

  return (
    <div className='size-full flex flex-col' style={{ backgroundColor }}>

      {/* ── Pre-expansion: TurnSection's own Google-AI-Overview rendering, untouched. Gated on
          !isExpanded so it actually unmounts once the full-screen surface opens — without this,
          it stayed mounted underneath FullScreenChatContainer's fixed overlay: visually covered,
          but still present in the DOM/accessibility tree (a real screen-reader/focus-order bug,
          found while writing the mutual-exclusivity test this gate exists to satisfy). ────────── */}
      {!isExpanded && (
        <div className='flex-1 overflow-y-auto thin-scrollbar'>
          <div className='max-w-3xl mx-auto p-6'>
            {turns.map((turn, idx) => (
              <Fragment key={turn.id}>
                <TurnSection
                  turn={turn}
                  showDivider={idx > 0}
                  onShowProducts={() => handleShowProducts(turn.id)}
                  primaryButtonBg={primaryButtonBg}
                  iconColor={iconColor}
                />
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── Post-"See Results": the same common/ chat surface ai-search-launcher uses, wired
          directly off ESA's own live `chat` instance — no adapter, chat.chats feeds ChatWindow
          as-is. Mirrors ai-search-launcher.tsx's own FullScreenChatContainer + ChatWindow +
          ChatComposer wiring; adapted only where ESA genuinely differs (widgetName/pwPrefix/
          ariaLabelledBy, no mute since ESA's read-aloud has no equivalent slot here and is
          dropped post-expansion per the accepted tradeoff, own max-w-3xl column width matching
          ESA's existing convention instead of ai-search-launcher's max-w-[820px]). */}
      <FullScreenChatContainer
        open={isExpanded}
        onClose={handleCollapse}
        title={customizations.chat?.title || intl.formatMessage({ id: 'aiOverviewLabel' })}
        isMuted={false}
        onToggleMute={() => {}}
        showVoiceToggle={false}
        onNewChat={handleNewChat}
        showNewChat
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
        widgetName='embedded-shopping-assistant'
        ariaLabelledBy={dialogTitleId}
        renderWithoutPortal={renderWithoutPortal}
      >
        <div className='mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col'>
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
            pwPrefix='esa'
          />
        </div>
        {customizations.generalLayout?.showViSenzeLogo && (
          <Footer darkMode={darkMode} className='pt-4' dataPw='esa-visenze-footer' />
        )}
        <ChatComposer
          chat={chat}
          chatInputRef={chatInputRef}
          chatCameraEnabled
        />
      </FullScreenChatContainer>

    </div>
  );
};

export default EmbeddedShoppingAssistantChat;
