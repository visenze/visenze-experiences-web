import { type FC, Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import TopBar from './components/TopBar';
import TurnSection from './components/TurnSection';
import { deriveTurns } from './derive-turns';
import type { EmbeddedShoppingAssistantProps } from './embedded-shopping-assistant';
import ChatComposer from '../../common/components/chat/ChatComposer';
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
const EmbeddedShoppingAssistantChat: FC<EmbeddedShoppingAssistantProps> = ({ query }) => {
  const { widgetConfig, widgetClient, darkMode, locale } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();

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

  // ESA's own local UI state for the "See Results" gate — no UseChatResult equivalent. Keyed by
  // deriveTurns' own stable, position-based turn ids.
  const [expandedTurnIds, setExpandedTurnIds] = useState<Set<string>>(new Set());
  // Wishlist state lives here (not per-turn) so a product marked in one turn still shows as
  // wishlisted if it reappears in a later turn — same lifting pattern as shopping-assistant's
  // ChatWindow.tsx. Deliberately not migrated onto useChat's own wishlistPids/setIsInWishlist:
  // that would require changing TurnSection's setWishlistPids prop contract (a raw
  // Dispatch<SetStateAction<string[]>>) to useChat's differently-shaped setIsInWishlist(pid,
  // bool) — off the table given TurnSection.tsx must stay untouched, and the two
  // implementations are already functionally identical, so there's nothing to gain.
  const [wishlistPids, setWishlistPids] = useState<string[]>(widgetConfig.initState?.wishlistProductIds || []);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
  const { suggestions } = chat;

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (): void => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const handleShowProducts = (turnId: string): void => {
    setExpandedTurnIds((prev) => new Set(prev).add(turnId));
    scrollToBottom();
  };

  const handleChipClick = (suggestion: string): void => {
    chat.sendMessage(suggestion);
  };

  // Client-side only (Web Speech API) — reads the initial turn's AI overview text aloud. There's no
  // backend support for translating/localizing the AI response itself (only this widget's own UI
  // chrome is localized via react-intl), so this always speaks the text in whatever language the
  // backend returned it in.
  const handleToggleReadAloud = (): void => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const overviewText = turns.find((t) => t.isInitial)?.aiText.replace(/\*\*/g, '');
    if (!overviewText) return;
    const utterance = new SpeechSynthesisUtterance(overviewText);
    utterance.lang = locale.replace('_', '-');
    utterance.onend = (): void => setIsSpeaking(false);
    utterance.onerror = (): void => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // "Start over" — this widget is a full-page embedded view, not a dismissible popup and has no
  // homepage to fall back to (ESA always receives its query from the host page), so closing means
  // starting the SAME original query as a fresh conversation rather than landing on empty state.
  const handleReset = (): void => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    // Clears turn-position-keyed expanded state too — without this, a stale id (e.g. '0') left
    // over from the previous conversation would make the new conversation's first turn render as
    // already-expanded, since deriveTurns numbers turns positionally starting from 0 again.
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
  // turns ever get created, so TopBar/ChatComposer below would otherwise never render either).
  if (!query) {
    return (
      <div className='size-full flex items-center justify-center px-4' style={{ backgroundColor }}>
        <p className='text-sm text-gray-500 dark:text-neutral-400'>
          {intl.formatMessage({ id: 'noQueryProvided' })}
        </p>
      </div>
    );
  }

  // ── Results state ─────────────────────────────────────────────────────────
  const resultsExpanded = turns.some((t) => t.productsExpanded);
  // Suggestions parse out of the AI text stream as soon as the markers arrive — often well before
  // the initial turn's "See Results" gate is opened. Hold them back until the latest turn has
  // actually revealed its products, so "next steps" never appears ahead of the results it follows.
  const latestTurn = turns[turns.length - 1];
  const showSuggestions = suggestions.length > 0 && !!latestTurn?.productsExpanded;

  return (
    <div className='size-full flex flex-col' style={{ backgroundColor }}>

      {/* Only shown once results are actually revealed (post "See Results"/auto-expanded follow-ups) —
          not during the initial loading/clamped-preview phase, so it doesn't appear ahead of content. */}
      {resultsExpanded && (
        <TopBar
          iconColor={iconColor}
          isSpeaking={isSpeaking}
          onToggleReadAloud={handleToggleReadAloud}
          onClose={handleReset}
        />
      )}

      <div ref={scrollRef} className='flex-1 overflow-y-auto thin-scrollbar'>
        <div className='max-w-3xl mx-auto p-6'>
          {turns.map((turn, idx) => (
            <Fragment key={turn.id}>
              <TurnSection
                turn={turn}
                showDivider={idx > 0}
                onShowProducts={() => handleShowProducts(turn.id)}
                primaryButtonBg={primaryButtonBg}
                iconColor={iconColor}
                wishlistPids={wishlistPids}
                setWishlistPids={setWishlistPids}
              />
            </Fragment>
          ))}

          {/* "Next steps" for the whole conversation — a single footer tied to the latest turn's
              response, not the past turn it came from. Cleared the instant a new turn starts
              (see use-chat.ts's sendMessage), so it always renders directly below the newest
              results and never lingers once a chip has been acted on. */}
          {showSuggestions && (
            <div className='flex flex-wrap gap-2 mt-2'>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type='button'
                  onClick={() => handleChipClick(suggestion)}
                  className='px-4 py-1.5 text-sm rounded-full border bg-white dark:bg-neutral-800 border-gray-300
                    dark:border-neutral-700 text-gray-700 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-neutral-700
                    hover:border-gray-400 dark:hover:border-neutral-600 cursor-pointer transition-colors'
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {customizations.generalLayout?.showViSenzeLogo && (
            <Footer darkMode={darkMode} className='pt-4' dataPw='esa-visenze-footer' />
          )}
        </div>
      </div>

      {/* Real ChatComposer (Step 5) — manages its own text value (chat.message), send gating
          (chat.allowUserInput), and camera/upload menu + mic entirely off the real `chat`
          instance; no onSend/onImageSelected override needed since chat.sendMessage is already
          ESA's real send path (Step 4) and its default behavior is exactly what ESA needs. */}
      {resultsExpanded && (
        <ChatComposer
          chat={chat}
          chatInputRef={chatInputRef}
          chatCameraEnabled
        />
      )}

    </div>
  );
};

export default EmbeddedShoppingAssistantChat;
