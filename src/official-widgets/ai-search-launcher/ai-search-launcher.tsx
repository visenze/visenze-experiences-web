import { cn } from '@heroui/theme';
import { type FC, useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import { RootContext } from '../../common/components/shadow-wrapper';
import CameraIcon from '../../common/icons/CameraIcon';
import { WidgetDataContext } from '../../common/types/contexts';

type EntryPoint = 'image' | 'mic' | 'ai';

const PLACEHOLDER_LABELS: Record<EntryPoint, string> = {
  image: 'Image search (coming soon)',
  mic: 'Voice search (coming soon)',
  ai: 'Ask AI (coming soon)',
};

interface TemporaryFullScreenPlaceholderProps {
  entryPoint: EntryPoint;
  onClose: () => void;
}

// Placeholder — replaced wholesale by the real Portal-based full-screen container in a later task.
const TemporaryFullScreenPlaceholder: FC<TemporaryFullScreenPlaceholderProps> = ({ entryPoint, onClose }) => (
  <div
    style={{ position: 'fixed', inset: 0 }}
    className='z-50 flex flex-col items-center justify-center gap-4 bg-white dark:bg-neutral-900'
  >
    <p className='text-lg text-black dark:text-white'>{PLACEHOLDER_LABELS[entryPoint]}</p>
    <button
      type='button'
      aria-label='Close'
      className={cn('rounded-md border border-gray bg-transparent px-4 py-2 text-black dark:text-white', FOCUS_VISIBLE_CLASSES)}
      onClick={onClose}
    >
      Close
    </button>
  </div>
);

const AiSearchLauncher: FC = () => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const [activeEntryPoint, setActiveEntryPoint] = useState<EntryPoint | null>(null);

  if (!root) {
    return <></>;
  }

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  return (
    <>
      <div className='flex items-center gap-2 p-2'>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenImageSearch' })}
          className={cn('rounded-md border border-gray bg-transparent p-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => setActiveEntryPoint('image')}
        >
          <CameraIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenVoiceSearch' })}
          className={cn('rounded-md border border-gray bg-transparent p-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => setActiveEntryPoint('mic')}
        >
          <MicrophoneIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenAskAi' })}
          style={{ color: fontColor }}
          className={cn('rounded-md border border-gray bg-transparent px-3 py-2', FOCUS_VISIBLE_CLASSES)}
          onClick={() => setActiveEntryPoint('ai')}
        >
          {customizations.launcher?.title || intl.formatMessage({ id: 'triggerAskAi' })}
        </button>
      </div>
      {activeEntryPoint && (
        <TemporaryFullScreenPlaceholder entryPoint={activeEntryPoint} onClose={() => setActiveEntryPoint(null)} />
      )}
    </>
  );
};

export default AiSearchLauncher;
