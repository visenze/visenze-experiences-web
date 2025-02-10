import type { FC } from 'react';
import { useContext, memo, useRef } from 'react';
import { Input } from '@heroui/input';
import { useIntl } from 'react-intl';
import { cn } from '@heroui/theme';
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
  placementId: string;
  setShowDropdown: (showDropdown: boolean) => void;
  image: SearchImage | undefined;
}

const SearchBarInput: FC<SearchBarInputProps> = ({
  query,
  setQuery,
  emitSearchBarCallback,
  imageUploadHandler,
  setShowDropdown,
  placementId,
  image,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const searchBarRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  const createImageEvent = (im: SearchImage): void => {
    const event = new CustomEvent('wigmix_search_bar_append_image', { detail: im });
    document.dispatchEvent(event);
  };

  return (
    <Input
      data-pw='sb-search-bar-input'
      ref={searchBarRef}
      className='z-5'
      classNames={{
        inputWrapper: cn('rounded-md w-full border border-gray-200', customizations.imageUpload?.enable ? 'px-1.5' : 'px-3'),
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
        const isImageUrl = (url: string): boolean => /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(url.toLowerCase());

        if (isImageUrl(value)) {
          createImageEvent({ imgUrl: value });
          imageUploadHandler({ imgUrl: value });
          setQuery('');
        } else {
          setQuery(value);
        }
      }}
      startContent={
        <div className='flex items-center gap-2'>
          {customizations.imageUpload?.enable && (
            <ImageGalleryUpload imageUploadHandler={imageUploadHandler} placementId={placementId} image={image} />
          )}
          <MagnifyingGlassIcon color={darkMode
                                 ? (customizations.generalLayout?.fontColorDark || '')
                                 : (customizations.generalLayout?.fontColor || '')}
                               className='size-4' />
        </div>
      }
    />
  );
};

export default memo(SearchBarInput);
