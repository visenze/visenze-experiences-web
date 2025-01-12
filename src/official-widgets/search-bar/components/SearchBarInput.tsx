import type { FC } from 'react';
import { useContext, memo, useRef } from 'react';
import { Input } from '@nextui-org/input';
import { useIntl } from 'react-intl';
import { cn } from '@nextui-org/theme';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import ImageGalleryUpload from './ImageGalleryUpload';
import type { SearchImage } from '../../../common/types/image';
import MagnifyingGlassIcon from '../../../common/icons/MagnifyingGlassIcon';
import { WidgetDataContext } from '../../../common/types/contexts';

interface SearchBarInputProps {
  query: string;
  setQuery: (query: string) => void;
  emitSearchBarCallback: () => void;
  imageUploadHandler: (image: SearchImage) => void;
  setShowDropdown: (showDropdown: boolean) => void;
  image: SearchImage | undefined;
  placementId: string;
}

const SearchBarInput: FC<SearchBarInputProps> = ({ query, setQuery, emitSearchBarCallback, imageUploadHandler, setShowDropdown, placementId, image }) => {
  const { customizations } = useContext(WidgetDataContext);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  return (
    <Input
      data-pw='sb-search-bar-input'
      ref={searchBarRef}
      className='z-30'
      classNames={{
        inputWrapper: cn('rounded-md bg-white w-full border border-gray-200', customizations.imageUpload?.enable ? 'px-1.5' : 'px-3'),
        input: 'text-mobile-searchBarText md:text-tablet-searchBarText lg:text-desktop-searchBarText font-mobile-searchBarText md:font-tablet-searchBarText '
          + 'lg:font-desktop-searchBarText',
      }}
      autoCapitalize='off'
      autoComplete='off'
      size='lg'
      isClearable
      maxLength={QUERY_MAX_CHARACTER_LENGTH}
      placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
      onClick={() => setShowDropdown(true)}
      onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          emitSearchBarCallback();
          if (searchBarRef.current) {
            searchBarRef.current.blur();
          }
        }
      }}
      value={query}
      onValueChange={(value) => {
        setQuery(value);
      }}
      startContent={
        <div className='flex items-center gap-2'>
          {customizations.imageUpload?.enable && (
            <ImageGalleryUpload imageUploadHandler={imageUploadHandler} placementId={placementId} image={image} />
          )}
          <MagnifyingGlassIcon className='size-4'/>
        </div>
      }
    />
  );
};

export default memo(SearchBarInput);
