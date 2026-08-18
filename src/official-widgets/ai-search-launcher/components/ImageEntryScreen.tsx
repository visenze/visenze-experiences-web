import { cn } from '@heroui/theme';
import { type FC, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import WebcamCapture from './WebcamCapture';
import FileDropzone from '../../../common/components/FileDropzone';
import Footer from '../../../common/components/Footer';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import UploadIcon from '../../../common/icons/UploadIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';
import { FOCUS_VISIBLE_CLASSES } from '../constants';
import type { UseLauncherChatResult } from '../use-launcher-chat';

interface ImageEntryScreenProps {
  chat: UseLauncherChatResult;
}

// Full-screen welcome state for the image-search entry point (spec §5.1), styled after
// camera-search's UploadScreen: a drag-drop/tap upload panel (shared `FileDropzone` primitive)
// with a camera link that opens `WebcamCapture` (this widget's own copy of shopping-assistant's
// `CameraCaptureDrawer` webcam pattern), plus an optional preset image gallery driven by the
// generic `customizations.imageUpload` config. Every path feeds the picked/captured/selected image
// straight into the chat as the initial query — no intermediate results screen (confirmed
// decision, spec §5.1; results stay in the chat surface, unlike camera-search's own ResultScreen).
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
  const galleryImages = customizations.imageUpload?.images || [];

  const handleImage = (image: SearchImage): void => {
    chat.sendMessage(undefined, image);
  };

  const closeWebcam = useCallback((): void => {
    setShowWebcam(false);
    openCameraButtonRef.current?.focus();
  }, []);

  // Preset gallery images (camera-search's UploadScreen pattern) are plain URLs, but this
  // screen's only way to feed an image into the chat is `chat.sendMessage`'s image param, which
  // only attaches an actual File to the outgoing request (see use-launcher-chat's isImageFile
  // check) — a bare `imgUrl` never reaches the backend as image bytes. Fetching the preset URL
  // into a File first (same fetch-to-blob-to-File conversion WebcamCapture already does for
  // webcam screenshots) keeps this working through the same File-based path.
  const handleGallerySelect = (url: string): void => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `${Date.now()}`, { type: blob.type || 'image/jpeg' });
        handleImage({ files: [file], file: url });
      });
  };

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

  // Mirrors camera-search's UploadScreen: images[0] renders alone as a tall "hero" tile, the rest
  // form a 2x2 subgrid beside it, rather than a uniform grid of equally-sized tiles.
  const [heroImage, ...restGalleryImages] = galleryImages;

  const renderGalleryTile = (imageWithLabel: { url: string; label?: string }, index: number): ReactNode => (
    <button
      key={imageWithLabel.url}
      type='button'
      data-testid={`wigmix-gallery-image-${index + 1}`}
      className={cn('relative h-full overflow-hidden rounded-md border-0 p-0', FOCUS_VISIBLE_CLASSES)}
      onClick={() => handleGallerySelect(imageWithLabel.url)}
    >
      <img
        className='size-full object-cover'
        src={imageWithLabel.url}
        alt={imageWithLabel.label || intl.formatMessage({ id: 'a11yUploadImage' })}
      />
      {imageWithLabel.label && (
        <div className='absolute bottom-0 z-10 w-full overflow-hidden bg-gray-800 bg-opacity-80 py-1 text-center text-xs text-white'>
          {imageWithLabel.label}
        </div>
      )}
    </button>
  );

  return (
    <div className='flex flex-1 flex-col items-center gap-6 overflow-y-auto p-6 text-center'>
      <p className='m-0 max-w-xs text-base' style={{ color: fontColor }}>
        {promptText}
      </p>
      <div className={cn('flex w-full flex-1 flex-col gap-6', galleryImages.length > 0 && 'md:flex-row md:items-start md:text-start')}>
        <div className={cn('flex flex-col items-center gap-3', galleryImages.length > 0 && 'md:w-1/3')}>
          <FileDropzone onImageUpload={handleImage} name='asl-image-entry' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
            <div className='flex flex-col items-center gap-2 rounded-xl border border-gray bg-transparent p-6'>
              {customizations.imageUpload?.icon?.url ? (
                <CustomizableIcon
                  height={64}
                  width={64}
                  url={customizations.imageUpload.icon.url}
                  color={darkMode
                    ? (customizations.imageUpload.icon.colorDark || '')
                    : (customizations.imageUpload.icon.color || '')}
                />
              ) : (
                <UploadIcon className='size-16' color={fontColor} />
              )}
              <p className='m-0 hidden text-sm md:block' style={{ color: fontColor }}>
                {intl.formatMessage({ id: 'dragImageToSearch' })}
              </p>
              <p className='m-0 text-sm md:hidden' style={{ color: fontColor }}>
                {intl.formatMessage({ id: 'tapToSearchImage' })}
              </p>
            </div>
          </FileDropzone>
          <button
            ref={openCameraButtonRef}
            type='button'
            aria-label={intl.formatMessage({ id: 'a11yTakePhoto' })}
            className={cn('w-full rounded-md border-0 bg-transparent p-1 text-sm underline', FOCUS_VISIBLE_CLASSES)}
            style={{ color: fontColor }}
            onClick={() => setShowWebcam(true)}
          >
            {intl.formatMessage({ id: 'useCamera' })}
          </button>
        </div>

        {galleryImages.length > 0 && (
          <div className='flex flex-col gap-3 md:w-2/3'>
            <p className='m-0 text-sm' style={{ color: fontColor }}>
              {intl.formatMessage({ id: 'tapProductGallery' })}
            </p>
            <div className='grid grid-cols-2 gap-2 md:gap-4'>
              {heroImage && renderGalleryTile(heroImage, 0)}
              {restGalleryImages.length > 0 && (
                <div className='grid grid-cols-2 gap-2 md:gap-4'>
                  {restGalleryImages.map((imageWithLabel, index) => renderGalleryTile(imageWithLabel, index + 1))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer darkMode={darkMode} className='mt-auto pt-2' dataPw='asl-visenze-footer' />
      )}
    </div>
  );
};

export default ImageEntryScreen;
