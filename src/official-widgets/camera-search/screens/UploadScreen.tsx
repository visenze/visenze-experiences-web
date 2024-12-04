import type { FC, ReactNode } from 'react';
import { useContext, useEffect } from 'react';
import { Card, CardFooter } from '@nextui-org/card';
import { useIntl } from 'react-intl';
import FileDropzone from '../../../common/components/FileDropzone';
import type { ScreenType } from '../../../common/types/constants';
import type { SearchImage } from '../../../common/types/image';
import { WidgetDataContext } from '../../../common/types/contexts';
import { Actions, Category, Labels } from '../../../common/types/tracking-constants';
import Header from '../components/Header';
import Footer from '../../../common/components/Footer';
import UploadIcon from '../../../common/icons/UploadIcon';

interface UploadScreenProps {
  onModalClose: () => void;
  setScreen: (screen: ScreenType) => void;
  onImageUpload: (img: SearchImage) => void;
}

const UploadScreen: FC<UploadScreenProps> = ({ onModalClose, onImageUpload }) => {
  const { productSearch, customizations } = useContext(WidgetDataContext);
  const intl = useIntl();

  const onGallerySelect = (index: number): void => {
    // Send Upload Click Sample event when a gallery image is clicked
    productSearch.sendEvent(Actions.CLICK, {
      cat: Category.UPLOAD,
      label: Labels.SAMPLE,
      pos: index + 1,
    });

    if (customizations) {
      onImageUpload?.({ imgUrl: customizations?.images[index].url });
    }
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
            <img className='object-fit h-full' src={imageWithLabel.url} data-pw={`cs-gallery-image-${index + 1}`}/>
            {
              imageWithLabel.label
              && <CardFooter className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large
            border-1 border-white/20 bg-gray-800 bg-opacity-80 py-1 shadow-small before:rounded-b-xl'>
                <p className='wigmix-calls-to-action-text text-primary'>{imageWithLabel.label}</p>
              </CardFooter>
            }
          </Card>
        );
      });
    }

    return <></>;
  };

  useEffect(() => {
    // Send Upload Load Page event on page load
    productSearch.sendEvent(Actions.LOAD, {
      cat: Category.UPLOAD,
      label: Labels.PAGE,
    });

    return (): void => {
      // Send Upload Close Page event on page close
      productSearch.sendEvent(Actions.CLOSE, {
        cat: Category.UPLOAD,
        label: Labels.PAGE,
      });
    };
  }, []);

  return (
    <div className='w-full md:overflow-hidden'>
      <Header onCloseHandler={onModalClose} />
      <div className='size-full bg-primary'>
        <div className='flex flex-col pb-5 md:flex-row'>
          <div className='px-1/5 md:w-1/3 md:px-10'>
            <FileDropzone onImageUpload={onImageUpload} name='cs-upload-icon'>
              <div
                className='flex w-full flex-col items-center rounded-3xl border border-black py-1 text-center text-medium'>
                {
                  customizations?.icons.upload
                    ? <img className='w-3/5 rounded-lg object-cover object-center lg:h-full' src={customizations?.icons.upload}/>
                    : <UploadIcon className='size-2/5 py-5'/>
                }

                <p className='wigmix-calls-to-action-text hidden px-3 py-2 leading-6 text-primary md:block'>
                  {intl.formatMessage({ id: 'cameraSearch.dragImageToSearch.part1' })}<br/>
                  {intl.formatMessage({ id: 'cameraSearch.dragImageToSearch.part2' })}&nbsp;
                  <span className='underline'>
                    {intl.formatMessage({ id: 'cameraSearch.dragImageToSearch.part3' })}
                  </span>
                </p>

                <p className='wigmix-calls-to-action-text pt-3 leading-6 text-primary md:hidden'>
                  {intl.formatMessage({ id: 'cameraSearch.tapToSearchImage.part1' })}
                  <br className='md:hidden'/>
                  {intl.formatMessage({ id: 'cameraSearch.tapToSearchImage.part2' })}
                </p>
              </div>
            </FileDropzone>
          </div>

          <div className='py-5 md:w-2/3 md:border-l-2 md:border-gray-300 md:px-12 md:pt-0'>
            <p className='wigmix-calls-to-action-text px-14 pb-3 text-center text-primary md:px-0 md:text-left'>
              {intl.formatMessage({ id: 'cameraSearch.tapProductGallery.part1' })}&nbsp;
              <br className='md:hidden'/>
              {intl.formatMessage({ id: 'cameraSearch.tapProductGallery.part2' })}
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
                  <img className='object-fit h-full' src={customizations?.images[0].url} data-pw='cs-gallery-image-1'/>
                  {
                    customizations?.images[0].label
                    && <CardFooter
                      className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large border-1
                      border-white/20 bg-gray-800 bg-opacity-80 py-1 shadow-small before:rounded-b-xl'>
                      <p className='wigmix-calls-to-action-text text-primary'>
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

          <div className='pb-5'>
            <FileDropzone onImageUpload={onImageUpload} name='cs-use-camera'>
              <div className='mx-16 mt-3 rounded-full bg-buttonPrimary py-2 text-center font-bold text-buttonPrimary md:hidden'>
                {intl.formatMessage({ id: 'cameraSearch.useCamera' })}
              </div>
            </FileDropzone>
          </div>
        </div>
      </div>

      <Footer className='sticky bottom-0 bg-white py-2 md:absolute md:justify-start md:pl-20 lg:rounded-b-3xl' dataPw='cs-visenze-footer'/>
    </div>
  );
};

export default UploadScreen;
