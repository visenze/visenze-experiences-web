import { type FC } from 'react';
import { useIntl } from 'react-intl';
import BreadcrumbTrail from './BreadcrumbTrail';
import ProductGrid from '../../../common/components/chat/ProductGrid';
import type { BreadcrumbTurn, Chat } from '../../../common/components/chat/use-chat';
import type { ProcessedProduct } from '../../../common/types/product';

interface ProductsPaneProps {
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  setActiveBreadcrumb: (requestId: string) => void;
  streamingProducts: ProcessedProduct[];
  streamingRequestId: string;
  // Read only to derive the pending query's label while a turn is streaming in (see
  // `pendingLabel` below) — not rendered directly.
  chats: Chat[];
  focusedProductId?: string | null;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
}

const ProductsPane: FC<ProductsPaneProps> = ({
  breadcrumbs, activeBreadcrumbId, setActiveBreadcrumb, streamingProducts, streamingRequestId, chats, focusedProductId = null,
  wishlistPids, setIsInWishlist,
}) => {
  const intl = useIntl();
  const activeCrumb = breadcrumbs.find((crumb) => crumb.requestId === activeBreadcrumbId);
  // Before the first turn commits (or whenever the in-flight request is newer than the active
  // crumb), show the live streaming products; once commitResponse runs, that turn becomes the
  // active crumb and takes over.
  const isStreaming = !!streamingRequestId
    && streamingProducts.length > 0
    && (!activeCrumb || activeCrumb.requestId !== streamingRequestId);
  const products = isStreaming ? streamingProducts : (activeCrumb?.products || []);
  const requestId = isStreaming ? streamingRequestId : (activeCrumb?.requestId || '');
  // The user's message is pushed to `chats` synchronously at send time, well before any response
  // streams back — so this reflects the new query immediately, rather than waiting for
  // commitResponse to update `activeCrumb` once the reply finishes.
  const pendingLabel = [...chats].reverse().find((c) => c.author === 'user')?.messages[0] || '';
  const headerLabel = isStreaming ? pendingLabel : activeCrumb?.label;

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      {headerLabel && (
        <div className='px-4 pt-4'>
          <span className='block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400'>
            {intl.formatMessage({ id: 'resultsForEyebrow' })}
          </span>
          <span className='block text-base font-semibold'>{headerLabel}</span>
        </div>
      )}
      <BreadcrumbTrail breadcrumbs={breadcrumbs} activeBreadcrumbId={activeBreadcrumbId} onSelect={setActiveBreadcrumb} />
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
          className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 pb-4'
        />
      )}
    </div>
  );
};

export default ProductsPane;
