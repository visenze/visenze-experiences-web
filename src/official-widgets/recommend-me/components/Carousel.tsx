import type { CSSProperties, FC } from 'react';
import { memo, useContext } from 'react';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';

/**
 * An individual carousel of product cards based on a search query
 */

interface CarouselProps {
  results: ProcessedProduct[];
  metadata: Record<string, any>;
}

const Carousel: FC<CarouselProps> = ({ results, metadata }) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const breakpoint = useBreakpoint();

  const getProductGridCssClasses = (defaultGapX: string): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push(defaultGapX);
      }
      return classes.join(' ');
    }
    return [defaultGapX].join(' ');
  };

  const getProductGridCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.columnGap = `${cssConfigSrc.marginHorizontal}px`;
      }
    }
    return cssConfig;
  };

  return (
    <div data-pw='rm-product-result-carousel'>
      <div
        className='flex space-x-4 overflow-x-auto pb-4 no-scrollbar p-2 items-end text-primary'
        data-pw='rm-product-result-row'>
        {results.map((result, index) => (
          <div
            key={`${result.product_id}-${index}`}
            className={`${getProductGridCssClasses('gap-x-4')} group relative flex-shrink-0`}
            style={{ ...getProductGridCssConfig(), width: '200px' }}>
            <ProductCard
              index={index}
              result={result}
              metadata={metadata}
              hasFindSimilar={false}
              isRecommendation={false}
              pwPrefix='rm'
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(Carousel);
