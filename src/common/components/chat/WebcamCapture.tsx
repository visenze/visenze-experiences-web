import { cn } from '@heroui/theme';
import { type FC, type KeyboardEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Webcam from 'react-webcam';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import ArrowPathIcon from '../../icons/ArrowPathIcon';
import CameraIcon from '../../icons/CameraIcon';
import UturnLeftIcon from '../../icons/UturnLeftIcon';
import { WidgetDataContext } from '../../types/contexts';
import type { SearchImage } from '../../types/image';

// i18n contract: this component calls `intl.formatMessage` for the following ids, so any widget
// consuming it must provide all of them in its own DEFAULT_TEXTS/locale files (via IntlProvider):
// a11yCameraDrawer, a11yCameraPreview, a11yCloseCamera, a11yTakePhoto, a11ySwitchCamera,
// a11yCameraError.
interface WebcamCaptureProps {
  onClose: () => void;
  onCapture: (image: SearchImage) => void;
  // 'fullscreen' (default) fills its container — the caller unmounts it once it's done with it, so
  // `capture()` doesn't close itself. 'drawer' renders as a compact bottom sheet over a chat
  // surface's input footer, where nothing else unmounts it, so `capture()` closes it directly
  // after feeding the image to the caller.
  variant?: 'fullscreen' | 'drawer';
}

// Live camera-capture screen: webcam ref, facingMode toggle, capture-to-blob-to-File conversion,
// a Shadow-DOM-aware focus trap, and Escape-to-close. Shared by any widget that offers a "take a
// photo" flow, either as a standalone welcome screen (`variant='fullscreen'`) or as a drawer over
// an in-progress chat's input footer (`variant='drawer'`, see ChatComposer).
const WebcamCapture: FC<WebcamCaptureProps> = ({ onClose, onCapture, variant = 'fullscreen' }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const webcamRef = useRef<Webcam>(null);
  const closeCameraButtonRef = useRef<HTMLButtonElement>(null);
  const takePhotoButtonRef = useRef<HTMLButtonElement>(null);
  const switchCameraButtonRef = useRef<HTMLButtonElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState(false);
  const iconColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

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
    event.stopPropagation();
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
        if (variant === 'drawer') {
          onClose();
        }
      })
      .catch(() => setCameraError(true));
  }, [onCapture, onClose, variant]);

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={intl.formatMessage({ id: 'a11yCameraDrawer' })}
      tabIndex={-1}
      className={variant === 'drawer'
        ? 'wigmix-camera-drawer absolute inset-x-0 bottom-0 z-50 flex animate-slideup flex-col items-center gap-4 rounded-t-2xl bg-white p-4 shadow-lg dark:bg-neutral-900'
        : 'flex flex-1 flex-col items-center justify-center gap-4 p-4'}
      onKeyDown={handleKeyDown}
    >
      {cameraError ? (
        <p role='alert' className='m-0 max-w-sm text-center text-sm text-red-600 dark:text-red-400'>
          {intl.formatMessage({ id: 'a11yCameraError' })}
        </p>
      ) : (
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat='image/jpeg'
          className='rounded-lg max-w-full'
          videoConstraints={{ facingMode }}
          aria-label={intl.formatMessage({ id: 'a11yCameraPreview' })}
          onUserMediaError={() => setCameraError(true)}
        />
      )}
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
                    'text-neutral-900 dark:text-neutral-100 disabled:opacity-50',
                    FOCUS_VISIBLE_CLASSES,
                )}
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yTakePhoto' })}
                title={intl.formatMessage({ id: 'a11yTakePhoto' })}
                disabled={cameraError}
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
                onClick={() => {
                  setCameraError(false);
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                }}>
          <ArrowPathIcon className='size-5 cursor-pointer' color={iconColor} />
        </button>
      </div>
    </div>
  );
};

export default WebcamCapture;
