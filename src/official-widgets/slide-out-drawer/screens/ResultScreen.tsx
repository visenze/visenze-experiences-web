import { Input } from '@heroui/input';
import { cn } from '@heroui/theme';
import { useContext, useEffect, useState } from 'react';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import Footer from '../../../common/components/Footer';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';
import type { SearchImageOrPid } from '../../../common/types/image';
import type { ProcessedProduct } from '../../../common/types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../../common/utils';
import Header from '../components/Header';

interface ResultScreenProps {
  productResults: ProcessedProduct[];
  image?: SearchImageOrPid;
  autocompleteResults?: string[];
  metadata: Record<string, any>;
  onModalClose: () => void;
  onTextSearch: (text: string) => void;
  onFindSimilar: (data: SearchImageOrPid) => void;
  onKeywordUpdate: (q: string) => void;
  searchHistory: SearchImageOrPid[];
}

const ResultScreen: FC<ResultScreenProps> = ({
  productResults,
  image,
  metadata,
  onModalClose,
  onTextSearch = (): void => {},
  onFindSimilar = (): void => {},
  onKeywordUpdate,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState<'similar' | 'suggested' | null>('similar');
  const [debouncedOnKeywordUpdate, setDebouncedOnKeywordUpdate] = useState<string | null>(null);
  const [isRecommendInputFocused, setIsRecommendInputFocused] = useState(false);
  const breakpoint = useBreakpoint();
  const intl = useIntl();

  const getFile = (searchImage: SearchImageOrPid | undefined): string => {
    if (!searchImage) {
      return '';
    }
    if (isImageUrl(searchImage)) {
      return searchImage.imgUrl;
    }
    if (isImageDataUrl(searchImage)) {
      return searchImage.file;
    }
    return '';
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedOnKeywordUpdate != null) {
        onKeywordUpdate(debouncedOnKeywordUpdate);
      }
    }, 300);

    return (): void => {
      clearTimeout(handler);
    };
  }, [debouncedOnKeywordUpdate]);

  return (
    <>
      <div className='h-full flex flex-col gap-4'>
        <Header
          onCloseHandler={onModalClose}
          showTitle={customizations.generalLayout?.showWidgetTitle}
          iconColor={darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor}
        />
        <div className='size-full'>
          <div className='flex h-full flex-col gap-4 overflow-y-scroll pb-8'>
            <div className='h-full px-2 flex flex-col gap-4'>
              <div className='flex justify-between px-2'>
                <div className='wigmix-reference-image-container w-1/2 flex items-center text-center'>
                  <img
                    src={getFile(image)}
                    className='wigmix-reference-image md:h-full'
                    data-pw='ss-reference-image'
                  />
                </div>

                <div className='flex w-full flex-col gap-2 px-4'>
                  <button
                    className={cn(
                      'text-sm px-2 py-1 rounded-full',
                    )}
                    style={activeSearch === 'similar' ? {
                      backgroundColor: darkMode ? customizations.buttons?.primary?.backgroundColorDark : customizations.buttons?.primary?.backgroundColor,
                      color: darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor,
                    } : {
                      backgroundColor: darkMode ? customizations.buttons?.secondary?.backgroundColorDark : customizations.buttons?.secondary?.backgroundColor,
                      color: darkMode ? customizations.buttons?.secondary?.fontColorDark : customizations.buttons?.secondary?.fontColor,
                    }}
                    onClick={() => {
                      setActiveSearch('similar');
                      setSearch('');
                      onTextSearch('');
                    }}>
                    {intl.formatMessage({ id: 'similarProductButton' })}
                  </button>
                </div>
              </div>

              <div className='border-b border-gray-200 px-2'></div>
            </div>

            {/* Search input bar with Recommend me button */}
            <div className='flex gap-0 w-full px-4'>
              <button
                className={`font-bold px-4 rounded-l-md h-10 text-sm transition-colors ${
                  isRecommendInputFocused
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }`}
                disabled={!search.trim()}
                onClick={() => {
                  if (!search) {
                    return;
                  }
                  setActiveSearch(null);
                  onTextSearch(search);
                }}
                data-pw='rm-recommend-me-button'>
                <span>{intl.formatMessage({ id: 'searchBarButton' })}</span>
              </button>

              <div className='relative flex-1'>
                <Input
                  isClearable
                  maxLength={QUERY_MAX_CHARACTER_LENGTH}
                  type='filters'
                  placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
                  classNames={{
                    inputWrapper: 'rounded-l-none',
                    input: 'rounded-l-none',
                  }}
                  value={search}
                  onValueChange={(input): void => {
                    setSearch(input);
                    setDebouncedOnKeywordUpdate(input);
                  }}
                  onKeyDown={(event): void => {
                    if (event.key === 'Enter') {
                      setActiveSearch(null);
                      onTextSearch(search);
                    }
                  }}
                  onClear={(): void => {
                    setSearch('');
                    onTextSearch('');
                    setActiveSearch(null);
                  }}
                  onFocus={(): void => {
                    setIsRecommendInputFocused(true);
                  }}
                  onBlur={(): void => {
                    setIsRecommendInputFocused(false);
                  }}
                  data-pw='ss-refinement-text-bar'
                  data-testid='wigmix-text-bar'
                />
              </div>
            </div>

            <div className='w-full flex flex-col px-2 gap-4 mb-28'>
              <div
                className={`wigmix-product-grid grid px-2 pb-3 ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-3', 'gap-x-2', 'gap-y-3')}`}
                style={getProductGridCssConfig(customizations, breakpoint)}
                data-pw='ss-product-result-grid'>
                {productResults.map((result, index) => (
                  <ProductCard
                    key={`${result.product_id}-${index}`}
                    onFindSimilar={(data) => {
                      setSearch('');
                      return onFindSimilar(data);
                    }}
                    index={index}
                    result={result}
                    metadata={metadata}
                    isInWishlist={wishlistPids.includes(result.product_id)}
                    setIsInWishlist={(pid, isInWishlist) => {
                      setWishlistPids((prev) => {
                        const newPids = [...prev];
                        if (isInWishlist && !newPids.includes(pid)) {
                          newPids.push(pid);
                        }
                        if (!isInWishlist && newPids.includes(pid)) {
                          newPids.splice(newPids.indexOf(pid), 1);
                        }
                        return newPids;
                      });
                    }}
                    isRecommendation={false}
                    hasFindSimilar={true}
                    pwPrefix='ss'
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {customizations.generalLayout?.showViSenzeLogo && (
        <div className='w-full fixed bottom-0 py-2 md:absolute'
          style={{
            backgroundColor: darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor,
          }}
        >
          <Footer darkMode={darkMode} dataPw='ss-visenze-footer' />
        </div>
      )}
    </>
  );
};

export default ResultScreen;
