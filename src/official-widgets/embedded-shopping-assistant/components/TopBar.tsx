import { cn } from '@heroui/theme';
import type { CSSProperties, FC } from 'react';
import { useContext } from 'react';
import { useIntl } from 'react-intl';
import CloseIcon from '../../../common/icons/CloseIcon';
import SparklesIcon from '../../../common/icons/SparklesIcon';
import SpeakerWaveIcon from '../../../common/icons/SpeakerWaveIcon';
import { WidgetDataContext } from '../../../common/types/contexts';

interface TopBarProps {
  iconColor?: string;
  isSpeaking: boolean;
  onToggleReadAloud: () => void;
  onClose: () => void;
}

const TopBar: FC<TopBarProps> = ({ iconColor, isSpeaking, onToggleReadAloud, onClose }) => {
  const intl = useIntl();
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { generalLayout } = widgetConfig.customizations;
  const border = generalLayout?.border;
  // Falls back to the previous plain hardcoded border (via the className below) when unset, same
  // pattern ChatComposer already uses for its own configurable borders.
  const borderStyle: CSSProperties | undefined = border ? {
    borderBottomWidth: `${border.width}px`,
    borderBottomStyle: 'solid',
    borderBottomColor: darkMode ? border.colorDark : border.color,
  } : undefined;
  // Matches the results container's own backgroundColor wiring below it, so TopBar doesn't stay
  // hardcoded white/near-black while its parent follows a host's override.
  const backgroundColor = (darkMode ? generalLayout?.backgroundColorDark : generalLayout?.backgroundColor) || undefined;

  return (
    <div
      className={cn('flex-shrink-0', !backgroundColor && 'bg-white dark:bg-neutral-900', !borderStyle && 'border-b border-gray-200 dark:border-neutral-700')}
      style={{ ...borderStyle, backgroundColor }}
    >
      {/* Same max-w-3xl/mx-auto column as the scrollable content below, so "AI Overview" and the
          close button line up with the query bubble and turns instead of hugging the page edges.
          px-4/py-2 matches ai-search-launcher's own header density (FullScreenChatContainer). */}
      <div className='max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3'>
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
