import type { FC } from 'react';
import { memo, useContext, useMemo } from 'react';
import type { ObjectProductResponse, ProductType } from 'visearch-javascript-sdk';
import { useIntl } from 'react-intl';
import { cn } from '@heroui/theme';
import ViSenzeModal from '../../../common/components/modal/visenze-modal';
import { CroppingContext, WidgetDataContext } from '../../../common/types/contexts';
import { getFlattenProducts, getProductGridCssClasses, getProductGridCssConfig } from '../../../common/utils';
import ProductCard from '../../../common/components/product-card/ProductCard';
import ImageCropThumbnail from './ImageCropThumbnail';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import CloseIcon from '../../../common/icons/CloseIcon';

/**
 * This component displays a drawer with product recommendations based on selected hotspots in an image.
 * It includes:
 * - A close button to dismiss the drawer.
 * - Thumbnails of cropped image areas representing different hotspots.
 * - A grid of product results for the selected hotspot.
 * - A message indicating no results if there are no products for the selected hotspot.
 */

interface HotspotRecommendationsProps {
  objects: ObjectProductResponse[];
  productTypes: ProductType[];
  metadata: Record<string, any>;
  openDrawer: boolean;
  setOpenDrawer: (openDrawer: boolean) => void;
  activeImageUrl: string;
  placementId: string;
}

const HotspotRecommendations: FC<HotspotRecommendationsProps> = ({ objects, productTypes, metadata, openDrawer, setOpenDrawer, activeImageUrl, placementId }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const { selectedHotspot, setSelectedHotspot } = useContext(CroppingContext) ?? {};
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const closeDrawerHandler = (): void => {
    setOpenDrawer(false);
    // Wait for drawer closing animation to finish before resetting
    setTimeout(() => {
      setSelectedHotspot?.(-1);
    }, 300);
  };

  const results = useMemo(() => {
    if (selectedHotspot === -1 || objects.length === 0) {
      return [];
    }
    return getFlattenProducts(objects[selectedHotspot].result);
  }, [objects, selectedHotspot]);

  return (
    <ViSenzeModal open={openDrawer} onClose={closeDrawerHandler} layout='mobile' className='bottom-0 top-[unset] h-9/10 w-full rounded-t-xl' position='center'
                  darkMode={darkMode}
                  fontFamily={customizations.generalLayout?.fontFamily}
                  placementId={placementId} idSuffix='hotspot' >
      <div className='flex size-full flex-col bg-primary' data-pw='sg-hotspot-recommendations'>
        {/* Close Button Tablet/Desktop */}
        <div className='absolute right-3 top-2 hidden bg-transparent md:flex rounded-full p-1 hover:opacity-90 cursor-pointer'
             onClick={closeDrawerHandler}
             data-pw='sg-drawer-close-button-desktop'>
          <CloseIcon className='size-6'
                     color={darkMode
                       ? customizations.generalLayout?.fontColorDark
                       : customizations.generalLayout?.fontColor} />
        </div>

        {/* Close Button Mobile */}
        <div className='flex flex-shrink-0 justify-center bg-buttonPrimary md:hidden rounded-full p-1 hover:opacity-90 w-full cursor-pointer'
             onClick={closeDrawerHandler} data-pw='sg-drawer-close-button-mobile'>
          <div className='h-1 w-12 bg-gray-400'></div>
        </div>

        {/* Image Crop Thumbnails */}
        <span className='text-center font-bold text-primary md:pt-3'>{intl.formatMessage({ id: 'hotspotRecommendationsTitle' })}</span>
        <div className='flex justify-center gap-x-3 py-3'>
          {
            productTypes?.map((productType, index) => (
              <div key={index} data-pw={`image-crop-thumbnail-${index + 1}`}>
                <ImageCropThumbnail imageUrl={activeImageUrl} box={productType.box} index={index}/>
              </div>
            ))
          }
        </div>

        {/* Product Result Grid */}
        <div className={cn(
            'wigmix-product-grid grid overflow-y-auto px-2 pb-4',
            getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4', 'gap-x-2', 'gap-y-4'),
        )}
             style={getProductGridCssConfig(customizations, breakpoint)}
             data-pw='sg-product-result-grid'>
          {
            results.map((result, index) => (
                <ProductCard key={`${result.product_id}-${index}`}
                             index={index}
                             result={result}
                             metadata={metadata}
                             hasFindSimilar={false}
                             isRecommendation={true}
                             pwPrefix='sg' />
            ))
          }
        </div>

        {/* No Results Message */}
        {
          results.length === 0
          && <div className='flex size-full items-center justify-center'>{intl.formatMessage({ id: 'noResults' })}</div>
        }
      </div>
    </ViSenzeModal>
  );
};

export default memo(HotspotRecommendations);
