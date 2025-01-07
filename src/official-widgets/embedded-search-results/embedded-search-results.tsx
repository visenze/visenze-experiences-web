import type { FC, ReactElement } from 'react';
import { useEffect, useContext, useState } from 'react';
import type { ProductSearchResponse, Facet } from 'visearch-javascript-sdk';
import { Button } from '@nextui-org/button';
import { useIntl } from 'react-intl';
import { Spinner } from '@nextui-org/spinner';
import { cn } from '@nextui-org/theme';
import { WidgetDataContext, WidgetResultContext } from '../../common/types/contexts';
import { RootContext } from '../../common/components/shadow-wrapper';
import { getFacets, getFilterQueries, getFlattenProducts } from '../../common/utils';
import type { ProcessedProduct } from '../../common/types/product';
import { Category } from '../../common/types/tracking-constants';
import Result from './components/Result';
import type { FacetType } from '../../common/types/constants';
import type { WidgetConfig } from '../../common/visenze-core';
import FilterOptions from './components/FilterOptions';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import FilterIcon from '../../common/icons/FilterIcon';
import type { ImageUrl } from '../../common/types/image';
import SearchBarInput from './components/SearchBarInput';
import SearchHistory, { STORAGE_KEY, MAX_HISTORY_ITEMS } from './components/SearchHistory';
import type { SearchHistoryEntry } from './components/SearchHistory';

interface EmbeddedSearchResultProps {
  config: WidgetConfig;
}

const EmbeddedSearchResults: FC<EmbeddedSearchResultProps> = ({ config }): ReactElement => {
  const { productSearch, searchSettings, displaySettings, debugMode, searchBarResultsSettings } = useContext(WidgetDataContext);
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
  const [showDesktopFilterOptions, setShowDesktopFilterOptions] = useState(false);
  const [showMobileFilterOptions, setShowMobileFilterOptions] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [imageUrl, setImageUrl] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [activeHistory, setActiveHistory] = useState<SearchHistoryEntry>();
  const root = useContext(RootContext);
  const intl = useIntl();
  const isMultiSearch = searchBarResultsSettings.enableMultiSearch;
  if (!isMultiSearch) {
    const event = new CustomEvent('wigmix_search_bar_multi_search', { detail: false });
    document.dispatchEvent(event);
  }

  const handleError = (errorMsg: string): void => {
    setError(errorMsg);
    console.error(errorMsg);
  };

  const handleSuccess = (res: ProductSearchResponse): void => {
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else {
      setError('');
      setMetadata({
        cat: Category.RESULT,
        queryId: res.reqid,
      });
      setProductResults(getFlattenProducts(res.result));
      // Only set facets once
      if (facets.length === 0 && res.facets) {
        const image: ImageUrl = {
          imgUrl: res.query_tmp_url || '',
        };
        setImageUrl(image.imgUrl);
        const event = new CustomEvent('wigmix_search_bar_append_image', { detail: image });
        document.dispatchEvent(event);
        setFacets(res.facets);
      }
    }
    setIsFirstLoad(false);
    setIsLoading(false);
  };

  // Function to generate unique ID for history entries
  const generateHistoryId = (entry: Partial<SearchHistoryEntry>): string => {
    // const base = entry.type === 'text' ? entry.query : entry.imageUrl || entry.imageId;
    let base: string;
    if (entry.imageId) base = entry.imageId;
    else if (entry.imageUrl) base = entry.imageUrl;
    else base = `${entry.query}`;
    return `${entry.type}-${base}`;
  };

  const addToHistory = (entry: Omit<SearchHistoryEntry, 'timestamp'>): void => {
    const newEntry: SearchHistoryEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    setSearchHistory((prevHistory) => {
      const newHistory = [newEntry, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });

    setActiveHistory(newEntry);
  };

  const searchFromHistory = (entry: SearchHistoryEntry): void => {
    console.log('searchFromHistory', entry);
    const url = new URL(searchBarResultsSettings.redirectUrl);
    if (entry.imageId) {
      url.searchParams.append('im_id', entry.imageId);
    } else if (entry.imageUrl) {
      url.searchParams.append('im_url', entry.imageUrl);
    }

    if (entry.query && isMultiSearch) {
      url.searchParams.append('q', entry.query);
    }
    if (debugMode) {
      window.history.pushState(null, '', url.toString());
    } else {
      window.location.href = url.toString();
    }
  };

  const handleRedirect = (imgUrl?: string): void => {
    const url = new URL(searchBarResultsSettings.redirectUrl);
    const urlSearchParams = new URLSearchParams(window.location.search);
    const searchBarImageId = urlSearchParams.get('im_id');
    const searchBarImageUrl = urlSearchParams.get('im_url');
    if (searchBarImageId) {
      url.searchParams.append('im_id', searchBarImageId);
    } else if (imgUrl) {
      url.searchParams.append('im_url', imgUrl);
    } else if (searchBarImageUrl) {
      url.searchParams.append('im_url', searchBarImageUrl);
    }
    if (query && (isMultiSearch || (!searchBarImageId && !searchBarImageUrl))) {
      url.searchParams.append('q', query);
    }
    if (debugMode) {
      window.history.pushState(null, '', url.toString());
    } else {
      window.location.href = url.toString();
    }
  };

  const multisearchWithSearchBarDetails = (imgUrl?: string): void => {
    setIsLoading(true);
    const urlSearchParams = new URLSearchParams(window.location.search);
    const searchBarImageId = urlSearchParams.get('im_id');
    const searchBarImageUrl = urlSearchParams.get('im_url');
    const searchBarQuery = urlSearchParams.get('q');
    if (!imgUrl || searchBarResultsSettings.enableMultiSearch) {
      setQuery(searchBarQuery || '');
      setDebouncedQuery(searchBarQuery || '');
    }
    const params: Record<string, any> = {
      ...searchSettings,
      filters: getFilterQueries(productDetails, selectedFilters),
      facets: getFacets(productDetails),
      facets_show_count: true,
      return_query_temp_url: true,
    };

    if (debugMode) {
      params.q = 'black';
    }
    if (!imgUrl || searchBarResultsSettings.enableMultiSearch) {
      if (searchBarQuery) {
        params.q = searchBarQuery;
      }
    }
    if (imgUrl) {
      params.im_url = imgUrl;
    }
    if (searchBarImageId && !imgUrl && (searchBarResultsSettings.enableMultiSearch || !searchBarQuery)) {
      params.im_id = searchBarImageId;
    }
    if (searchBarImageUrl && !imgUrl && !searchBarImageId && (searchBarResultsSettings.enableMultiSearch || !searchBarQuery)) {
      params.im_url = searchBarImageUrl;
    }

    // Only add to history if we have actual search parameters
    if (searchBarImageId || searchBarImageUrl || searchBarQuery) {
      const type = searchBarQuery && (!searchBarImageId && !searchBarImageUrl) ? 'text' : 'image';
      const historyEntry: Omit<SearchHistoryEntry, 'timestamp'> = {
        id: generateHistoryId({ type, imageId: searchBarImageId, imageUrl: searchBarImageUrl, query: searchBarQuery }),
        type,
        source: 'url',
        filters: selectedFilters,
      };

      if (searchBarQuery) {
        historyEntry.query = searchBarQuery;
      }
      if (searchBarImageId) {
        historyEntry.imageId = searchBarImageId;
      }
      if (searchBarImageUrl) {
        historyEntry.imageUrl = searchBarImageUrl;
      }

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
    }

    productSearch.multisearchByImage(params, handleSuccess, handleError);
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }

    multisearchWithSearchBarDetails();
  }, []);

  if (!root) {
    return <></>;
  }

  if (error) {
    console.error(error);
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        <div className='flex w-full flex-col items-center'>
          <div className='flex w-full gap-y-2 px-2 py-6 md:py-8 lg:py-10'>
            <div className='sticky top-0 z-20 hidden w-1/4 px-2 py-1 md:block md:px-0'>
              <Button className='self-start bg-transparent px-2' data-pw='esr-filter-button' onClick={() => setShowDesktopFilterOptions(true)}>
                <FilterIcon className='size-5'/>
                <span className='calls-to-action-text'>
                {intl.formatMessage({ id: 'embeddedSearchResults.filter' })}
              </span>
              </Button>

              <ViSenzeModal
                className='inset-y-0 w-1/5'
                open={showDesktopFilterOptions}
                layout='mobile'
                onClose={() => setShowDesktopFilterOptions(false)}
                position='center'
                placementId={`${config.appSettings.placementId}`}
              >
                <FilterOptions
                  facets={facets}
                  selectedFilters={selectedFilters}
                  setSelectedFilters={setSelectedFilters}
                />
              </ViSenzeModal>
            </div>

            <div className='w-full md:w-1/2'>
              <SearchBarInput
                query={query}
                setQuery={setQuery}
                handleRedirect={() => {
                  if (query) {
                    handleRedirect();
                  }
                }}
              />
            </div>
          </div>

          <SearchHistory
            activeHistory={activeHistory}
            setActiveHistory={setActiveHistory}
            history={searchHistory}
            multisearchWithSearchBarDetails={handleRedirect}
            searchFromHistory={searchFromHistory}
          />
        </div>

        <div className='flex size-full flex-col justify-center bg-primary md:flex-row'>
          {/* Filter Section Mobile */}
          <div className='sticky top-0 z-20 w-full bg-white px-2 py-1 md:hidden md:px-0'>
            <Button className='self-start bg-transparent px-2' data-pw='esr-filter-button' onClick={() => setShowMobileFilterOptions(true)}>
              <FilterIcon className='size-5'/>
              <span className='calls-to-action-text'>
              {intl.formatMessage({ id: 'embeddedSearchResults.filter' })}
            </span>
            </Button>

            <ViSenzeModal
              className='bottom-0 top-[unset] h-4/5'
              open={showMobileFilterOptions} layout='mobile'
              onClose={() => setShowMobileFilterOptions(false)}
              position='center'
              placementId={`${config.appSettings.placementId}`}
            >
              <FilterOptions
                facets={facets}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
              />
            </ViSenzeModal>
          </div>

          <div className='flex w-full flex-col'>
            {/* Product Result Grid */}
            <div className='flex items-center'>
              {
                isLoading && isFirstLoad
                  ? <div className='flex w-full justify-center py-32'>
                    <Spinner color='secondary'/>
                  </div>
                  : <>
                    {
                      productResults.length > 0
                        ? <div className='grid w-full grid-cols-2 gap-x-2 gap-y-4 pb-2 md:grid-cols-4' data-pw='esr-product-result-grid'>
                          {productResults.map((result, index) => (
                            <div key={`${result.product_id}-${index}`} data-pw={`esr-product-result-card-${index + 1}`}>
                              <Result
                                index={index}
                                result={result}
                                findSimilarClickHandler={handleRedirect}
                              />
                            </div>
                          ))}
                        </div>
                        : <div className={cn(
                          'flex flex-col gap-y-2 py-24 text-center md:w-3/4',
                          !debouncedQuery && !imageUrl && 'hidden',
                        )}>
                          <p className='calls-to-action-text font-semibold'>{intl.formatMessage({ id: 'embeddedSearchResults.errorMessage.part1' })}</p>
                          <p className='calls-to-action-text'>{intl.formatMessage({ id: 'embeddedSearchResults.errorMessage.part2' })}</p>
                        </div>
                    }
                  </>
              }
            </div>
          </div>
        </div>
      </WidgetResultContext.Provider>
    </>
  );
};

export default EmbeddedSearchResults;
