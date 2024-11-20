import type { FC, ReactElement } from 'react';
import { useEffect, useRef, useContext, useState } from 'react';
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
import FindSimilarHistory from './components/FindSimilarHistory';
import type { ImageUrl } from '../../common/types/image';
import CloseIcon from '../../common/icons/CloseIcon';

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
  const [showMobileFilterOptions, setShowMobileFilterOptions] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [activeImgUrl, setActiveImgUrl] = useState<string | null>('');
  const [findSimilarHistory, setFindSimilarHistory] = useState<string[]>([]);
  const widgetTitleRef = useRef<HTMLDivElement>(null);
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

  const multisearchWithSearchBarDetails = (imgUrl?: string): void => {
    setIsLoading(true);
    const urlSearchParams = new URLSearchParams(window.location.search);
    const searchBarImageId = urlSearchParams.get('im_id');
    const searchBarQuery = urlSearchParams.get('q');
    if (!imgUrl || searchBarResultsSettings.enableMultiSearch) {
      setQuery(searchBarQuery || '');
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

    productSearch.multisearchByImage(params, handleSuccess, handleError);
  };

  const findSimilarClickHandler = (imgUrl: string): void => {
    if (searchBarResultsSettings.enableMultiSearch) {
      const image: ImageUrl = { imgUrl };
      const event1 = new CustomEvent('wigmix_search_bar_replace_image', { detail: image });
      document.dispatchEvent(event1);
      const event2 = new CustomEvent('wigmix_search_bar_append_image', { detail: image });
      document.dispatchEvent(event2);
    } else {
      setQuery('');
    }
    setImageUrl(imgUrl);
    multisearchWithSearchBarDetails(imgUrl);
    // const isProductInHistory = findSimilarHistory.some((item) => item === imgUrl);
    // if (!isProductInHistory) {
    //   setFindSimilarHistory([...findSimilarHistory, imgUrl]);
    // }

    setActiveImgUrl(imgUrl);
  };

  useEffect(() => {
    if (activeImgUrl === null) {
      multisearchWithSearchBarDetails();
    }
  }, [activeImgUrl]);

  useEffect(() => {
    if (!isLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      multisearchWithSearchBarDetails();
    }
  }, [selectedFilters]);

  useEffect(() => {
    multisearchWithSearchBarDetails();
  }, []);

  if (isLoading && isFirstLoad) {
    return (
      <div className='flex justify-center py-20'>
        <Spinner color='secondary'/>
      </div>
    );
  }

  if (!root || error) {
    console.error(error);
    return <></>;
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        {/* Widget Title */}
        <div className='flex flex-col items-center gap-y-2 bg-primary px-2 py-6 md:py-8 lg:py-10' ref={widgetTitleRef}>
          <div className='widget-title font-bold'>{intl.formatMessage({ id: 'embeddedSearchResults.title' })}</div>
          {query && !imageUrl && (
            <div className='break-words text-lg'>
              {intl.formatMessage({ id: 'embeddedSearchResults.subtitle.part1' })}&nbsp;
              {productResults.length} {intl.formatMessage({ id: 'embeddedSearchResults.subtitle.part2' })} <b>{query}</b>
            </div>
          )}
          {!query && imageUrl && (
              <div className='mt-2 flex items-center gap-x-3 text-lg'>
                {intl.formatMessage({ id: 'embeddedSearchResults.subtitle.part1' })}&nbsp;
                {productResults.length} {intl.formatMessage({ id: 'embeddedSearchResults.subtitle.part2' })}
                <div className={cn('relative h-full flex-shrink-0 cursor-pointer border border-gray-500')}>
                  <img className='object-fit aspect-[4/5] w-20 border-1 border-black' src={imageUrl} />
                  <button
                      className='absolute right-1 top-1 z-10 rounded-full bg-white p-1'
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        findSimilarClickHandler('');
                      }}
                      data-pw='esr-product-history-delete'
                  >
                    <CloseIcon className='size-3'/>
                  </button>
                </div>
              </div>
          )}
          {isMultiSearch && query && imageUrl && (
              <div className='mt-2 flex items-center gap-x-3 text-lg'>
                {intl.formatMessage({ id: 'embeddedSearchResults.subtitle.part1' })}&nbsp;
                {productResults.length} {intl.formatMessage({ id: 'embeddedSearchResults.subtitle.part2' })}
                <b>{query}</b>
                {' '}+{' '}
                <div className={cn('relative h-full flex-shrink-0 cursor-pointer border border-gray-500')}>
                  <img className='object-fit aspect-[4/5] w-20 border-1 border-black' src={imageUrl} />
                  <button
                      className='absolute right-1 top-1 z-10 rounded-full bg-white p-1'
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        findSimilarClickHandler('');
                      }}
                      data-pw='esr-product-history-delete'
                  >
                    <CloseIcon className='size-3'/>
                  </button>
                </div>
              </div>
          )}
        </div>
        <div className='flex size-full flex-col bg-primary md:flex-row'>
          {/* Filter Section Tablet & Desktop */}
          {
              facets
              && <div className='sticky top-0 hidden h-full w-1/4 flex-col md:flex'>
              <div
                className='p-3 text-center text-xl font-bold'>{intl.formatMessage({ id: 'embeddedSearchResults.filter' })}</div>
              <FilterOptions
                facets={facets}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
              />
            </div>
          }
          {/* Filter Section Mobile */}
          <div className='sticky top-0 z-20 w-full bg-white px-2 py-1 md:hidden md:px-0'>
            <Button className='self-start bg-transparent px-2' data-pw='esr-filter-button' onClick={() => setShowMobileFilterOptions(true)}>
              <FilterIcon className='size-5'/>
              <span className='calls-to-action-text'>
              {intl.formatMessage({ id: 'embeddedSearchResults.filter' })}
            </span>
            </Button>
          </div>
          <ViSenzeModal className='bottom-0 top-[unset] h-4/5' open={showMobileFilterOptions} layout='mobile' onClose={() => setShowMobileFilterOptions(false)} position='center'
                        placementId={`${config.appSettings.placementId}`}>
            <FilterOptions
              facets={facets}
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
            />
          </ViSenzeModal>
          <div className='flex flex-col md:w-3/4'>
            {/* Find Similar Image History */}
            <FindSimilarHistory
              activeImgUrl={activeImgUrl}
              setActiveImgUrl={setActiveImgUrl}
              findSimilarHistory={findSimilarHistory}
              setFindSimilarHistory={setFindSimilarHistory}
              multisearchWithSearchBarDetails={multisearchWithSearchBarDetails}
            />
            {/* Product Result Grid */}
            {
              isLoading && !isFirstLoad
                ? <div className='flex w-full justify-center py-32'>
                  <Spinner color='secondary'/>
                </div>
                : <>
                  {
                    productResults.length > 0
                      ? <div className='grid w-full grid-cols-2 gap-x-2 gap-y-4 px-2 pb-2 md:grid-cols-3 md:pl-0 md:pr-2' data-pw='esr-product-result-grid'>
                        {productResults.map((result, index) => (
                          <div key={`${result.product_id}-${index}`} data-pw={`esr-product-result-card-${index + 1}`}>
                            <Result
                              index={index}
                              result={result}
                              findSimilarClickHandler={findSimilarClickHandler}
                            />
                          </div>
                        ))}
                      </div>
                      : <div className='flex flex-col gap-y-2 py-24 text-center md:w-3/4'>
                        <p className='calls-to-action-text font-semibold'>{intl.formatMessage({ id: 'embeddedSearchResults.errorMessage.part1' })}</p>
                        <p className='calls-to-action-text'>{intl.formatMessage({ id: 'embeddedSearchResults.errorMessage.part2' })}</p>
                      </div>
                  }
                </>
            }
          </div>
        </div>
      </WidgetResultContext.Provider>
    </>
  );
};

export default EmbeddedSearchResults;
