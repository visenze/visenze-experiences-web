import { cn } from '@heroui/theme';
import { type FC, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Webcam from 'react-webcam';
import ArrowPathIcon from '../../../common/icons/ArrowPathIcon';
import CameraIcon from '../../../common/icons/CameraIcon';
import UturnLeftIcon from '../../../common/icons/UturnLeftIcon';
import type { SearchImage } from '../../../common/types/image';
import { FOCUS_VISIBLE_CLASSES } from '../constants';

interface WebcamCaptureProps {
  darkMode?: boolean;
  fontColor?: string;
  fontColorDark?: string;
  onClose: () => void;
  onCapture: (image: SearchImage) => void;
}

// Live camera-capture screen for the image-entry welcome state (spec §5.1, §6.1). This is a
// standalone copy of shopping-assistant's `CameraCaptureDrawer` webcam-capture pattern (webcam
// ref, facingMode toggle, capture-to-blob-to-File conversion, the Shadow-DOM-aware focus trap /
// Escape-to-close) — duplicated on purpose rather than imported, per this phase's constraint
// against importing from shopping-assistant. Laid out to fill the whole full-screen welcome
// surface (rather than sliding up as a bottom drawer over a compact widget) since here it IS the
// screen, not an overlay on top of something else. Unlike the original, `capture()` does not call
// `onClose()` itself: the caller (`ImageEntryScreen`) feeds the captured image straight into
// `sendMessage`, which flips `hasStartedChat` synchronously, and the parent (`ai-search-launcher.tsx`)
// unmounts this screen for the chat surface as soon as that happens.
const WebcamCapture: FC<WebcamCaptureProps> = ({ darkMode, fontColor, fontColorDark, onClose, onCapture }) => {
  const intl = useIntl();
  const webcamRef = useRef<Webcam>(null);
  const closeCameraButtonRef = useRef<HTMLButtonElement>(null);
  const takePhotoButtonRef = useRef<HTMLButtonElement>(null);
  const switchCameraButtonRef = useRef<HTMLButtonElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const iconColor = darkMode ? (fontColorDark || '') : (fontColor || '');

  useEffect(() => {
    closeCameraButtonRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusableControls = [
      closeCameraButtonRef.current,
      takePhotoButtonRef.current,
      switchCameraButtonRef.current,
    ].filter((control): control is HTMLButtonElement => !!control && !control.disabled);
    if (!focusableControls.length) {
      return;
    }
    // document.activeElement doesn't pierce the Shadow DOM this widget renders in (it only
    // reports the shadow host), so it never matches these controls in production. Reading
    // activeElement off the event's own root (the Shadow DOM when present, else document) works
    // in both contexts.
    const activeRoot = event.currentTarget.getRootNode() as Document | ShadowRoot;
    const activeIndex = focusableControls.indexOf(activeRoot.activeElement as HTMLButtonElement);
    let nextIndex = activeIndex + 1;
    if (event.shiftKey) {
      nextIndex = activeIndex - 1;
    }
    if (nextIndex < 0) {
      nextIndex = focusableControls.length - 1;
    }
    if (nextIndex >= focusableControls.length) {
      nextIndex = 0;
    }

    event.preventDefault();
    focusableControls[nextIndex].focus();
  }, [onClose]);

  const capture = useCallback((): void => {
    if (!webcamRef.current) {
      return;
    }
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      return;
    }
    fetch(imageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `${Date.now()}`, { type: 'image/png' });
        onCapture({ files: [file], file: imageSrc });
      });
  }, [onCapture]);

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={intl.formatMessage({ id: 'a11yCameraDrawer' })}
      tabIndex={-1}
      className='flex flex-1 flex-col items-center justify-center gap-4 p-4'
      onKeyDown={handleKeyDown}
    >
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat='image/jpeg'
        className='rounded-lg max-w-full'
        videoConstraints={{ facingMode }}
        aria-label={intl.formatMessage({ id: 'a11yCameraPreview' })}
      />
      <div className='flex w-full max-w-sm gap-2'>
        <button ref={closeCameraButtonRef}
                className={cn(
                    'w-full p-2 rounded flex justify-center bg-gray-100 dark:bg-neutral-800 dark:border-1',
                    'text-neutral-900 dark:text-neutral-100',
                    FOCUS_VISIBLE_CLASSES,
                )}
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yCloseCamera' })}
                title={intl.formatMessage({ id: 'a11yCloseCamera' })}
                onClick={onClose}>
          <UturnLeftIcon className='size-5 cursor-pointer' color={iconColor} />
        </button>
        <button ref={takePhotoButtonRef}
                className={cn(
                    'w-full p-2 rounded flex justify-center bg-gray-100 dark:bg-neutral-800 dark:border-1',
                    'text-neutral-900 dark:text-neutral-100',
                    FOCUS_VISIBLE_CLASSES,
                )}
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yTakePhoto' })}
                title={intl.formatMessage({ id: 'a11yTakePhoto' })}
                onClick={capture}>
          <CameraIcon className='size-5 cursor-pointer' color={iconColor} />
        </button>
        <button ref={switchCameraButtonRef}
                className={cn(
                    'w-full p-2 rounded flex justify-center bg-gray-100 dark:bg-neutral-800 dark:border-1',
                    'text-neutral-900 dark:text-neutral-100',
                    FOCUS_VISIBLE_CLASSES,
                )}
                type='button'
                aria-label={intl.formatMessage({ id: 'a11ySwitchCamera' })}
                title={intl.formatMessage({ id: 'a11ySwitchCamera' })}
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}>
          <ArrowPathIcon className='size-5 cursor-pointer' color={iconColor} />
        </button>
      </div>
    </div>
  );
};

export default WebcamCapture;
