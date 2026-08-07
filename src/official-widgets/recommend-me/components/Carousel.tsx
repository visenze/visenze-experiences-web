import type { CSSProperties, FC } from 'react';
import { memo, useContext, useState } from 'react';
import { useIntl } from 'react-intl';
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
  latestMessage?: string;
}

const Carousel: FC<CarouselProps> = ({ results, metadata, latestMessage = '' }) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const breakpoint = useBreakpoint();
  const intl = useIntl();

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
      <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
        {[
          latestMessage,
          results.length ? intl.formatMessage({ id: 'a11yProductResultsShown' }, { count: results.length }) : '',
        ].filter(Boolean).join(' ')}
      </div>
      <div
        className='flex space-x-4 overflow-x-auto pb-4 no-scrollbar p-2 items-end text-primary'
        role='list'
        aria-label={intl.formatMessage({ id: 'a11yRecommendedProducts' })}
        tabIndex={0}
        data-pw='rm-product-result-row'>
        {results.map((result, index) => (
          <div
            key={`${result.product_id}-${index}`}
            role='listitem'
            className={`${getProductGridCssClasses('gap-x-4')} group relative flex-shrink-0`}
            style={{ ...getProductGridCssConfig(), width: '200px' }}>
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
