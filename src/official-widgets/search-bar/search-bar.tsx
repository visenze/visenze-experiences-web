import type { FC, ReactElement } from 'react';
import { useEffect, useContext, useState } from 'react';
import { Listbox, ListboxItem, ListboxSection } from '@nextui-org/listbox';
import { cn } from '@nextui-org/theme';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { SearchImage } from '../../common/types/image';
import { isImageFile } from '../../common/types/image';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import SearchBarInput from './components/SearchBarInput';
import useAutocomplete from '../../common/components/hooks/use-autocomplete';
import type { WidgetConfig } from '../../common/visenze-core';

interface SearchBarResultProps {
  config: WidgetConfig;
  textQuery: string;
  imUrl: string;
}

const SearchBar: FC<SearchBarResultProps> = ({ config, textQuery, imUrl }): ReactElement => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [showDropdown, setShowDropdown] = useState(false);
  const root = useContext(RootContext);

  const {
    imageUrl,
    autocompleteResults,
    error,
  } = useAutocomplete({
    image,
    query: debouncedQuery,
  });

  useEffect(() => {
    const handleImageAppended = (e: any): void => {
      setImage(e.detail);
    };
    document.addEventListener('wigmix_search_bar_append_image', handleImageAppended);
    return (): void => {
      document.removeEventListener('wigmix_search_bar_append_image', handleImageAppended);
    };
  }, []);

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
          {
            <Listbox
              onAction={(key) => {
                setQuery(String(key));
                emitSearchBarCallback(String(key), image);
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
                    <span className='pl-2 text-primary'
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
