import type { CSSProperties, FC } from 'react';
import { useEffect, useState, useContext, useRef } from 'react';
import { Skeleton } from '@heroui/skeleton';
import { useIntl } from 'react-intl';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext, WidgetResultContext } from '../../common/types/contexts';
import ProductCard from '../../common/components/product-card/ProductCard';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';

interface ShoppableLookbookProps {
  productId: string;
}

interface ObjectDot {
  index: number;
  top: number;
  left: number;
}

const ShoppableLookbook: FC<ShoppableLookbookProps> = ({ productId }) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const imageRef = useRef<HTMLImageElement>(null);
  const [objectDots, setObjectDots] = useState<ObjectDot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const { productResults, metadata, referenceImageUrl, error, objectIndex, setObjectIndex, objects } = useRecommendationSearch({
    productId,
  });

  const resizeObjectDots = (image: HTMLImageElement): void => {
    const heightScale = image.clientHeight / image.naturalHeight;
    const widthScale = image.clientWidth / image.naturalWidth;
    if (objects.length > 0) {
      const normalizedObjs = objects.map((object, index) => {
        const { box } = object;
        return {
          index,
          top: (box[1] + (box[3] - box[1]) / 2) * heightScale,
          left: (box[0] + (box[2] - box[0]) / 2) * widthScale,
        };
      });
      setObjectDots(normalizedObjs);
    }
  };

  const getProductGridCssClasses = (defaultCols: string, defaultGapX: string, defaultGapY: string): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
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

  const onImageLoad = (e: any): void => {
    const image = e.target;
    resizeObjectDots(image);
    window.addEventListener('resize', () => {
      if (imageRef.current) {
        resizeObjectDots(imageRef.current);
      }
    });
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (!root || isLoading) {
    return <></>;
  }

  if (error) {
    return (
      <div className='flex h-60 flex-col items-center justify-center gap-4'>
        <span className='text-md font-bold'>{intl.formatMessage({ id: 'errorDescription' })}</span>
        <span className='text-sm'>{intl.formatMessage({ id: 'errorResolution' })}</span>
      </div>
    );
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        <div>
          {/* Widget Title */}
          {customizations.generalLayout?.showWidgetTitle && (
            <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='sl-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
          )}

          {/* Reference Image and Product Card Grid container */}
          <div className='relative flex flex-col gap-y-4 text-primary md:flex-row'>
            {/* Reference Image */}
            <div className='relative md:h-full md:w-2/5'>
              {objectDots.map((obj, index) => (
                <button
                  data-pw='sl-hotspot-dot'
                  className={`group absolute z-10 flex items-center justify-center rounded-full bg-[#515151] transition-all
                    duration-300 hover:size-6 hover:-translate-x-3 hover:-translate-y-3 hover:ring-1 hover:ring-white
                    ${objectIndex === index ? 'size-6 -translate-x-3 -translate-y-3 ring-1 ring-white' : 'size-4 -translate-x-2 -translate-y-2'}`}
                  style={{ top: obj.top, left: obj.left }}
                  key={obj.index}
                  onClick={(): void => setObjectIndex(index)}>
                  <div
                    className={`rounded-full bg-white transition-all duration-300 group-hover:size-4 ${objectIndex === index ? 'size-4' : 'size-2'}`}></div>
                </button>
              ))}
              {!referenceImageUrl && <Skeleton className='aspect-square' />}
              {referenceImageUrl && (
                <img
                  ref={imageRef}
                  className='wigmix-reference-image size-full object-cover'
                  src={referenceImageUrl}
                  onLoad={onImageLoad}
                  data-pw='sl-reference-image'
                />
              )}
            </div>

            {/* Product card grid */}
            <div
              className={`wigmix-product-grid grid ${getProductGridCssClasses('grid-cols-2 md:grid-cols-3', 'gap-x-2', 'gap-y-4')} 
              md:absolute md:right-0 md:top-0 md:h-full md:w-[59%] md:overflow-y-scroll`}
              style={getProductGridCssConfig()}
              data-pw='sl-product-result-grid'>
              {productResults.map((result, index) => (
                  <ProductCard key={`${result.product_id}-${index}`}
                               index={index}
                               result={result}
                               hasFindSimilar={false}
                               isRecommendation={true}
                               pwPrefix='sl' />
              ))}
            </div>
          </div>

          {/* ViSenze Footer */}
          {customizations.generalLayout?.showViSenzeLogo && (
              <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='sl-visenze-footer' />
          )}
        </div>
      </WidgetResultContext.Provider>
    </>
  );
};

export default ShoppableLookbook;
