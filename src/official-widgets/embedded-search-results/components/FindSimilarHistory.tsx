import type { FC } from 'react';
import { cn } from '@nextui-org/theme';
import { Image } from '@nextui-org/image';
import CloseIcon from '../../../common/icons/CloseIcon';

interface FindSimilarHistoryProps {
  activeImgUrl: string | null;
  setActiveImgUrl: (activeImgUrl: string | null) => void;
  findSimilarHistory: string[];
  setFindSimilarHistory: (findSimilarHistory: string[]) => void;
  multisearchWithSearchBarDetails: (imgUrl: string) => void;
}

const FindSimilarHistory:FC<FindSimilarHistoryProps> = ({ activeImgUrl, setActiveImgUrl, findSimilarHistory, setFindSimilarHistory, multisearchWithSearchBarDetails }) => {
  const removeFromHistory = (imgUrl: string): void => {
    const newFindSimilarHistory = findSimilarHistory.filter((item) => item !== imgUrl);
    if (newFindSimilarHistory.length === 0 || activeImgUrl === imgUrl) {
      setActiveImgUrl(null);
    }
    setFindSimilarHistory(newFindSimilarHistory);
  };

  return (
    <>
      {
        findSimilarHistory.length > 0
        && <div className='no-scrollbar flex h-32 w-full gap-2 overflow-x-scroll px-2 py-3 md:h-36 md:px-0 lg:h-40' data-pw='esr-product-history'>
          {
            findSimilarHistory.map((imgUrl, index) => (
              <div
                key={imgUrl}
                className={cn(
                  'relative h-full flex-shrink-0 cursor-pointer',
                  imgUrl === activeImgUrl ? 'border border-gray-500' : 'opacity-60',
                )}
                onClick={() => {
                  multisearchWithSearchBarDetails(imgUrl);
                  setActiveImgUrl(imgUrl);
                }}
                data-pw={`esr-${imgUrl === activeImgUrl ? 'active-product' : 'inactive-product'}`}
              >
                <Image
                  classNames={{ wrapper: 'h-full' }}
                  className='h-full rounded-none object-cover' src={imgUrl}
                  data-pw={`esr-product-history-image-${index + 1}`}
                />
                <button
                  className='absolute right-1 top-1 z-10 rounded-full bg-white p-1'
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeFromHistory(imgUrl);
                  }}
                  data-pw='esr-product-history-delete'
                >
                  <CloseIcon className='size-3'/>
                </button>
              </div>
            ))
          }
        </div>
      }
    </>
  );
};

export default FindSimilarHistory;
