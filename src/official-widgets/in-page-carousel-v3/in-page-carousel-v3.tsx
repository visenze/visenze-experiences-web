import type { CSSProperties, FC } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationMultiSearch from '../../common/components/hooks/use-recommendation-multisearch';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';

interface InPageCarouselV3Props {
  productId: string;
}

const InPageCarouselV3: FC<InPageCarouselV3Props> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const root = useContext(RootContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  widgetClient.forceErrorState = (): void => {
    setError('Sample error message here');
  };

  const {
    productResults,
    metadata,
    error: errorFromApi,
  } = useRecommendationMultiSearch({
    productId,
    shouldDisplayAlternatives: customizations.productCard?.images?.showAlternatives,
  });

  const getProductCardCssClasses = (): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push('p-1 md:p-2');
      }
      return classes.join(' ');
    }
    return 'p-1 md:p-2';
  };

  const getProductCardCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (!showGrid) {
        cssConfig.width = `calc(100% / ${cssConfigSrc.productsPerRow})`;
        if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
          cssConfig.width = `calc(100% / ${cssConfigSrc.productsPerRow} - ${cssConfigSrc.marginHorizontal}px)`;
        }
      }
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.marginLeft = cssConfigSrc.marginHorizontal / 2;
        cssConfig.marginRight = cssConfigSrc.marginHorizontal / 2;
      }
    }
    return cssConfig;
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
    }
    return cssConfig;
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (errorFromApi) {
      setError(errorFromApi);
    }
  }, [errorFromApi]);

  if (!root || isLoading) {
    return <></>;
  }

  if (error) {
    return <></>;
  }

  const renderHorizontalScroll = (): React.ReactNode => (
    <div className='relative text-primary' data-testid='ipcv3-product-result-carousel'>
      <div className='flex overflow-x-auto no-scrollbar pb-2' style={{ scrollSnapType: 'x mandatory' }}>
        {productResults.map((result, index) => (
          <div
            key={`${result.product_id}-${index}`}
            className={`${getProductCardCssClasses()} flex-shrink-0 scroll-snap-align-start`}
            style={getProductCardCssConfig()}>
            <ProductCard
              index={index}
              result={result}
              metadata={metadata}
              isInWishlist={wishlistPids.includes(result.product_id)}
              setIsInWishlist={(pid, isInWishlist) => {
                setWishlistPids((prev) => {
                  const newPids = [...prev];
                  if (isInWishlist && !newPids.includes(pid)) {
                    newPids.push(pid);
                  }
                  if (!isInWishlist && newPids.includes(pid)) {
                    newPids.splice(newPids.indexOf(pid), 1);
                  }
                  return newPids;
                });
              }}
              hasFindSimilar={true}
              isRecommendation={true}
              pwPrefix='ipcv3'
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderGrid = (): React.ReactNode => (
    <div className='relative text-primary' data-testid='ipcv3-product-result-grid'>
      <div className='wigmix-product-grid grid' style={getProductGridCssConfig()}>
        {productResults.map((result, index) => (
          <div
            key={`${result.product_id}-${index}`}
            className={`${getProductCardCssClasses()}`}
            style={getProductCardCssConfig()}>
            <ProductCard
              index={index}
              result={result}
              metadata={metadata}
              isInWishlist={wishlistPids.includes(result.product_id)}
              setIsInWishlist={(pid, isInWishlist) => {
                setWishlistPids((prev) => {
                  const newPids = [...prev];
                  if (isInWishlist && !newPids.includes(pid)) {
                    newPids.push(pid);
                  }
                  if (!isInWishlist && newPids.includes(pid)) {
                    newPids.splice(newPids.indexOf(pid), 1);
                  }
                  return newPids;
                });
              }}
              hasFindSimilar={false}
              isRecommendation={true}
              pwPrefix='ipcv3'
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {productResults.length > 0 && (
        <>
          <div className='flex justify-between'>
            {customizations.generalLayout?.showWidgetTitle && (
              <div className='wigmix-widget-title py-2 text-primary' data-testid='ipcv3-widget-title'>
                {intl.formatMessage({ id: 'widgetTitle' })}
              </div>
            )}

            <div className='flex items-center'>
              <button
                className='border rounded px-4 py-1 text-sm font-medium transition'
                style={{
                  borderColor: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor,
                  color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor,
                 }}
                data-pw='ipcv3-show-more-button'
                onClick={() => setShowGrid(!showGrid)}>
                {showGrid
                  ? intl.formatMessage({ id: 'showLess' })
                  : intl.formatMessage({ id: 'showMore' })}
              </button>
            </div>
          </div>

          {/* Product Result List */}
          {showGrid ? renderGrid() : renderHorizontalScroll()}

          {/* ViSenze Footer */}
          {customizations.generalLayout?.showViSenzeLogo && (
            <Footer darkMode={darkMode} className='bg-transparent py-4 text-primary md:py-8' dataPw='ipcv3-visenze-footer' />
          )}
        </>
      )}
    </>
  );
};

export default InPageCarouselV3;
