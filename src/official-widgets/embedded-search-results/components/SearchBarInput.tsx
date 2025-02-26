import { Input } from '@heroui/input';
import { cn } from '@heroui/theme';
import type { FC } from 'react';
import { memo, useContext, useRef } from 'react';
import { useIntl } from 'react-intl';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import MagnifyingGlassIcon from '../../../common/icons/MagnifyingGlassIcon';
import { WidgetDataContext } from '../../../common/types/contexts';

interface SearchBarInputProps {
  query: string;
  setQuery: (query: string) => void;
  emitSearchBarCallback: () => void;
}

const SearchBarInput: FC<SearchBarInputProps> = ({
  query,
  setQuery,
  emitSearchBarCallback,
}) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const searchBarRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  return (
    <Input
      data-pw='esr-search-bar-input'
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
          <MagnifyingGlassIcon className='size-4'/>
        </div>
      }
    />
  );
};

export default memo(SearchBarInput);
