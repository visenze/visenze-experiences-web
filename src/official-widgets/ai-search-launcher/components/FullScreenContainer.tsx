import { cn } from '@heroui/theme';
import { type FC, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import Portal from '../../../common/components/portal';
import ShadowWrapper from '../../../common/components/shadow-wrapper';
import CloseIcon from '../../../common/icons/CloseIcon';
import PlusCircleIcon from '../../../common/icons/PlusCircleIcon';
import { WidgetBreakpoint } from '../../../common/types/constants';
import { FOCUS_VISIBLE_CLASSES } from '../constants';
import SpeakerIcon from '../icons/SpeakerIcon';

interface FullScreenContainerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onNewChat: () => void;
  darkMode: boolean;
  fontFamily?: string;
  fontColor?: string;
  fontColorDark?: string;
  placementId: string;
  ariaLabelledBy: string;
  children: ReactNode;
  // Test-only escape hatch, same reason ViSenzeModal has one: Portal + Shadow DOM is hard to
  // query directly in RTL/jsdom.
  renderWithoutPortal?: boolean;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const FullScreenContainer: FC<FullScreenContainerProps> = ({
  open,
  onClose,
  title,
  isMuted,
  onToggleMute,
  onNewChat,
  darkMode,
  fontFamily,
  fontColor,
  fontColorDark,
  placementId,
  ariaLabelledBy,
  children,
  renderWithoutPortal,
}) => {
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<string>('');

  // Scroll lock — mirrors Modal's implementation in src/common/components/modal/visenze-modal.tsx.
  useEffect(() => {
    if (open) {
      setOverflow(document.body.style.overflow);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = overflow;
      setOverflow('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusableControls = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) || []);
    if (!focusableControls.length) {
      return;
    }
    // document.activeElement doesn't pierce the Shadow DOM this widget renders in (it only
    // reports the shadow host), so it never matches these controls in production. Reading
    // activeElement off the event's own root (the Shadow DOM when present, else document)
    // works in both contexts.
    const activeRoot = event.currentTarget.getRootNode() as Document | ShadowRoot;
    const activeIndex = focusableControls.indexOf(activeRoot.activeElement as HTMLElement);
    let nextIndex = activeIndex + 1;
    if (event.shiftKey) {
      nextIndex = activeIndex - 1;
    }
    if (nextIndex < 0) {
      nextIndex = focusableControls.length - 1;
    }
    if (nextIndex >= focusableControls.length) {
      nextIndex = 0;
    }

    event.preventDefault();
    focusableControls[nextIndex].focus();
  }, [onClose]);

  if (!open) {
    return <></>;
  }

  const iconColor = darkMode ? (fontColorDark || '') : (fontColor || '');

  const content = (
    <div
      ref={containerRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      className='fixed inset-0 z-50 flex justify-center bg-white dark:bg-neutral-900'
      onKeyDown={handleKeyDown}
    >
      <div className={cn('flex h-full w-full flex-col', breakpoint === WidgetBreakpoint.DESKTOP && 'max-w-[820px]')}>
        <div className='flex w-full items-center justify-between py-4'>
          <h2 id={ariaLabelledBy} className='m-0 flex items-center gap-2 px-4' style={{ color: iconColor }}>
            {title}
          </h2>
          <div className='flex items-center gap-2 pe-4'>
            <button
              type='button'
              aria-label={intl.formatMessage({ id: isMuted ? 'a11yEnableMute' : 'a11yToggleMute' })}
              aria-pressed={isMuted}
              className={cn('border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
              onClick={onToggleMute}
            >
              <SpeakerIcon muted={isMuted} className='size-6 cursor-pointer' color={iconColor} />
            </button>
            <button
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yStartNewChat' })}
              title={intl.formatMessage({ id: 'a11yStartNewChat' })}
              className={cn('border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
              onClick={onNewChat}
            >
              <PlusCircleIcon className='size-6 cursor-pointer' color={iconColor} />
            </button>
            <button
              type='button'
              aria-label={intl.formatMessage({ id: 'a11yCloseFullScreen' })}
              title={intl.formatMessage({ id: 'a11yCloseFullScreen' })}
              className={cn('border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
              onClick={onClose}
            >
              <CloseIcon className='size-6 cursor-pointer' color={iconColor} />
            </button>
          </div>
        </div>
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
          {children}
        </div>
      </div>
    </div>
  );

  if (renderWithoutPortal) {
    return content;
  }

  return (
    <Portal idName={`visenze-widget-ai-search-launcher-fullscreen-${placementId}`}>
      <ShadowWrapper darkMode={darkMode} fontFamily={fontFamily || ''}>
        {content}
      </ShadowWrapper>
    </Portal>
  );
};

export default FullScreenContainer;
