import { cn } from '@heroui/theme';
import { type FC, useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import FullScreenContainer from './components/FullScreenContainer';
import { FOCUS_VISIBLE_CLASSES } from './constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import { RootContext } from '../../common/components/shadow-wrapper';
import CameraIcon from '../../common/icons/CameraIcon';
import { WidgetDataContext } from '../../common/types/contexts';

type EntryPoint = 'image' | 'mic' | 'ai';

const AiSearchLauncher: FC = () => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, appSettings } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const [activeEntryPoint, setActiveEntryPoint] = useState<EntryPoint | null>(null);
  // Temporary — replaced when the chat/voice hook (use-launcher-chat) is wired in.
  const [isMuted, setIsMuted] = useState(false);
  const dialogTitleId = `wigmix-ai-search-launcher-title-${appSettings.placementId}`;

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
      <FullScreenContainer
        open={activeEntryPoint !== null}
        onClose={() => setActiveEntryPoint(null)}
        title={customizations.launcher?.title || intl.formatMessage({ id: 'widgetTitle' })}
        isMuted={isMuted}
        // Temporary — replaced when the chat/voice hook (use-launcher-chat) is wired in.
        onToggleMute={() => setIsMuted((muted) => !muted)}
        // Temporary no-op — replaced when the chat/voice hook (use-launcher-chat) is wired in.
        onNewChat={() => {}}
        darkMode={darkMode}
        placementId={String(appSettings.placementId)}
        ariaLabelledBy={dialogTitleId}
      >
        {`Entry point: ${activeEntryPoint} (chat UI coming soon)`}
      </FullScreenContainer>
    </>
  );
};

export default AiSearchLauncher;
