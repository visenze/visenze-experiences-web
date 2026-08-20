import { Skeleton } from '@heroui/skeleton';
import { type FC } from 'react';

interface ProductGridSkeletonProps {
  className?: string;
}

// Enough cards to fill the widest grid breakpoint (xl:grid-cols-4) a couple of rows deep.
const SKELETON_CARD_COUNT = 8;

const ProductGridSkeleton: FC<ProductGridSkeletonProps> = ({ className }) => (
  <div className={className} aria-hidden='true' data-testid='asl-product-grid-skeleton'>
    {Array.from({ length: SKELETON_CARD_COUNT }).map((_unused, index) => (
      // eslint-disable-next-line react/no-array-index-key
      <div key={index}>
        <Skeleton className='aspect-square w-full rounded' />
        <div className='flex flex-col gap-2 pt-2'>
          <Skeleton className='h-3 w-3/4 rounded' />
          <Skeleton className='h-3 w-1/2 rounded' />
          <Skeleton className='h-4 w-1/3 rounded' />
        </div>
      </div>
    ))}
  </div>
);

export default ProductGridSkeleton;
