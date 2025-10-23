import { Input } from '@heroui/input';
import { Skeleton } from '@heroui/skeleton';
import { cn } from '@heroui/theme';
import { useContext, useState } from 'react';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import Footer from '../../../common/components/Footer';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../../common/utils';
import Header from '../components/Header';

interface ResultScreenProps {
  productResults: ProcessedProduct[];
  imageUrl: string;
  metadata: Record<string, any>;
  onModalClose: () => void;
  onTextSearch: (text: string) => void;
  onSimilarSearch: () => void;
  onComplementarySearch: () => void;
  isStreaming: boolean;
}

const ResultScreen: FC<ResultScreenProps> = ({
  productResults,
  imageUrl,
  metadata,
  onModalClose,
  onTextSearch,
  onSimilarSearch,
  onComplementarySearch,
  isStreaming,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState<'similar' | 'complementary' | null>('similar');
  const [isRecommendInputFocused, setIsRecommendInputFocused] = useState(false);
  const breakpoint = useBreakpoint();
  const intl = useIntl();

  return (
    <>
      <div className='h-full'>
        <Header
          onCloseHandler={onModalClose}
          showTitle={customizations.generalLayout?.showWidgetTitle}
          iconColor={darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor}
        />
        <div className='size-full'>
          <div className='h-full overflow-y-scroll pb-8'>
            <div className='px-2 gap-4'>
              <div className='flex justify-between p-2'>
                <div className='wigmix-reference-image-container w-1/2 flex items-center text-center'>
                  <img
                    src={imageUrl}
                    className='wigmix-reference-image md:h-full'
                    data-pw='sod-reference-image'
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
                      if (isStreaming) {
                        return;
                      }
                      setActiveSearch('similar');
                      setSearch('');
                      onSimilarSearch();
                    }}>
                    {intl.formatMessage({ id: 'similarProducts' })}
                  </button>

                  <button
                    className={cn(
                        'text-sm px-2 py-1 rounded-full',
                    )}
                    style={activeSearch === 'complementary' ? {
                      backgroundColor: darkMode ? customizations.buttons?.primary?.backgroundColorDark : customizations.buttons?.primary?.backgroundColor,
                      color: darkMode ? customizations.buttons?.primary?.fontColorDark : customizations.buttons?.primary?.fontColor,
                    } : {
                      backgroundColor: darkMode ? customizations.buttons?.secondary?.backgroundColorDark : customizations.buttons?.secondary?.backgroundColor,
                      color: darkMode ? customizations.buttons?.secondary?.fontColorDark : customizations.buttons?.secondary?.fontColor,
                    }}
                    onClick={() => {
                      if (isStreaming) {
                        return;
                      }
                      setActiveSearch('complementary');
                      setSearch('');
                      onComplementarySearch();
                    }}>
                    {intl.formatMessage({ id: 'complementaryProducts' })}
                  </button>
                </div>
              </div>

              <div className='border-b border-gray-200 px-2'></div>
            </div>

            {/* Search input bar with Recommend me button */}
            <div className='flex gap-0 w-full px-4 py-2'>
              <button
                className={`font-bold px-4 rounded-s-md h-10 text-sm transition-colors ${
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
                data-pw='sod-recommend-me-button'>
                <span>{intl.formatMessage({ id: 'searchBarButton' })}</span>
              </button>

              <div className='relative flex-1'>
                <Input
                  isClearable
                  maxLength={QUERY_MAX_CHARACTER_LENGTH}
                  type='filters'
                  placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
                  classNames={{
                    inputWrapper: 'rounded-s-none',
                    input: 'rounded-s-none',
                  }}
                  value={search}
                  onValueChange={(input): void => {
                    setSearch(input);
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
                  data-pw='sod-refinement-text-bar'
                  data-testid='wigmix-text-bar'
                />
              </div>
            </div>

            <div className='w-full flex flex-col px-2 gap-4 mb-28'>
              {isStreaming && (
                  <div className={`wigmix-product-grid grid px-2 pb-3 ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-3', 'gap-x-2', 'gap-y-3')}`}
                       style={getProductGridCssConfig(customizations, breakpoint)}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={`skeleton-${i}`}
                             className='group relative flex-shrink-0'
                             style={{ width: 200, minWidth: 200 }}>
                          <div className='wigmix-product-card overflow-hidden'>
                            <Skeleton className='wigmix-product-card-image aspect-[2/3] w-full' style={{ height: 300 }} />
                            <div className='flex flex-col space-y-2 py-3'>
                              <Skeleton className='h-3 w-3/4 rounded' />
                              <Skeleton className='h-4 w-1/2 rounded' />
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
              {!isStreaming && (
                <div
                  className={`wigmix-product-grid grid px-2 pb-3 ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-3', 'gap-x-2', 'gap-y-3')}`}
                  style={getProductGridCssConfig(customizations, breakpoint)}
                  data-pw='sod-product-result-grid'>
                  {productResults.map((result, index) => (
                    <ProductCard
                      key={`${result.product_id}-${index}`}
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
                      hasFindSimilar={false}
                      pwPrefix='sod'
                    />
                  ))}
                </div>
              )}
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
          <Footer darkMode={darkMode} dataPw='sod-visenze-footer' />
        </div>
      )}
    </>
  );
};

export default ResultScreen;
