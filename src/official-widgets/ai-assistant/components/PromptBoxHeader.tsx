import { cn } from '@heroui/theme';
import type { FC } from 'react';
import EntryLogo from '../../../common/components/entry-logo/EntryLogo';
import PlusCircleIcon from '../../../common/icons/PlusCircleIcon';

export type TitleLayout = 'ICON' | 'TEXT' | 'ICON_TEXT' | 'TEXT_ICON';

interface PromptBoxHeaderProps {
  title: string;
  // "New chat" is only offered once there is a conversation to reset.
  showNewChat: boolean;
  newChatLabel: string;
  onNewChat: () => void;
  iconColor?: string;
  // A configured brand logo replaces the default sparkle. The title text is shown next to it
  // (layout ICON_TEXT) unless `layout` says otherwise.
  logoUrl?: string;
  logoColor?: string;
  logoHeight?: number;
  logoWidth?: number;
  layout?: TitleLayout;
}

const DEFAULT_LOGO_HEIGHT = 24;

const Sparkle: FC = () => (
  <svg aria-hidden='true' width='22' height='22' viewBox='0 0 24 24' fill='currentColor' className='shrink-0'>
    <path d='M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm7 11l.9 2.6L22.5 16.5l-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z' />
  </svg>
);

const PromptBoxHeader: FC<PromptBoxHeaderProps> = ({
  title, showNewChat, newChatLabel, onNewChat, iconColor, logoUrl, logoColor, logoHeight, logoWidth, layout,
}) => {
  const resolvedLayout: TitleLayout = layout || 'ICON_TEXT';
  const showIcon = resolvedLayout !== 'TEXT';
  const showText = resolvedLayout !== 'ICON';
  const iconFirst = resolvedLayout !== 'TEXT_ICON';

  const icon = showIcon && (logoUrl ? (
    <EntryLogo
      url={logoUrl}
      color={logoColor}
      height={logoHeight || DEFAULT_LOGO_HEIGHT}
      width={logoWidth}
      className={cn('object-contain', !logoWidth && 'w-auto max-w-[240px]')}
    />
  ) : <Sparkle />);
  // Always rendered so the panel keeps an accessible heading; visually hidden for a logo-only title.
  const text = <h2 className={cn('truncate text-lg font-semibold', !showText && 'sr-only')}>{title}</h2>;

  return (
    <div className='flex items-center justify-between gap-2 px-3 pt-3'>
      <div className='flex min-w-0 items-center gap-2' style={{ color: iconColor }}>
        {iconFirst && icon}
        {text}
        {!iconFirst && icon}
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        {showNewChat && (
          <button
            type='button'
            aria-label={newChatLabel}
            title={newChatLabel}
            onClick={onNewChat}
            className='flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full border-0 bg-transparent p-1'
            style={{ color: iconColor }}
          >
            <PlusCircleIcon className='size-5' color={iconColor} />
          </button>
        )}
      </div>
    </div>
  );
};

export default PromptBoxHeader;
