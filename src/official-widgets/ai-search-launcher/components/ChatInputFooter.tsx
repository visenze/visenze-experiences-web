import { Input } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, type RefObject, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import WebcamCapture from './WebcamCapture';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import FileDropzone from '../../../common/components/FileDropzone';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import CameraIcon from '../../../common/icons/CameraIcon';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import MicrophoneIcon from '../../../common/icons/MicrophoneIcon';
import PhotoIcon from '../../../common/icons/PhotoIcon';
import StopIcon from '../../../common/icons/StopIcon';
import UploadIcon from '../../../common/icons/UploadIcon';
import type { SearchImage } from '../../../common/types/image';
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
  chatInputRef: RefObject<HTMLInputElement>;
  openChatCameraButtonRef: RefObject<HTMLButtonElement>;
  showChatCameraCapture: boolean;
  setShowChatCameraCapture: (show: boolean) => void;
  closeChatCameraCapture: () => void;
  handleChatImage: (image: SearchImage) => void;
  handleSend: () => void;
}

const ICON_BUTTON_CLASSES = 'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border-0 bg-transparent p-1 disabled:opacity-50';

const ChatInputFooter: FC<ChatInputFooterProps> = ({
  chat, darkMode, fontColorLight, fontColorDark, chatCameraEnabled, imageUploadIconUrl,
  chatInputRef, openChatCameraButtonRef, showChatCameraCapture, setShowChatCameraCapture, closeChatCameraCapture,
  handleChatImage, handleSend,
}) => {
  const intl = useIntl();
  const iconColor = darkMode ? (fontColorDark || '') : (fontColorLight || '');
  // Camera and upload are collapsed behind a single "Add image" trigger (spec: one line matching
  // send/mic, no separate icon row) that opens a small menu offering both options.
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isImageMenuOpen) {
      return undefined;
    }
    const closeIfOutside = (event: MouseEvent): void => {
      // This dialog is portaled into its own Shadow DOM (see FullScreenChatContainer), and this
      // listener lives on `document`, outside it — so `event.target` gets retargeted to the
      // shadow host for every click that happens inside, including clicks on the menu's own
      // items. That made the menu treat every click as "outside" and immediately close itself
      // before the click could open the file picker or camera. `composedPath()` isn't retargeted
      // (the shadow root is open), so it still lists the real elements the click passed through.
      const path = event.composedPath();
      if ((imageMenuRef.current && path.includes(imageMenuRef.current))
        || (openChatCameraButtonRef.current && path.includes(openChatCameraButtonRef.current))) {
        return;
      }
      setIsImageMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsImageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return (): void => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isImageMenuOpen, openChatCameraButtonRef]);

  const openCameraFromMenu = (): void => {
    setIsImageMenuOpen(false);
    setShowChatCameraCapture(true);
  };

  return (
    <div className='relative flex flex-col gap-2 p-4 border-t border-neutral-300 dark:border-neutral-800'>
      <div className='relative mx-auto flex w-full max-w-[820px] flex-col gap-2'>
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
        <Input
          ref={chatInputRef}
          aria-label={intl.formatMessage({ id: 'a11yChatInput' })}
          value={chat.message}
          placeholder={intl.formatMessage({ id: 'chatBoxPlaceholder' })}
          size='lg'
          classNames={{ inputWrapper: 'rounded-full' }}
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
            <div className='flex items-center gap-1'>
              {chatCameraEnabled ? (
                <div className='relative'>
                  <button
                    ref={openChatCameraButtonRef}
                    type='button'
                    aria-label={intl.formatMessage({ id: 'a11yAddImage' })}
                    title={intl.formatMessage({ id: 'a11yAddImage' })}
                    aria-haspopup='true'
                    aria-expanded={isImageMenuOpen}
                    className={cn(ICON_BUTTON_CLASSES, FOCUS_VISIBLE_CLASSES)}
                    onClick={() => setIsImageMenuOpen((prev) => !prev)}
                  >
                    <PhotoIcon className='size-5 cursor-pointer' color={iconColor} />
                  </button>
                  {isImageMenuOpen && (
                    <div
                      ref={imageMenuRef}
                      className={cn(
                        'absolute bottom-full right-0 z-10 mb-2 flex w-max flex-col gap-1 rounded-lg border border-gray',
                        'bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900',
                      )}
                    >
                      <button
                        type='button'
                        className={cn(
                          'flex items-center gap-2 whitespace-nowrap rounded-md p-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-800',
                          FOCUS_VISIBLE_CLASSES,
                        )}
                        onClick={openCameraFromMenu}
                      >
                        <CameraIcon className='size-4' color={iconColor} />
                        {intl.formatMessage({ id: 'a11yOpenCamera' })}
                      </button>
                      <FileDropzone
                        onImageUpload={handleChatImage}
                        name='asl-chat-upload'
                        ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}
                      >
                        <div
                          className='flex items-center gap-2 whitespace-nowrap rounded-md p-2 hover:bg-gray-100 dark:hover:bg-neutral-800'
                          onClick={() => setIsImageMenuOpen(false)}
                        >
                          {imageUploadIconUrl ? (
                            <CustomizableIcon height={16} width={16} url={imageUploadIconUrl} color={iconColor} />
                          ) : (
                            <UploadIcon className='size-4' color={iconColor} />
                          )}
                          {intl.formatMessage({ id: 'a11yUploadImage' })}
                        </div>
                      </FileDropzone>
                    </div>
                  )}
                </div>
              ) : (
                <FileDropzone onImageUpload={handleChatImage} name='asl-chat-upload' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
                  <div className={ICON_BUTTON_CLASSES}>
                    {imageUploadIconUrl ? (
                      <CustomizableIcon height={20} width={20} url={imageUploadIconUrl} color={iconColor} />
                    ) : (
                      <UploadIcon className='size-5' color={iconColor} />
                    )}
                  </div>
                </FileDropzone>
              )}
              {chat.voiceEnabled && (
                <>
                  <button
                    type='button'
                    aria-label={intl.formatMessage({ id: chat.voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yVoicePending' })}
                    aria-pressed={chat.voiceStatus === 'recording'}
                    aria-describedby='asl-chat-hold-mic-instructions'
                    title={chat.hasVoiceError ? intl.formatMessage({ id: 'voiceInputError' }) : intl.formatMessage({ id: 'holdMicToRecord' })}
                    disabled={(chat.voiceStatus === 'idle' && !chat.allowUserInput && !chat.isSpeechPlaying) || chat.voiceStatus === 'transcribing'}
                    className={cn(ICON_BUTTON_CLASSES, FOCUS_VISIBLE_CLASSES)}
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
                  <span id='asl-chat-hold-mic-instructions' className='sr-only'>
                    {intl.formatMessage({ id: 'a11yHoldMicInstructions' })}
                  </span>
                  {chat.hasVoiceError && (
                    <span role='alert' className='sr-only'>
                      {intl.formatMessage({ id: 'voiceInputError' })}
                    </span>
                  )}
                </>
              )}
              <button
                type='button'
                aria-label={intl.formatMessage({ id: 'a11ySendMessage' })}
                title={intl.formatMessage({ id: 'a11ySendMessage' })}
                disabled={!chat.allowUserInput}
                className={cn(
                  'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border-0 bg-blue-600 p-1.5 text-white disabled:opacity-50 place-items-center ',
                  FOCUS_VISIBLE_CLASSES,
                )}
                onClick={handleSend}
              >
                <SubmitChatIcon className='size-4' color='currentColor' />
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default ChatInputFooter;
