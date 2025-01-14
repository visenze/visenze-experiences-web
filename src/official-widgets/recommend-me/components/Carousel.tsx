import type { CSSProperties, FC } from 'react';
import { useContext, memo, useEffect, useState } from 'react';
import type { ProcessedProduct } from '../../../common/types/product';
import Result from './Result';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import { WidgetDataContext } from '../../../common/types/contexts';

/**
 * An individual carousel of product cards based on a search query
 */

interface CarouselProps {
  results: ProcessedProduct[];
  searchValue: string;
  removeFromHistory: () => void;
}

const Carousel: FC<CarouselProps> = ({ results, searchValue, removeFromHistory }) => {
  const { customizations } = useContext(WidgetDataContext);
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
          <CustomizableIcon
              height={20}
              width={20}
              url={'https://cdn.visenze.com/images/trash-icon.svg'}
              color={customizations.generalLayout?.fontColor}
              onClickHandler={removeFromHistory}
              className='absolute right-0 top-4 cursor-pointer'
          />
        )}
      </div>
      <div className={`no-scrollbar flex w-full items-end text-primary ${getProductGridCssClasses('gap-x-4')} overflow-scroll`}
           style={getProductGridCssConfig()}>
        {results.map((result, i) => (
          <div key={result.product_id}>
            <Result
              index={i}
              result={result}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(Carousel);
