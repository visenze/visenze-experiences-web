import type { FC, ReactElement } from 'react';
import { useEffect, useRef, useContext, useState, useLayoutEffect } from 'react';
import type { ProductSearchResponse, Facet } from 'visearch-javascript-sdk';
import { useIntl } from 'react-intl';
import { Spinner } from '@heroui/spinner';
import { cn } from '@heroui/theme';
import { WidgetDataContext } from '../../common/types/contexts';
import { RootContext } from '../../common/components/shadow-wrapper';
import {
  getFacets,
  getFilterQueries,
  getFlattenProducts,
  getProductGridCssClasses,
  getProductGridCssConfig,
} from '../../common/utils';
import type { ProcessedProduct } from '../../common/types/product';
import { Actions, Category } from '../../common/types/tracking-constants';
import ProductCard from '../../common/components/product-card/ProductCard';
import type { FacetType } from '../../common/types/constants';
import FilterOptions, { showFacet } from './components/FilterOptions';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import FilterIcon from '../../common/icons/FilterIcon';
import type { ImageUrl } from '../../common/types/image';
import SearchBarInput from './components/SearchBarInput';
import SearchHistory, { MAX_HISTORY_ITEMS, SEARCH_HISTORY_BASE_KEY } from './components/SearchHistory';
import type { SearchHistoryEntry } from './components/SearchHistory';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';

interface EmbeddedSearchResultProps {
  textQuery: string;
  imUrl: string;
}

const EmbeddedSearchResults: FC<EmbeddedSearchResultProps> = ({ textQuery, imUrl }): ReactElement => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations, displaySettings, searchSettings } = widgetConfig;
  const { productDetails } = displaySettings;
  const [productResults, setProductResults] = useState<ProcessedProduct[]>([]);
  const [facets, setFacets] = useState<Facet[]>([]);
  const defaultFilters = {
    price: [],
    category: new Set<string>(),
    gender: new Set<string>(),
    brand: new Set<string>(),
    sizes: new Set<string>(),
    colors: new Set<string>(),
  };
  const [selectedFilters, setSelectedFilters] = useState<Record<FacetType, any>>(defaultFilters);
  const [showMobileFilterOptions, setShowMobileFilterOptions] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [activeHistory, setActiveHistory] = useState<SearchHistoryEntry>();
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const root = useContext(RootContext);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const handleError = (errorMsg: string): void => {
    setError(errorMsg);
  };

  const handleSuccess = (res: ProductSearchResponse, shouldResetFacets: boolean): void => {
    if (widgetConfig.callbacks?.preprocessResponse && typeof widgetConfig.callbacks.preprocessResponse === 'function') {
      widgetConfig.callbacks.preprocessResponse(res);
    }
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else {
      setError('');
      const md = {
        cat: Category.RESULT,
        queryId: res.reqid,
      };
      setMetadata(md);

      const newProducts = getFlattenProducts(res.result);
      setProductResults((prev) => ((res.page === 1) ? newProducts : [...prev, ...newProducts]));

      if (newProducts.length) {
        widgetClient.sendEvent(Actions.RESULT_LOAD, md);
        widgetClient.setLastTrackingMeta(md);
      }

      if (shouldResetFacets && res.facets) {
        setFacets(res.facets);
      }
    }
    setIsFirstLoad(false);
    setIsLoading(false);
    setIsLoadingMore(false);
  };

  const addToHistory = (entry: Omit<SearchHistoryEntry, 'timestamp'>): void => {
    const newEntry: SearchHistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    setSearchHistory((prevHistory) => {
      const newHistory = [newEntry, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(`${SEARCH_HISTORY_BASE_KEY}${widgetConfig.appSettings.appKey}`, JSON.stringify(newHistory));
      return newHistory;
    });

    setActiveHistory(newEntry);
  };

  const multisearchWithSearchBarDetails = (imgUrl?: string, text?: string, currentPage?: number, shouldResetFacets = true): void => {
    if (currentPage && currentPage > 1) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    const params: Record<string, any> = {
      ...searchSettings,
      facets: getFacets(productDetails),
      facets_show_count: true,
      page: currentPage ?? page,
      return_query_temp_url: true,
    };
    if (shouldResetFacets) {
      if (Object.keys(selectedFilters).length) {
        setSelectedFilters(defaultFilters);
      }
    } else {
      params['filters'] = getFilterQueries(productDetails, selectedFilters);
    }

    if (text) {
      params['q'] = text;
    }
    if (imgUrl) {
      params['im_url'] = imgUrl;
    }
    params['limit'] = 24; // hardcode for now

    widgetClient.multisearchByImage(params, (res) => {
      handleSuccess(res, shouldResetFacets);

      let historyId = imgUrl ?? '';
      if (text && text.length > 0) {
        historyId += `-${text}`;
      }
      const historyText = text && text.length > 0 ? text : undefined;
      const historyImgUrl = imgUrl && imgUrl.length > 0 ? imgUrl : undefined;

      const historyEntry: Omit<SearchHistoryEntry, 'timestamp'> = {
        id: historyId,
        query: historyText,
        imageUrl: historyImgUrl,
      };

      setSearchHistory((prevHistory) => {
        const isProductInHistory = prevHistory.find((item) => {
          if (item.id === historyEntry.id) {
            setActiveHistory(item);
            return item;
          }
          return null;
        });

        if (!isProductInHistory) {
          addToHistory(historyEntry);
        }
        return prevHistory;
      });
    }, handleError);
  };

  const searchFromHistory = (entry: SearchHistoryEntry): void => {
    let imgUrl: string | undefined;
    let historyText: string | undefined;
    if (entry.imageUrl) {
      imgUrl = entry.imageUrl;
      setImageUrl(entry.imageUrl);
    } else {
      setImageUrl('');
    }
    if (entry.query) {
      historyText = entry.query;
      setQuery(entry.query);
    } else {
      setQuery('');
    }
    multisearchWithSearchBarDetails(imgUrl, historyText, 1);
    setIsLoading(true);
  };

  const onHistorySelect = (entry: SearchHistoryEntry): void => {
    setPage(1);
    if (entry.id !== activeHistory?.id) {
      searchFromHistory(entry);
    } else {
      setImageUrl('');
      setProductResults([]);
      setActiveHistory(undefined);
      setIsLoading(true);
      setIsFirstLoad(true);
      multisearchWithSearchBarDetails(imageUrl, query, 1);
    }
  };

  const onHistoryRemove = (entry: SearchHistoryEntry, isActiveHistoryRemoved: boolean): void => {
    setSearchHistory((prev) => prev.filter((hist) => hist.id !== entry.id));
    if (isActiveHistoryRemoved) {
      setImageUrl('');
      if (query) {
        multisearchWithSearchBarDetails('', query, 1);
      } else {
        // empty input
        setProductResults([]);
        setFacets([]);
      }
    }
  };

  const findSimilarClickHandler = (imgUrl?: string): void => {
    setPage(1);
    if (imgUrl) {
      const image: ImageUrl = { imgUrl };
      const event = new CustomEvent('wigmix_search_bar_append_image', { detail: image });
      document.dispatchEvent(event);
      setImageUrl(imgUrl);
    }
    multisearchWithSearchBarDetails(imgUrl, query, 1);
    setIsLoading(true);
  };

  useLayoutEffect(() => {
    // Wait for the next frame after UI update
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading && !isLoadingMore && productResults.length > 0) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            multisearchWithSearchBarDetails(imageUrl, query, nextPage, false);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 },
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return (): void => {
      observer.disconnect();
    };
  }, [isLoading, isLoadingMore, imageUrl, productResults.length]);

  useEffect(() => {
    if (!isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      multisearchWithSearchBarDetails(imageUrl, query, 1, false);
    }
  }, [selectedFilters]);

  useEffect(() => {
    if (isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isLoading]);

  useEffect(() => {
    setQuery(textQuery);
    setImageUrl(imUrl);
    if (imUrl || textQuery) {
      multisearchWithSearchBarDetails(imUrl, textQuery);
    } else {
      setIsLoading(false);
    }

    const localHistory: Array<SearchHistoryEntry> = JSON.parse(localStorage.getItem(`${SEARCH_HISTORY_BASE_KEY}${widgetConfig.appSettings.appKey}`) as string);
    const expiryTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newHistory: Array<SearchHistoryEntry> = [];
    localHistory.forEach((item) => {
      const entryTimestamp = item.timestamp;
      if (entryTimestamp > expiryTimestamp) {
        newHistory.push(item);
      }
    });
    setSearchHistory(newHistory);
  }, []);

  const hasApplicableFacets = facets.filter((f) => showFacet(f)).length > 0;

  if (!root) {
    return <>Searching...</>;
  }

  if (error) {
    console.error(error);
  }

  return (
    <>
        <div className='flex w-full flex-col items-center'>
          <div className='flex w-full gap-y-2 px-2 py-3 md:py-4 lg:py-5'>
            <div className='sticky top-0 z-20 hidden w-2/12 px-2 py-1 md:block md:px-0'>
            </div>

            <div className='w-full md:w-8/12'>
              <SearchBarInput
                query={query}
                setQuery={setQuery}
                emitSearchBarCallback={() => {
                  if (imageUrl) {
                    findSimilarClickHandler(imageUrl);
                  } else if (query) {
                    multisearchWithSearchBarDetails(undefined, query);
                  } else {
                    // empty input
                    setProductResults([]);
                    setFacets([]);
                  }
                }}
              />
            </div>
          </div>
          <div className='flex w-full items-end gap-y-2 px-2 pb-3 md:pb-4 lg:pb-5'>
            <div className='hidden w-2/12 md:flex' />
            <div className='w-full md:w-8/12'>
              <SearchHistory
                activeHistory={activeHistory}
                setActiveHistory={setActiveHistory}
                history={searchHistory}
                multisearchWithSearchBarDetails={findSimilarClickHandler}
                onHistorySelect={onHistorySelect}
                onHistoryRemove={onHistoryRemove}
              />
            </div>
          </div>
          <div className='hidden w-full gap-y-2 px-2 pb-2 md:flex'>
            <div className='w-2/12' />
            <FilterOptions
                displayAsDropdown={true}
                facets={facets}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
            />
          </div>
        </div>

        <div className='flex size-full flex-col justify-center md:flex-row'>
          {/* Filter Section Mobile */}
          {hasApplicableFacets && (
              <>
                <div className='w-full bg-white p-2 md:hidden md:px-0 cursor-pointer flex gap-2 mb-2 items-center'
                     onClick={() => setShowMobileFilterOptions(true)}>
                  <FilterIcon className='size-5'/>
                  <span className='text-black'>
                    {intl.formatMessage({ id: 'filter' })}
                  </span>
                </div>
                <ViSenzeModal
                    className='bottom-0 top-[unset] h-4/5'
                    open={showMobileFilterOptions} layout='mobile'
                    onClose={() => setShowMobileFilterOptions(false)}
                    position='center'
                    placementId={`${appSettings.placementId}`}
                    darkMode={darkMode}
                    fontFamily={customizations.generalLayout?.fontFamily}
                >
                  <FilterOptions
                      displayAsDropdown={false}
                      facets={facets}
                      selectedFilters={selectedFilters}
                      setSelectedFilters={setSelectedFilters}
                  />
                </ViSenzeModal>
              </>
          )}
          <div className='flex w-full flex-col'>
            {/* Product Result Grid */}
            <div className='flex flex-col items-center text-primary'>
              {
                isLoading && isFirstLoad
                  ? <div className='flex w-full justify-center py-32'>
                    <Spinner color='secondary'/>
                  </div>
                  : <>
                    {
                      productResults.length > 0
                        ? <div className={cn(
                            `wigmix-product-grid grid w-full ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2 md:grid-cols-4', 'gap-x-2', 'gap-y-4')}`,
                            isLoading && 'opacity-50',
                            )}
                            style={getProductGridCssConfig(customizations, breakpoint)}
                            data-pw='esr-product-result-grid'
                          >
                          {isLoading && (
                            <div className='absolute z-20 flex w-full justify-center py-32'>
                              <Spinner color='secondary'/>
                            </div>
                          )}
                          {productResults.map((result, index) => (
                              <ProductCard key={`${result.product_id}-${index}`} index={index}
                                           result={result}
                                           metadata={metadata}
                                           onFindSimilar={(data) => {
                                             if (!isLoading) {
                                               findSimilarClickHandler(data.im_url);
                                             }
                                           }}
                                           isRecommendation={true}
                                           hasFindSimilar={true}
                                           pwPrefix='esr' />
                          ))}
                        </div>
                        : <div className={cn(
                          'flex flex-col gap-y-2 py-24 text-center md:w-3/4',
                          !query && !imageUrl && 'hidden',
                        )}>
                          <p className='font-semibold text-primary'>{intl.formatMessage({ id: 'noResults' })}</p>
                          <p className='text-primary'>{intl.formatMessage({ id: 'noResultsDescription' })}</p>
                        </div>
                    }
                  </>
              }

              <div ref={loaderRef} className='flex h-10 items-center justify-center'>
                {isLoadingMore && <Spinner color='secondary' />}
              </div>
            </div>
          </div>
        </div>

        {!isLoading && !query && !imageUrl && productResults.length === 0 && (
          <div className='flex w-full flex-col items-center justify-center gap-y-2 py-24 text-center'>
            <p className='font-semibold text-primary'>{intl.formatMessage({ id: 'noSearchInput' })}</p>
            <p className='text-primary'>{intl.formatMessage({ id: 'noSearchInputDescription' })}</p>
          </div>
        )}
    </>
  );
};

export default EmbeddedSearchResults;
