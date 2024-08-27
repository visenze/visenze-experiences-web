import type { FC } from 'react';
import { useContext, memo, useRef } from 'react';
import { Input } from '@nextui-org/input';
import { useIntl } from 'react-intl';
import { cn } from '@nextui-org/theme';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import ImageGalleryUpload from './ImageGalleryUpload';
import type { SearchImage } from '../../../common/types/image';
import MagnifyingGlassIcon from '../../../common/icons/MagnifyingGlassIcon';
import CameraUpload from './CameraUpload';
import { WidgetDataContext } from '../../../common/types/contexts';

interface SearchBarInputProps {
  query: string;
  setQuery: (query: string) => void;
  handleRedirect: () => void;
  setAllowRedirect: (allowRedirect: boolean) => void;
  setShowDropdown: (showDropdown: boolean) => void;
  setImage: (image: SearchImage) => void;
  placementId: string;
}

const SearchBarInput: FC<SearchBarInputProps> = ({ query, setQuery, handleRedirect, setAllowRedirect, setShowDropdown, setImage, placementId }) => {
  const { searchBarResultsSettings } = useContext(WidgetDataContext);
  const searchBarRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  const imageUploadHandler = (img: SearchImage): void => {
    setImage(img);
    setAllowRedirect(true);
  };

  return (
    <Input
      data-pw='sb-search-bar-input'
      ref={searchBarRef}
      className='z-30'
      classNames={{
        inputWrapper: cn('rounded-md bg-white w-full border border-gray-200', searchBarResultsSettings.enableImageUpload ? 'px-1.5' : 'px-3'),
        input: 'text-mobile-searchBarText md:text-tablet-searchBarText lg:text-desktop-searchBarText font-mobile-searchBarText md:font-tablet-searchBarText '
          + 'lg:font-desktop-searchBarText',
      }}
      autoCapitalize='off'
      autoComplete='off'
      size='lg'
      isClearable
      maxLength={QUERY_MAX_CHARACTER_LENGTH}
      placeholder={intl.formatMessage({ id: 'searchBar.searchBarPlaceholder' })}
      onClick={() => setShowDropdown(true)}
      onBlur={() => setTimeout(() => setShowDropdown(false), 100)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleRedirect();
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
          {
            searchBarResultsSettings.enableImageUpload
            && <>
              <ImageGalleryUpload imageUploadHandler={imageUploadHandler} placementId={placementId} />
              <CameraUpload imageUploadHandler={imageUploadHandler} />
            </>
          }
          <MagnifyingGlassIcon className='size-4'/>
        </div>
      }
    />
  );
};

export default memo(SearchBarInput);
