import type { CSSProperties, FC, KeyboardEvent } from 'react';
import { memo, useContext, useRef, useState } from 'react';
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
}

// Fallback card scroll width (card + gap) used when the carousel is empty.
const DEFAULT_CARD_SCROLL_WIDTH = 216;
const FOCUS_VISIBLE_CLASSES = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';

const Carousel: FC<CarouselProps> = ({ results, metadata }) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const breakpoint = useBreakpoint();
  const intl = useIntl();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getCardScrollWidth = (container: HTMLDivElement): number => {
    const firstCard = container.firstElementChild as HTMLElement | null;
    return firstCard ? firstCard.offsetWidth + 16 : DEFAULT_CARD_SCROLL_WIDTH; // 16px matches the space-x-4 gap
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Keydown bubbles from every focusable descendant (each ProductCard's link/wishlist button) -
    // only scroll when the carousel row itself is focused, so nested controls and native page
    // keyboard behavior (e.g. Home/End scrolling the page) aren't hijacked.
    if (event.target !== event.currentTarget) {
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        container.scrollBy({ left: getCardScrollWidth(container), behavior: 'smooth' });
        break;
      case 'ArrowLeft':
        event.preventDefault();
        container.scrollBy({ left: -getCardScrollWidth(container), behavior: 'smooth' });
        break;
      case 'Home':
        event.preventDefault();
        container.scrollTo({ left: 0, behavior: 'smooth' });
        break;
      case 'End':
        event.preventDefault();
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
        break;
      default:
        break;
    }
  };

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
        ref={scrollContainerRef}
        className={`flex space-x-4 overflow-x-auto pb-4 no-scrollbar p-2 items-end text-primary ${FOCUS_VISIBLE_CLASSES}`}
        role='list'
        aria-label={intl.formatMessage({ id: 'a11yRecommendedProducts' })}
        tabIndex={0}
        onKeyDown={handleKeyDown}
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
