import type { FC, ReactNode } from 'react';
import { useContext, useEffect } from 'react';
import { Card, CardFooter } from '@nextui-org/card';
import { useIntl } from 'react-intl';
import FileDropzone from '../../../common/components/FileDropzone';
import type { SearchImage } from '../../../common/types/image';
import { WidgetDataContext } from '../../../common/types/contexts';
import { Actions, Category, Labels } from '../../../common/types/tracking-constants';
import Header from '../components/Header';
import Footer from '../../../common/components/Footer';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

interface UploadScreenProps {
  onModalClose: () => void;
  onImageUpload: (img: SearchImage) => void;
}

const UploadScreen: FC<UploadScreenProps> = ({ onModalClose, onImageUpload }) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();

  const onGallerySelect = (index: number): void => {
    // Send Upload Click Sample event when a gallery image is clicked
    widgetClient.sendEvent(Actions.CLICK, {
      cat: Category.UPLOAD,
      label: Labels.SAMPLE,
      pos: index + 1,
    });

    if (customizations) {
      onImageUpload?.({ imgUrl: customizations?.imageUpload?.images[index].url });
    }
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
            <img className='h-full object-cover' src={imageWithLabel.url} data-pw={`cs-gallery-image-${index + 1}`}/>
            {
              imageWithLabel.label
              && <CardFooter className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large
            border-1 border-white/20 bg-gray-800 bg-opacity-80 py-1 text-white shadow-small before:rounded-b-xl'>
                <p>{imageWithLabel.label}</p>
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
    widgetClient.sendEvent(Actions.LOAD, {
      cat: Category.UPLOAD,
      label: Labels.PAGE,
    });

    return (): void => {
      // Send Upload Close Page event on page close
      widgetClient.sendEvent(Actions.CLOSE, {
        cat: Category.UPLOAD,
        label: Labels.PAGE,
      });
    };
  }, []);

  return (
    <div className='w-full md:overflow-hidden'>
      <Header onCloseHandler={onModalClose} isResultScreen={false} onBackHandler={() => {}}
              showTitle={customizations.generalLayout?.showWidgetTitle}
              iconColor={customizations.generalLayout?.fontColor} />
      <div className='size-full'>
        <div className='flex flex-col pb-5 md:flex-row'>
          <div className='px-1/5 md:w-1/3 md:px-10'>
            <FileDropzone onImageUpload={onImageUpload} name='cs-upload-icon'>
              <div
                className='wigmix-reference-image flex w-full flex-col items-center rounded-3xl border border-gray-300 py-1 text-center'>
                <CustomizableIcon
                    height={80}
                    width={80}
                    url={customizations.imageUpload?.icon?.url || 'https://cdn.visenze.com/images/upload-icon.svg'}
                    color={customizations.imageUpload?.icon?.color || ''}
                />

                <p className='hidden px-3 py-2 leading-6 md:block'>
                  {intl.formatMessage({ id: 'dragImageToSearch' })}
                </p>

                <p className='px-6 pt-3 md:hidden'>
                  {intl.formatMessage({ id: 'tapToSearchImage' })}
                </p>
              </div>
            </FileDropzone>
          </div>

          <div className='py-5 md:w-2/3 md:border-l-2 md:border-gray-300 md:px-12 md:pt-0'>
            <p className='px-16 pb-3 text-center md:px-0 md:text-left'>
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
                  <img className='h-full object-cover' src={customizations.imageUpload?.images[0].url} data-pw='cs-gallery-image-1'/>
                  {
                    customizations.imageUpload?.images[0].label
                    && <CardFooter
                      className='absolute bottom-0 z-10 w-full justify-center overflow-hidden rounded-b-large border-1
                      border-white/20 bg-gray-800 bg-opacity-80 py-1 text-white shadow-small before:rounded-b-xl'>
                      <p>
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

          <div className='pb-5'>
            <FileDropzone onImageUpload={onImageUpload} name='cs-use-camera'>
              <div className='mx-16 mt-3 rounded-full bg-buttonPrimary py-2 text-center font-bold text-buttonPrimary hover:opacity-80 md:hidden'>
                {intl.formatMessage({ id: 'useCamera' })}
              </div>
            </FileDropzone>
          </div>
        </div>
      </div>

      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer className='sticky bottom-0 bg-primary py-2 md:absolute md:justify-start md:pl-20 lg:rounded-b-3xl' dataPw='cs-visenze-footer'/>
      )}
    </div>
  );
};

export default UploadScreen;
