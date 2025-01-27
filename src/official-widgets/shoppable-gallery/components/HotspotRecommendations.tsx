import type { CSSProperties, FC } from 'react';
import { memo, useContext, useMemo } from 'react';
import { Button } from '@nextui-org/button';
import type { ObjectProductResponse } from 'visearch-javascript-sdk';
import { useIntl } from 'react-intl';
import ViSenzeModal from '../../../common/components/modal/visenze-modal';
import { CroppingContext, WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import { getFlattenProducts } from '../../../common/utils';
import Result from './Result';
import ImageCropThumbnail from './ImageCropThumbnail';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

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
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const { productTypes } = useContext(WidgetResultContext);
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
    if (selectedHotspot === -1 || objects.length === 0) return [];
    return getFlattenProducts(objects[selectedHotspot].result);
  }, [objects, selectedHotspot]);

  const getProductGridCssClasses = (defaultCols: string, defaultGapX: string, defaultGapY: string): string => {
    const cssConfigSrc = customizations?.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.productsPerRow) {
        classes.push(defaultCols);
      }
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push(defaultGapX);
      }
      if (!cssConfigSrc.marginVertical && cssConfigSrc.marginVertical !== 0) {
        classes.push(defaultGapY);
      }
      return classes.join(' ');
    }
    return [defaultCols, defaultGapX, defaultGapY].join(' ');
  };

  const getProductGridCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations?.productGrid?.[breakpoint];
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

  return (
    <ViSenzeModal open={openDrawer} onClose={closeDrawerHandler} layout='mobile' className='bottom-0 top-[unset] h-9/10 w-full rounded-t-xl' position='center'
                  fontFamily={customizations.generalLayout?.fontFamily}
                  placementId={placementId} idSuffix='hotspot' >
      <div className='flex size-full flex-col bg-primary' data-pw='sif-hotspot-recommendations'>
        {/* Close Button Tablet/Desktop */}
        <Button isIconOnly className='absolute right-3 top-2 hidden bg-transparent md:flex' onClick={closeDrawerHandler} data-pw='sif-drawer-close-button-desktop'>
          <CustomizableIcon
              height={24}
              width={24}
              url={'https://cdn.visenze.com/images/close-icon.svg'}
              color={customizations.generalLayout?.fontColor}
          />
        </Button>

        {/* Close Button Mobile */}
        <Button className='flex flex-shrink-0 justify-center bg-primary md:hidden' size='sm' onClick={closeDrawerHandler} data-pw='sif-drawer-close-button-mobile'>
          <div className='h-1 w-12 bg-gray-400'></div>
        </Button>

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
        <div className={`wigmix-product-grid grid ${getProductGridCssClasses('grid-cols-2 md:grid-cols-3 lg:grid-cols-4', 'gap-x-2', 'gap-y-4')} overflow-y-auto px-2 pb-4`}
             style={getProductGridCssConfig()}
             data-pw='sif-product-result-grid'>
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
          && <div className='flex size-full items-center justify-center'>{intl.formatMessage({ id: 'noResults' })}</div>
        }
      </div>
    </ViSenzeModal>
  );
};

export default memo(HotspotRecommendations);
