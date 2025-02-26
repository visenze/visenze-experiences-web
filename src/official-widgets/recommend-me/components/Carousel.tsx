import type { CSSProperties, FC } from 'react';
import { memo, useContext, useEffect, useState } from 'react';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import TrashIcon from '../../../common/icons/TrashIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';

/**
 * An individual carousel of product cards based on a search query
 */

interface CarouselProps {
  results: ProcessedProduct[];
  searchValue: string;
  removeFromHistory: () => void;
  metadata: Record<string, any>;
}

const Carousel: FC<CarouselProps> = ({ results, metadata, searchValue, removeFromHistory }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [isLoading, setIsLoading] = useState(true);
  const breakpoint = useBreakpoint();

  useEffect(() => {
    setIsLoading(false);
  }, []);

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
      <div className='relative flex items-center pb-2 pt-4 text-primary'>
        <div className='flex w-full' data-pw='rm-carousel-title'>
          <span>Results for &quot;</span>
          <div className='max-w-13/20 truncate font-bold'>{searchValue}</div>
          <span>&quot;</span>
        </div>
        {!isLoading && (
          <div className='absolute right-0 top-4 cursor-pointer' onClick={removeFromHistory}>
            <TrashIcon className='size-5'
                       color={darkMode
                         ? customizations.generalLayout?.fontColorDark
                         : customizations.generalLayout?.fontColor} />
          </div>
        )}
      </div>
      <div className={`no-scrollbar grid w-full grid-cols-5 items-end text-primary ${getProductGridCssClasses('gap-x-4')} overflow-scroll`}
           style={getProductGridCssConfig()}>
        {results.map((result, index) => (
            <ProductCard key={`${result.product_id}-${index}`}
                         index={index}
                         result={result}
                         metadata={metadata}
                         hasFindSimilar={false}
                         isRecommendation={false}
                         pwPrefix='rm' />
        ))}
      </div>
    </div>
  );
};

export default memo(Carousel);
