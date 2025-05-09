import { Listbox, ListboxItem, ListboxSection } from '@heroui/listbox';
import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import SearchBarInput from './components/SearchBarInput';
import useAutocomplete from '../../common/components/hooks/use-autocomplete';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useSearchAsYouType from '../../common/components/hooks/use-search-as-you-type';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';
import { isImageFile } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../common/utils';

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

interface SearchBarResultProps {
  textQuery: string;
  imUrl: string;
  renderModalWithoutPortal?: boolean;
}

const SEARCH_HISTORY_BASE_KEY = 'wigmix_internal_search_history_';

const MerchandiseSearchBar: FC<SearchBarResultProps> = ({ textQuery, imUrl, renderModalWithoutPortal }): ReactElement => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [suggestionMax, setSuggestionMax] = useState(6);
  const [relatedMax] = useState(8);
  const breakpoint = useBreakpoint();
  const root = useContext(RootContext);
  const intl = useIntl();

  const {
    imageUrl,
    autocompleteResults,
    error,
  } = useAutocomplete({
    image,
    query: debouncedQuery,
  });

  const {
    searchAsYouTypeResults,
    metadata,
  } = useSearchAsYouType({
    image,
    query: debouncedQuery,
  });
  const getTrendingProducts = (): ProcessedProduct[] => {
    const recProducts = [] as ProcessedProduct[];
    if (!customizations.trendingProducts?.products) {
      return recProducts;
    }
    customizations.trendingProducts.products.map((p) => {
      const product: ProcessedProduct = {
        product_id: p.productId,
        im_url: p.imUrl,
        title: p.title,
        price: p.price,
        product_url: p.productUrl,
      };
      recProducts.push(product);
      return product;
    });
    return recProducts;
  };

  const trendingProducts = getTrendingProducts();

  useEffect(() => {
    const handleImageAppended = (e: any): void => {
      setImage(e.detail);
    };
    document.addEventListener('wigmix_internal_search_bar_append_image', handleImageAppended);
    return (): void => {
      document.removeEventListener('wigmix_internal_search_bar_append_image', handleImageAppended);
    };
  }, []);

  useEffect(() => {
    if (breakpoint === WidgetBreakpoint.MOBILE) {
      setSuggestionMax(4);
    }
  }, [breakpoint]);

  const emitSearchBarCallback = (t: string | undefined, i: SearchImage | undefined): void => {
    if (widgetConfig.callbacks?.onSearchBarInput && typeof widgetConfig.callbacks.onSearchBarInput === 'function') {
      widgetConfig.callbacks.onSearchBarInput(t, i);
    }
  };

  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
    if (imageUrl) {
      if (image) {
        if (isImageFile(image)) {
          setImage({
            imgUrl: imageUrl,
          });
          emitSearchBarCallback(query, {
            imgUrl: imageUrl,
          });
        }
      } else {
        setImage({
          imgUrl: imageUrl,
        });
      }
    } else {
      setImage(undefined);
    }
  }, [imageUrl]);

  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return (): void => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (textQuery) {
      setQuery(textQuery);
    }
    if (imUrl) {
      setImage({
        imgUrl: imUrl,
      });
    }

    const historyFromLocalStorage = localStorage.getItem(`${SEARCH_HISTORY_BASE_KEY}${widgetConfig.appSettings.appKey}`);
    const historyFull: SearchHistoryEntry[] = historyFromLocalStorage ? JSON.parse(historyFromLocalStorage) : [];
    const now = new Date().getTime();
    setSearchHistory(historyFull.filter((h) => now - h.timestamp <= 7 * 24 * 60 * 60 * 1000));
  }, []);

  if (error && !hasError) {
    setHasError(true);
  }

  const updateSavedHistory = (search: string): void => {
    setSearchHistory((prevHistory) => {
      const newEntry: SearchHistoryEntry = {
        query: search,
        timestamp: new Date().getTime(),
      };
      const newHistory = [newEntry, ...prevHistory.filter((h) => h.query !== search)]
          .slice(0, 20);
      localStorage.setItem(`${SEARCH_HISTORY_BASE_KEY}${widgetConfig.appSettings.appKey}`, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const useOutsideAlerter = (ref: any): void => {
    useEffect(() => {
      const handleClickOutside = (event: any): void => {
        if (!ref.current || !event.target || !event.target.shadowRoot || !event.target.shadowRoot.contains(ref.current)) {
          setShowDropdown(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return (): void => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  };

  const OutsideAlerter = (props: any): ReactElement => {
    const wrapperRef = useRef(null);
    useOutsideAlerter(wrapperRef);

    return (
        <div ref={wrapperRef}
             className='absolute top-12 z-20 h-fit w-full overflow-y-scroll rounded-b-md border-x-1 border-b-1 border-gray-200 bg-primary transition-all'>
          {props.children}
        </div>
    );
  };

  if (!root) {
    return <></>;
  }

  return (
    <>
      <div className='flex size-full flex-col bg-primary'>
        <div className='relative flex w-full flex-col items-center'>
          {/* Search bar */}
          <SearchBarInput query={query} setQuery={setQuery} image={image}
                          imageUploadHandler={(img: SearchImage | undefined) => {
                            setImage(img);
                            if (img && !isImageFile(img)) {
                              emitSearchBarCallback(query, img);
                            }
                          }}
                          emitSearchBarCallback={() => {
                            if (query) {
                              updateSavedHistory(query);
                            }
                            emitSearchBarCallback(query, image);
                          }}
                          setShowDropdown={(s) => {
                            if (s) {
                              setShowDropdown(true);
                            }
                          }}
                          placementId={`${widgetConfig.appSettings.placementId}`}
                          renderModalWithoutPortal={!!renderModalWithoutPortal} />
          {/* Autocomplete dropdown */}
          {/* eslint-disable no-nested-ternary */}
          {showDropdown && query && (autocompleteResults.length > 0 || searchAsYouTypeResults.length > 0)
              ? (<OutsideAlerter>
                    <div className='relative flex max-h-[70vh] flex-col divide-x divide-gray-200 py-1 md:min-h-fit md:max-h-full md:flex-row'>
                      <div className='flex flex-col justify-between md:w-2/5'>
                        <div className='flex flex-col gap-2 px-4 py-1'>
                          <p className='text-large font-semibold leading-6 text-primary'>
                            {intl.formatMessage({ id: 'suggestions' })}
                          </p>
                          <Listbox
                              aria-label='Autocomplete Dropdown'
                          >
                            <ListboxSection classNames={{ base: 'mb-0' }}>
                              {autocompleteResults.slice(0, suggestionMax).map((result, index) => (
                                  <ListboxItem
                                      tabIndex={0}
                                      className='pr-4'
                                      key={result}
                                      endContent={(
                                          <MagnifyingGlassIcon color={darkMode
                                                                 ? (customizations.generalLayout?.fontColorDark || '')
                                                                 : (customizations.generalLayout?.fontColor || '')}
                                                               className='size-4' />
                                      )}
                                      textValue={result}
                                      onPress={() => {
                                        setQuery(result);
                                        emitSearchBarCallback(result, image);
                                      }}
                                  >
                            <span className='pl-2 text-primary'
                                  data-pw={`msb-autocomplete-suggestion-${index + 1}`}
                                  data-testid='wigmix-msb-autocomplete-value'>{result}</span>
                                  </ListboxItem>
                              ))}
                            </ListboxSection>
                          </Listbox>
                        </div>

                        <div className='hidden px-4 pb-4 md:flex'>
                          <div
                              className='w-full rounded text-center bg-buttonPrimary py-2 font-semibold text-buttonPrimary cursor-pointer hover:opacity-90'
                              data-testid='wigmix-msb-view-all-button'
                              onClick={() => {
                                if (query) {
                                  emitSearchBarCallback(query, image);
                                }
                              }}
                          >
                            {intl.formatMessage({ id: 'viewAllProducts' })}
                          </div>
                        </div>
                      </div>

                      <div className='flex w-full justify-center md:w-3/5'>
                        <div className='flex flex-col gap-2 overflow-y-scroll px-4 py-1 md:max-h-[70vh]'>
                          <p className='text-large font-semibold leading-6 text-primary'>
                            {intl.formatMessage({ id: 'relatedProducts' })}
                          </p>
                          <div
                              className={cn(
                                  'wigmix-product-grid grid text-primary w-full',
                                  getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2 md:grid-cols-4', 'gap-x-2', 'gap-y-4'),
                              )}
                              style={getProductGridCssConfig(customizations, breakpoint)}
                              data-pw='msb-product-result-grid'
                          >
                            {searchAsYouTypeResults.slice(0, relatedMax).map((result, index) => (
                                <div key={`${result.product_id}-${index}`} data-pw={`msb-product-result-card-${index + 1}`}>
                                  <ProductCard key={`${result.product_id}-${index}`}
                                               index={index}
                                               result={result}
                                               metadata={metadata}
                                               hasFindSimilar={false}
                                               isRecommendation={false}
                                               pwPrefix='msb' />
                                </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className='sticky bottom-0 flex bg-primary text-center px-4 py-2 md:hidden'>
                        <div
                            className='w-full rounded text-center bg-buttonPrimary py-2 font-semibold text-buttonPrimary cursor-pointer'
                            data-testid='wigmix-msb-view-all-button'
                            onClick={() => {
                              if (query) {
                                emitSearchBarCallback(query, image);
                              }
                            }}
                        >
                          {intl.formatMessage({ id: 'viewAllProducts' })}
                        </div>
                      </div>
                    </div>
                  </OutsideAlerter>
              )
              : (showDropdown && (searchHistory.length > 0 || customizations.imageUpload?.enable || customizations.popularTerms?.enable || customizations.trendingProducts?.enable))
                  ? <OutsideAlerter>
                  { hasError && (
                    <div className='flex w-full ps-4 py-4 justify-center items-center text-center border-b-2'>
                      <p className='text-large font-semibold leading-10 text-primary'>
                        {intl.formatMessage({ id: 'errorMessage' })}
                      </p>
                    </div>)
                  }
                  <div
                    className='flex flex-col-reverse justify-center divide-gray-200 py-1 px-4'>
                    { (customizations.trendingProducts?.products && customizations.trendingProducts?.products.length > 0) && (
                      <div className='px-4 py-1'>
                        <p className='text-large font-semibold leading-6 text-primary py-1'>
                          {intl.formatMessage({ id: 'trending' })}
                        </p>
                        <div className='flex py-2 w-full overflow-x-auto gap-x-3'>
                          {trendingProducts.map((result, index) => (
                            <div className='size-1/2' key={`${result.product_id}-${index}`} data-pw={`msb-product-result-card-${index + 1}`}>
                              <ProductCard key={`${result.product_id}-${index}`}
                                           index={index}
                                           result={result}
                                           metadata={metadata}
                                           hasFindSimilar={false}
                                           isRecommendation={false}
                                           pwPrefix='msb' />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    { (customizations.popularTerms?.terms && customizations.popularTerms?.terms.length > 0) && (
                    <div className='px-4 py-1'>
                      <p className='text-large font-semibold leading-6 text-primary py-1'>
                        {intl.formatMessage({ id: 'popularChoices' })}
                      </p>
                      <div>
                        {customizations.popularTerms.terms.map((term) => (
                          <button
                            className='rounded-full border-1 border-black px-2 mr-2 text-small font-normal'
                            key={term} onClick={() => {
                              setQuery(term);
                              emitSearchBarCallback(term, image);
                          }}>
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                    )}
                    {searchHistory.length > 0 && (
                      <div className='flex-1'>
                        <div className='flex flex-col gap-2 px-4 py-1'>
                          <p className='text-large font-semibold leading-6 text-primary'>
                            {intl.formatMessage({ id: 'recentSearches' })}
                          </p>
                          <Listbox
                            aria-label='Recent searches'
                          >
                            <ListboxSection classNames={{ base: 'mb-0' }}>
                              {searchHistory.slice(0, 4).map((entry) => (
                                <ListboxItem
                                  tabIndex={0}
                                  className='pr-4'
                                  key={String(entry.query)}
                                  endContent={(
                                    <MagnifyingGlassIcon color={darkMode
                                      ? (customizations.generalLayout?.fontColorDark || '')
                                      : (customizations.generalLayout?.fontColor || '')}
                                                         className='size-4' />
                                  )}
                                  textValue={entry.query || ''}
                                  onPress={() => {
                                    if (entry && entry.query) {
                                      updateSavedHistory(entry.query);
                                      setQuery(entry.query);
                                      emitSearchBarCallback(entry.query, image);
                                    }
                                  }}
                                >
                                  <span className='pl-2 text-primary' data-testid='wigmix-msb-recent-search'>{entry.query}</span>
                                </ListboxItem>
                              ))}
                            </ListboxSection>
                          </Listbox>
                        </div>
                      </div>
                    )}
                  </div>
                </OutsideAlerter>
                : <></>
          }
        </div>
      </div>
    </>
  );
};

export default MerchandiseSearchBar;
