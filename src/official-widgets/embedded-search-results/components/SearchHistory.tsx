import { cn } from '@heroui/theme';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ProductType } from 'visearch-javascript-sdk';
import ImageCropThumbnail from './ImageCropThumbnail';
import CloseIcon from '../../../common/icons/CloseIcon';

export interface SearchHistoryEntry {
  id: string;
  query?: string | null;
  imageUrl?: string | null;
  product_types?: ProductType[];
  box?: number[];
  timestamp: number;
}

export const MAX_HISTORY_ITEMS = 20;
export const SEARCH_HISTORY_BASE_KEY = 'visenze_search_history_';

const SearchHistory = ({
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
  onHistoryRemove: (entry: SearchHistoryEntry, isActiveHistoryRemoved: boolean) => void;
}): ReactElement => {
  const [imageDimensions, setImageDimensions] = useState<{ [key: string]: { width: number; height: number } }>({});
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
        // TODO refactor this to remove dependency to URL params
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
      <div className='flex size-full flex-row items-center'>
        <div className='no-scrollbar flex w-full items-center gap-2 overflow-x-scroll'>
          {history.filter((entry) => entry.query && !entry.imageUrl).map((entry, index) => (
            <div key={index}>
              <button
                className={cn(
                  'rounded-xl bg-gray-200 px-2 py-1 border',
                  entry.id === activeHistory?.id ? 'border-gray-500' : 'opacity-60',
                )}
                onClick={() => {
                  if (entry.id !== getActiveHistoryId()) {
                    onHistorySelect(entry);
                  }
                }}
              >
                {entry.query}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className='no-scrollbar flex w-full flex-col gap-2 overflow-x-scroll px-2 py-3' data-pw='esr-product-history'>
        <div className='flex w-full flex-row gap-2 md:w-1/2'>
          {history.filter((entry) => entry.imageUrl)
            .flatMap((entry) => (entry.product_types !== undefined
              ? entry.product_types.map((type) => ({
                  ...entry,
                  id: `${entry.id}-${type.box.join()}`,
                  box: type.box,
                }))
              : [entry]))
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
                       onHistoryRemove(entry, entry.id === getActiveHistoryId());
                     }}>
                  <CloseIcon className='size-4 text-black' />
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
                  <img className='h-full rounded-none object-contain aspect-square'
                       src={entry.imageUrl ?? ''}
                       data-pw={`esr-product-history-image-${index + 1}`} />
                )}
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default SearchHistory;
