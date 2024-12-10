import type { CSSProperties, FC } from 'react';
import { useEffect, useState, useContext } from 'react';
import { useIntl } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetResultContext } from '../../common/types/contexts';
import Result from './components/Result';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';

interface EmbeddedGridProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  productId: string;
}

const EmbeddedGrid: FC<EmbeddedGridProps> = ({ config, productSearch, productId }) => {
  const root = useContext(RootContext);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const { productResults, metadata, error } = useRecommendationSearch({
    productSearch,
    config,
    productId,
    retryCount,
  });

  const getProductGridCssClasses = (defaultCols: string, defaultGapX: string, defaultGapY: string): string => {
    const cssConfigSrc = config.customizations?.productCards?.[breakpoint];
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
    const cssConfigSrc = config.customizations?.productCards?.[breakpoint];
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

  const getProductCardCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = config.customizations?.productCards?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.contentPadding || cssConfigSrc.contentPadding === 0) {
        cssConfig.padding = `${cssConfigSrc.contentPadding}px`;
      }
    }
    return cssConfig;
  };

  useEffect(() => {
    if (error) {
      setRetryCount(retryCount + 1);
    } else {
      setRetryCount(0);
    }
  }, [error]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (!root || isLoading) {
    return <></>;
  }

  if (error) {
    return (
      <div className='flex h-60 flex-col items-center justify-center gap-4'>
        <span className='text-md font-bold'>{intl.formatMessage({ id: 'errorMessage.part1' })}</span>
        <span className='text-sm'>{intl.formatMessage({ id: 'errorMessage.part2' })}</span>
      </div>
    );
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        <div className='bg-primary'>
          {/* Widget Title */}
          <div className='wigmix-widget-title py-2 text-center text-primary md:py-4' data-pw='eg-widget-title'>
            {intl.formatMessage({ id: 'widgetTitle' })}
          </div>

          {/* Product result grid */}
          <div
            className={`grid ${getProductGridCssClasses('grid-cols-2 md:grid-cols-5', 'gap-x-2', 'gap-y-4')}`}
            style={getProductGridCssConfig()}
            data-pw='eg-product-result-grid'>
            {productResults.map((result, index) => (
              <div
                key={`${result.product_id}-${index}`}
                data-pw={`eg-product-result-card-${index + 1}`}
                style={getProductCardCssConfig()}
              >
                <Result index={index} result={result} />
              </div>
            ))}
          </div>

          {/* ViSenze Footer */}
          <Footer className='bg-transparent py-4 md:py-8' dataPw='eg-visenze-footer' />
        </div>
      </WidgetResultContext.Provider>
    </>
  );
};

export default EmbeddedGrid;
