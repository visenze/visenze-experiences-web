import { type FC } from 'react';
import { useIntl } from 'react-intl';
import BreadcrumbTrail from './BreadcrumbTrail';
import ProductGrid from '../../../common/components/chat/ProductGrid';
import type { BreadcrumbTurn } from '../../../common/components/chat/use-chat';
import type { ProcessedProduct } from '../../../common/types/product';

interface ProductsPaneProps {
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  setActiveBreadcrumb: (requestId: string) => void;
  streamingProducts: ProcessedProduct[];
  streamingRequestId: string;
  wishlistPids: string[];
  setIsInWishlist: (pid: string, isInWishlist: boolean) => void;
}

const ProductsPane: FC<ProductsPaneProps> = ({
  breadcrumbs, activeBreadcrumbId, setActiveBreadcrumb, streamingProducts, streamingRequestId, wishlistPids, setIsInWishlist,
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

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      {activeCrumb && (
        <div className='px-4 pt-4'>
          <span className='block text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400'>
            {intl.formatMessage({ id: 'resultsForEyebrow' })}
          </span>
          <span className='block text-base font-semibold'>{activeCrumb.label}</span>
        </div>
      )}
      <BreadcrumbTrail breadcrumbs={breadcrumbs} activeBreadcrumbId={activeBreadcrumbId} onSelect={setActiveBreadcrumb} />
      {products.length > 0 && (
        <ProductGrid
          products={products}
          requestId={requestId}
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
