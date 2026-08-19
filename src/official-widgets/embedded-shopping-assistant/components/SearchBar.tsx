import type { FC } from 'react';
import { useRef } from 'react';
import { useIntl } from 'react-intl';
import CameraIcon from '../../../common/icons/CameraIcon';
import MagnifyingGlassIcon from '../../../common/icons/MagnifyingGlassIcon';
import MicrophoneIcon from '../../../common/icons/MicrophoneIcon';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  iconColor?: string;
}

const SearchBar: FC<SearchBarProps> = ({ value, onChange, onSubmit, iconColor }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  return (
    <div className='flex items-center gap-2 px-5 py-3.5 rounded-full bg-white dark:bg-neutral-800 border
      border-gray-300 dark:border-neutral-700 shadow-md hover:shadow-lg focus-within:shadow-lg transition-shadow'>

      <MagnifyingGlassIcon className='size-5 flex-shrink-0 text-gray-400 dark:text-neutral-500' />

      <input
        ref={inputRef}
        type='text'
        value={value}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
        placeholder={intl.formatMessage({ id: 'searchPlaceholder' })}
        className='flex-1 min-w-0 bg-transparent text-sm text-gray-800 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 outline-none border-none'
      />

      <div className='flex items-center gap-3 flex-shrink-0 border-l border-gray-200 dark:border-neutral-700 pl-3'>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yVoiceSearch' })}
          className='transition-opacity hover:opacity-70'
        >
          <MicrophoneIcon className='size-5' color={iconColor} />
        </button>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yImageSearch' })}
          className='transition-opacity hover:opacity-70'
        >
          <CameraIcon className='size-5' color={iconColor} />
        </button>
      </div>

    </div>
  );
};

export default SearchBar;
