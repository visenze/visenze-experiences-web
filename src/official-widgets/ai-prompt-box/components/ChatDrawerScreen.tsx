import { cn } from '@heroui/theme';
import type { FC, RefObject } from 'react';
import { useIntl } from 'react-intl';
import ChatComposer from '../../../common/components/chat/ChatComposer';
import ChatWindow from '../../../common/components/chat/ChatWindow';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import CloseIcon from '../../../common/icons/CloseIcon';
import PlusCircleIcon from '../../../common/icons/PlusCircleIcon';
import SpeakerIcon from '../../../common/icons/SpeakerIcon';

interface ChatDrawerScreenProps {
  chat: UseChatResult;
  chatInputRef: RefObject<HTMLInputElement>;
  title: string;
  titleId: string;
  onClose: () => void;
  iconColor?: string;
  backgroundColor?: string;
}

const HEADER_BUTTON_CLASSES = 'p-0 bg-transparent border-0';

// The body of the side-mounted chat drawer (header + conversation + composer), laid out like
// shopping-assistant's own drawer screen. It reads from the same `chat` session as the panel.
const ChatDrawerScreen: FC<ChatDrawerScreenProps> = ({ chat, chatInputRef, title, titleId, onClose, iconColor, backgroundColor }) => {
  const intl = useIntl();
  const hasStarted = chat.chats.length > 0;

  return (
    <div className='flex h-full flex-col border-x border-neutral-300 dark:border-neutral-600' style={{ backgroundColor, color: iconColor }}>
      <div className='flex w-full items-center justify-between py-4 shadow'>
        <h2 id={titleId} className='wigmix-widget-title m-0 flex items-center gap-2 px-4' style={{ color: iconColor }}>
          {title}
        </h2>
        <div className='flex items-center gap-2 pe-4'>
          {chat.speechOutputEnabled && (
            <button
              type='button'
              aria-label={intl.formatMessage({ id: chat.isVoiceReadingEnabled ? 'a11yToggleMute' : 'a11yEnableMute' })}
              aria-pressed={!chat.isVoiceReadingEnabled}
              className={cn(HEADER_BUTTON_CLASSES, FOCUS_VISIBLE_CLASSES)}
              onClick={chat.toggleVoiceReading}
            >
              <SpeakerIcon muted={!chat.isVoiceReadingEnabled} className='size-6 cursor-pointer' color={iconColor} />
            </button>
          )}
          {hasStarted && (
            <button
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yStartNewChat' })}
              title={intl.formatMessage({ id: 'a11yStartNewChat' })}
              className={cn(HEADER_BUTTON_CLASSES, FOCUS_VISIBLE_CLASSES)}
              onClick={chat.newChat}
            >
              <PlusCircleIcon className='size-6 cursor-pointer' color={iconColor} />
            </button>
          )}
          <button
            type='button'
            aria-label={intl.formatMessage({ id: 'a11yCloseChat' })}
            title={intl.formatMessage({ id: 'a11yCloseChat' })}
            className={cn(HEADER_BUTTON_CLASSES, FOCUS_VISIBLE_CLASSES)}
            onClick={onClose}
          >
            <CloseIcon className='size-6 cursor-pointer' color={iconColor} />
          </button>
        </div>
      </div>
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
        pwPrefix='apb'
        capProductImageHeight={false}
      />
      <ChatComposer chat={chat} chatInputRef={chatInputRef} chatCameraEnabled={false} />
    </div>
  );
};

export default ChatDrawerScreen;
