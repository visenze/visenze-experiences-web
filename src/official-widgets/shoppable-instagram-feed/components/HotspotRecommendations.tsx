import type { FC } from 'react';
import { memo, useContext, useMemo } from 'react';
import { Button } from '@nextui-org/button';
import type { ObjectProductResponse } from 'visearch-javascript-sdk';
import { useIntl } from 'react-intl';
import ViSenzeModal from '../../../common/components/modal/visenze-modal';
import { CroppingContext, WidgetResultContext } from '../../../common/types/contexts';
import { getFlattenProducts } from '../../../common/utils';
import Result from './Result';
import ImageCropThumbnail from './ImageCropThumbnail';
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
  openDrawer: boolean;
  setOpenDrawer: (openDrawer: boolean) => void;
  activeImageUrl: string;
  placementId: string;
}

const HotspotRecommendations: FC<HotspotRecommendationsProps> = ({ objects, openDrawer, setOpenDrawer, activeImageUrl, placementId }) => {
  const { productTypes } = useContext(WidgetResultContext);
  const { selectedHotspot, setSelectedHotspot } = useContext(CroppingContext) ?? {};
  const intl = useIntl();

  const closeDrawerHandler = (): void => {
    setOpenDrawer(false);
    // Wait for drawer closing animation to finish before resetting
    setTimeout(() => {
      setSelectedHotspot?.(-1);
    }, 300);
  };

  const results = useMemo(() => {
    if (selectedHotspot === -1 || objects.length === 0) return [];
    return getFlattenProducts(objects[selectedHotspot].result);
  }, [objects, selectedHotspot]);

  return (
    <ViSenzeModal open={openDrawer} onClose={closeDrawerHandler} layout='mobile' className='bottom-0 top-[unset] h-9/10 w-full rounded-t-xl' position='center'
                  placementId={placementId} idSuffix='hotspot' >
      <div className='flex size-full flex-col bg-primary' data-pw='sif-hotspot-recommendations'>
        {/* Close Button Tablet/Desktop */}
        <Button isIconOnly className='absolute right-3 top-2 hidden bg-transparent md:flex' onClick={closeDrawerHandler} data-pw='sif-drawer-close-button-desktop'>
          <CloseIcon className='size-6'/>
        </Button>

        {/* Close Button Mobile */}
        <Button className='flex flex-shrink-0 justify-center bg-primary md:hidden' size='sm' onClick={closeDrawerHandler} data-pw='sif-drawer-close-button-mobile'>
          <div className='h-1 w-12 bg-gray-400'></div>
        </Button>

        {/* Image Crop Thumbnails */}
        <span className='calls-to-action-text text-center font-bold text-primary md:pt-3'>{intl.formatMessage({ id: 'shoppableInstagramFeed.hotspotRecommendationsTitle' })}</span>
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
        <div className='grid grid-cols-2 gap-x-2 gap-y-4 overflow-y-auto px-2 pb-4 md:grid-cols-3 lg:grid-cols-4' data-pw='sif-product-result-grid'>
          {
            results.map((result, index) => (
              <div key={`${result.product_id}-${index}`} data-pw={`sif-product-result-card-${index + 1}`}>
                <Result
                  index={index}
                  result={result}
                />
              </div>
            ))
          }
        </div>

        {/* No Results Message */}
        {
          results.length === 0
          && <div className='flex size-full items-center justify-center'>{intl.formatMessage({ id: 'shoppableInstagramFeed.noResults' })}</div>
        }
      </div>
    </ViSenzeModal>
  );
};

export default memo(HotspotRecommendations);
