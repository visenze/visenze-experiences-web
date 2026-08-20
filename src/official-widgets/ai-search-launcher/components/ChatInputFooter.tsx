import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, type RefObject } from 'react';
import { useIntl } from 'react-intl';
import WebcamCapture from './WebcamCapture';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import FileDropzone from '../../../common/components/FileDropzone';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import CameraIcon from '../../../common/icons/CameraIcon';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import UploadIcon from '../../../common/icons/UploadIcon';
import type { SearchImage } from '../../../common/types/image';
import MicrophoneIcon from '../icons/MicrophoneIcon';
import StopIcon from '../icons/StopIcon';
import SubmitChatIcon from '../icons/SubmitChatIcon';

interface ChatInputFooterProps {
  chat: UseChatResult;
  darkMode: boolean;
  // Raw (unresolved) `customizations.generalLayout` colors. WebcamCapture takes both and resolves
  // dark mode itself, while this component's own icons use the `iconColor` resolved below — hence
  // passing the raw pair rather than a single pre-resolved color.
  fontColorLight?: string;
  fontColorDark?: string;
  chatCameraEnabled: boolean;
  imageUploadIconUrl?: string;
  chatInputRef: RefObject<HTMLTextAreaElement>;
  openChatCameraButtonRef: RefObject<HTMLButtonElement>;
  showChatCameraCapture: boolean;
  setShowChatCameraCapture: (show: boolean) => void;
  closeChatCameraCapture: () => void;
  handleChatImage: (image: SearchImage) => void;
  handleSend: () => void;
}

const ChatInputFooter: FC<ChatInputFooterProps> = ({
  chat, darkMode, fontColorLight, fontColorDark, chatCameraEnabled, imageUploadIconUrl,
  chatInputRef, openChatCameraButtonRef, showChatCameraCapture, setShowChatCameraCapture, closeChatCameraCapture,
  handleChatImage, handleSend,
}) => {
  const intl = useIntl();
  const iconColor = darkMode ? (fontColorDark || '') : (fontColorLight || '');
  return (
    <div className='relative flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
      {showChatCameraCapture && (
        <WebcamCapture
          variant='drawer'
          darkMode={darkMode}
          fontColor={fontColorLight}
          fontColorDark={fontColorDark}
          onClose={closeChatCameraCapture}
          onCapture={handleChatImage}
        />
      )}
      <div className='flex justify-end gap-2'>
        {chatCameraEnabled && (
          <button
            ref={openChatCameraButtonRef}
            type='button'
            aria-label={intl.formatMessage({ id: 'a11yOpenCamera' })}
            title={intl.formatMessage({ id: 'a11yOpenCamera' })}
            className={cn(
                'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-md border border-gray bg-transparent p-2 dark:border-neutral-500',
                FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => setShowChatCameraCapture(true)}
          >
            <CameraIcon className='size-5 cursor-pointer' color={iconColor} />
          </button>
        )}
        <FileDropzone onImageUpload={handleChatImage} name='asl-chat-upload' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
          <div className='flex min-h-[38px] min-w-[38px] items-center justify-center rounded-md border border-gray p-2 dark:border-neutral-500'>
            {imageUploadIconUrl ? (
              <CustomizableIcon height={20} width={20} url={imageUploadIconUrl} color={iconColor} />
            ) : (
              <UploadIcon className='size-5' color={iconColor} />
            )}
          </div>
        </FileDropzone>
        {chat.voiceEnabled && (
          <button
            type='button'
            aria-label={intl.formatMessage({ id: chat.voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yVoicePending' })}
            aria-pressed={chat.voiceStatus === 'recording'}
            title={chat.hasVoiceError ? intl.formatMessage({ id: 'voiceInputError' }) : intl.formatMessage({ id: 'holdMicToRecord' })}
            disabled={(chat.voiceStatus === 'idle' && !chat.allowUserInput && !chat.isSpeechPlaying) || chat.voiceStatus === 'transcribing'}
            className={cn(
                'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-md border border-gray bg-transparent p-2',
                'disabled:opacity-50 dark:border-neutral-500',
                FOCUS_VISIBLE_CLASSES,
            )}
            onMouseDown={chat.startVoiceRecording}
            onMouseUp={chat.stopRecording}
            onMouseLeave={chat.stopRecording}
            onTouchStart={(e) => {
              e.preventDefault();
              chat.startVoiceRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              chat.stopRecording();
            }}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                chat.startVoiceRecording();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                chat.stopRecording();
              }
            }}
          >
            {chat.voiceStatus === 'recording'
              ? <StopIcon className='size-5 cursor-pointer animate-pulse' color='#EF4444' />
              : <MicrophoneIcon className='size-5 cursor-pointer' color={iconColor} />}
          </button>
        )}
      </div>
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
            className={cn(
                'flex min-h-[38px] min-w-[38px] items-center justify-center border-0 bg-transparent p-0 disabled:opacity-50',
                FOCUS_VISIBLE_CLASSES,
            )}
            onClick={handleSend}
          >
            <SubmitChatIcon color={iconColor} />
          </button>
        }
      />
    </div>
  );
};

export default ChatInputFooter;
