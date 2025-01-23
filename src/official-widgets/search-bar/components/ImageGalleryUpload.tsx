import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useState } from 'react';
import { Button } from '@nextui-org/button';
import { Card, CardFooter } from '@nextui-org/card';
import { useIntl } from 'react-intl';
import PhotoIcon from '../../../common/icons/PhotoIcon';
import VisenzeModal from '../../../common/components/modal/visenze-modal';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import FileDropzone from '../../../common/components/FileDropzone';
import UploadIcon from '../../../common/icons/UploadIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { ImageFile, ImageUrl, SearchImage } from '../../../common/types/image';
import CloseIcon from '../../../common/icons/CloseIcon';

interface ImageGalleryUploadProps {
  imageUploadHandler: (image: SearchImage) => void;
  placementId: string;
}

const ImageGalleryUpload: FC<ImageGalleryUploadProps> = ({ imageUploadHandler, placementId }) => {
  const { customizations } = useContext(WidgetDataContext);
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
      setSearchImage(e.detail);
    };
    document.addEventListener('wigmix_search_bar_append_image', handleImageAppended);
    return (): void => {
      document.removeEventListener('wigmix_search_bar_append_image', handleImageAppended);
    };
  }, []);

  const createImageEvent = (image: SearchImage): void => {
    const event = new CustomEvent('wigmix_search_bar_append_image', { detail: image });
    document.dispatchEvent(event);
  };

  const onImageUpload = (image: SearchImage): void => {
    imageUploadHandler(image);
    createImageEvent(image);
    setOpenModal(false);
  };

  const onGallerySelect = (index: number): void => {
    if (customizations && customizations.images[index]) {
      imageUploadHandler?.({ imgUrl: customizations.images[index].url });
      createImageEvent({ imgUrl: customizations.images[index].url });
    }
    setOpenModal(false);
  };

  const getGalleryCards = (): ReactNode => {
    if (customizations) {
      return Object.entries(customizations.images).map(([, imageWithLabel], index) => {
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
            <img className='object-fit h-full' src={imageWithLabel.url} data-pw={`sb-gallery-image-${index + 1}`}/>
            {
              imageWithLabel.label
              && <CardFooter className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large
            border-1 border-white/20 bg-gray-800 bg-opacity-80 py-1 shadow-small before:rounded-b-xl'>
                <p className='calls-to-action-text text-primary'>{imageWithLabel.label}</p>
              </CardFooter>
            }
          </Card>
        );
      });
    }

    return <></>;
  };

  return (
    <div className='flex'>
      <Button isIconOnly className='rounded-full bg-zinc-100' onClick={onIconClickHandler} data-pw='sb-gallery-button'>
        {searchImage && (
            <>
              {(searchImage as ImageUrl).imgUrl && (
                  <img src={(searchImage as ImageUrl).imgUrl} />
              )}
              {(searchImage as ImageFile).file && (
                  <img src={(searchImage as ImageFile).file} />
              )}
            </>
        )}
        {!searchImage && (
            <PhotoIcon className='size-6'/>
        )}
      </Button>

      <VisenzeModal open={openModal} onClose={onCloseHandler} layout={breakpoint} position='center'
                    placementId={placementId} idSuffix='image-gallery-upload'>
        <div className='relative flex size-full flex-col bg-primary'>
          {/* Title */}
          <p className='widget-title py-4 text-center text-primary' data-pw='sb-image-upload-title'>
            {intl.formatMessage({ id: 'searchBar.uploadScreenTitle.part1' })}&nbsp;
            <br className='md:hidden'/>
            {intl.formatMessage({ id: 'searchBar.uploadScreenTitle.part2' })}
          </p>

          {/* Close Button */}
          <Button isIconOnly className='absolute right-5 top-3 bg-transparent' onClick={onCloseHandler} data-pw='sb-close-button'>
            <CloseIcon className='size-6'/>
          </Button>

          <div className='flex flex-col pb-5 md:flex-row'>
            <div className='px-1/5 md:w-1/3 md:px-10'>
              <FileDropzone onImageUpload={onImageUpload} name='sb-image-upload'>
                <div
                  className='flex w-full flex-col items-center rounded-3xl border border-black py-1 text-center text-medium'>
                  {
                    customizations?.icons.upload
                      ? <img className='w-3/5 rounded-lg object-cover object-center lg:h-full'
                             src={customizations?.icons.upload}/>
                      : <UploadIcon className='size-2/5 py-5'/>
                  }

                  <p className='calls-to-action-text hidden px-3 py-2 leading-6 text-primary md:block'>
                    {intl.formatMessage({ id: 'searchBar.dragImageToSearch.part1' })}<br/>
                    {intl.formatMessage({ id: 'searchBar.dragImageToSearch.part2' })}&nbsp;
                    <span className='underline'>
                  {intl.formatMessage({ id: 'searchBar.dragImageToSearch.part3' })}
                </span>
                  </p>

                  <p className='calls-to-action-text pt-3 leading-6 text-primary md:hidden'>
                    {intl.formatMessage({ id: 'searchBar.tapToSearchImage.part1' })}
                    <br className='md:hidden'/>
                    {intl.formatMessage({ id: 'searchBar.tapToSearchImage.part2' })}
                  </p>
                </div>
              </FileDropzone>
            </div>

            <div className='py-5 md:w-2/3 md:border-l-2 md:border-gray-300 md:px-12 md:pt-0'>
              <p className='calls-to-action-text px-14 pb-3 text-center text-primary md:px-0 md:text-left'>
                {intl.formatMessage({ id: 'searchBar.tapProductGallery.part1' })}&nbsp;
                <br className='md:hidden'/>
                {intl.formatMessage({ id: 'searchBar.tapProductGallery.part2' })}
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
                    <img className='object-fit h-full' src={customizations?.images[0].url}
                         data-pw='sb-gallery-image-1'/>
                    {
                      customizations?.images[0].label
                      && <CardFooter
                        className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large border-1
                    border-white/20 bg-gray-800 bg-opacity-80 py-1 shadow-small before:rounded-b-xl'>
                        <p className='calls-to-action-text text-primary'>
                          {customizations?.images[0].label}
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
