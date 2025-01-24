import { cn } from '@nextui-org/theme';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Image as NextImage } from '@nextui-org/image';
import ImageCropThumbnail from './ImageCropThumbnail';
import CloseIcon from '../../../common/icons/CloseIcon';

export interface ProductType {
  type: string;
  score?: number;
  rerankScore?: number;
  box: number[];
  attributes: { [index: string]: string[] };
  box_type: string;
}

export interface SearchHistoryEntry {
  id: string;
  type: 'text' | 'image';
  query?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  product_types?: ProductType[];
  box?: number[];
  timestamp: number;
  filters?: Record<string, any>;
  source: 'url' | 'user';
}

export const MAX_HISTORY_ITEMS = 20;

export default function SearchHistory({
  activeHistory,
  history,
  onHistorySelect,
  onHistoryRemove,
}: {
  activeHistory: SearchHistoryEntry | undefined;
  setActiveHistory: (entry: SearchHistoryEntry | undefined) => void;
  history: SearchHistoryEntry[];
  multisearchWithSearchBarDetails: (imgUrl?: string) => void;
  onHistorySelect: (entry: SearchHistoryEntry) => void;
  onHistoryRemove: (entry: SearchHistoryEntry) => void;
}): ReactElement {
  const [imageDimensions, setImageDimensions] = useState<{ [key: string]: { width: number, height: number } }>({});
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeHistory]);

  const loadImageDimensions = (imageUrl: string): void => {
    if (!imageDimensions[imageUrl]) {
      const img = new Image();
      img.onload = (): void => {
        setImageDimensions((prev) => ({
          ...prev,
          [imageUrl]: {
            width: img.width,
            height: img.height,
          },
        }));
      };
      img.src = imageUrl;
    }
  };

  const getActiveHistoryId = (): string => {
    if (activeHistory) {
      let baseId = activeHistory.id;
      if (activeHistory.product_types) {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const searchBarBox = urlSearchParams.get('box');

        if (searchBarBox) {
          baseId += `-${searchBarBox}`;
        } else {
          baseId += `-${activeHistory.product_types[0].box.join()}`;
        }
      }
      return baseId;
    }
    return '';
  };

  return (
    <>
      <div className='no-scrollbar flex w-full flex-col gap-2 overflow-x-scroll px-2 py-3' data-pw='esr-product-history'>
        <div className='flex w-full flex-row gap-2 md:w-1/2'>
          {history
            .filter((entry) => (entry.type === 'image'))
            // eslint-disable-next-line no-confusing-arrow
            .flatMap((entry) => (entry.product_types !== undefined)
              ? entry.product_types.map((type) => ({
                  ...entry,
                  id: `${entry.id}-${type.box.join()}`,
                  box: type.box,
                }))
              : [entry])
            .map((entry, index) => (
              <div
                key={`${entry.id}-${index}`}
                ref={entry.id === getActiveHistoryId() ? activeItemRef : undefined}
                className={cn(
                  'relative h-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-md',
                  entry.id === getActiveHistoryId() ? 'border border-gray-500' : 'opacity-60',
                )}
                onClick={() => {
                  if (entry.id !== getActiveHistoryId()) {
                    onHistorySelect(entry);
                  }
                }}
                data-pw={`esr-${entry.id === getActiveHistoryId() ? 'active-product' : 'inactive-product'}`}
              >
                <div className='absolute right-1 top-1 z-20 rounded-full bg-white'
                     onClick={(event) => {
                       event.preventDefault();
                       event.stopPropagation();
                       onHistoryRemove(entry);
                     }}>
                  <CloseIcon className='size-4'/>
                </div>
                {entry.box ? (
                  <div className='h-32 w-24 overflow-hidden'>
                    {entry.imageUrl && (
                      <>
                        {!imageDimensions[entry.imageUrl] && loadImageDimensions(entry.imageUrl)}
                        <ImageCropThumbnail
                          imageSrc={entry.imageUrl}
                          originalBox={entry.box}
                          className='h-full rounded-none bg-gray-200'
                          data-pw={`esr-product-history-image-cropped-${index + 1}`}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <NextImage
                    classNames={{ wrapper: 'h-full' }}
                    className='h-full rounded-none object-cover'
                    src={entry.imageUrl ?? ''}
                    data-pw={`esr-product-history-image-${index + 1}`}
                  />
                )}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
