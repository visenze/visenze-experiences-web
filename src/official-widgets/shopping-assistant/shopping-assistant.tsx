import { cn } from '@heroui/theme';
import { type FC, type ReactElement, type PointerEvent as ReactPointerEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import FloatingHeader from './components/FloatingHeader';
import FloatingLauncherButton from './components/FloatingLauncherButton';
import NewChatIcon from './icons/NewChatIcon';
import ChatComposer from '../../common/components/chat/ChatComposer';
import ChatWindow from '../../common/components/chat/ChatWindow';
import useChat, { type UseChatResult } from '../../common/components/chat/use-chat';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useDraggableCorner, { type FloatingCorner } from '../../common/components/hooks/use-draggable-corner';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import { FOCUS_VISIBLE_CLASSES } from '../../common/constants';
import CloseIcon from '../../common/icons/CloseIcon';
import PlusCircleIcon from '../../common/icons/PlusCircleIcon';
import SpeakerIcon from '../../common/icons/SpeakerIcon';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImageOrPid } from '../../common/types/image';
import type { WidgetConfig } from '../../common/wigmix-core';

// Narrowest-wins ordering used to reconcile the window's real breakpoint with the one implied by
// the floating card's own fixed width (see productGridBreakpoint below) — whichever is narrower
// governs the product grid's column count.
const BREAKPOINT_NARROWNESS = [WidgetBreakpoint.MOBILE, WidgetBreakpoint.TABLET, WidgetBreakpoint.DESKTOP];
const narrowerBreakpoint = (a: WidgetBreakpoint, b: WidgetBreakpoint): WidgetBreakpoint => (
  BREAKPOINT_NARROWNESS.indexOf(a) <= BREAKPOINT_NARROWNESS.indexOf(b) ? a : b
);
// Given a width in pixels, which breakpoint bucket that width itself falls into, using the same
// mobile/tablet maxWidth thresholds useBreakpoint() reads off the window.
const widthToBreakpoint = (width: number, breakpoints: WidgetConfig['customizations']['breakpoints']): WidgetBreakpoint => {
  if (breakpoints?.mobile?.maxWidth !== undefined && width <= breakpoints.mobile.maxWidth) {
    return WidgetBreakpoint.MOBILE;
  }
  if (breakpoints?.tablet?.maxWidth !== undefined && width <= breakpoints.tablet.maxWidth) {
    return WidgetBreakpoint.TABLET;
  }
  return WidgetBreakpoint.DESKTOP;
};
// The floating card renders near full-screen on mobile (see modal.scss), so dragging it there
// wouldn't add much — only desktop/tablet get a draggable card. Exported as a pure predicate so
// it's directly unit-testable: useBreakpoint() itself can't be driven to MOBILE in this test
// suite (jest-setup.ts's window.matchMedia mock is captured once by react-responsive's underlying
// matchmediaquery library and always reports no match, regardless of window.innerWidth).
export const isCardDraggingEnabled = (isFloating: boolean, breakpoint: WidgetBreakpoint): boolean => (
  isFloating && breakpoint !== WidgetBreakpoint.MOBILE
);

// Maps the docked-layout `popup.position` setting onto a starting corner for the floating card/
// launcher bubble, so the setting still has an effect when layout is 'floating' instead of being
// silently ignored. 'center' has no corner equivalent and falls back to the same bottom-right
// default used previously.
export const initialFloatingCorner = (position: 'left' | 'center' | 'right' | undefined): FloatingCorner => (
  position === 'left' ? 'bottom-left' : 'bottom-right'
);

interface ShoppingAssistantProps {
  renderModalWithoutPortal?: boolean;
}

const ShoppingAssistant: FC<ShoppingAssistantProps> = ({ renderModalWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const [dialogVisible, setDialogVisible] = useState(false);
  const root = useContext(RootContext);
  const breakpoint = useBreakpoint();
  const [widgetOpenTrigger, setWidgetOpenTrigger] = useState(0);
  const [sendChatTrigger, setSendChatTrigger] = useState<[string, SearchImageOrPid | undefined]>();
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();
  const dialogTitleId = `wigmix-shopping-assistant-title-${appSettings.placementId}`;
  const layout = customizations.popup?.layout || 'docked';
  const isFloating = layout === 'floating';
  // The floating card renders at a fixed configured width (default 380px) regardless of how wide
  // the window is, so useBreakpoint()'s window-based result would otherwise pick the desktop/
  // tablet product grid even though the card itself is mobile-sized. Reconcile by taking whichever
  // of the window's real breakpoint and the card's own width-derived breakpoint is narrower — at a
  // real mobile window the card already renders near-full-width (see modal.scss), so the window's
  // own 'mobile' breakpoint still wins there unchanged.
  const productGridBreakpoint = isFloating
    ? narrowerBreakpoint(breakpoint, widthToBreakpoint(customizations.popup?.floating?.width || 380, customizations.breakpoints))
    : undefined;

  // Shared between the launcher bubble and the open card (see useDraggableCorner) so dragging
  // either one to a corner is where the other appears next — the card only drags on desktop/
  // tablet since it renders near full-screen on mobile (see modal.scss), where dragging wouldn't
  // add much.
  const [floatingCorner, setFloatingCorner] = useState<FloatingCorner>(
    () => initialFloatingCorner(customizations.popup?.position),
  );
  const cardDragEnabled = isCardDraggingEnabled(isFloating, breakpoint);
  const cardDrag = useDraggableCorner({
    corner: floatingCorner,
    onCornerChange: setFloatingCorner,
    size: {
      width: customizations.popup?.floating?.width || 380,
      height: customizations.popup?.floating?.height || 580,
    },
    enabled: cardDragEnabled,
  });
  // The card's drag handle is its whole surface, but real interactive controls (header/composer
  // buttons, the chat input, product links) must keep working — only pointerdowns starting
  // outside of those begin a drag.
  const handleCardPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!cardDragEnabled) {
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]')) {
      return;
    }
    cardDrag.dragHandlers.onPointerDown(e);
  }, [cardDragEnabled, cardDrag.dragHandlers]);

  const openingMessages = [
    intl.formatMessage({ id: 'openingMessage1' }),
    intl.formatMessage({ id: 'openingMessage2' }),
  ];

  const chat = useChat();

  // Preserves this widget's scripted two-part opening (openingMessage1 shown at ~2s,
  // openingMessage2 at ~4s, input disabled throughout) on top of useChat's open()/newChat(),
  // which reset chat state (including allowUserInput) synchronously and have no staggered-reveal
  // concept of their own — only a single-string playGreeting.
  const [isOpening, setIsOpening] = useState(false);
  const playOpeningSequence = (): void => {
    setIsOpening(true);
    window.setTimeout(() => {
      chat.playGreeting(openingMessages[0]);
      window.setTimeout(() => {
        chat.playGreeting(openingMessages[1]);
        setIsOpening(false);
      }, 2000);
    }, 2000);
  };

  // A local override on top of the live chat instance, disabling ChatComposer's input for the
  // duration of the scripted opening sequence above — chat.allowUserInput alone already flips
  // true as soon as open()/newChat() resets state, well before the opening messages finish.
  const composerChat: UseChatResult = { ...chat, allowUserInput: chat.allowUserInput && !isOpening };

  const closeDialog = useCallback((): void => {
    setDialogVisible(false);
    chat.close();
    // Deferred: in floating mode the launcher bubble is conditionally rendered on !dialogVisible
    // (see the trigger button below), so it only remounts once this state update's re-render
    // commits — triggerButtonRef.current is still null at this exact point otherwise. A macrotask
    // runs after that commit, same technique already used for the input auto-focus effect below.
    // Harmless no-op timing difference for docked mode, whose trigger button is always mounted.
    window.setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 0);
  }, []);

  const openDialog = (): void => {
    if (dialogVisible) {
      return;
    }
    setDialogVisible(true);
    chat.open();
    playOpeningSequence();
  };

  const newChat = (): void => {
    chat.newChat();
    playOpeningSequence();
  };

  const onChatButtonClick = useCallback((): void => {
    setWidgetOpenTrigger(Math.random());
  }, []);

  const getScreen = (): ReactElement => (
      <div aria-label={intl.formatMessage({ id: 'widgetTitle' })}
        className='flex h-full flex-col bg-white dark:bg-neutral-700 border-x border-neutral-300 dark:border-neutral-800'
        data-testid={cardDragEnabled ? 'wigmix-floating-card-drag-surface' : undefined}
        onPointerDown={cardDragEnabled ? handleCardPointerDown : undefined}
        onPointerMove={cardDragEnabled ? cardDrag.dragHandlers.onPointerMove : undefined}
        onPointerUp={cardDragEnabled ? cardDrag.dragHandlers.onPointerUp : undefined}
        onPointerCancel={cardDragEnabled ? cardDrag.dragHandlers.onPointerCancel : undefined}>
        {isFloating ? (
          <FloatingHeader
            darkMode={darkMode}
            customizations={customizations}
            chat={chat}
            onNewChat={newChat}
            onMinimize={closeDialog}
            titleId={dialogTitleId}
          />
        ) : (
          <div className='flex w-full py-4 justify-between shadow'>
            <h2 id={dialogTitleId}
              className='wigmix-widget-title flex items-center gap-2 px-4 m-0'
              style={{ color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor }}
            >
              {intl.formatMessage({ id: 'widgetTitle' })}
            </h2>

            <div className='flex items-center gap-2 pe-4'>
              {chat.speechOutputEnabled && (
                <button
                  type='button'
                  aria-label={intl.formatMessage({
                    id: chat.isVoiceReadingEnabled ? 'a11yDisableVoiceReading' : 'a11yEnableVoiceReading',
                  })}
                  aria-pressed={chat.isVoiceReadingEnabled}
                  className={cn(
                    'p-0 bg-transparent border-0',
                    FOCUS_VISIBLE_CLASSES,
                  )}
                  onClick={chat.toggleVoiceReading}
                >
                  <SpeakerIcon
                    muted={!chat.isVoiceReadingEnabled}
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
                title={intl.formatMessage({ id: 'a11yStartNewChat' })}
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
                title={intl.formatMessage({ id: 'a11yCloseShoppingAssistant' })}
                className={cn('p-0 bg-transparent border-0', FOCUS_VISIBLE_CLASSES)}
                onClick={closeDialog}>
                <CloseIcon className='size-6 cursor-pointer'
                  color={darkMode
                    ? (customizations.generalLayout?.fontColorDark || '')
                    : (customizations.generalLayout?.fontColor || '')} />
              </button>
            </div>
          </div>
        )}
        <ChatWindow isWaiting={isOpening || chat.isWaiting}
                    chats={chat.chats}
                    latestMessage={chat.typewriterText}
                    suggestions={chat.suggestions}
                    streamingProducts={chat.streamingProducts}
                    streamingRequestId={chat.streamingRequestId}
                    focusedProductId={chat.focusedProductId}
                    showAllSuggestions={chat.showAllSuggestions}
                    setShowAllSuggestions={chat.setShowAllSuggestions}
                    sendMessage={chat.sendMessage}
                    wishlistPids={chat.wishlistPids}
                    setIsInWishlist={chat.setIsInWishlist}
                    pwPrefix='sa'
                    productGridBreakpoint={productGridBreakpoint} />
        <ChatComposer
          chat={composerChat}
          chatInputRef={chatInputRef}
          chatCameraEnabled
        />
        {isFloating && customizations.generalLayout?.showViSenzeLogo && (
          <Footer darkMode={darkMode} className='pb-2' dataPw='shopping-assistant-floating-footer' />
        )}
      </div>
  );

  useEffect(() => {
    // react-modal grabs focus onto its own content wrapper right after mount (based on
    // document.activeElement, which can't see into the widget's Shadow DOM so it always thinks
    // nothing is focused yet). A same-tick focus call here loses that race. Deferring to a
    // macrotask runs after react-modal's own focus handling has settled, so this call wins.
    const timeoutId = window.setTimeout(() => {
      const input = chatInputRef.current;
      input?.focus();
      // Chromium-family browsers can accept a programmatic focus() call (typing already works)
      // without ever painting the blinking caret, until something forces a repaint — a real user
      // click does that; a bare focus() sometimes doesn't. Nudging the selection range forces the
      // same repaint the browser would do for a real click, without changing what's selected.
      input?.setSelectionRange(input.value.length, input.value.length);
    }, 0);
    return (): void => window.clearTimeout(timeoutId);
  }, [dialogVisible]);

  useEffect(() => {
    if (widgetOpenTrigger) {
      openDialog();
    }
  }, [widgetOpenTrigger]);

  useEffect(() => {
    if (sendChatTrigger) {
      setDialogVisible(true);
      chat.sendMessage(sendChatTrigger[0], sendChatTrigger[1]);
    }
  }, [sendChatTrigger]);

  useEffect(() => {
    widgetClient.registerWidgetOpener(() => {
      setWidgetOpenTrigger(Math.random());
    });
    widgetClient.registerWidgetCloser(() => {
      closeDialog();
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
        {isFloating ? (
          // Only rendered while the card is closed — the launcher bubble and the open card are
          // both fixed to the same bottom-right corner (see modal.scss's floating-card CSS), so
          // keeping the bubble mounted underneath an open card let it intercept clicks meant for
          // the composer's controls in that same corner (root cause of the "click doesn't focus
          // the input" report).
          !dialogVisible && (
            <FloatingLauncherButton ref={triggerButtonRef}
                              config={customizations.popup}
                              text={intl.formatMessage({ id: 'triggerCTA' })}
                              darkMode={darkMode}
                              onClick={onChatButtonClick}
                              corner={floatingCorner}
                              onCornerChange={setFloatingCorner}
                              defaultIcon={
                                <NewChatIcon
                                    color={darkMode
                                        ? customizations.popup?.triggerIcon?.colorDark || '#FFFFFF'
                                        : customizations.popup?.triggerIcon?.color || '#FFFFFF'}
                                    className='wigmix-popup-trigger-icon default size-6'
                                />
                              } />
          )
        ) : (
          <PopupTriggerButton ref={triggerButtonRef}
                            config={customizations.popup}
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
        )}
        <ViSenzeModal
            open={dialogVisible}
            layout={breakpoint}
            onClose={closeDialog}
            position={isFloating ? 'center' : (customizations.popup?.position || 'left')}
            variant={isFloating ? 'floating-card' : 'panel'}
            floatingSize={isFloating ? {
              width: customizations.popup?.floating?.width || 380,
              height: customizations.popup?.floating?.height || 580,
            } : undefined}
            floatingPosition={cardDragEnabled ? cardDrag.position : undefined}
            isDraggingFloating={cardDragEnabled ? cardDrag.isDragging : undefined}
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
