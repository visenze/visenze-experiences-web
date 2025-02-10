import type { CSSProperties, FC } from 'react';
import { useEffect, useState, useContext } from 'react';
import { useIntl } from 'react-intl';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext, WidgetResultContext } from '../../common/types/contexts';
import ProductCard from '../../common/components/product-card/ProductCard';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';

interface EmbeddedGridProps {
  productId: string;
}

const EmbeddedGrid: FC<EmbeddedGridProps> = ({ productId }) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  widgetClient.forceErrorState = (): void => {
    setError('Sample error message here');
  };

  const { productResults, metadata, error: errorFromApi } = useRecommendationSearch({
    productId,
  });

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

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        {productResults.length > 0 && (
            <>
              {/* Widget Title */}
              {customizations.generalLayout?.showWidgetTitle && (
                  <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='eg-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
              )}

              {/* Product result grid */}
              <div
                  className={`wigmix-product-grid grid text-primary ${getProductGridCssClasses('grid-cols-2 md:grid-cols-5', 'gap-x-2', 'gap-y-4')}`}
                  style={getProductGridCssConfig()}
                  data-pw='eg-product-result-grid'>
                {productResults.map((result, index) => (
                    <ProductCard key={`${result.product_id}-${index}`}
                                 index={index}
                                 result={result}
                                 hasFindSimilar={false}
                                 isRecommendation={true}
                                 pwPrefix='eg' />
                ))}
              </div>

              {/* ViSenze Footer */}
              {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='eg-visenze-footer' />
              )}
            </>
        )}
      </WidgetResultContext.Provider>
    </>
  );
};

export default EmbeddedGrid;
