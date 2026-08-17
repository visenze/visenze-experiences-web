import { cn } from '@heroui/theme';
import { type FC, useCallback, useContext, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import WebcamCapture from './WebcamCapture';
import FileDropzone from '../../../common/components/FileDropzone';
import CameraIcon from '../../../common/icons/CameraIcon';
import UploadIcon from '../../../common/icons/UploadIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';
import { FOCUS_VISIBLE_CLASSES } from '../constants';
import type { UseLauncherChatResult } from '../use-launcher-chat';

interface ImageEntryScreenProps {
  chat: UseLauncherChatResult;
}

// Full-screen welcome state for the image-search entry point (spec §5.1): two ways to provide an
// image — gallery upload via the shared `FileDropzone` primitive (same as shopping-assistant), or
// live camera capture via `WebcamCapture` (this widget's own copy of shopping-assistant's
// `CameraCaptureDrawer` webcam pattern). Either path feeds the picked/captured image straight into
// the chat as the initial query — no intermediate results screen (confirmed decision, spec §5.1).
// Once `chat.sendMessage` flips `hasStartedChat`, the caller (`ai-search-launcher.tsx`) swaps this
// screen out for the normal chat surface on its own; this component doesn't need to know that.
const ImageEntryScreen: FC<ImageEntryScreenProps> = ({ chat }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const [showWebcam, setShowWebcam] = useState(false);
  const openCameraButtonRef = useRef<HTMLButtonElement>(null);

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  const handleImage = (image: SearchImage): void => {
    chat.sendMessage(undefined, image);
  };

  const closeWebcam = useCallback((): void => {
    setShowWebcam(false);
    openCameraButtonRef.current?.focus();
  }, []);

  // The configured greeting (played into `chat.chats` as a bot bubble by the parent's greeting
  // effect, which fires from the same commit that renders this screen) is the single source of
  // truth for this screen's welcome copy; only fall back to the static default when no greeting
  // is configured for the image entry point.
  const greetingMessage = chat.chats.find((c) => c.author === 'bot')?.messages[0];
  const promptText = greetingMessage || intl.formatMessage({ id: 'imageEntryPrompt' });

  if (showWebcam) {
    return (
      <WebcamCapture
        darkMode={darkMode}
        fontColor={customizations.generalLayout?.fontColor}
        fontColorDark={customizations.generalLayout?.fontColorDark}
        onClose={closeWebcam}
        onCapture={handleImage}
      />
    );
  }

  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center'>
      <p className='m-0 max-w-xs text-base' style={{ color: fontColor }}>
        {promptText}
      </p>
      <div className='flex gap-6'>
        <button
          ref={openCameraButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yTakePhoto' })}
          className={cn('flex flex-col items-center gap-2 rounded-md border border-gray bg-transparent p-4', FOCUS_VISIBLE_CLASSES)}
          onClick={() => setShowWebcam(true)}
        >
          <CameraIcon className='size-8 cursor-pointer' color={fontColor} />
          <span className='text-sm' style={{ color: fontColor }}>
            {intl.formatMessage({ id: 'a11yTakePhoto' })}
          </span>
        </button>
        <FileDropzone onImageUpload={handleImage} name='asl-image-entry' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
          <div className='flex flex-col items-center gap-2 rounded-md border border-gray bg-transparent p-4'>
            <UploadIcon className='size-8 cursor-pointer' color={fontColor} />
            <span className='text-sm' style={{ color: fontColor }}>
              {intl.formatMessage({ id: 'a11yUploadImage' })}
            </span>
          </div>
        </FileDropzone>
      </div>
    </div>
  );
};

export default ImageEntryScreen;
