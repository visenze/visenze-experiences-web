import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useState } from 'react';
import { Button } from '@heroui/button';
import { useIntl } from 'react-intl';
import PhotoIcon from '../../../common/icons/PhotoIcon';
import VisenzeModal from '../../../common/components/modal/visenze-modal';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import FileDropzone from '../../../common/components/FileDropzone';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';
import CloseIcon from '../../../common/icons/CloseIcon';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import UploadIcon from '../../../common/icons/UploadIcon';

interface ImageGalleryUploadProps {
  imageUploadHandler: (image: SearchImage) => void;
  placementId: string;
  image: SearchImage | undefined;
}

const ImageGalleryUpload: FC<ImageGalleryUploadProps> = ({ imageUploadHandler, placementId, image }) => {
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
    const handleImageAppended = (e: any): void => {
      if (e.detail && (e.detail.imgUrl || e.detail.file)) {
        setSearchImage(e.detail);
      } else {
        setSearchImage(undefined);
      }
    };
    document.addEventListener('wigmix_search_bar_append_image', handleImageAppended);
    return (): void => {
      document.removeEventListener('wigmix_search_bar_append_image', handleImageAppended);
    };
  }, []);

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
            className='row-span-1 border-none relative'
            onClick={(): void => onGallerySelect(index)}
            onKeyDown={(evt): void => {
              if (evt.key === 'Enter') {
                onGallerySelect(index);
              }
            }}
          >
            <img className='h-full object-contain' src={imageWithLabel.url} data-pw={`sb-gallery-image-${index + 1}`}/>
            {imageWithLabel.label && (
              <div className='absolute bottom-0 z-10 w-full text-center overflow-hidden
            border-1 border-white/20 bg-gray-800 bg-opacity-80 py-1 text-white shadow-small'>
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
    <div className='md:flex'>
      <Button isIconOnly className='rounded-full bg-zinc-100' onClick={onIconClickHandler} data-pw='sb-gallery-button'>
        {searchImage && (
            <>
              {isImageUrl(searchImage) && (
                  <img src={searchImage.imgUrl} />
              )}
              {isImageDataUrl(searchImage) && (
                  <img src={searchImage.file} />
              )}
              {!isImageUrl(searchImage) && !isImageDataUrl(searchImage) && (
                  <PhotoIcon className='size-6'/>
              )}
            </>
        )}
        {!searchImage && (
            <PhotoIcon className='size-6'/>
        )}
      </Button>

      <VisenzeModal open={openModal} onClose={onCloseHandler} layout={breakpoint} position='center'
                    darkMode={darkMode}
                    fontFamily={customizations.generalLayout?.fontFamily}
                    placementId={placementId} idSuffix='image-gallery-upload'>
        <div className='relative flex size-full flex-col bg-primary'>
          {/* Title */}
          <p className='widget-title py-4 text-center text-primary' data-pw='sb-image-upload-title'>
            {intl.formatMessage({ id: 'uploadScreenTitle' })}
          </p>

          {/* Close Button */}
          <Button isIconOnly className='absolute right-5 top-3 bg-transparent' onClick={onCloseHandler} data-pw='sb-close-button'>
            <CloseIcon className='size-6'/>
          </Button>

          <div className='flex flex-col pb-5 md:flex-row'>
            <div className='px-1/5 md:w-1/3 md:px-10'>
              <FileDropzone onImageUpload={onImageUpload} name='sb-image-upload'>
                <div
                  className='wigmix-reference-image-container flex w-full flex-col items-center rounded-3xl border border-gray-300 py-1 text-center'>
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
                    className='h-full relative'
                    onClick={(): void => onGallerySelect(0)}
                    onKeyDown={(evt): void => {
                      if (evt.key === 'Enter') {
                        onGallerySelect(0);
                      }
                    }}>
                    <img className='h-full object-contain' src={customizations.imageUpload?.images[0].url}
                         data-pw='sb-gallery-image-1'/>
                    {customizations.imageUpload?.images[0].label && (
                      <div className='absolute bottom-0 z-10 w-full text-center overflow-hidden border-1
                    border-white/20 bg-gray-800 bg-opacity-80 py-1 text-white shadow-small'>
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
      </VisenzeModal>
    </div>
  );
};

export default ImageGalleryUpload;
