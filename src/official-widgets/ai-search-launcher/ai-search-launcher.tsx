import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import FullScreenContainer from './components/FullScreenContainer';
import LauncherChatWindow from './components/LauncherChatWindow';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SubmitChatIcon from './icons/SubmitChatIcon';
import useLauncherChat from './use-launcher-chat';
import { RootContext } from '../../common/components/shadow-wrapper';
import CameraIcon from '../../common/icons/CameraIcon';
import { WidgetDataContext } from '../../common/types/contexts';

const AiSearchLauncher: FC = () => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, appSettings } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const chat = useLauncherChat();
  const [message, setMessage] = useState('');
  const dialogTitleId = `wigmix-ai-search-launcher-title-${appSettings.placementId}`;

  if (!root) {
    return <></>;
  }

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  const handleSend = (): void => {
    if (!chat.allowUserInput) {
      return;
    }
    const messageToSend = message;
    setMessage('');
    chat.sendMessage(messageToSend);
  };

  return (
    <>
      <div className='flex items-center gap-2 p-2'>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenImageSearch' })}
          className={cn('rounded-md border border-gray bg-transparent p-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => chat.openEntryPoint('image')}
        >
          <CameraIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenVoiceSearch' })}
          className={cn('rounded-md border border-gray bg-transparent p-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => chat.openEntryPoint('mic')}
        >
          <MicrophoneIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
        <button
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
        onClose={chat.closeEntryPoint}
        title={customizations.launcher?.title || intl.formatMessage({ id: 'widgetTitle' })}
        isMuted={!chat.isVoiceReadingEnabled}
        onToggleMute={chat.toggleVoiceReading}
        onNewChat={chat.newChat}
        darkMode={darkMode}
        placementId={String(appSettings.placementId)}
        ariaLabelledBy={dialogTitleId}
      >
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
            aria-label={intl.formatMessage({ id: 'a11yChatInput' })}
            value={message}
            placeholder={intl.formatMessage({ id: 'chatBoxPlaceholder' })}
            minRows={1}
            onChange={(e) => setMessage(e.target.value)}
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
      </FullScreenContainer>
    </>
  );
};

export default AiSearchLauncher;
