import { type CSSProperties, type FC, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { FOCUSED_SCALE, PRODUCT_REVEAL_DELAY_MS } from './constants';
import type { ProcessedProduct } from '../../types/product';
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
}

const ProductGrid: FC<ProductGridProps> = ({
  products, requestId, focusedProductId = null, focusedRequestId = null, wishlistPids, setIsInWishlist, pwPrefix, streaming = false, className, style,
}) => {
  const intl = useIntl();
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
          ref={isFocused ? focusedCardRef : undefined}
          className='relative'
          style={getCardWrapperStyle(isFocused)}
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
            isRecommendation={false}
            hasFindSimilar={false}
            skipViewTracking={viewedProductIdsRef.current.has(viewedKey)}
            onProductViewed={() => {
              viewedProductIdsRef.current.add(viewedKey);
            }} />
      </div>
    );
  };

  return (
    <div className={className} style={style}>
      {products.slice(0, revealedCount).map((product, pidx) => renderCard(product, pidx))}
    </div>
  );
};

export default ProductGrid;
