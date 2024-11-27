import type { FC } from 'react';
import { useEffect, useState, useContext } from 'react';
import { Button } from '@nextui-org/button';
import { Spinner } from '@nextui-org/spinner';
import { useIntl } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetResultContext, WidgetDataContext } from '../../common/types/contexts';
import InstagramImage from './components/InstagramImage';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import CloseIcon from '../../common/icons/CloseIcon';
import HotspotContainer from '../../common/components/hotspots/hotspot-container';
import type { BoxData, ProcessedProduct } from '../../common/types/product';
import { getFlattenProducts } from '../../common/utils';
import HotspotRecommendations from './components/HotspotRecommendations';
import CroppingProvider from '../../common/components/providers/CroppingProvider';

interface ShoppableInstagramFeedProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
}

const ShoppableInstagramFeed: FC<ShoppableInstagramFeedProps> = ({ config, productSearch }) => {
  const breakpoint = useBreakpoint();
  const root = useContext(RootContext);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [activeProductId, setActiveProductId] = useState('');
  const [activeImageUrl, setActiveImageUrl] = useState('');
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [galleryProducts, setGalleryProducts] = useState<ProcessedProduct[]>([]);
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const { appSettings } = useContext(WidgetDataContext);
  const intl = useIntl();

  const { objects, productResults, productTypes, metadata, error } = useRecommendationSearch({
    productSearch,
    config,
    retryCount,
    productId: activeProductId,
  });

  const instagramImageClickHandler = (result: ProcessedProduct): void => {
    setActiveProductId(result.product_id);
    setActiveImageUrl(result.im_url);
    setOpenModal(true);
  };

  const onCloseHandler = (): void => {
    setOpenModal(false);
    setActiveProductId('');
  };

  const getProductGridStyles = (): string => {
    if (config.customizations.productSlider) {
      return (
        `grid-cols-${config.customizations.productSlider.display.mobile.slideToShow} `
        + `md:grid-cols-${config.customizations.productSlider.display.tablet.slideToShow} `
        + `lg:grid-cols-${config.customizations.productSlider.display.desktop.slideToShow}`
      );
    }
    return '';
  };

  useEffect(() => {
    if (error) {
      setRetryCount(retryCount + 1);
    } else {
      setRetryCount(0);
    }
  }, [error]);

  // Retrieve gallery products
  useEffect(() => {
    const fetchGalleryProducts = async (): Promise<void> => {
      const response = await fetch(
        `${appSettings.endpoint}/v1/product/linked/gallery/browse?placement_id=${appSettings.placementId}&app_key=${appSettings.appKey}&limit=100`,
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
          {intl.formatMessage({ id: 'shoppableInstagramFeed.errorMessage.part1' })}
        </span>
        <span className='text-sm'>{intl.formatMessage({ id: 'shoppableInstagramFeed.errorMessage.part2' })}</span>
      </div>
    );
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults, productTypes }}>
        <div>
          {/* Gallery Products Grid */}
          <div
            className={`grid ${getProductGridStyles() !== '' ? getProductGridStyles() : 'grid-cols-3'} gap-0.5`}
            data-pw='sif-gallery-products-grid'>
            {galleryProducts.slice(0, page * 20).map((result, index) => (
              <div key={`${result.im_url}-${index}`} data-pw={`sif-gallery-product-${index + 1}`}>
                <InstagramImage index={index} result={result} onClickHandler={instagramImageClickHandler} />
              </div>
            ))}
          </div>

          {/* ViSenze Footer */}
          <Footer className='bg-transparent py-4 md:py-8' dataPw='sif-visenze-footer' />
        </div>

        <CroppingProvider boxData={boxData} setBoxData={setBoxData}>
          {/* Modal showing hotspots on selected image */}
          <ViSenzeModal
            open={openModal}
            onClose={onCloseHandler}
            layout={breakpoint}
            position='center'
            placementId={`${config.appSettings.placementId}`}
            className='left-[unset] top-[unset] h-[500px] w-[300px] rounded-xl'>
            <div className='flex size-full flex-col bg-primary pt-1/5' data-pw='sif-image-hotspot-modal'>
              <Button
                isIconOnly
                className='absolute right-2 top-2 bg-transparent'
                onClick={onCloseHandler}
                data-pw='sif-modal-close-button'>
                <CloseIcon className='size-6' />
              </Button>
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
            activeImageUrl={activeImageUrl}
            placementId={`${config.appSettings.placementId}`}
          />
        </CroppingProvider>
      </WidgetResultContext.Provider>
    </>
  );
};

export default ShoppableInstagramFeed;
