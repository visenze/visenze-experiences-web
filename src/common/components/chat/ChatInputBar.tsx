import { cn } from '@heroui/theme';
import { type ChangeEvent, type FC, type ReactElement, useCallback, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import CameraCaptureDrawer from './CameraCaptureDrawer';
import type { VoiceStatus } from '../../assistant';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import CameraIcon from '../../icons/CameraIcon';
import MicrophoneIcon from '../../icons/MicrophoneIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import StopIcon from '../../icons/StopIcon';
import { isImageFile, type SearchImage } from '../../types/image';

// i18n contract: this component (and the CameraCaptureDrawer it renders) calls
// `intl.formatMessage` for the following ids, so any widget consuming it must provide all of them
// in its own DEFAULT_TEXTS/locale files: askPlaceholder, a11yUploadImage, a11yOpenCamera,
// a11yCameraDrawer, a11yCameraPreview, a11yCloseCamera, a11yTakePhoto, a11ySwitchCamera,
// a11yStartVoiceInput, a11yStopVoiceInput, voiceInputError, a11ySend.
interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onImageSelect: (file: File) => void;
  iconColor?: string;
  primaryButtonBg?: string;
  primaryButtonText?: string;
  voiceEnabled: boolean;
  voiceStatus: VoiceStatus;
  hasVoiceError: boolean;
  onStartVoiceRecording: () => void;
  onStopVoiceRecording: () => void;
}

// A single-row text input with image upload, live camera capture, click-to-toggle voice input,
// and send — the bottom-bar-style chat input shared across widgets whose chat surface isn't the
// full-screen ChatWindow/FullScreenChatContainer pairing (e.g. embedded-shopping-assistant, which
// renders inline/full-page rather than as a popup).
const ChatInputBar: FC<ChatInputBarProps> = ({
  value, onChange, onSubmit, onImageSelect, iconColor, primaryButtonBg, primaryButtonText,
  voiceEnabled, voiceStatus, hasVoiceError, onStartVoiceRecording, onStopVoiceRecording,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openCameraButtonRef = useRef<HTMLButtonElement>(null);
  const intl = useIntl();
  const [showCameraCapture, setShowCameraCapture] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) onImageSelect(file);
    e.target.value = '';
  };

  const closeCameraCapture = useCallback((): void => {
    setShowCameraCapture(false);
    openCameraButtonRef.current?.focus();
  }, []);

  const handleCameraCapture = (image: SearchImage): void => {
    if (isImageFile(image)) {
      onImageSelect(image.files[0]);
    }
  };

  const renderVoiceButtonIcon = (): ReactElement => (
    voiceStatus === 'recording'
      ? <StopIcon className='size-5 cursor-pointer animate-pulse' color='#EF4444' />
      : <MicrophoneIcon className='size-5 cursor-pointer' color={iconColor} />
  );

  // Click-to-toggle rather than press-and-hold: a single click starts recording, a second click
  // (or the input's own silence-triggered onend) stops it and sends the transcript.
  const handleVoiceButtonClick = (): void => {
    if (voiceStatus === 'recording') {
      onStopVoiceRecording();
    } else if (voiceStatus === 'idle') {
      onStartVoiceRecording();
    }
  };

  return (
    <div className='relative bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 px-6 py-3 flex-shrink-0'>
      {showCameraCapture && (
        <CameraCaptureDrawer
          iconColor={iconColor}
          onClose={closeCameraCapture}
          onCapture={handleCameraCapture}
        />
      )}
      <div className='max-w-3xl mx-auto flex items-center gap-3 px-4 py-2.5 rounded-full border border-gray-300 dark:border-neutral-700
        bg-white dark:bg-neutral-800 shadow-sm hover:shadow focus-within:shadow transition-shadow'>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yUploadImage' })}
          onClick={() => fileInputRef.current?.click()}
          className='flex-shrink-0 transition-opacity hover:opacity-70'
        >
          <PlusCircleIcon className='size-6' color={iconColor} />
        </button>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileChange}
          className='hidden'
        />
        <button
          ref={openCameraButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenCamera' })}
          title={intl.formatMessage({ id: 'a11yOpenCamera' })}
          onClick={() => setShowCameraCapture(true)}
          className={cn('flex-shrink-0 transition-opacity hover:opacity-70', FOCUS_VISIBLE_CLASSES)}
        >
          <CameraIcon className='size-5' color={iconColor} />
        </button>
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          placeholder={intl.formatMessage({ id: 'askPlaceholder' })}
          className='flex-1 min-w-0 bg-transparent text-sm text-gray-800 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 outline-none border-none'
        />
        {voiceEnabled && (
          <button
            type='button'
            aria-label={intl.formatMessage({ id: voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yStartVoiceInput' })}
            aria-pressed={voiceStatus === 'recording'}
            title={hasVoiceError
              ? intl.formatMessage({ id: 'voiceInputError' })
              : intl.formatMessage({ id: voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yStartVoiceInput' })}
            disabled={voiceStatus === 'transcribing'}
            className={cn('flex-shrink-0 transition-opacity hover:opacity-70 disabled:opacity-50', FOCUS_VISIBLE_CLASSES)}
            onClick={handleVoiceButtonClick}
          >
            {renderVoiceButtonIcon()}
          </button>
        )}
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11ySend' })}
          onClick={onSubmit}
          style={{ backgroundColor: primaryButtonBg }}
          className='flex-shrink-0 size-8 rounded-full transition-opacity hover:opacity-90 flex items-center justify-center'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='2.5'
            stroke='currentColor'
            className='size-4'
            style={{ color: primaryButtonText }}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInputBar;
