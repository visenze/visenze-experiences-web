import { cn } from '@heroui/theme';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import CloseIcon from '../../../common/icons/CloseIcon';
import SparklesIcon from '../../../common/icons/SparklesIcon';
import SpeakerWaveIcon from '../../../common/icons/SpeakerWaveIcon';

interface TopBarProps {
  iconColor?: string;
  isSpeaking: boolean;
  onToggleReadAloud: () => void;
  onClose: () => void;
}

const TopBar: FC<TopBarProps> = ({ iconColor, isSpeaking, onToggleReadAloud, onClose }) => {
  const intl = useIntl();

  return (
    <div className='border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex-shrink-0'>
      {/* Same max-w-3xl/mx-auto/p-6 column as the scrollable content below, so "AI Overview" and the
          close button line up with the query bubble and turns instead of hugging the page edges. */}
      <div className='max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <SparklesIcon className='size-4' color={iconColor} />
          <span className='text-sm font-semibold text-gray-800 dark:text-neutral-100'>
            {intl.formatMessage({ id: 'aiOverviewLabel' })}
          </span>
          <button
            type='button'
            onClick={onToggleReadAloud}
            aria-label={intl.formatMessage({ id: isSpeaking ? 'a11yStopReading' : 'a11yReadAloud' })}
            className={cn(
              'flex items-center justify-center size-7 rounded-full transition-colors',
              isSpeaking ? 'bg-gray-200 dark:bg-neutral-700' : 'hover:bg-gray-100 dark:hover:bg-neutral-800',
            )}
          >
            <SpeakerWaveIcon className='size-4' color={iconColor} />
          </button>
        </div>
        <button
          type='button'
          onClick={onClose}
          aria-label={intl.formatMessage({ id: 'a11yCloseModal' })}
          className='flex items-center justify-center size-7 rounded-full text-gray-500 dark:text-neutral-400
            hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors'
        >
          <CloseIcon className='size-4' />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
