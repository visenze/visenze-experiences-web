import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import BreadcrumbTrail from './BreadcrumbTrail';
import ProductGridSkeleton from './ProductGridSkeleton';
import ProductGrid from '../../../common/components/chat/ProductGrid';
import type { BreadcrumbTurn } from '../../../common/components/chat/use-chat';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../../common/utils';

// Falls back to these whenever customizations.productGrid doesn't configure a given breakpoint —
// same defaults ChatWindow.tsx uses for the regular (non-split) chat surface's product grid, so
// split layout's products pane matches it out of the box.
const PRODUCT_GRID_COLUMNS_CLASSES = 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
const PRODUCT_GRID_DEFAULT_GAP_Y = 'gap-y-4';
// Stacked skeleton bars (image + three text lines) read as more cramped between rows than actual
// product cards, so the skeleton's default row gap is taller than the real grid's — but only
// when marginVertical isn't explicitly customized; an explicit value applies to both alike.
const PRODUCT_GRID_SKELETON_DEFAULT_GAP_Y = 'gap-y-8';

interface ProductsPaneProps {
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  onTrailSelect: (requestId: string) => void;
  streamingProducts: ProcessedProduct[];
  streamingRequestId: string;
  focusedProductId?: string | null;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
}

const ProductsPane: FC<ProductsPaneProps> = ({
  breadcrumbs, activeBreadcrumbId, onTrailSelect, streamingProducts, streamingRequestId, focusedProductId = null,
  wishlistPids, setIsInWishlist,
}) => {
  const activeCrumb = breadcrumbs.find((crumb) => crumb.requestId === activeBreadcrumbId);
  // Before the first turn commits (or whenever the in-flight request is newer than the active
  // crumb), show the live streaming products; once commitResponse runs, that turn becomes the
  // active crumb and takes over.
  const isStreaming = !!streamingRequestId
    && streamingProducts.length > 0
    && (!activeCrumb || activeCrumb.requestId !== streamingRequestId);
  const products = isStreaming ? streamingProducts : (activeCrumb?.products || []);
  const requestId = isStreaming ? streamingRequestId : (activeCrumb?.requestId || '');
  // The active crumb is the optimistic placeholder use-chat adds the moment a query is sent (see
  // use-chat.ts's sendMessage) — it always starts with an empty products array, and only turns
  // that end up with products ever become permanent breadcrumbs. So an active crumb with zero
  // products reliably means "this query is in flight and nothing has streamed back yet",
  // regardless of whether the 'reqid' SSE event (and therefore isStreaming) has fired yet.
  const isWaitingForFirstProduct = !!activeCrumb && activeCrumb.products.length === 0 && !isStreaming;
  const intl = useIntl();
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const breakpoint = useBreakpoint();

  const productGridClasses = useMemo(
    (): string => getProductGridCssClasses(customizations, breakpoint, PRODUCT_GRID_COLUMNS_CLASSES, 'gap-x-4', PRODUCT_GRID_DEFAULT_GAP_Y),
    [customizations.productGrid, breakpoint],
  );
  const skeletonGridClasses = useMemo(
    (): string => getProductGridCssClasses(customizations, breakpoint, PRODUCT_GRID_COLUMNS_CLASSES, 'gap-x-4', PRODUCT_GRID_SKELETON_DEFAULT_GAP_Y),
    [customizations.productGrid, breakpoint],
  );
  const productGridCssConfig = useMemo(
    (): CSSProperties => getProductGridCssConfig(customizations, breakpoint),
    [customizations.productGrid, breakpoint],
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <BreadcrumbTrail breadcrumbs={breadcrumbs} activeBreadcrumbId={activeBreadcrumbId} onSelect={onTrailSelect} />
      {isWaitingForFirstProduct && (
        <>
          <span role='status' className='sr-only'>
            {intl.formatMessage({ id: 'a11yLoadingResults' })}
          </span>
          <ProductGridSkeleton className={cn('grid px-4 pb-4', skeletonGridClasses)} style={productGridCssConfig} />
        </>
      )}
      {products.length > 0 && (
        <ProductGrid
          products={products}
          requestId={requestId}
          focusedProductId={focusedProductId}
          focusedRequestId={streamingRequestId}
          wishlistPids={wishlistPids}
          setIsInWishlist={setIsInWishlist}
          pwPrefix='asl'
          streaming={isStreaming}
          className={cn('grid px-4 pb-4', productGridClasses)}
          style={productGridCssConfig}
        />
      )}
    </div>
  );
};

export default ProductsPane;
