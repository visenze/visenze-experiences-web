import { cn } from '@heroui/theme';
import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import FileDropzone from '../../../common/components/FileDropzone';
import Footer from '../../../common/components/Footer';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import VisenzeModal from '../../../common/components/modal/visenze-modal';
import CloseIcon from '../../../common/icons/CloseIcon';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import PhotoIcon from '../../../common/icons/PhotoIcon';
import UploadIcon from '../../../common/icons/UploadIcon';
import { WidgetBreakpoint } from '../../../common/types/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';

interface ImageGalleryUploadProps {
  imageUploadHandler: (image: SearchImage | undefined) => void;
  placementId: string;
  image: SearchImage | undefined;
  renderModalWithoutPortal: boolean;
}

const ImageGalleryUpload: FC<ImageGalleryUploadProps> = ({ imageUploadHandler, placementId, image, renderModalWithoutPortal }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [openModal, setOpenModal] = useState(false);
  const [searchImage, setSearchImage] = useState<SearchImage>();
  const breakpoint = useBreakpoint();
  const intl = useIntl();

  const onIconClickHandler = (): void => {
    setOpenModal(true);
  };

  const onCloseHandler = (): void => {
    setOpenModal(false);
  };

  useEffect(() => {
    setSearchImage(image);
  }, [image]);

  const onImageUpload = (im: SearchImage): void => {
    imageUploadHandler(im);
    setOpenModal(false);
  };

  const onGallerySelect = (index: number): void => {
    if (customizations.imageUpload?.images[index]) {
      imageUploadHandler?.({ imgUrl: customizations.imageUpload.images[index].url });
    }
    setOpenModal(false);
  };

  const getGalleryCards = (): ReactNode => {
    if (customizations) {
      return Object.entries(customizations.imageUpload?.images || []).map(([, imageWithLabel], index) => {
        if (index === 0) {
          return null;
        }
        return (
          <div
            key={index}
            className='relative row-span-1 border-none'
            onClick={(): void => onGallerySelect(index)}
            onKeyDown={(evt): void => {
              if (evt.key === 'Enter') {
                onGallerySelect(index);
              }
            }}
          >
            <img className='h-full w-fit object-cover' src={imageWithLabel.url} data-pw={`sb-gallery-image-${index + 1}`}/>
            {imageWithLabel.label && (
              <div className='absolute bottom-0 z-10 w-full overflow-hidden border-1
            border-white/20 bg-gray-800 bg-opacity-80 py-1 text-center text-white shadow-small'>
                <p>{imageWithLabel.label}</p>
              </div>
            )}
          </div>
        );
      });
    }

    return <></>;
  };

  return (
    <div className='relative flex'>
      <div className='flex items-center justify-center rounded-full bg-zinc-100 cursor-pointer size-10' onClick={onIconClickHandler}
           data-testid='wigmix-sb-gallery-button' data-pw='sb-gallery-button'>
        {searchImage && (
            <>
              {isImageUrl(searchImage) && (
                  <img className='rounded-full aspect-square object-cover' src={searchImage.imgUrl} />
              )}
              {isImageDataUrl(searchImage) && (
                  <img className='rounded-full aspect-square object-cover' src={searchImage.file} />
              )}
              {!isImageUrl(searchImage) && !isImageDataUrl(searchImage) && (
                  <PhotoIcon className='size-6'/>
              )}
            </>
        )}
        {!searchImage && (
            <PhotoIcon className='size-6'/>
        )}
      </div>

      {searchImage && (
        <div
          className='absolute -right-1 -top-1 z-20 cursor-pointer rounded-full bg-white'
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setSearchImage(undefined);
            imageUploadHandler(undefined);
          }}
        >
          <CloseIcon className='size-4'/>
        </div>
      )}

      <VisenzeModal open={openModal} onClose={onCloseHandler} layout={breakpoint} position='center'
                    className={breakpoint !== WidgetBreakpoint.MOBILE ? 'h-fit' : ''}
                    renderWithoutPortal={!!renderModalWithoutPortal}
                    darkMode={darkMode}
                    fontFamily={customizations.generalLayout?.fontFamily}
                    placementId={placementId} idSuffix='image-gallery-upload'>
        <div className='flex size-full flex-col'>
          <div className='relative flex w-full items-center justify-center py-4'>
            {/* Title */}
            <p className='wigmix-widget-title px-16 md:px-0 text-center' data-pw='sb-image-upload-title'>
              {intl.formatMessage({ id: 'uploadScreenTitle' })}
            </p>

            {/* Close Button */}
            <div className='absolute right-5 top-3 rounded-full p-1 bg-transparent hover:opacity-90'
                 onClick={onCloseHandler} data-testid='wigmix-sb-close-button' data-pw='sb-close-button'>
              <CloseIcon className='size-6 cursor-pointer' />
            </div>
          </div>

          <div className='overflow-y-scroll'>
            <div className='flex flex-col pb-5 md:flex-row overflow-y-scroll'>
              <div className='px-1/5 md:w-1/3 md:px-10'>
                <FileDropzone onImageUpload={onImageUpload} name='sb-image-upload'>
                  <div className={cn(
                      'wigmix-reference-image-container flex size-full flex-col items-center justify-center text-center',
                      'py-4 md:py-0 border rounded-xl border-gray md:border-0',
                  )}>
                    {customizations.imageUpload?.icon?.url ? (
                        <CustomizableIcon
                            height={80}
                            width={80}
                            url={customizations.imageUpload.icon.url}
                            color={darkMode
                                ? (customizations.imageUpload.icon.colorDark || '')
                                : (customizations.imageUpload.icon.color || '')}
                        />
                    ) : (
                        <UploadIcon className='size-20'
                                    color={darkMode
                                        ? (customizations.imageUpload?.icon?.colorDark || '')
                                        : (customizations.imageUpload?.icon?.color || '')} />
                    )}

                    <p className='hidden px-3 py-2 leading-6 text-primary md:block'>
                      {intl.formatMessage({ id: 'dragImageToSearch' })}
                    </p>

                    <p className='pt-3 leading-6 text-primary md:hidden'>
                      {intl.formatMessage({ id: 'tapToSearchImage' })}
                    </p>
                  </div>
                </FileDropzone>
              </div>

              <div className='py-5 md:w-2/3 md:border-l-2 md:border-gray-300 md:px-12 md:pt-0'>
                <p className='px-14 pb-3 text-center text-primary md:px-0 md:text-left'>
                  {intl.formatMessage({ id: 'tapProductGallery' })}
                </p>

                <div className='grid grid-cols-2 gap-2 px-5 md:gap-4 md:px-0'>
                  <div className='col-span-1'>
                    <div
                        className='relative h-full'
                        onClick={(): void => onGallerySelect(0)}
                        onKeyDown={(evt): void => {
                          if (evt.key === 'Enter') {
                            onGallerySelect(0);
                          }
                        }}>
                      <img className='h-full w-fit object-cover' src={customizations.imageUpload?.images[0].url}
                           data-pw='sb-gallery-image-1'/>
                      {customizations.imageUpload?.images[0].label && (
                          <div className='absolute bottom-0 z-10 w-full overflow-hidden border-1 border-white/20
                    bg-gray-800 bg-opacity-80 py-1 text-center text-white shadow-small'>
                            <p>{customizations.imageUpload?.images[0].label}</p>
                          </div>
                      )}
                    </div>
                  </div>
                  <div className='col-span-1'>
                    <div className='grid grid-cols-2 gap-2 md:gap-4'>
                      {getGalleryCards()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {customizations.generalLayout?.showViSenzeLogo && (
              <Footer darkMode={darkMode} className='sticky bottom-0 bg-primary py-2 md:absolute lg:rounded-b-3xl' dataPw='cs-visenze-footer'/>
          )}
        </div>
      </VisenzeModal>
    </div>
  );
};

export default ImageGalleryUpload;
