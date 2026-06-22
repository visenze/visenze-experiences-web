import { Spinner } from '@heroui/spinner';
import type { FC } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import GalleryImage from './components/GalleryImage';
import HotspotRecommendations from './components/HotspotRecommendations';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../common/client/endpoint';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import HotspotContainer from '../../common/components/hotspots/hotspot-container';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import CroppingProvider from '../../common/components/providers/CroppingProvider';
import { RootContext } from '../../common/components/shadow-wrapper';
import CloseIcon from '../../common/icons/CloseIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import type { BoxData, ProcessedProduct } from '../../common/types/product';
import { getFlattenProducts, getProductGridCssClasses, getProductGridCssConfig } from '../../common/utils';

interface ShoppableGalleryProps {
  renderModalWithoutPortal?: boolean;
}

const ShoppableGallery: FC<ShoppableGalleryProps> = ({ renderModalWithoutPortal }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const root = useContext(RootContext);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [activeProductId, setActiveProductId] = useState('');
  const [activeImageUrl, setActiveImageUrl] = useState('');
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [galleryProducts, setGalleryProducts] = useState<ProcessedProduct[]>([]);
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const intl = useIntl();

  const { objects, productTypes, metadata, error } = useRecommendationSearch({
    productId: activeProductId,
  });

  const galleryImageClickHandler = (result: ProcessedProduct): void => {
    setActiveProductId(result.product_id);
    setActiveImageUrl(result.im_url);
    setOpenModal(true);
  };

  const onCloseHandler = (): void => {
    setOpenModal(false);
    setActiveProductId('');
  };

 // Retrieve gallery products
  useEffect(() => {
    const fetchGalleryProducts = async (): Promise<void> => {
      const manualEndpoint = getManualEndpoint(appSettings.placementId);
      const base = resolveBaseEndpoint(appSettings, manualEndpoint);
      const browsePath = usesCloudPaths(appSettings, manualEndpoint)
        ? '/v1/visearch/linked/gallery/browse'
        : '/v1/product/linked/gallery/browse';
      const response = await fetch(
        `${base}${browsePath}?placement_id=${appSettings.placementId}&app_key=${appSettings.appKey}&limit=100`,
      );
      const data = await response.json();
      setGalleryProducts(getFlattenProducts(data.result));
      setIsLoading(false);
    };
    fetchGalleryProducts();
  }, []);

  // Load more images when reaching the bottom of the page
  useEffect(() => {
    const handleScroll = (): void => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return (): void => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!root || isLoading) {
    return (
      <div className='flex justify-center py-20'>
        <Spinner color='secondary' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-60 flex-col items-center justify-center gap-4'>
        <span className='text-md font-bold'>
          {intl.formatMessage({ id: 'errorDescription' })}
        </span>
        <span className='text-sm'>{intl.formatMessage({ id: 'errorResolution' })}</span>
      </div>
    );
  }

  return (
    <>
        <div>
          {/* Gallery Products Grid */}
          <div
            className={`wigmix-product-grid grid ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-3', 'gap-x-0.5', 'gap-y-0.5')}`}
            style={getProductGridCssConfig(customizations, breakpoint)}
            data-pw='sg-gallery-products-grid'>
            {galleryProducts.slice(0, page * 20).map((result, index) => (
              <div key={`${result.im_url}-${index}`} data-pw={`sg-gallery-product-${index + 1}`}>
                <GalleryImage index={index} result={result} onClickHandler={galleryImageClickHandler} />
              </div>
            ))}
          </div>

          {/* ViSenze Footer */}
          {customizations.generalLayout?.showViSenzeLogo && (
            <Footer darkMode={darkMode} className='bg-transparent py-4 text-primary md:py-8' dataPw='sg-visenze-footer'/>
          )}
        </div>

        <CroppingProvider boxData={boxData} setBoxData={setBoxData}>
          {/* Modal showing hotspots on selected image */}
          <ViSenzeModal
            open={openModal}
            onClose={onCloseHandler}
            layout={breakpoint}
            position='center'
            darkMode={darkMode}
            fontFamily={customizations.generalLayout?.fontFamily}
            placementId={`${appSettings.placementId}`}
            renderWithoutPortal={!!renderModalWithoutPortal}
            className='start-[unset] top-[unset] h-[500px] w-[300px] rounded-xl'>
            <div className='flex size-full flex-col bg-primary pt-1/5' data-pw='sg-image-hotspot-modal'>
              <div
                className='absolute end-2 top-2 cursor-pointer rounded-full bg-transparent p-1 hover:opacity-90'
                onClick={onCloseHandler}
                data-pw='sg-modal-close-button'>
                <CloseIcon className='size-6'
                           color={darkMode
                             ? customizations.generalLayout?.fontColorDark
                             : customizations.generalLayout?.fontColor} />
              </div>
              {productTypes.length > 0 && (
                <HotspotContainer
                  referenceImage={activeImageUrl}
                  referenceImageClassName='aspect-[3/4]'
                  noSelectedHotspot={true}
                  handleBoxClick={() => setOpenDrawer(true)}
                />
              )}
            </div>
          </ViSenzeModal>

          {/* Drawer which displays product recommendations for the selected hotspot */}
          <HotspotRecommendations
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            objects={objects}
            metadata={metadata}
            productTypes={productTypes}
            activeImageUrl={activeImageUrl}
            placementId={`${appSettings.placementId}`}
            renderModalWithoutPortal={!!renderModalWithoutPortal}
          />
        </CroppingProvider>
    </>
  );
};

export default ShoppableGallery;
