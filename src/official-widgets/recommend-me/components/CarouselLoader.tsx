import { Skeleton } from '@heroui/skeleton';
import type { FC, ReactElement } from 'react';

/**
 * A placeholder carousel that displays products as they are being received from the ongoing event stream.
 */
const SKELETON_CARD_COUNT = 5;

const CarouselLoader: FC = (): ReactElement => {
  // Match the ProductCard width and aspect ratio (2/3 or fallback to aspect-square)
  const cardWidth = 200;
  // const aspectRatio = '2/3'; // fallback to 'aspect-square' if needed

  return (
    <div
      className='flex space-x-4 overflow-x-auto pb-4 no-scrollbar p-2 items-end text-primary'
      aria-hidden='true'
      data-pw='rm-product-loader-row'>
      {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className='group relative flex-shrink-0'
          style={{ width: cardWidth, minWidth: cardWidth }}>
          <div className='wigmix-product-card overflow-hidden'>
            <Skeleton className='wigmix-product-card-image aspect-[2/3] w-full' style={{ height: cardWidth * 1.5 }} />
            <div className='flex flex-col space-y-2 py-3'>
              <Skeleton className='h-3 w-3/4 rounded' />
              <Skeleton className='h-4 w-1/2 rounded' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CarouselLoader;
