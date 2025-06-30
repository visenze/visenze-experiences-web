import { cn } from '@heroui/theme';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import ImageCropThumbnail from '../../../common/components/crop/ImageCropThumbnail';
import type { BoxData } from '../../../common/types/product';
import { flattenBox } from '../../../common/utils';

export interface SearchHistoryEntry {
  id: string;
  imageUrl: string;
  pid?: string;
  box?: BoxData;
  timestamp: number;
}

export const MAX_HISTORY_ITEMS = 20;

const SearchHistory = ({
  activeHistory,
  history,
  onHistorySelect,
  onHistoryRemove,
}: {
  activeHistory: SearchHistoryEntry | undefined;
  setActiveHistory: (entry: SearchHistoryEntry | undefined) => void;
  history: SearchHistoryEntry[];
  onHistorySelect: (entry: SearchHistoryEntry) => void;
  onHistoryRemove: (entry: SearchHistoryEntry, isActiveHistoryRemoved: boolean) => void;
}): ReactElement => {
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

  const [showHistory, setShowHistory] = useState(true);
  const getActiveHistoryId = (): string => {
    if (activeHistory) {
      return activeHistory.id;
    }
    return '';
  };

  // Handler for clear all button
  const handleClearAll = (): void => {
    history.forEach((entry) => onHistoryRemove(entry, false));
  };

  if (history.length === 0) {
    return <></>;
  }

  return (
    <div className='bg-gray-50 rounded-md w-full p-4'>
      {/* Header with Saved Searches and Hide/Show */}
      <div className='flex items-center justify-between'>
        <span className='text-sm font-semibold text-gray-700'>Saved Searches ({history.length})</span>
        <button
          className='text-xs font-medium text-gray-400 hover:text-primary focus:outline-none'
          type='button'
          onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Hide' : 'Show'}
        </button>
      </div>
      {/* Thumbnails Row */}
      {showHistory && (
        <div className='flex flex-row gap-2 min-h-[90px] border-t mt-2 p-2 w-full overflow-x-scroll'>
          {history.length === 0 && <span className='text-xs text-gray-400'>No saved searches</span>}
          {history.map((entry, index) => (
            <div
              key={`${entry.id}-${index}`}
              ref={entry.id === getActiveHistoryId() ? activeItemRef : undefined}
              className={cn(
                'relative h-24 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-md border border-gray-200 bg-white',
                entry.id === getActiveHistoryId() ? 'ring-2 ring-primary' : 'opacity-60',
              )}
              onClick={() => {
                if (entry.id !== getActiveHistoryId()) {
                  onHistorySelect(entry);
                }
              }}
              data-pw={`esr-${entry.id === getActiveHistoryId() ? 'active-product' : 'inactive-product'}`}
              data-testid={`wigmix-${entry.id === getActiveHistoryId() ? 'active-product' : 'inactive-product'}`}>
              {entry.box ? (
                <ImageCropThumbnail
                  imageUrl={entry.imageUrl ?? ''}
                  className='aspect-square size-full rounded-none object-contain opacity-100'
                  box={flattenBox(entry.box.box)}
                  index={entry.box.index}
                />
              ) : (
                <img
                  className='aspect-square size-full rounded-none object-contain'
                  src={entry.imageUrl ?? ''}
                  data-pw={`esr-product-history-image-${index + 1}`}
                  data-testid={`wigmix-${entry.id === getActiveHistoryId() ? 'active-product-history-image' : 'inactive-product-history-image'}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {/* Clear All Button */}
      {showHistory && history.length > 0 && (
        <div className='flex w-full justify-end mt-2'>
          <button
            className='text-xs font-medium text-gray-400 hover:text-primary focus:outline-none'
            type='button'
            onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchHistory;
