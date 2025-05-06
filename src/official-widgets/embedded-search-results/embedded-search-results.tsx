import { Spinner } from '@heroui/spinner';
import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { Facet, ProductSearchResponse } from 'visearch-javascript-sdk';
import FilterOptions, { showFacet } from './components/FilterOptions';
import SearchBarInput from './components/SearchBarInput';
import type { SearchHistoryEntry } from './components/SearchHistory';
import SearchHistory, { MAX_HISTORY_ITEMS } from './components/SearchHistory';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import FilterIcon from '../../common/icons/FilterIcon';
import type { FacetType } from '../../common/types/constants';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImageOrPid } from '../../common/types/image';
import { isImageUrl, isPid } from '../../common/types/image';
import type { BoxData, ProcessedProduct } from '../../common/types/product';
import { Actions, Category } from '../../common/types/tracking-constants';
import {
  getFacets,
  getFilterQueries,
  getFlattenProducts,
  getProductGridCssClasses,
  getProductGridCssConfig, parseBox,
} from '../../common/utils';

interface EmbeddedSearchResultProps {
  textQuery: string;
  imUrl: string;
  renderModalWithoutPortal?: boolean;
}

const EmbeddedSearchResults: FC<EmbeddedSearchResultProps> = ({ textQuery, imUrl, renderModalWithoutPortal }): ReactElement => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations, displaySettings, searchSettings } = widgetConfig;
  const { productDetails } = displaySettings;
  const [hasError, setHasError] = useState<boolean>(false);
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
  const [image, setImage] = useState<SearchImageOrPid | undefined>();
  const [imageBoxData, setImageBoxData] = useState<BoxData | undefined>();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [activeHistory, setActiveHistory] = useState<SearchHistoryEntry>();
  const [, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const root = useContext(RootContext);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const handleError = (errorMsg: string): void => {
    setHasError(true);
    if (errorMsg.includes('im_url') || errorMsg.includes('image')) {
      setError(intl.formatMessage({ id: 'imageOrQueryNotFound' }));
    } else {
      setError(intl.formatMessage({ id: 'systemError' }));
    }
  };

  const handleSuccess = (res: ProductSearchResponse, shouldResetFacets: boolean): void => {
    if (widgetConfig.callbacks?.preprocessResponse && typeof widgetConfig.callbacks.preprocessResponse === 'function') {
      widgetConfig.callbacks.preprocessResponse(res);
    }
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else {
      setError('');
      setHasError(false);
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
      setHasNextPage(newProducts.length > 0);

      if (shouldResetFacets && res.facets) {
        setFacets(res.facets);
      }
    }
    setIsFirstLoad(false);
    setIsLoading(false);
    setIsLoadingMore(false);
  };

  const addToHistory = (entry: Omit<SearchHistoryEntry, 'timestamp'>[]): void => {
    const entries = entry.map((e) => {
      const newEntry: SearchHistoryEntry = {
        ...e,
        timestamp: Date.now(),
      };
      return newEntry;
    });

    setSearchHistory((prevHistory) => [...entries, ...prevHistory].slice(0, MAX_HISTORY_ITEMS));

    setActiveHistory(entries[0]);
    setImage({
      imgUrl: entries[0].imageUrl,
      pid: entries[0]?.pid,
    });
    setImageBoxData(entries[0]?.box);
  };

  const multisearchWithSearchBarDetails = (
    imgOrPid?: SearchImageOrPid,
    text?: string,
    currentPage?: number,
    shouldResetFacets = true,
    isInitialSearch = false,
    boxData?: BoxData,
  ): void => {
    if (currentPage && currentPage > 1) {
      setIsLoadingMore(true);
    } else {
      setPage(1);
      setIsLoading(true);
    }

    const params: Record<string, any> = {
      ...searchSettings,
      facets: getFacets(productDetails),
      facets_show_count: true,
      page: currentPage ?? 1,
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
    if (imgOrPid) {
      if (isPid(imgOrPid)) {
        params['pid'] = imgOrPid.pid;
      } else if (isImageUrl(imgOrPid)) {
        params['im_url'] = imgOrPid.imgUrl;
      }
    }
    if (boxData) {
      params['box'] = parseBox(boxData.box);
    }
    params['limit'] = customizations.results?.limit || 24;

    widgetClient.multisearchByImage(params, (res) => {
      handleSuccess(res, shouldResetFacets);

      // Only add to history if image URL is used
      // This flow can only be reached with non-null image URL; PID is optional
      if (imgOrPid && isImageUrl(imgOrPid)) {
        const newEntries: Omit<SearchHistoryEntry, 'timestamp'>[] = [];
        if (res.status === 'OK' && isInitialSearch) {
          res.product_types?.map((pt, i) => {
            const historyEntry: Omit<SearchHistoryEntry, 'timestamp'> = {
              id: `${imgOrPid.imgUrl}-${pt.box || []}`,
              imageUrl: imgOrPid.imgUrl,
              box: {
                box: {
                  x1: pt.box[0],
                  y1: pt.box[1],
                  x2: pt.box[2],
                  y2: pt.box[3],
                },
                index: i,
              },
            };

            if (isPid(imgOrPid)) {
              historyEntry.pid = imgOrPid.pid;
            }
            newEntries.push(historyEntry);
            return historyEntry;
          });
        } else {
          const historyEntry: Omit<SearchHistoryEntry, 'timestamp'> = {
            id: `${imgOrPid.imgUrl}${boxData ? `-${parseBox(boxData.box)}` : ''}`,
            imageUrl: imgOrPid.imgUrl,
          };

          if (isPid(imgOrPid)) {
            historyEntry.pid = imgOrPid.pid;
          }
          newEntries.push(historyEntry);
        }
        setSearchHistory((prevHistory) => {
          const isProductInHistory = prevHistory.find((item) => {
            if (item.id === newEntries[0].id) {
              setActiveHistory(item);
              return item;
            }
            return null;
          });
          if (!isProductInHistory) {
            addToHistory(newEntries);
          }
          return prevHistory;
        });
      }
    }, handleError);
  };

  const searchFromHistory = (entry: SearchHistoryEntry): void => {
    const imgUrl: SearchImageOrPid = {
      imgUrl: entry.imageUrl,
      pid: entry.pid || '',
    };
    setImage(imgUrl);
    if (entry.box) {
      setImageBoxData(entry.box);
      multisearchWithSearchBarDetails(imgUrl, query, 1, true, false, entry.box);
    } else {
      setImageBoxData(undefined);
      multisearchWithSearchBarDetails(imgUrl, query, 1);
    }
    setIsLoading(true);
  };

  const onHistorySelect = (entry: SearchHistoryEntry): void => {
    setPage(1);
    if (entry.id !== activeHistory?.id) {
      searchFromHistory(entry);
    } else {
      setImage(undefined);
      setImageBoxData(undefined);
      setProductResults([]);
      setActiveHistory(undefined);
      setIsLoading(true);
      setIsFirstLoad(true);
      multisearchWithSearchBarDetails(image, query, 1);
    }
  };

  const onHistoryRemove = (entry: SearchHistoryEntry, isActiveHistoryRemoved: boolean): void => {
    setSearchHistory((prev) => prev.filter((hist) => hist.id !== entry.id));
    if (isActiveHistoryRemoved) {
      setImage(undefined);
      setImageBoxData(undefined);
      if (query) {
        multisearchWithSearchBarDetails(undefined, query, 1);
      } else {
        // empty input
        setProductResults([]);
        setFacets([]);
      }
      setHasError(false);
    }
  };

  const findSimilarClickHandler = (imgOrPid: SearchImageOrPid): void => {
    setPage(1);
    if (isImageUrl(imgOrPid)) {
      const event = new CustomEvent('wigmix_internal_search_bar_append_image', { detail: { imgUrl: imgOrPid.imgUrl } });
      document.dispatchEvent(event);
    }
    if (image === imgOrPid && imageBoxData) {
      multisearchWithSearchBarDetails(imgOrPid, query, 1, true, false, imageBoxData);
    } else {
      multisearchWithSearchBarDetails(imgOrPid, query, 1);
    }
    setImage(imgOrPid);
    setIsLoading(true);
  };

  const checkForError = () : void => {
    if (hasError) {
      setHasError(false);
    }
    if (query === '' && imUrl === '') {
      setError('');
    }
  };

  useLayoutEffect(() => {
    // Wait for the next frame after UI update
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoading && !isLoadingMore && productResults.length > 0) {
          if (hasNextPage) {
            setPage((prevPage) => {
              const nextPage = prevPage + 1;
              if (imageBoxData) {
                multisearchWithSearchBarDetails(image, query, nextPage, false, false, imageBoxData);
              } else {
                multisearchWithSearchBarDetails(image, query, nextPage, false);
              }
              return nextPage;
            });
          }
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
  }, [isLoading, isLoadingMore, image, productResults.length]);

  useEffect(() => {
    if (!isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (activeHistory?.box) {
        multisearchWithSearchBarDetails(image, query, 1, false, false, activeHistory.box);
      } else {
        multisearchWithSearchBarDetails(image, query, 1, false);
      }
    }
  }, [selectedFilters]);

  useEffect(() => {
    if (isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isLoading]);

  useEffect(() => {
    setQuery(textQuery);
    if (imUrl) {
      setImage({ imgUrl: imUrl });
    }
    if (imUrl || textQuery) {
      multisearchWithSearchBarDetails(imUrl ? { imgUrl: imUrl } : undefined, textQuery, 1, true, true);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkForError();
  }, [query, imUrl]);

  const hasApplicableFacets = facets.filter((f) => showFacet(f)).length > 0;

  const errorDiv = (): ReactElement => <p className='font-semibold text-primary pb-7'>{ error }</p>;

  if (!root) {
    return <>Searching...</>;
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
                  if (image) {
                    findSimilarClickHandler(image);
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
                onHistorySelect={onHistorySelect}
                onHistoryRemove={onHistoryRemove}
              />
            </div>
          </div>
          {hasError && productResults.length > 0 && (errorDiv())}
          {breakpoint !== WidgetBreakpoint.MOBILE && (
              <div className='hidden w-full gap-y-2 px-2 pb-2 md:flex'>
                <div className='w-2/12' />
                <FilterOptions
                    displayAsDropdown={true}
                    facets={facets}
                    selectedFilters={selectedFilters}
                    setSelectedFilters={setSelectedFilters}
                />
              </div>
          )}
        </div>
        <div className='flex size-full flex-col justify-center md:flex-row'>
          {/* Filter Section Mobile */}
          {hasApplicableFacets && breakpoint === WidgetBreakpoint.MOBILE && (
              <>
                <div className='mb-2 flex w-full cursor-pointer items-center gap-2 bg-white p-2 md:hidden md:px-0'
                     data-testid='wigmix-mobile-filter-toggle'
                     onClick={() => setShowMobileFilterOptions(true)}>
                  <FilterIcon className='size-5'/>
                  <span className='text-black'>
                    {intl.formatMessage({ id: 'filter' })}
                  </span>
                </div>
                <ViSenzeModal
                    open={showMobileFilterOptions} layout='mobile'
                    onClose={() => setShowMobileFilterOptions(false)}
                    position='bottom'
                    placementId={`${appSettings.placementId}`}
                    darkMode={darkMode}
                    fontFamily={customizations.generalLayout?.fontFamily}
                    renderWithoutPortal={!!renderModalWithoutPortal}
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
                                               findSimilarClickHandler({
                                                 imgUrl: data.im_url,
                                                 pid: data.product_id,
                                               });
                                             }
                                           }}
                                           isRecommendation={true}
                                           hasFindSimilar={true}
                                           pwPrefix='esr' />
                          ))}
                        </div>
                        : <div className={cn(
                          'flex flex-col w-full gap-y-2 py-24 items-center justify-center text-center md:w-3/4',
                          !query && !image && 'hidden',
                        )}>
                          { hasError ? (
                            errorDiv()
                          ) : (
                            <>
                            <p className='font-semibold text-primary'>{intl.formatMessage({ id: 'noResults' })}</p>
                            <p className='text-primary'>{intl.formatMessage({ id: 'noResultsDescription' })}</p>
                            </>
                          )}
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

        {!isLoading && !query && !image && productResults.length === 0 && (
          <div className='flex w-full flex-col items-center justify-center gap-y-2 py-24 text-center'>
            <p className='font-semibold text-primary'>{intl.formatMessage({ id: 'noSearchInput' })}</p>
            <p className='text-primary'>{intl.formatMessage({ id: 'noSearchInputDescription' })}</p>
          </div>
        )}
    </>
  );
};

export default EmbeddedSearchResults;
