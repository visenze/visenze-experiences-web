import type { FC, ReactElement } from 'react';
import { useEffect, useContext, useState } from 'react';
import { Listbox, ListboxItem, ListboxSection } from '@nextui-org/listbox';
// import { cn } from '@nextui-org/theme';
import { useIntl } from 'react-intl';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { SearchImage } from '../../common/types/image';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import SearchBarInput from './components/SearchBarInput';
import useAutocomplete from '../../common/components/hooks/use-autocomplete';
import useSearchAsYouType from '../../common/components/hooks/use-search-as-you-type';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/visenze-core';
import FileDropzone from '../../common/components/FileDropzone';
import UploadIcon from '../../common/icons/UploadIcon';
import Result from './components/Result';

const STORAGE_KEY = 'visenze_search_history';
export interface SearchHistoryEntry {
  id: string; // Unique identifier for deduplication
  type: 'text' | 'image';
  query?: string;
  imageUrl?: string;
  imageId?: string; // For im_id parameter
  timestamp: number;
  filters?: Record<string, any>;
  source: 'url' | 'user'; // Track whether entry came from URL or user action
}

interface SearchBarResultProps {
  config: WidgetConfig;
}

const SearchBar: FC<SearchBarResultProps> = ({ config }): ReactElement => {
  const { searchBarResultsSettings, customizations, debugMode } = useContext(WidgetDataContext);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [showDropdown, setShowDropdown] = useState(true);
  const [allowRedirect, setAllowRedirect] = useState(false);
  const [isMultiSearch, setIsMultiSearch] = useState(true);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const root = useContext(RootContext);
  const intl = useIntl();

  const {
    imageId,
    autocompleteResults,
    error,
  } = useAutocomplete({
    image,
    query: debouncedQuery,
  });

  const {
    // imageId,
    searchAsYouTypeResults,
    // error,
  } = useSearchAsYouType({
    image,
    query: debouncedQuery,
  });

  const imageUploadHandler = (img: SearchImage): void => {
    console.log('onImageUpload', img);
    setImage(img);
    setAllowRedirect(true);
  };

  const createImageEvent = (img: SearchImage): void => {
    console.log('onImageUpload', img);
    const event = new CustomEvent('wigmix_search_bar_append_image', { detail: img });
    document.dispatchEvent(event);
  };

  const onImageUpload = (img: SearchImage): void => {
    console.log('onImageUpload', img);
    imageUploadHandler(img);
    createImageEvent(img);
  };

  const redirectWithAutocomplete = (autocomplete: string): void => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const searchBarImageId = urlSearchParams.get('im_id');
    const searchBarImageUrl = urlSearchParams.get('im_url');
    const url = new URL(searchBarResultsSettings.redirectUrl);
    if (isMultiSearch && (imageId || searchBarImageId)) {
      url.searchParams.append('im_id', imageId || searchBarImageId || '');
    } else if (isMultiSearch && searchBarImageUrl) {
      url.searchParams.append('im_url', searchBarImageUrl);
    }
    url.searchParams.set('q', autocomplete);
    if (debugMode) {
      window.history.pushState(null, '', url.toString());
    } else {
      window.location.href = url.toString();
    }
  };

  const handleRedirect = (): void => {
    if (!query && !image) {
      return;
    }

    const url = new URL(searchBarResultsSettings.redirectUrl);
    const urlSearchParams = new URLSearchParams(window.location.search);
    const searchBarImageId = urlSearchParams.get('im_id');
    if (imageId || searchBarImageId) {
      url.searchParams.append('im_id', imageId || searchBarImageId || '');
    }
    if (query && (isMultiSearch || (!imageId && !searchBarImageId))) {
      url.searchParams.append('q', query);
    }
    if (debugMode) {
      window.history.pushState(null, '', url.toString());
    } else {
      window.location.href = url.toString();
    }
  };

  useEffect(() => {
    if (imageId && allowRedirect) {
      handleRedirect();
    }
  }, [imageId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return (): void => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const searchBarQuery = urlSearchParams.get('q');
    if (searchBarQuery) {
      setQuery(searchBarQuery);
    }
  }, []);

  useEffect(() => {
    const handleImageAppended = (e: any): void => {
      setAllowRedirect(false);
      setImage(e.detail);
    };
    const handleMultiSearch = (e: any): void => {
      setIsMultiSearch(e.detail);
    };
    document.addEventListener('wigmix_search_bar_replace_image', handleImageAppended);
    document.addEventListener('wigmix_search_bar_multi_search', handleMultiSearch);
    return (): void => {
      document.removeEventListener('wigmix_search_bar_replace_image', handleImageAppended);
      document.removeEventListener('wigmix_search_bar_multi_search', handleMultiSearch);
    };
  }, []);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse search history:', e);
      }
    }
  }, []);

  if (error) {
    console.error(error);
  }

  if (!root) {
    return <></>;
  }

  return (
    <>
      <div className='flex size-full flex-col bg-primary'>
        <div className='relative flex w-full flex-col items-center'>
          {/* Search bar */}
          <SearchBarInput query={query} setQuery={setQuery} setImage={setImage} setAllowRedirect={setAllowRedirect}
                          imageUploadHandler={imageUploadHandler}
                          handleRedirect={() => {
                            if (query) {
                              redirectWithAutocomplete(query);
                            }
                          }}
                          setShowDropdown={setShowDropdown}
                          placementId={`${config.appSettings.placementId}`} />
          {/* Autocomplete dropdown */}
          {showDropdown && query && (autocompleteResults.length > 0 || searchAsYouTypeResults.length > 0)
            ? (<div
              className='absolute top-12 z-20 w-full overflow-y-auto rounded-b-md border-x-1 border-b-1 border-gray-200 bg-white transition-all'
              //        '
              aria-label='Drag or upload image'
            >
              <div className='flex divide-x divide-gray-200 py-1'>
                <div className='flex-1'>
                  <div className='flex flex-col gap-2 px-4 py-1'>
                    <p className='text-large font-semibold leading-6 text-primary'>Suggestions</p>

                    <Listbox
                      onAction={(key) => {
                        setQuery(String(key));
                        redirectWithAutocomplete(String(key));
                      }}
                      aria-label='Autocomplete Dropdown'
                    >
                      <ListboxSection classNames={{ base: 'mb-0' }}>
                        {autocompleteResults.map((result, index) => (
                          <ListboxItem
                            tabIndex={0}
                            className='pr-4'
                            key={result}
                            endContent={<MagnifyingGlassIcon className='size-4'/>}
                            textValue={result}
                          >
                            <span className='calls-to-action-text pl-2 text-primary'
                                  data-pw={`sb-autocomplete-suggestion-${index + 1}`}>{result}</span>
                          </ListboxItem>
                        ))}
                      </ListboxSection>
                    </Listbox>
                  </div>
                </div>

                <div className='hidden w-2/5 justify-center md:flex'>
                  <div className='flex flex-col gap-2 px-4 py-1'>
                    <p className='text-large font-semibold leading-6 text-primary'>Related products</p>

                      <div
                        className='grid w-full grid-cols-3 gap-x-2 gap-y-4 pb-2'
                        data-pw='esr-product-result-grid'
                      >
                        {searchAsYouTypeResults.map((result, index) => (
                          <div key={`${result.product_id}-${index}`} data-pw={`esr-product-result-card-${index + 1}`}>
                            <Result
                              index={index}
                              result={result}
                            />
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
              </div>
            </div>
            )
            : <div
              className='absolute top-12 z-20 w-full overflow-y-auto rounded-b-md border-x-1 border-b-1 border-gray-200 bg-white transition-all'
              //        '
              aria-label='Drag or upload image'
            >
              <div className='flex divide-x divide-gray-200 py-1'>
                <div className='flex-1'>
                  <div className='flex flex-col gap-2 px-4 py-1'>
                    <p className='text-large font-semibold leading-6 text-primary'>Recent searches</p>

                    <Listbox
                      onAction={(key) => {
                        setQuery(String(key));
                        redirectWithAutocomplete(String(key));
                      }}
                      aria-label='Recent searches'
                    >
                      <ListboxSection classNames={{ base: 'mb-0' }}>
                        {searchHistory.filter((entry) => entry.type === 'text').slice(0, 5).map((entry) => (
                          <ListboxItem
                            tabIndex={0}
                            className='pr-4'
                            key={String(entry.query)}
                            endContent={<MagnifyingGlassIcon className='size-4'/>}
                            textValue={entry.query}
                          >
                            <span className='calls-to-action-text pl-2 text-primary'
                                  data-pw={`sb-recent-searches-${entry.id}`}>{entry.query}</span>
                          </ListboxItem>
                        ))}
                      </ListboxSection>
                    </Listbox>
                  </div>
                </div>

                <div className='hidden w-2/5 justify-center md:flex'>
                  <FileDropzone onImageUpload={onImageUpload} name='sb-image-upload-dropdown'>
                    <div
                      className='flex flex-col items-center gap-6 py-1 text-center text-medium'>
                      {
                        customizations?.icons.upload
                          ? <img className='w-3/5 rounded-lg object-cover object-center lg:h-full'
                                src={customizations?.icons.upload}/>
                          : <UploadIcon className='size-24 py-5'/>
                      }

                      <p className='calls-to-action-text hidden px-3 py-2 leading-6 text-primary md:block'>
                        {intl.formatMessage({ id: 'searchBar.dragImageToSearch.part1' })}<br/>
                        {intl.formatMessage({ id: 'searchBar.dragImageToSearch.part2' })}&nbsp;
                        <span className='underline'>
                          {intl.formatMessage({ id: 'searchBar.dragImageToSearch.part3' })}
                        </span>
                      </p>

                      <p className='calls-to-action-text pt-3 leading-6 text-primary md:hidden'>
                        {intl.formatMessage({ id: 'searchBar.tapToSearchImage.part1' })}
                        <br className='md:hidden'/>
                        {intl.formatMessage({ id: 'searchBar.tapToSearchImage.part2' })}
                      </p>
                    </div>
                  </FileDropzone>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </>
  );
};

export default SearchBar;
