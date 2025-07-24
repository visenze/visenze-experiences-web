import { Input } from '@heroui/input';
import { cn } from '@heroui/theme';
import type { FC } from 'react';
import { memo, useContext, useRef } from 'react';
import { useIntl } from 'react-intl';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import MagnifyingGlassIcon from '../../../common/icons/MagnifyingGlassIcon';
import PhotoIcon from '../../../common/icons/PhotoIcon';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';

interface SearchBarInputProps {
  query: string;
  setQuery: (query: string) => void;
  emitSearchBarCallback: () => void;
  imageUploadHandler: (image: SearchImage | undefined) => void;
  setShowDropdown: (showDropdown: boolean) => void;
  setShowImageUpload: (showImageUpload: boolean) => void;
  image: SearchImage | undefined;
  placementId: string;
  renderModalWithoutPortal?: boolean;
}

const SearchBarInput: FC<SearchBarInputProps> = ({
  query,
  setQuery,
  emitSearchBarCallback,
  imageUploadHandler,
  setShowDropdown,
  setShowImageUpload,
  }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const searchBarRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  return (
    <Input
      data-pw='msb-search-bar-input'
      data-testid='wigmix-msb-search-bar-input'
      ref={searchBarRef}
      className='z-5'
      classNames={{
        inputWrapper: cn(
          'rounded-none w-full border border-gray-400',
          customizations.imageUpload?.enable ? 'px-1.5' : 'px-3',
          darkMode ? 'bg-gray-800 data-[hover=true]:bg-gray-800' : 'bg-white data-[hover=true]:bg-white',
        ),
      }}
      autoCapitalize='off'
      autoComplete='off'
      size='lg'
      // isClearable
      maxLength={QUERY_MAX_CHARACTER_LENGTH}
      placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
      onClick={() => {
        setShowDropdown(true);
        setShowImageUpload(false);
      }}
      onBlur={() => setTimeout(() => {
        setShowDropdown(false);
        setShowImageUpload(false);
      }, 100)}
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
          imageUploadHandler({ imgUrl: value });
          setQuery('');
        } else {
          setQuery(value);
        }
      }}
      startContent={
        <div className='flex items-center pl-2'>
          <div
            className='cursor-pointer pe-1'
            onClick={() => {
              setShowDropdown(true);
            }}>
            <MagnifyingGlassIcon
              color={
                darkMode
                  ? customizations.generalLayout?.fontColorDark || ''
                  : customizations.generalLayout?.fontColor || ''
              }
              className='size-4'
            />
          </div>
        </div>
      }
      endContent={
        <div className='flex items-center pr-2'>
          {customizations.imageUpload?.enable && (
            <button data-testid='wigmix-msb-gallery-button' onClick={() => {
              setShowDropdown(true);
              setShowImageUpload(true);
            }}>
              <PhotoIcon className='size-6'
                color={
                  darkMode
                    ? customizations.generalLayout?.fontColorDark || ''
                    : customizations.generalLayout?.fontColor || ''
                }
              />
            </button>
          )}
        </div>
      }
    />
  );
};

export default memo(SearchBarInput);
