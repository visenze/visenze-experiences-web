import { cn } from '@heroui/theme';
import { type FC, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Webcam from 'react-webcam';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import ArrowPathIcon from '../../icons/ArrowPathIcon';
import CameraIcon from '../../icons/CameraIcon';
import UturnLeftIcon from '../../icons/UturnLeftIcon';
import type { SearchImage } from '../../types/image';

// i18n contract: this component calls `intl.formatMessage` for the following ids, so any widget
// consuming it must provide all of them in its own DEFAULT_TEXTS/locale files: a11yCameraDrawer,
// a11yCameraPreview, a11yCloseCamera, a11yTakePhoto, a11ySwitchCamera.
interface CameraCaptureDrawerProps {
  iconColor?: string;
  onClose: () => void;
  onCapture: (image: SearchImage) => void;
}

// Live camera-capture bottom sheet: webcam ref, facingMode toggle, capture-to-blob-to-File
// conversion, the Shadow-DOM-aware focus trap / Escape-to-close. Kept generic (a single resolved
// `iconColor` rather than a darkMode/light/dark trio) so any widget's input bar can drop it in.
const CameraCaptureDrawer: FC<CameraCaptureDrawerProps> = ({ iconColor, onClose, onCapture }) => {
  const intl = useIntl();
  const webcamRef = useRef<Webcam>(null);
  const closeCameraButtonRef = useRef<HTMLButtonElement>(null);
  const takePhotoButtonRef = useRef<HTMLButtonElement>(null);
  const switchCameraButtonRef = useRef<HTMLButtonElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

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
    // document.activeElement doesn't pierce the Shadow DOM the widget renders in (it only
    // reports the shadow host), so it never matches these controls in production. Reading
    // activeElement off the event's own root (the Shadow DOM when present, else document)
    // works in both contexts.
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
        onClose();
      });
  }, [onCapture, onClose]);

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={intl.formatMessage({ id: 'a11yCameraDrawer' })}
      tabIndex={-1}
      className='wigmix-camera-drawer absolute inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-800 shadow-lg flex flex-col items-center p-4 animate-slideup'
      style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, minHeight: 340 }}
      onKeyDown={handleKeyDown}
    >
      <div className='w-full flex justify-center'>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat='image/jpeg'
          className='rounded-lg max-w-full'
          videoConstraints={{ facingMode }}
          aria-label={intl.formatMessage({ id: 'a11yCameraPreview' })}
        />
      </div>
      <div className='w-full flex gap-2 mt-2'>
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
                onClick={() => {
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                }}>
          <ArrowPathIcon className='size-5 cursor-pointer' color={iconColor} />
        </button>
      </div>
    </div>
  );
};

export default CameraCaptureDrawer;
