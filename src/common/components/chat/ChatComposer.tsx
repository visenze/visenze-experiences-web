import { Input } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, type RefObject, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { UseChatResult } from './use-chat';
import WebcamCapture from './WebcamCapture';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import CameraIcon from '../../icons/CameraIcon';
import CustomizableIcon from '../../icons/CustomizableIcon';
import MicrophoneIcon from '../../icons/MicrophoneIcon';
import PhotoIcon from '../../icons/PhotoIcon';
import StopIcon from '../../icons/StopIcon';
import SubmitChatIcon from '../../icons/SubmitChatIcon';
import UploadIcon from '../../icons/UploadIcon';
import { WidgetDataContext } from '../../types/contexts';
import type { SearchImage } from '../../types/image';
import FileDropzone from '../FileDropzone';
import Toast from '../toast/Toast';

// i18n contract: this component calls `intl.formatMessage` for the following ids, so any widget
// consuming it must provide all of them in its own DEFAULT_TEXTS/locale files (via IntlProvider):
// a11yChatInput, chatBoxPlaceholder, a11yAddImage, a11yOpenCamera, a11yUploadImage,
// a11yStopVoiceInput, a11yTranscribingVoice, a11yListening, a11yHoldMicInstructions,
// holdMicToRecord, voiceInputError, voiceOutputError, a11ySendMessage. Also pulls in
// WebcamCapture's own i18n contract when `chatCameraEnabled` is on.
interface ChatComposerProps {
  chat: UseChatResult;
  chatInputRef: RefObject<HTMLInputElement>;
  // Sourced from a widget-specific config key today (e.g. ai-search-launcher's
  // `customizations.launcher.chatCameraEnabled`) rather than read internally, since that
  // namespace is specific to widgets with dedicated camera entry points, not a universal concept.
  chatCameraEnabled: boolean;
  // Defaults to `chat.sendMessage(chat.message)` (gated on `chat.allowUserInput`). Override only
  // if a widget needs different send semantics (e.g. staging the message before sending).
  onSend?: () => void;
  // Defaults to `chat.sendMessage(undefined, image)` — fires the query immediately. Override if a
  // widget needs to stage the image instead (e.g. show a preview attached to the input, letting
  // the user send it explicitly rather than searching right away).
  onImageSelected?: (image: SearchImage) => void;
}

const ICON_BUTTON_CLASSES = 'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border-0 bg-buttonIcon p-1 disabled:opacity-50';
const DEFAULT_VOICE_RECORDING_COLOR = '#EF4444';

// The text input + image (camera/upload) trigger + hold-to-record mic for an in-progress chat
// conversation. Pairs with WebcamCapture (variant='drawer' here) and `useChat` to give any widget
// a ready-to-use chat composer with camera and voice support — no widget-local copy needed.
const ChatComposer: FC<ChatComposerProps> = ({ chat, chatInputRef, chatCameraEnabled, onSend, onImageSelected }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const iconColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');
  const imageUploadIconUrl = customizations.imageUpload?.icon?.url;
  const inputBar = customizations.chatbot?.inputBar;
  // Plain icon-only buttons (add-image trigger, upload fallback, idle mic) carry their own color
  // scheme via buttons.icon rather than the general layout color — same precedent as the send
  // button, which already uses buttons.primary instead of generalLayout.
  const iconButtonColor = darkMode
    ? (customizations.buttons?.icon?.fontColorDark || iconColor)
    : (customizations.buttons?.icon?.fontColor || iconColor);
  // The popover panel is its own themed surface (background/border/icon-and-label color), driven
  // by chat.inputBar.menuPanel — falls back to the plain icon color when unconfigured.
  const menuPanelColor = darkMode
    ? (inputBar?.menuPanel?.fontColorDark || iconColor)
    : (inputBar?.menuPanel?.fontColor || iconColor);
  const inputBarBorderStyle: CSSProperties | undefined = inputBar?.border ? {
    borderTopWidth: `${inputBar.border.width}px`,
    borderTopStyle: 'solid',
    borderTopColor: darkMode ? inputBar.border.colorDark : inputBar.border.color,
  } : undefined;
  const menuPanelBorderStyle: CSSProperties | undefined = inputBar?.menuPanel?.border ? {
    borderWidth: `${inputBar.menuPanel.border.width}px`,
    borderStyle: 'solid',
    borderColor: darkMode ? inputBar.menuPanel.border.colorDark : inputBar.menuPanel.border.color,
  } : undefined;
  const voiceRecordingColor = (darkMode
    ? inputBar?.voiceRecordingColorDark
    : inputBar?.voiceRecordingColor) || DEFAULT_VOICE_RECORDING_COLOR;
  // Camera and upload are collapsed behind a single "Add image" trigger that opens a small menu
  // offering both options.
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const openCameraButtonRef = useRef<HTMLButtonElement>(null);

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
        || (openCameraButtonRef.current && path.includes(openCameraButtonRef.current))) {
        return;
      }
      setIsImageMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsImageMenuOpen(false);
        openCameraButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return (): void => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isImageMenuOpen]);

  // 'idle' and 'transcribing' used to share the same "Preparing to listen" label, which the
  // screen reader user has no way to tell apart from an actionable idle button — and since
  // aria-label changes aren't re-announced on an already-focused element, distinguishing them
  // here alone isn't enough (see the aria-live status span below).
  const getVoiceButtonLabelId = (): 'a11yStopVoiceInput' | 'a11yTranscribingVoice' | 'holdMicToRecord' => {
    if (chat.voiceStatus === 'recording') {
      return 'a11yStopVoiceInput';
    }
    if (chat.voiceStatus === 'transcribing') {
      return 'a11yTranscribingVoice';
    }
    return 'holdMicToRecord';
  };
  const voiceButtonLabelId = getVoiceButtonLabelId();

  const closeCameraCapture = (): void => {
    setShowCameraCapture(false);
    openCameraButtonRef.current?.focus();
  };

  const openCameraFromMenu = (): void => {
    setIsImageMenuOpen(false);
    setShowCameraCapture(true);
  };

  const handleSend = (): void => {
    if (onSend) {
      onSend();
      return;
    }
    if (!chat.allowUserInput) {
      return;
    }
    chat.sendMessage(chat.message);
  };

  const handleImageSelected = (image: SearchImage): void => {
    // Also closes the "Add image" popover — deliberately deferred to here rather than an onClick
    // on the upload menu item itself. That item's click both fires this (via FileDropzone's
    // underlying react-dropzone root) AND opens the native file picker, which resolves
    // asynchronously; closing the popover synchronously on click would unmount FileDropzone's
    // hidden <input> before the user finishes picking a file, so the native 'change' event that
    // eventually fires has no mounted React tree left to reach and the image was silently dropped.
    setIsImageMenuOpen(false);
    if (onImageSelected) {
      onImageSelected(image);
      return;
    }
    chat.sendMessage(undefined, image);
  };

  return (
    <div
      className={cn('relative flex flex-col gap-2 p-4', !inputBarBorderStyle && 'border-t border-neutral-300 dark:border-neutral-800')}
      style={inputBarBorderStyle}
    >
      {chat.hasSpeechOutputError && <Toast message={intl.formatMessage({ id: 'voiceOutputError' })} />}
      <div className='relative mx-auto flex w-full max-w-[820px] flex-col gap-2'>
        {showCameraCapture && (
          <WebcamCapture
            variant='drawer'
            onClose={closeCameraCapture}
            onCapture={handleImageSelected}
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
                    ref={openCameraButtonRef}
                    type='button'
                    aria-label={intl.formatMessage({ id: 'a11yAddImage' })}
                    title={intl.formatMessage({ id: 'a11yAddImage' })}
                    aria-haspopup='true'
                    aria-expanded={isImageMenuOpen}
                    disabled={!chat.allowUserInput}
                    className={cn(ICON_BUTTON_CLASSES, FOCUS_VISIBLE_CLASSES)}
                    onClick={() => setIsImageMenuOpen((prev) => !prev)}
                  >
                    <PhotoIcon className='size-5 cursor-pointer' color={iconButtonColor} />
                  </button>
                  {isImageMenuOpen && (
                    <div
                      ref={imageMenuRef}
                      className={cn(
                        'absolute bottom-full right-0 z-10 mb-2 flex w-max flex-col gap-1 rounded-lg',
                        'bg-inputBarMenuPanel p-1 text-inputBarMenuPanel shadow-lg',
                        !menuPanelBorderStyle && 'border border-gray dark:border-neutral-700',
                      )}
                      style={menuPanelBorderStyle}
                    >
                      <button
                        type='button'
                        disabled={!chat.allowUserInput}
                        className={cn(
                          'flex items-center gap-2 whitespace-nowrap rounded-md p-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50',
                          FOCUS_VISIBLE_CLASSES,
                        )}
                        onClick={openCameraFromMenu}
                      >
                        <CameraIcon className='size-4' color={menuPanelColor} />
                        {intl.formatMessage({ id: 'a11yOpenCamera' })}
                      </button>
                      <FileDropzone
                        onImageUpload={handleImageSelected}
                        name='asl-chat-upload'
                        ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}
                        disabled={!chat.allowUserInput}
                      >
                        {/* No onClick here: it used to close the popover immediately, which
                            unmounted this FileDropzone (and its hidden file input) before the
                            native file dialog it just opened could resolve — silently dropping
                            the picked image. The popover now closes once handleImageSelected
                            actually fires, once a file is picked. */}
                        <div className='flex items-center gap-2 whitespace-nowrap rounded-md p-2 hover:bg-gray-100 dark:hover:bg-neutral-800'>
                          {imageUploadIconUrl ? (
                            <CustomizableIcon height={16} width={16} url={imageUploadIconUrl} color={menuPanelColor} />
                          ) : (
                            <UploadIcon className='size-4' color={menuPanelColor} />
                          )}
                          {intl.formatMessage({ id: 'a11yUploadImage' })}
                        </div>
                      </FileDropzone>
                    </div>
                  )}
                </div>
              ) : (
                <FileDropzone
                  onImageUpload={handleImageSelected}
                  name='asl-chat-upload'
                  ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}
                  disabled={!chat.allowUserInput}
                >
                  <div className={ICON_BUTTON_CLASSES}>
                    {imageUploadIconUrl ? (
                      <CustomizableIcon height={20} width={20} url={imageUploadIconUrl} color={iconButtonColor} />
                    ) : (
                      <UploadIcon className='size-5' color={iconButtonColor} />
                    )}
                  </div>
                </FileDropzone>
              )}
              {chat.voiceEnabled && (
                <>
                  <button
                    type='button'
                    aria-label={intl.formatMessage({ id: voiceButtonLabelId })}
                    aria-pressed={chat.voiceStatus === 'recording'}
                    aria-describedby='asl-chat-hold-mic-instructions'
                    title={chat.hasVoiceError ? intl.formatMessage({ id: 'voiceInputError' }) : intl.formatMessage({ id: 'holdMicToRecord' })}
                    disabled={(chat.voiceStatus === 'idle' && !chat.allowUserInput) || chat.voiceStatus === 'transcribing'}
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
                      ? <StopIcon className='size-5 cursor-pointer animate-pulse' color={voiceRecordingColor} />
                      : <MicrophoneIcon className='size-5 cursor-pointer' color={iconButtonColor} />}
                  </button>
                  <span id='asl-chat-hold-mic-instructions' className='sr-only'>
                    {intl.formatMessage({ id: 'a11yHoldMicInstructions' })}
                  </span>
                  <span role='status' aria-live='polite' className='sr-only'>
                    {chat.voiceStatus === 'recording' && (chat.liveTranscript || intl.formatMessage({ id: 'a11yListening' }))}
                    {chat.voiceStatus === 'transcribing' && intl.formatMessage({ id: 'a11yTranscribingVoice' })}
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
                  'flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border-0',
                  'bg-buttonPrimary p-1.5 text-buttonPrimary disabled:opacity-50 place-items-center',
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

export default ChatComposer;
