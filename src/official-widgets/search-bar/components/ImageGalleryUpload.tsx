import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useState } from 'react';
import { Button } from '@nextui-org/button';
import { Card, CardFooter } from '@nextui-org/card';
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

interface ImageGalleryUploadProps {
  imageUploadHandler: (image: SearchImage) => void;
  placementId: string;
  image: SearchImage | undefined;
}

const ImageGalleryUpload: FC<ImageGalleryUploadProps> = ({ imageUploadHandler, placementId, image }) => {
  const { widgetConfig } = useContext(WidgetDataContext);
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
        if (index === 0) return null;
        return (
          <Card
            key={index}
            isPressable
            radius='lg'
            className='row-span-1 border-none'
            onClick={(): void => onGallerySelect(index)}
            onKeyDown={(evt): void => {
              if (evt.key === 'Enter') {
                onGallerySelect(index);
              }
            }}
          >
            <img className='h-full object-cover' src={imageWithLabel.url} data-pw={`sb-gallery-image-${index + 1}`}/>
            {
              imageWithLabel.label
              && <CardFooter className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large
            border-1 border-white/20 bg-gray-800 bg-opacity-80 py-1 shadow-small before:rounded-b-xl'>
                <p className='text-primary'>{imageWithLabel.label}</p>
              </CardFooter>
            }
          </Card>
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
                  className='wigmix-reference-image flex w-full flex-col items-center rounded-3xl border border-gray-300 py-1 text-center'>
                  <CustomizableIcon
                      height={80}
                      width={80}
                      url={customizations.imageUpload?.icon?.url || 'https://cdn.visenze.com/images/upload-icon.svg'}
                      color={customizations.imageUpload?.icon?.color || ''}
                  />

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
                  <Card
                    isFooterBlurred
                    isPressable
                    radius='lg'
                    className='h-full'
                    onClick={(): void => onGallerySelect(0)}
                    onKeyDown={(evt): void => {
                      if (evt.key === 'Enter') {
                        onGallerySelect(0);
                      }
                    }}>
                    <img className='h-full object-cover' src={customizations.imageUpload?.images[0].url}
                         data-pw='sb-gallery-image-1'/>
                    {
                      customizations.imageUpload?.images[0].label
                      && <CardFooter
                        className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large border-1
                    border-white/20 bg-gray-800 bg-opacity-80 py-1 shadow-small before:rounded-b-xl'>
                        <p className='text-primary'>
                          {customizations.imageUpload?.images[0].label}
                        </p>
                      </CardFooter>
                    }
                  </Card>
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
