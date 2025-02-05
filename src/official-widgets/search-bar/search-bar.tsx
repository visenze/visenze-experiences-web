import type { FC, ReactElement } from 'react';
import { useEffect, useContext, useState } from 'react';
import { Listbox, ListboxItem, ListboxSection } from '@nextui-org/listbox';
import { Button } from '@nextui-org/button';
import { useIntl } from 'react-intl';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { WidgetBreakpoint } from '../../common/types/constants';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { SearchImage } from '../../common/types/image';
import { isImageFile } from '../../common/types/image';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import SearchBarInput from './components/SearchBarInput';
import useAutocomplete from '../../common/components/hooks/use-autocomplete';
import useSearchAsYouType from '../../common/components/hooks/use-search-as-you-type';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/visenze-core';
import FileDropzone from '../../common/components/FileDropzone';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import Result from './components/Result';

interface SearchHistoryEntry {
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
  textQuery: string;
  imUrl: string;
}

const SearchBar: FC<SearchBarResultProps> = ({ config, textQuery, imUrl }): ReactElement => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [, setShowDropdown] = useState(false);
  const [searchHistory] = useState<SearchHistoryEntry[]>([]);
  const [suggestionMax, setSuggestionMax] = useState(6);
  const [relatedMax, setRelatedMax] = useState(8);
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
    productCount,
    searchAsYouTypeResults,
  } = useSearchAsYouType({
    image,
    query: debouncedQuery,
  });

  const onImageUpload = (img: SearchImage): void => {
    setImage(img);
    const event = new CustomEvent('wigmix_search_bar_append_image', { detail: img });
    document.dispatchEvent(event);
  };

  useEffect(() => {
    const handleImageAppended = (e: any): void => {
      setImage(e.detail);
    };
    document.addEventListener('wigmix_search_bar_append_image', handleImageAppended);
    return (): void => {
      document.removeEventListener('wigmix_search_bar_append_image', handleImageAppended);
    };
  }, []);

  useEffect(() => {
    if (breakpoint === WidgetBreakpoint.MOBILE) {
      setSuggestionMax(4);
      setRelatedMax(4);
    }
  }, [breakpoint]);

  const emitSearchBarCallback = (t: string | undefined, i: SearchImage | undefined): void => {
    if (config.callbacks?.onSearchBarInput && typeof config.callbacks.onSearchBarInput === 'function') {
      config.callbacks.onSearchBarInput(t, i);
    }
  };

  useEffect(() => {
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
          <SearchBarInput query={query} setQuery={setQuery} image={image}
                          imageUploadHandler={(img: SearchImage) => {
                            setImage(img);
                            if (img && !isImageFile(img)) {
                              emitSearchBarCallback(query, img);
                            }
                          }}
                          emitSearchBarCallback={() => {
                            emitSearchBarCallback(query, image);
                          }}
                          setShowDropdown={setShowDropdown}
                          placementId={`${config.appSettings.placementId}`} />
          {/* Autocomplete dropdown */}
          {query && (autocompleteResults.length > 0 || searchAsYouTypeResults.length > 0)
              ? (<div
                      className='absolute top-12 z-20 h-[80vh] w-full overflow-y-auto rounded-b-md border-x-1 border-b-1 border-gray-200 bg-white transition-all md:h-auto'
                      aria-label='Drag or upload image'
                  >
                    <div className='relative flex flex-col divide-x divide-gray-200 py-1 md:flex-row'>
                      <div className='flex flex-col justify-between md:w-2/5'>
                        <div className='flex flex-col gap-2 px-4 py-1'>
                          <p className='text-large font-semibold leading-6 text-primary'>Suggestions</p>

                          <Listbox
                              onAction={(key) => {
                                setQuery(String(key));
                                emitSearchBarCallback(String(key), image);
                              }}
                              aria-label='Autocomplete Dropdown'
                          >
                            <ListboxSection classNames={{ base: 'mb-0' }}>
                              {autocompleteResults.slice(0, suggestionMax).map((result, index) => (
                                  <ListboxItem
                                      tabIndex={0}
                                      className='pr-4'
                                      key={result}
                                      endContent={<MagnifyingGlassIcon className='size-4'/>}
                                      textValue={result}
                                  >
                            <span className='pl-2 text-primary'
                                  data-pw={`sb-autocomplete-suggestion-${index + 1}`}>{result}</span>
                                  </ListboxItem>
                              ))}
                            </ListboxSection>
                          </Listbox>
                        </div>

                        <div className='hidden px-4 pb-4 md:flex'>
                          <Button
                              className='w-full rounded bg-buttonPrimary py-2 font-semibold text-white'
                              radius='none'
                              onClick={() => {
                                if (query) {
                                  emitSearchBarCallback(query, image);
                                }
                              }}
                          >
                            View all {productCount} products
                          </Button>
                        </div>
                      </div>

                      <div className='flex w-full justify-center md:w-3/5'>
                        <div className='flex flex-col gap-2 px-4 py-1'>
                          <p className='text-large font-semibold leading-6 text-primary'>Related products</p>

                          <div
                              className='grid w-full grid-cols-2 gap-x-2 gap-y-4 pb-2 md:grid-cols-4'
                              data-pw='esr-product-result-grid'
                          >
                            {searchAsYouTypeResults.slice(0, relatedMax).map((result, index) => (
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

                      <div className='sticky bottom-0 flex px-4 md:hidden'>
                        <Button
                            className='w-full rounded bg-buttonPrimary py-2 font-semibold text-white'
                            radius='none'
                            onClick={() => {
                              if (query) {
                                emitSearchBarCallback(query, image);
                              }
                            }}
                        >
                          View all {productCount} products
                        </Button>
                      </div>
                    </div>
                  </div>
              )
              : <div
                  className='absolute top-12 z-20 w-full overflow-y-scroll rounded-b-md border-x-1 border-b-1 border-gray-200 bg-white transition-all'
                  aria-label='Drag or upload image'
              >
                <div className='flex divide-x divide-gray-200 py-1'>
                  <div className='flex-1'>
                    <div className='flex flex-col gap-2 px-4 py-1'>
                      <p className='text-large font-semibold leading-6 text-primary'>Recent searches</p>

                      <Listbox
                          onAction={(key) => {
                            setQuery(String(key));
                            emitSearchBarCallback(String(key), image);
                          }}
                          aria-label='Recent searches'
                      >
                        <ListboxSection classNames={{ base: 'mb-0' }}>
                          {searchHistory.filter((entry) => entry.type === 'text').slice(0, 4).map((entry) => (
                              <ListboxItem
                                  tabIndex={0}
                                  className='pr-4'
                                  key={String(entry.query)}
                                  endContent={<MagnifyingGlassIcon className='size-4'/>}
                                  textValue={entry.query}
                              >
                            <span className='pl-2 text-primary'
                                  data-pw={`sb-recent-searches-${entry.id}`}>{entry.query}</span>
                              </ListboxItem>
                          ))}
                        </ListboxSection>
                      </Listbox>
                    </div>
                  </div>

                  {customizations.imageUpload?.enable && (
                      <div className='hidden w-2/5 justify-center md:flex'>
                        <FileDropzone onImageUpload={onImageUpload} name='sb-image-upload-dropdown'>
                          <div
                              className='flex flex-col items-center gap-6 py-1 text-center text-medium'>
                            <CustomizableIcon
                                height={80}
                                width={80}
                                url={customizations.imageUpload?.icon?.url || 'https://cdn.visenze.com/images/upload-icon.svg'}
                                color={customizations.imageUpload?.icon?.color || ''}
                            />

                            <p className='hidden px-3 py-2 leading-6 text-primary md:block'>
                              {intl.formatMessage({ id: 'dragImageToSearch' })}
                            </p>

                            <p className='pt-3 leading-6 text-primary md:hidden'>
                              {intl.formatMessage({ id: 'tapToSearchImage' })}
                            </p>
                          </div>
                        </FileDropzone>
                      </div>
                  )}
                </div>
              </div>
          }
        </div>
      </div>
    </>
  );
};

export default SearchBar;
