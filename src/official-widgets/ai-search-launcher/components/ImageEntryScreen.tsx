import { cn } from '@heroui/theme';
import { type FC, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import WebcamCapture from '../../../common/components/chat/WebcamCapture';
import FileDropzone from '../../../common/components/FileDropzone';
import Footer from '../../../common/components/Footer';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import UploadIcon from '../../../common/icons/UploadIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';

interface ImageEntryScreenProps {
  chat: UseChatResult;
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
  const galleryColumnsClass = customizations.imageUpload?.galleryColumns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  const handleImage = (image: SearchImage): void => {
    chat.sendMessage(undefined, image);
  };

  const closeWebcam = useCallback((): void => {
    setShowWebcam(false);
    openCameraButtonRef.current?.focus();
  }, []);

  // Preset gallery images (camera-search's UploadScreen pattern, see its onGallerySelect) are
  // sent straight through as a URL — `chat.sendMessage` forwards an `imgUrl` to the backend as
  // `im_url` (use-chat.ts), which fetches it server-side. Converting it to a File in the browser
  // first would require the gallery host to send CORS headers just to serve an `<img>` tag, which
  // it generally won't (that's the plain-`<img src>` display path just above, not this one).
  const handleGallerySelect = (url: string): void => {
    handleImage({ imgUrl: url });
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
        onClose={closeWebcam}
        onCapture={handleImage}
      />
    );
  }

  // Mirrors camera-search's UploadScreen: images[0] renders alone as a tall "hero" tile, the rest
  // form a 2x2 subgrid beside it, rather than a uniform grid of equally-sized tiles. Capped at 4
  // "rest" tiles (regardless of how many are configured) so the grid stays a fixed 2x2 shape and
  // the welcome screen never grows tall enough to need a scrollbar.
  const [heroImage, ...restGalleryImages] = galleryImages;
  const visibleRestGalleryImages = restGalleryImages.slice(0, 4);

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
    <div className='mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-4 overflow-hidden p-4 text-center'>
      <p className='m-0 text-base font-semibold' style={{ color: fontColor }}>
        {promptText}
      </p>
      {/* Wrapped in a plain shrink-0 div rather than nesting FileDropzone directly in the root flex
          column: FileDropzone's own root has a hardcoded h-full, and the root column here has a
          definite height, so without this auto-height buffer FileDropzone would silently stretch
          to fill the whole screen and shove everything after it off-screen. */}
      <div className='shrink-0'>
        <FileDropzone onImageUpload={handleImage} name='asl-image-entry' ariaLabel={intl.formatMessage({ id: 'a11yUploadImage' })}>
          <div
            data-testid='asl-image-dropzone'
            className='flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 dark:border-neutral-700 dark:bg-neutral-900/40'
          >
            {customizations.imageUpload?.icon?.url ? (
              <CustomizableIcon
                height={40}
                width={40}
                url={customizations.imageUpload.icon.url}
                color={darkMode
                  ? (customizations.imageUpload.icon.colorDark || '')
                  : (customizations.imageUpload.icon.color || '')}
              />
            ) : (
              <UploadIcon className='size-10' color={fontColor} />
            )}
            <p className='m-0 text-sm' style={{ color: fontColor }}>
              {intl.formatMessage({ id: 'dragImageToSearch' })}
            </p>
            <div className='flex w-full gap-3'>
              {/* No onClick: a click anywhere inside FileDropzone's root (including this button) already
                  opens the native file picker via react-dropzone's own bubbled root click handler. */}
              <button
                type='button'
                className={cn('flex-1 rounded-lg border border-gray bg-buttonPrimary px-4 py-2.5 text-sm text-buttonPrimary', FOCUS_VISIBLE_CLASSES)}
              >
                {intl.formatMessage({ id: 'browsePhotos' })}
              </button>
              <button
                ref={openCameraButtonRef}
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yTakePhoto' })}
                className={cn('flex-1 rounded-lg border border-gray bg-buttonSecondary px-4 py-2.5 text-sm', FOCUS_VISIBLE_CLASSES)}
                style={{ color: fontColor }}
                onClick={(event) => {
                  // Stop the click from bubbling into FileDropzone's root handler, which would
                  // otherwise also pop the native file picker open behind the webcam view.
                  event.stopPropagation();
                  setShowWebcam(true);
                }}
              >
                {intl.formatMessage({ id: 'useCamera' })}
              </button>
            </div>
          </div>
        </FileDropzone>
      </div>

      {galleryImages.length > 0 && (
        <div className='flex flex-col gap-2 overflow-hidden'>
          <p className='m-0 text-left text-sm text-gray-500 dark:text-gray-400'>
            {intl.formatMessage({ id: 'tapProductGallery' })}
          </p>
          {/* Fixed (not flex-grown) height: h-full tiles inside a CSS grid need a definite row
              height to resolve against, and it also guarantees this section can never push the
              screen tall enough to need a scrollbar, regardless of viewport size. */}
          <div data-testid='asl-gallery-grid' className={cn('grid h-56 auto-rows-fr gap-2 md:h-80', galleryColumnsClass)}>
            {heroImage && renderGalleryTile(heroImage, 0)}
            {visibleRestGalleryImages.length > 0 && (
              <div className={cn('grid h-full grid-rows-2 gap-2', galleryColumnsClass)}>
                {visibleRestGalleryImages.map((imageWithLabel, index) => renderGalleryTile(imageWithLabel, index + 1))}
              </div>
            )}
          </div>
        </div>
      )}

      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer darkMode={darkMode} className='mt-auto shrink-0 pt-2' dataPw='asl-visenze-footer' />
      )}
    </div>
  );
};

export default ImageEntryScreen;
