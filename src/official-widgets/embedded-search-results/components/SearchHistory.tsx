// src/official-widgets/embedded-search-results/components/SearchHistory.tsx
import { cn } from '@nextui-org/theme';
import type { ReactElement } from 'react';
import { Image } from '@nextui-org/image';
// import CloseIcon from '../../../common/icons/CloseIcon';

export interface SearchHistoryEntry {
  id: string;
  type: 'text' | 'image';
  query?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  timestamp: number;
  filters?: Record<string, any>;
  source: 'url' | 'user';
}

export const STORAGE_KEY = 'visenze_search_history';
export const MAX_HISTORY_ITEMS = 20;

export default function SearchHistory({
  activeHistory,
  // setActiveHistory,
  history,
  // multisearchWithSearchBarDetails,
  searchFromHistory,
}: {
  activeHistory: SearchHistoryEntry | undefined;
  setActiveHistory: (entry: SearchHistoryEntry | undefined) => void;
  history: SearchHistoryEntry[];
  multisearchWithSearchBarDetails: (imgUrl?: string) => void;
  searchFromHistory: (entry: SearchHistoryEntry) => void
}): ReactElement {
  return (
    <div className='no-scrollbar flex w-full flex-col gap-2 overflow-x-scroll px-2 py-3 md:h-36 md:flex-row md:px-0 lg:h-40' data-pw='esr-product-history'>
      <div className='flex w-full flex-row items-center md:w-1/4 md:flex-col'>
        <p className='w-auto pb-2 text-center'>Past searches</p>

        <div className='grid auto-cols-max grid-flow-col gap-2 pl-2'>
          {history.filter((entry) => entry.type === 'text').map((entry, index) => (
            <div key={index}>
              <button
                className={cn(
                  'rounded-xl bg-gray-200 px-2 py-1',
                  entry.id === activeHistory?.id ? 'border border-gray-500' : 'opacity-60',
                )}
                onClick={() => {
                  searchFromHistory(entry);
                }}
              >
                {entry.query}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className='flex flex-row gap-2 md:w-3/4'>
      {history.filter((entry) => entry.type === 'image').map((entry, index) => (
        <div
          key={index}
          className={cn(
            'relative h-32 flex-shrink-0 cursor-pointer',
            entry.id === activeHistory?.id ? 'border border-gray-500' : 'opacity-60',
          )}
          onClick={() => {
            searchFromHistory(entry);
          }}
          data-pw={`esr-${entry.id === activeHistory?.id ? 'active-product' : 'inactive-product'}`}
        >
          <Image
            classNames={{ wrapper: 'h-full' }}
            className='h-full rounded-none object-cover' src={entry.imageUrl ?? ''}
            data-pw={`esr-product-history-image-${index + 1}`}
          />
          {/* <button
            className='absolute right-1 top-1 z-10 rounded-full bg-white p-1'
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              // removeFromHistory(imgUrl);
            }}
            data-pw='esr-product-history-delete'
          >
            <CloseIcon className='size-3'/>
          </button> */}
        </div>
      ))}
      </div>
    </div>
  );
}
