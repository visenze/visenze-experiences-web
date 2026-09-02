import { cn } from '@heroui/theme';
import { type FC, type ReactElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import ChatWindow from './components/ChatWindow';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import NewChatIcon from './icons/NewChatIcon';
import ChatComposer from '../../common/components/chat/ChatComposer';
import useChat, { type UseChatResult } from '../../common/components/chat/use-chat';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import CloseIcon from '../../common/icons/CloseIcon';
import PlusCircleIcon from '../../common/icons/PlusCircleIcon';
import SpeakerIcon from '../../common/icons/SpeakerIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImageOrPid } from '../../common/types/image';

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
    triggerButtonRef.current?.focus();
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
      <div aria-label={intl.formatMessage({ id: 'widgetTitle' })} className='flex h-full flex-col bg-white dark:bg-neutral-700 border-x border-neutral-300 dark:border-neutral-800'>
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
        <ChatWindow isWaiting={isOpening || chat.isWaiting}
                    chats={chat.chats}
                    latestMessage={chat.typewriterText}
                    suggestions={chat.suggestions}
                    streamingProducts={chat.streamingProducts}
                    streamingRequestId={chat.streamingRequestId}
                    focusedProductId={chat.focusedProductId}
                    showAllSuggestions={chat.showAllSuggestions}
                    setShowAllSuggestions={chat.setShowAllSuggestions}
                    sendMessage={chat.sendMessage} />
        <ChatComposer
          chat={composerChat}
          chatInputRef={chatInputRef}
          chatCameraEnabled
        />
      </div>
  );

  useEffect(() => {
    // react-modal grabs focus onto its own content wrapper right after mount (based on
    // document.activeElement, which can't see into the widget's Shadow DOM so it always thinks
    // nothing is focused yet). A same-tick focus call here loses that race. Deferring to a
    // macrotask runs after react-modal's own focus handling has settled, so this call wins.
    const timeoutId = window.setTimeout(() => {
      chatInputRef.current?.focus();
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
        <ViSenzeModal
            open={dialogVisible}
            layout={breakpoint}
            onClose={closeDialog}
            position={customizations.popup?.position || 'left'}
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
