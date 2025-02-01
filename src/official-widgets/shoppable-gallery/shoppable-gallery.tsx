import type { CSSProperties, FC } from 'react';
import { useEffect, useState, useContext } from 'react';
import { Spinner } from '@heroui/spinner';
import { useIntl } from 'react-intl';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetResultContext, WidgetDataContext } from '../../common/types/contexts';
import GalleryImage from './components/GalleryImage';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import HotspotContainer from '../../common/components/hotspots/hotspot-container';
import type { BoxData, ProcessedProduct } from '../../common/types/product';
import { getFlattenProducts } from '../../common/utils';
import HotspotRecommendations from './components/HotspotRecommendations';
import CroppingProvider from '../../common/components/providers/CroppingProvider';
import CloseIcon from '../../common/icons/CloseIcon';

interface ShoppableGalleryProps {
  // no properties at the moment
}

const ShoppableGallery: FC<ShoppableGalleryProps> = () => {
  const { widgetConfig } = useContext(WidgetDataContext);
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

  const { objects, productResults, productTypes, metadata, error } = useRecommendationSearch({
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

  const getProductGridCssClasses = (defaultCols: string): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.productsPerRow) {
        classes.push(defaultCols);
      }
      return classes.join(' ');
    }
    return defaultCols;
  };

  const getProductGridCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.productsPerRow) {
        cssConfig.gridTemplateColumns = `repeat(${cssConfigSrc.productsPerRow}, minmax(0, 1fr))`;
      }
      if (cssConfigSrc.marginVertical || cssConfigSrc.marginVertical === 0) {
        cssConfig.rowGap = `${cssConfigSrc.marginVertical}px`;
      }
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.columnGap = `${cssConfigSrc.marginHorizontal}px`;
      }
    }
    return cssConfig;
  };

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
          {intl.formatMessage({ id: 'errorDescription' })}
        </span>
        <span className='text-sm'>{intl.formatMessage({ id: 'errorResolution' })}</span>
      </div>
    );
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults, productTypes }}>
        <div>
          {/* Gallery Products Grid */}
          <div
            className={`wigmix-product-grid grid ${getProductGridCssClasses('grid-cols-3')} gap-0.5`}
            style={getProductGridCssConfig()}
            data-pw='sg-gallery-products-grid'>
            {galleryProducts.slice(0, page * 20).map((result, index) => (
              <div key={`${result.im_url}-${index}`} data-pw={`sg-gallery-product-${index + 1}`}>
                <GalleryImage index={index} result={result} onClickHandler={galleryImageClickHandler} />
              </div>
            ))}
          </div>

          {/* ViSenze Footer */}
          {customizations.generalLayout?.showViSenzeLogo && (
            <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='sg-visenze-footer'/>
          )}
        </div>

        <CroppingProvider boxData={boxData} setBoxData={setBoxData}>
          {/* Modal showing hotspots on selected image */}
          <ViSenzeModal
            open={openModal}
            onClose={onCloseHandler}
            layout={breakpoint}
            position='center'
            fontFamily={customizations.generalLayout?.fontFamily}
            placementId={`${appSettings.placementId}`}
            className='left-[unset] top-[unset] h-[500px] w-[300px] rounded-xl'>
            <div className='flex size-full flex-col bg-primary pt-1/5' data-pw='sg-image-hotspot-modal'>
              <div
                className='absolute right-2 top-2 bg-transparent rounded-full p-1 hover:opacity-90 cursor-pointer'
                onClick={onCloseHandler}
                data-pw='sg-modal-close-button'>
                <CloseIcon className='size-6' color={customizations.generalLayout?.fontColor} />
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
            activeImageUrl={activeImageUrl}
            placementId={`${appSettings.placementId}`}
          />
        </CroppingProvider>
      </WidgetResultContext.Provider>
    </>
  );
};

export default ShoppableGallery;
