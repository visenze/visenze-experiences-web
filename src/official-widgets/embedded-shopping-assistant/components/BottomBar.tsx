import type { ChangeEvent, FC } from 'react';
import { useRef } from 'react';
import { useIntl } from 'react-intl';
import MicrophoneIcon from '../../../common/icons/MicrophoneIcon';
import PlusCircleIcon from '../../../common/icons/PlusCircleIcon';

interface BottomBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onImageSelect: (file: File) => void;
  iconColor?: string;
  primaryButtonBg?: string;
  primaryButtonText?: string;
}

const BottomBar: FC<BottomBarProps> = ({
  value, onChange, onSubmit, onImageSelect, iconColor, primaryButtonBg, primaryButtonText,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) onImageSelect(file);
    e.target.value = '';
  };

  return (
    <div className='bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 px-6 py-3 flex-shrink-0'>
      <div className='max-w-3xl mx-auto flex items-center gap-3 px-4 py-2.5 rounded-full border border-gray-300 dark:border-neutral-700
        bg-white dark:bg-neutral-800 shadow-sm hover:shadow focus-within:shadow transition-shadow'>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yUploadImage' })}
          onClick={() => fileInputRef.current?.click()}
          className='flex-shrink-0 transition-opacity hover:opacity-70'
        >
          <PlusCircleIcon className='size-6' color={iconColor} />
        </button>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileChange}
          className='hidden'
        />
        <input
          ref={inputRef}
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          placeholder={intl.formatMessage({ id: 'askPlaceholder' })}
          className='flex-1 min-w-0 bg-transparent text-sm text-gray-800 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 outline-none border-none'
        />
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yVoiceSearch' })}
          className='flex-shrink-0 transition-opacity hover:opacity-70'
        >
          <MicrophoneIcon className='size-5' color={iconColor} />
        </button>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11ySend' })}
          onClick={onSubmit}
          style={{ backgroundColor: primaryButtonBg }}
          className='flex-shrink-0 size-8 rounded-full transition-opacity hover:opacity-90 flex items-center justify-center'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='2.5'
            stroke='currentColor'
            className='size-4'
            style={{ color: primaryButtonText }}
          >
            <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BottomBar;
