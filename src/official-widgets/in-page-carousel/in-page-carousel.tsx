import type { CSSProperties, FC } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';

interface InPageCarouselProps {
  productId: string;
}

const InPageCarousel: FC<InPageCarouselProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
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
  } = useRecommendationSearch({
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
        cssConfig.gridTemplateColumns = `repeat(${cssConfigSrc.productsPerRow}, 1fr)`;
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
    <div className='relative text-primary' data-testid='ipc-product-result-carousel'>
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
              hasFindSimilar={true}
              isRecommendation={true}
              pwPrefix='ipc'
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderGrid = (): React.ReactNode => (
    <div className='relative text-primary' data-testid='ipc-product-result-grid'>
      <div className='grid' style={getProductGridCssConfig()}>
        {productResults.map((result, index) => (
          <div
            key={`${result.product_id}-${index}`}
            className={`${getProductCardCssClasses()}`}
            style={getProductCardCssConfig()}>
            <ProductCard
              index={index}
              result={result}
              metadata={metadata}
              hasFindSimilar={false}
              isRecommendation={true}
              pwPrefix='ipc'
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
              <div className='wigmix-widget-title py-2 text-primary' data-testid='ipc-widget-title'>
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
                data-pw='ipc-show-more-button'
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
            <Footer darkMode={darkMode} className='bg-transparent py-4 text-primary md:py-8' dataPw='ipc-visenze-footer' />
          )}
        </>
      )}
    </>
  );
};

export default InPageCarousel;
