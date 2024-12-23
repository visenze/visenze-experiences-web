import type { FC, ReactElement } from 'react';
import { useEffect, useContext, useState } from 'react';
import { Listbox, ListboxItem, ListboxSection } from '@nextui-org/listbox';
import { cn } from '@nextui-org/theme';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { SearchImage } from '../../common/types/image';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import SearchBarInput from './components/SearchBarInput';
import useAutocomplete from '../../common/components/hooks/use-autocomplete';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/visenze-core';

interface SearchBarResultProps {
  config: WidgetConfig;
}

const SearchBar: FC<SearchBarResultProps> = ({ config }): ReactElement => {
  const { searchBarResultsSettings, debugMode } = useContext(WidgetDataContext);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [showDropdown, setShowDropdown] = useState(false);
  const [allowRedirect, setAllowRedirect] = useState(false);
  const [isMultiSearch, setIsMultiSearch] = useState(true);
  const root = useContext(RootContext);

  const {
    imageId,
    autocompleteResults,
    error,
  } = useAutocomplete({
    image,
    query: debouncedQuery,
  });

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
    if (!query) setShowDropdown(false);
    else setShowDropdown(true);
  }, [query]);

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
                          handleRedirect={() => {
                            if (query) {
                              redirectWithAutocomplete(query);
                            }
                          }}
                          setShowDropdown={setShowDropdown}
                          placementId={`${config.appSettings.placementId}`} />
          {/* Autocomplete dropdown */}
          {
            <Listbox
              onAction={(key) => {
                setQuery(String(key));
                redirectWithAutocomplete(String(key));
              }}
              classNames={{
                base: cn(
                  'absolute top-12 rounded-b-md max-h-52 w-full overflow-y-auto border-gray-200 bg-white transition-all z-20',
                  showDropdown && autocompleteResults.length > 0 ? 'border-b-1 border-x-1' : 'border-none hidden',
                ),
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
          }
        </div>
      </div>
    </>
  );
};

export default SearchBar;
