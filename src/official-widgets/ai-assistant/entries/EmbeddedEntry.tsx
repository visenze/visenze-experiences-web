import { type FC, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import ChatComposer from '../../../common/components/chat/ChatComposer';
import ChatWindow from '../../../common/components/chat/ChatWindow';
import FullScreenChatContainer from '../../../common/components/chat/FullScreenChatContainer';
import { deriveTurns } from '../../../common/components/chat/overview/derive-turns';
import TurnSection from '../../../common/components/chat/overview/TurnSection';
import { getChatSessionStore } from '../../../common/components/chat/session/chat-session-registry';
import useChat from '../../../common/components/chat/use-chat';
import Footer from '../../../common/components/Footer';
import { RootContext } from '../../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../../common/types/contexts';
import { Actions } from '../../../common/types/tracking-constants';

export interface EmbeddedEntryProps {
  query: string;
  // `data-pid`: product context for the query and the follow-ups.
  productId?: string;
  // The key of this element's own chat session (see EmbeddedHost); never the shared one.
  sessionKey: string;
  // Scopes the stored session (when persistence is on) to this element's query/product, apart from the shared one's.
  scopeKey: string;
  // Test-only escape hatch (Portal + Shadow DOM is hard to query in RTL/jsdom); never set in production.
  renderWithoutPortal?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
// The ai_assistant `embedded` entry: embedded-shopping-assistant's chat (embedded-shopping-assistant-
// chat.tsx), ported with its own per-element, query-scoped session. It uses only its own `chat`, never the
// shared AssistantSession; its stored conversation lives under a key of its own.
const EmbeddedEntry: FC<EmbeddedEntryProps> = ({ query, productId, sessionKey, scopeKey, renderWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  // Suffixed with the element's own session key: several embedded elements of one placement each have a title.
  const dialogTitleId = `wigmix-embedded-shopping-assistant-title-${appSettings.placementId}-${sessionKey}`;

  // Same customization fields (and the same inline-style pattern) the shopping-assistant widget
  // uses for its icon/CTA colors, so hosts can rebrand this widget's accents the same way.
  const iconColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) || undefined;
  // TurnSection's pre-expansion loading dots. Reads buttons.primary.fontColor/fontColorDark (the
  // send button's *text* color, not its background) — matching how ChatWindow's own post-
  // expansion loading dots are colored (ChatWindow.tsx). Previously this read backgroundColor,
  // which is white in ESA's default config and matched ESA's own white light-mode page background
  // exactly, making the dots invisible; fontColor is chosen for contrast against the page
  // background instead, same as ChatWindow's dots already do.
  const loadingDotColor = (darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor) || undefined;
  // Replaces the previous hardcoded bg-white/dark:bg-neutral-900 on ESA's own page containers —
  // default-config.ts's values were already set to match those exact colors, so this is a pure
  // wiring change with no visible difference unless a host overrides them.
  const backgroundColor = (darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor) || undefined;
  // "See Results" button's text + border (buttons.secondary was previously unused anywhere in
  // ESA) — border matches text color, a standard outline-button convention, rather than adding a
  // separate border-specific field.
  const seeResultsButtonColor = (darkMode ? customizations.buttons?.secondary?.fontColorDark : customizations.buttons?.secondary?.fontColor) || undefined;

  // Mounted here — now ESA's real send path (Step 4) and the source for ChatComposer (Step 5)
  // below. suppressActionTokenCallbacks is intentionally left unset (falsy) so AI-embedded
  // <<ADD_TO_CART>>/<<ADD_TO_WISHLIST>> tokens in the streamed reply also fire the host's
  // onAddToCartToggle/onAddToWishlistToggle callbacks, same as every other useChat() caller —
  // not just a direct click on a rendered ProductCard.
  // storeKey: this element's own session (never the widgetClient's shared one). It is saved and restored
  // like the shared conversation (customizations.chatbot.persistChatEnabled),
  // but under sessionScopeKey's own storage key, so the two never read or overwrite each other.
  // attachVoice is left at its default: this store has no other surface, so it owns its own voice.
  const chat = useChat({ storeKey: sessionKey, sessionScopeKey: scopeKey });
  // Set once, by the mount effect below: whether a stored conversation is being resumed (so the query must
  // not be sent again).
  const resumedRef = useRef(false);

  // This element's own store, tagged so its RESULT_LOAD events carry `entry: 'embedded'`.
  useEffect(() => {
    getChatSessionStore(widgetClient, widgetConfig.initState?.wishlistProductIds || [], sessionKey).setActiveEntry('embedded', productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetClient, sessionKey]);

  // Marks this element's shadow host (root is the .wigmix-shadow-root node inside it) so app.css can give
  // it, and only it, the host element's height via :host([data-wigmix-entry='embedded']). Outside a shadow
  // root (tests), getRootNode() is the document, which has no host: nothing is marked.
  useLayoutEffect(() => {
    const host = (root?.getRootNode() as ShadowRoot | undefined)?.host as HTMLElement | undefined;
    host?.setAttribute('data-wigmix-entry', 'embedded');
    return (): void => host?.removeAttribute('data-wigmix-entry');
  }, [root]);

  // useChat's mount effect has already started a restore if a stored session exists (it sets the chat id
  // at once); otherwise this element starts its own fresh session.
  useEffect(() => {
    const store = getChatSessionStore(widgetClient, widgetConfig.initState?.wishlistProductIds || [], sessionKey);
    resumedRef.current = Boolean(store.getChatId());
    if (!resumedRef.current) {
      chat.open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voice narration starts muted by default (customizations.chatbot?.startMuted, defaulting to
  // true in ESA's own default-config.ts) — mirrors ai-search-launcher.tsx's own startMuted mount
  // effect exactly. From here, the mute button (chat.toggleVoiceReading, already wired below) is
  // a normal toggle — no special first-read behavior.
  useEffect(() => {
    if (customizations.chatbot?.startMuted) {
      chat.toggleVoiceReading();
    }
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
  // The "See Results" button that opens the full-screen surface — TurnSection (which owns the
  // actual <button>) unmounts while isExpanded is true, so unlike ai-search-launcher's own
  // always-mounted entry-bar-button refs, this can't be focused synchronously inside
  // handleCollapse itself; the effect below does it once TurnSection has remounted.
  const seeResultsButtonRef = useRef<HTMLButtonElement>(null);
  // Tracks the previous isExpanded value so the focus-restore effect below only fires on an
  // actual collapse (true -> false), not on the initial mount (which also starts at false).
  const wasExpandedRef = useRef(false);

  // chat.reopen() (not chat.open()) — handleCollapse's chat.close() leaves isOpen false, which
  // silently drops any voice transcript that finalizes afterward (use-chat.ts gates the
  // onTranscript handler on isOpen). open() would also fix that, but it calls resetChatState()
  // and generates a fresh chatId — wrong here, since re-expanding resumes the same live
  // conversation TurnSection was already showing, not a new one.
  const handleShowProducts = (turnId: string): void => {
    chat.reopen();
    setExpandedTurnIds((prev) => new Set(prev).add(turnId));
    setIsExpanded(true);
  };

  useEffect(() => {
    if (wasExpandedRef.current && !isExpanded) {
      seeResultsButtonRef.current?.focus();
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded]);

  // Full-screen header's close button — collapses back to the pre-expansion TurnSection view.
  // Calls chat.close() exactly like ai-search-launcher's own handleClose does for its dialog:
  // aborts any still-in-flight stream and interrupts speech, so a late reply/narration can't
  // keep going after the surface that showed it has already collapsed (chat.close() deliberately
  // skips resetChatState() though, so the conversation itself stays live, same as ai-search-
  // launcher). Also resets expandedTurnIds back to empty: only the initial turn is ever gated
  // (onShowProducts/handleShowProducts can only fire for it — follow-up turns always auto-expand
  // per deriveTurns, and no follow-up turn can exist before "See Results" is clicked anyway,
  // since ChatComposer only mounts post-expansion), so this always restores that turn's "See
  // Results" gate rather than leaving it permanently revealed-but-unrenderable — TurnSection has
  // no product-grid rendering left for the productsExpanded=true state (removed as dead code
  // under the assumption this state was unreachable while TurnSection was mounted, which didn't
  // account for this close path).
  const handleCollapse = (): void => {
    chat.close();
    setIsExpanded(false);
    setExpandedTurnIds(new Set());
  };

  useEffect(() => {
    if (query && !resumedRef.current) {
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
      // Cleared on unmount: unmounted in the same tick, EmbeddedHost has already disposed this store, and
      // the send would start a request on that orphan.
      const timeoutId = setTimeout(() => {
        chat.sendMessage(query, productId ? { pid: productId } : undefined);
      }, 0);
      return (): void => clearTimeout(timeoutId);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A resumed session can turn out to have nothing to restore (e.g. it was reloaded before the first reply
  // finished, so the backend has no history): the restore then clears the chat id. Start from the query then,
  // as a fresh mount would. The restore always raises isWaiting first, which is what tells it from the first render.
  const restoreSeenWaitingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!resumedRef.current) {
      return undefined;
    }
    if (chat.isWaiting) {
      restoreSeenWaitingRef.current = true;
      return undefined;
    }
    if (!restoreSeenWaitingRef.current || chat.chatId || chat.chats.length > 0) {
      return undefined;
    }
    resumedRef.current = false;
    if (!query) {
      return undefined;
    }
    chat.open();
    // Same deferral as the mount send above: it must run after open()'s chat id update has committed.
    // Not cleared by this effect's own cleanup: open() changes its dependencies, which would cancel the send
    // before it fires. The unmount effect below clears it instead.
    fallbackTimerRef.current = setTimeout(() => {
      chat.sendMessage(query, productId ? { pid: productId } : undefined);
    }, 0);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.isWaiting, chat.chatId, chat.chats.length]);
  useEffect(() => (): void => clearTimeout(fallbackTimerRef.current), []);

  if (!root) return <></>;

  // ESA always receives `query` from the host page in practice, but nothing enforces that at
  // runtime (app.tsx falls back to '' when the placement element has no data-query attribute) —
  // this is the explicit, visible fallback for that case rather than an empty/dead screen (no
  // turns ever get created, so nothing below would ever render either).
  if (!query) {
    return (
      <div className='wigmix-embedded-host size-full flex items-center justify-center px-4' style={{ backgroundColor }}>
        <p className='text-sm text-gray-600 dark:text-neutral-400'>
          {intl.formatMessage({ id: 'noQueryProvided' })}
        </p>
      </div>
    );
  }

  return (
    <div className='wigmix-embedded-host size-full flex flex-col' style={{ backgroundColor }}>

      {/* ── Pre-expansion: TurnSection's own Google-AI-Overview rendering, untouched. Gated on
          !isExpanded so it actually unmounts once the full-screen surface opens — without this,
          it stayed mounted underneath FullScreenChatContainer's fixed overlay: visually covered,
          but still present in the DOM/accessibility tree (a real screen-reader/focus-order bug,
          found while writing the mutual-exclusivity test this gate exists to satisfy).
          Only ever the FIRST turn — TurnSection has no rendering path at all for a non-initial
          turn (its header/text/button are every one gated on turn.isInitial), and a follow-up
          turn asked while expanded always gets productsExpanded: true from deriveTurns, so
          mapping over every turn here used to leave nothing but that follow-up turn's own bare
          divider line behind once collapsed back to this view. ─────────────────────────────── */}
      {!isExpanded && turns[0] && (
        <div className='flex-1 overflow-y-auto thin-scrollbar'>
          <div className='max-w-3xl mx-auto p-6'>
            <TurnSection
              turn={turns[0]}
              onShowProducts={() => handleShowProducts(turns[0].id)}
              loadingDotColor={loadingDotColor}
              iconColor={iconColor}
              backgroundColor={backgroundColor}
              seeResultsButtonRef={seeResultsButtonRef}
              seeResultsButtonColor={seeResultsButtonColor}
            />
          </div>
        </div>
      )}

      {/* ── Post-"See Results": the same common/ chat surface ai-search-launcher uses, wired
          directly off ESA's own live `chat` instance — no adapter, chat.chats feeds ChatWindow
          as-is. Mirrors ai-search-launcher.tsx's own FullScreenChatContainer + ChatWindow +
          ChatComposer wiring, INCLUDING the mute/voice-narration toggle (isMuted/onToggleMute/
          showVoiceToggle below) — useChat's real backend narration is now a genuine, intentional
          capability for ESA, gated the same way ai-search-launcher gates it
          (customizations.chatbot?.voiceEnabled, via chat.speechOutputEnabled). Adapted only where
          ESA genuinely differs (widgetName/pwPrefix/ariaLabelledBy, own max-w-3xl column width
          matching ESA's existing convention instead of ai-search-launcher's max-w-[820px]). */}
      <FullScreenChatContainer
        open={isExpanded}
        onClose={handleCollapse}
        title={customizations.chatbot?.title || intl.formatMessage({ id: 'aiOverviewLabel' })}
        isMuted={!chat.isVoiceReadingEnabled}
        onToggleMute={chat.toggleVoiceReading}
        showVoiceToggle={chat.speechOutputEnabled}
        // ESA has no "new chat" entry point — the widget is always tied to the one query it was
        // embedded with, so starting a fresh conversation isn't a meaningful action here the way
        // it is for ai-search-launcher. onNewChat is a required prop on the shared container but
        // unreachable: the button it would trigger never renders while showNewChat is false.
        onNewChat={() => {}}
        showNewChat={false}
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
            hideInitialUserMessage
            scrollAnchor='top'
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

export default EmbeddedEntry;
