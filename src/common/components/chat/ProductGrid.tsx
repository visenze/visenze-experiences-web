import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { FOCUSED_SCALE, PRODUCT_REVEAL_DELAY_MS, PRODUCT_SCROLLER_PEEK_PX } from './constants';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import ChevronLeftIcon from '../../icons/ChevronLeftIcon';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import type { ProductScrollerConfig } from '../../utils';
import ProductCard from '../product-card/ProductCard';

interface ProductGridProps {
  products: ProcessedProduct[];
  requestId: string;
  focusedProductId?: string | null;
  // The requestId of the turn currently being narrated. Narration only ever targets one turn at
  // a time, but multiple ProductGrid instances (one per historical chat turn) can be mounted
  // simultaneously — without this, a product_id that recurs across two turns' results would
  // light up the badge in both, fighting over the "Now Describing" highlight and scroll target.
  focusedRequestId?: string | null;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
  pwPrefix: string;
  streaming?: boolean;
  className?: string;
  style?: CSSProperties;
  // Forwarded to each ProductCard's own `imageClasses` — lets a consumer cap image height (e.g.
  // narration surfaces where a tall portrait aspect ratio combined with few grid columns would
  // otherwise push a card taller than the viewport, hiding the "Now Describing" badge).
  imageClasses?: string;
  // When set, cards render in one horizontally scrollable row (with a peek of the neighbouring
  // cards and prev/next arrows) instead of a CSS grid; `className`/`style` then only apply to the
  // outer wrapper, so the caller must not pass grid classes.
  scroller?: ProductScrollerConfig;
}

const ProductGrid: FC<ProductGridProps> = ({
  products, requestId, focusedProductId = null, focusedRequestId = null, wishlistPids, setIsInWishlist, pwPrefix, streaming = false, className, style,
  imageClasses, scroller,
}) => {
  const intl = useIntl();
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  // Configurable through `buttons.icon`. Widgets that don't define it (shopping-assistant, ESA) fall
  // back to a white circle with a dark chevron, so the arrows stay visible over product images in
  // both themes (generalLayout's dark-mode font color is white, which would vanish on white).
  const buttonIcon = customizations.buttons?.icon;
  const arrowColor = (darkMode ? buttonIcon?.fontColorDark : buttonIcon?.fontColor) || '#000000';
  const arrowBackground = (darkMode ? buttonIcon?.backgroundColorDark : buttonIcon?.backgroundColor) || '#FFFFFF';
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [revealedCount, setRevealedCount] = useState(streaming ? 0 : products.length);
  const viewedProductIdsRef = useRef<Set<string>>(new Set());
  const focusedCardRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) | undefined => {
    if (!streaming) {
      setRevealedCount(products.length);
      return undefined;
    }
    const interval = setInterval((): void => {
      setRevealedCount((count) => {
        if (count >= products.length) {
          clearInterval(interval);
          return count;
        }
        const next = count + 1;
        if (next >= products.length) {
          clearInterval(interval);
        }
        return next;
      });
    }, PRODUCT_REVEAL_DELAY_MS);
    return (): void => clearInterval(interval);
  }, [streaming, products.length]);

  const updateScrollState = useCallback((): void => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!scroller || !el) {
      return undefined;
    }
    updateScrollState();
    // Observes the scroller itself rather than `window`: the chat panel/drawer can resize without
    // any window resize, and card widths follow the container, so this also covers every case that
    // changes how much content overflows. Newly revealed cards re-run this effect via `revealedCount`.
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return (): void => observer.disconnect();
  }, [scroller, revealedCount, updateScrollState]);

  const scrollByCards = (direction: 1 | -1): void => {
    const el = scrollerRef.current;
    const firstCard = el?.firstElementChild as HTMLElement | null;
    if (!el || !scroller || !firstCard) {
      return;
    }
    const step = (firstCard.offsetWidth + scroller.gap) * scroller.cardsPerScroll;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const isFocusedTurn = !!focusedRequestId && requestId === focusedRequestId;

  useEffect(() => {
    if (!isFocusedTurn || !focusedProductId || !focusedCardRef.current) {
      return;
    }
    focusedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [isFocusedTurn, focusedProductId]);

  const getCardWrapperStyle = (isFocused: boolean): CSSProperties => ({
    transformOrigin: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: isFocused ? 2 : 1,
    transform: isFocused ? `scale(${FOCUSED_SCALE})` : undefined,
    boxShadow: isFocused
      ? '0 8px 20px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)'
      : undefined,
  });

  const renderCard = (product: ProcessedProduct, pidx: number): JSX.Element => {
    const viewedKey = `${requestId}:${product.product_id}`;
    const isFocused = isFocusedTurn && !!focusedProductId && product.product_id === focusedProductId;
    return (
      <div
          key={`${product.product_id}-${pidx}`}
          role='listitem'
          ref={isFocused ? focusedCardRef : undefined}
          className={cn('relative', scroller && 'snap-start')}
          style={scroller ? {
            ...getCardWrapperStyle(isFocused),
            flexBasis: `calc(${100 / scroller.productsPerView}% - ${(scroller.gap * (scroller.productsPerView - 1)) / scroller.productsPerView}px)`,
            flexShrink: 0,
            flexGrow: 0,
            minWidth: 0,
          } : getCardWrapperStyle(isFocused)}
      >
        {isFocused && (
          <span
            className='absolute top-1 right-1 z-10 rounded-md bg-black/70 dark:bg-white/80
              px-1.5 py-0.5 text-[10px] font-medium leading-none text-white dark:text-black'
          >
            {intl.formatMessage({ id: 'nowDescribing' })}
          </span>
        )}
        <ProductCard
            result={product}
            metadata={{ queryId: requestId }}
            isInWishlist={wishlistPids.includes(product.product_id)}
            setIsInWishlist={setIsInWishlist}
            index={pidx}
            pwPrefix={pwPrefix}
            imageClasses={imageClasses}
            isRecommendation={false}
            hasFindSimilar={false}
            skipViewTracking={viewedProductIdsRef.current.has(viewedKey)}
            onProductViewed={() => {
              viewedProductIdsRef.current.add(viewedKey);
            }} />
      </div>
    );
  };

  const cards = products.slice(0, revealedCount).map((product, pidx) => renderCard(product, pidx));

  if (!scroller) {
    return (
      <div role='list' className={className} style={style}>
        {cards}
      </div>
    );
  }

  const arrowClasses = cn(
    'absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border-0',
    'p-1 shadow-md cursor-pointer',
    FOCUS_VISIBLE_CLASSES,
  );

  return (
    <div className={cn('relative min-w-0', className)} style={style}>
      <div
        ref={scrollerRef}
        role='list'
        className='flex snap-x snap-mandatory overflow-x-auto scroll-smooth py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        style={{
          columnGap: `${scroller.gap}px`,
          paddingInline: `${PRODUCT_SCROLLER_PEEK_PX}px`,
          scrollPaddingInline: `${PRODUCT_SCROLLER_PEEK_PX}px`,
        }}
        onScroll={updateScrollState}
      >
        {cards}
      </div>
      {canScrollPrev && (
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yScrollProductsPrev' })}
          className={cn(arrowClasses, 'left-1')}
          style={{ backgroundColor: arrowBackground }}
          onClick={() => scrollByCards(-1)}
        >
          <ChevronLeftIcon className='size-5' color={arrowColor} />
        </button>
      )}
      {canScrollNext && (
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yScrollProductsNext' })}
          className={cn(arrowClasses, 'right-1')}
          style={{ backgroundColor: arrowBackground }}
          onClick={() => scrollByCards(1)}
        >
          <ChevronLeftIcon className='size-5 rotate-180' color={arrowColor} />
        </button>
      )}
    </div>
  );
};

// Toggling one product's wishlist state produces a new `wishlistPids` array reference — a plain
// memo would see that as "changed" and re-render every ProductGrid instance (one per historical
// chat turn) on every single toggle. Comparing membership only for THIS grid's own products lets
// every other turn's grid (and its ProductCards) skip re-rendering entirely.
const arePropsEqual = (prev: ProductGridProps, next: ProductGridProps): boolean => {
  if (
    prev.products !== next.products
    || prev.requestId !== next.requestId
    || prev.focusedProductId !== next.focusedProductId
    || prev.focusedRequestId !== next.focusedRequestId
    || prev.setIsInWishlist !== next.setIsInWishlist
    || prev.pwPrefix !== next.pwPrefix
    || prev.streaming !== next.streaming
    || prev.className !== next.className
    || prev.style !== next.style
    || prev.imageClasses !== next.imageClasses
    || prev.scroller !== next.scroller
  ) {
    return false;
  }
  if (prev.wishlistPids === next.wishlistPids) {
    return true;
  }
  return next.products.every(
    (product) => prev.wishlistPids.includes(product.product_id) === next.wishlistPids.includes(product.product_id),
  );
};

export default memo(ProductGrid, arePropsEqual);
