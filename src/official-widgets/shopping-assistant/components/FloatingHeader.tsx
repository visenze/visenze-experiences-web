import { cn } from '@heroui/theme';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import CloseIcon from '../../../common/icons/CloseIcon';
import PlusCircleIcon from '../../../common/icons/PlusCircleIcon';
import SpeakerIcon from '../../../common/icons/SpeakerIcon';
import type { WidgetConfig } from '../../../common/wigmix-core';

interface FloatingHeaderProps {
  darkMode: boolean;
  customizations: WidgetConfig['customizations'];
  chat: UseChatResult;
  onNewChat: () => void;
  onMinimize: () => void;
  titleId: string;
}

const FloatingHeader: FC<FloatingHeaderProps> = ({ darkMode, customizations, chat, onNewChat, onMinimize, titleId }) => {
  const intl = useIntl();
  const floatingHeader = customizations.popup?.floating?.header;
  const background = (darkMode ? floatingHeader?.backgroundColorDark : floatingHeader?.backgroundColor) || '#4F46E5';
  const gradientTo = darkMode ? floatingHeader?.gradientToColorDark : floatingHeader?.gradientToColor;

  return (
    <div
      className='flex w-full items-center justify-between gap-2 px-4 py-3 text-white'
      style={{ background: gradientTo ? `linear-gradient(135deg, ${background}, ${gradientTo})` : background }}
    >
      <div className='flex items-center gap-2 overflow-hidden'>
        {floatingHeader?.avatarUrl && (
          <img src={floatingHeader.avatarUrl} alt='' className='size-8 shrink-0 rounded-full' />
        )}
        <h2 id={titleId} className='wigmix-widget-title m-0 truncate'>
          {intl.formatMessage({ id: 'widgetTitle' })}
        </h2>
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        {chat.speechOutputEnabled && (
          <button
            type='button'
            aria-label={intl.formatMessage({
              id: chat.isVoiceReadingEnabled ? 'a11yDisableVoiceReading' : 'a11yEnableVoiceReading',
            })}
            aria-pressed={chat.isVoiceReadingEnabled}
            className={cn('border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
            onClick={chat.toggleVoiceReading}
          >
            <SpeakerIcon muted={!chat.isVoiceReadingEnabled} className='size-6 cursor-pointer' color='currentColor' />
          </button>
        )}
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yStartNewChat' })}
          title={intl.formatMessage({ id: 'a11yStartNewChat' })}
          className={cn('border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
          onClick={onNewChat}>
          <PlusCircleIcon className='size-6 cursor-pointer' color='currentColor' />
        </button>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yMinimizeShoppingAssistant' })}
          title={intl.formatMessage({ id: 'a11yMinimizeShoppingAssistant' })}
          className={cn('border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
          onClick={onMinimize}>
          <CloseIcon className='size-6 cursor-pointer' color='currentColor' />
        </button>
      </div>
    </div>
  );
};

export default FloatingHeader;
