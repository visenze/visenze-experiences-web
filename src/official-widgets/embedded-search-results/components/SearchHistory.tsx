import { cn } from '@heroui/theme';
import { type ReactElement, useEffect, useRef } from 'react';
import CloseIcon from '../../../common/icons/CloseIcon';

export interface SearchHistoryEntry {
  id: string;
  imageUrl: string;
  pid?: string;
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

  const getActiveHistoryId = (): string => {
    if (activeHistory) {
      return activeHistory.id;
    }
    return '';
  };

  return (
    <>
      <div className='no-scrollbar flex w-full flex-col gap-2 overflow-x-scroll px-2 py-3' data-pw='esr-product-history'>
        <div className='flex w-full flex-row gap-2 md:w-1/2'>
          {history
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
                data-testid={`wigmix-${entry.id === getActiveHistoryId() ? 'active-product' : 'inactive-product'}`}
              >
                <div className='absolute right-1 top-1 z-20 rounded-full bg-white'
                   onClick={(event) => {
                     event.preventDefault();
                     event.stopPropagation();
                     onHistoryRemove(entry, entry.id === getActiveHistoryId());
                   }}
                   data-pw={`esr-${entry.id === getActiveHistoryId() ? 'active-product-close' : 'inactive-product-close'}`}
                   data-testid={`wigmix-${entry.id === getActiveHistoryId() ? 'active-product-close' : 'inactive-product-close'}`}
                >
                  <CloseIcon className='size-4 text-black' />
                </div>
                <img className='aspect-square h-full rounded-none object-contain'
                     src={entry.imageUrl ?? ''}
                     data-pw={`esr-product-history-image-${index + 1}`} />
              </div>
            ))}
        </div>
      </div>
    </>
  );
};

export default SearchHistory;
