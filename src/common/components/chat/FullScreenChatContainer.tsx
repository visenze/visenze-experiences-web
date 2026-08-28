import { cn } from '@heroui/theme';
import { type FC, type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import CloseIcon from '../../icons/CloseIcon';
import PlusCircleIcon from '../../icons/PlusCircleIcon';
import SpeakerIcon from '../../icons/SpeakerIcon';
import { WidgetBreakpoint } from '../../types/constants';
import useBreakpoint from '../hooks/use-breakpoint';
import Portal from '../portal';
import ShadowWrapper from '../shadow-wrapper';

// i18n contract: this component calls `intl.formatMessage` for the following ids, so any widget
// consuming this shared component must provide all of them in its own DEFAULT_TEXTS/locale files
// (via IntlProvider), or the UI will render raw translation ids instead of text:
// a11yCloseFullScreen, a11yEnableMute, a11yStartNewChat, a11yToggleMute.
interface FullScreenChatContainerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  isMuted: boolean;
  onToggleMute: () => void;
  // Hides the mute/unmute toggle entirely when voice is disabled widget-wide (customizations
  // .chat.voiceEnabled === false) — mirrors shopping-assistant gating its own SpeakerIcon on
  // `speechOutputEnabled`.
  showVoiceToggle: boolean;
  onNewChat: () => void;
  // Hides the "new chat" trigger while the consuming widget's own welcome/onboarding screen is
  // showing — there's no chat to reset yet at that point, only once a message is sent.
  showNewChat: boolean;
  darkMode: boolean;
  fontFamily?: string;
  fontColor?: string;
  fontColorDark?: string;
  // Dialog background, from customizations.generalLayout.backgroundColor/backgroundColorDark.
  // Falls back to the default white/neutral-900 classes below when unset.
  backgroundColor?: string;
  backgroundColorDark?: string;
  // Header separator border, from customizations.generalLayout.border. Falls back to the
  // default neutral border classes below when unset.
  borderWidth?: number;
  borderColor?: string;
  borderColorDark?: string;
  placementId: string;
  // Identifies the consuming widget in the portal element's id (e.g. 'ai-search-launcher'), so
  // multiple widgets embedding this same shared container on one page get distinct portal ids.
  widgetName: string;
  ariaLabelledBy: string;
  children: ReactNode;
  // Test-only escape hatch, same reason ViSenzeModal has one: Portal + Shadow DOM is hard to
  // query directly in RTL/jsdom.
  renderWithoutPortal?: boolean;
  // When true, the desktop max-w-[820px] constraint is dropped so children can fill the full
  // viewport width — used by split-layout's two-pane view. Defaults to false (today's behavior).
  fullWidth?: boolean;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const FullScreenChatContainer: FC<FullScreenChatContainerProps> = ({
  open,
  onClose,
  title,
  isMuted,
  onToggleMute,
  showVoiceToggle,
  onNewChat,
  showNewChat,
  darkMode,
  fontFamily,
  fontColor,
  fontColorDark,
  backgroundColor,
  backgroundColorDark,
  borderWidth,
  borderColor,
  borderColorDark,
  placementId,
  widgetName,
  ariaLabelledBy,
  children,
  renderWithoutPortal,
  fullWidth = false,
}) => {
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<string>('');

  // Initial focus when the full-screen container opens. Note this FC's own instance is mounted
  // once and persists for the widget's whole lifetime (it's unconditionally present in the parent
  // JSX — only the `if (!open)` guard below toggles what it renders), so a literal empty-deps
  // mount effect would fire exactly once, while still closed, when `containerRef.current` is still
  // null — it would never actually focus anything. Keying on `open` (mirroring the scroll-lock
  // effect right below) re-fires each time the dialog opens, once its div has actually rendered.
  // Without this, Escape-to-close (and Tab-trapping) don't work until the user manually tabs into
  // the dialog, since the keydown handler below is scoped to this div.
  useEffect(() => {
    if (open) {
      containerRef.current?.focus();
    }
  }, [open]);

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
    const focusableControls = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) || [])
      .filter((control) => !(control as HTMLButtonElement | HTMLInputElement).disabled);
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
  const resolvedBackgroundColor = darkMode ? (backgroundColorDark || '') : (backgroundColor || '');
  const resolvedBorderColor = darkMode ? (borderColorDark || '') : (borderColor || '');

  const content = (
    <div
      ref={containerRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      className='fixed inset-0 z-50 flex justify-center bg-white dark:bg-neutral-900'
      style={{ backgroundColor: resolvedBackgroundColor }}
      onKeyDown={handleKeyDown}
    >
      <div className='flex size-full flex-col'>
        <div
          data-testid='wigmix-fullscreen-header'
          className='flex w-full items-center justify-between border-b border-neutral-300 py-2 dark:border-neutral-800'
          style={{ borderBottomColor: resolvedBorderColor, borderBottomWidth: borderWidth !== undefined ? `${borderWidth}px` : undefined }}
        >
          <div
            className={cn(
              'flex w-full items-center justify-between',
              breakpoint === WidgetBreakpoint.DESKTOP && !fullWidth && 'mx-auto max-w-[820px]',
            )}
          >
            <h2 id={ariaLabelledBy} className='m-0 flex items-center gap-2 px-4' style={{ color: iconColor }}>
              {title}
            </h2>
            <div className='flex items-center gap-2 pe-4'>
              {showVoiceToggle && (
                <button
                  type='button'
                  aria-label={intl.formatMessage({ id: isMuted ? 'a11yEnableMute' : 'a11yToggleMute' })}
                  aria-pressed={isMuted}
                  className={cn('flex min-h-[38px] min-w-[38px] items-center justify-center border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
                  onClick={onToggleMute}
                >
                  <SpeakerIcon muted={isMuted} className='size-6 cursor-pointer' color={iconColor} />
                </button>
              )}
              {showNewChat && (
                <button
                  type='button'
                  aria-label={intl.formatMessage({ id: 'a11yStartNewChat' })}
                  title={intl.formatMessage({ id: 'a11yStartNewChat' })}
                  className={cn('flex min-h-[38px] min-w-[38px] items-center justify-center border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
                  onClick={onNewChat}
                >
                  <PlusCircleIcon className='size-6 cursor-pointer' color={iconColor} />
                </button>
              )}
              <button
                type='button'
                aria-label={intl.formatMessage({ id: 'a11yCloseFullScreen' })}
                title={intl.formatMessage({ id: 'a11yCloseFullScreen' })}
                className={cn('flex min-h-[38px] min-w-[38px] items-center justify-center border-0 bg-transparent p-0', FOCUS_VISIBLE_CLASSES)}
                onClick={onClose}
              >
                <CloseIcon className='size-6 cursor-pointer' color={iconColor} />
              </button>
            </div>
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
    <Portal idName={`visenze-widget-${widgetName}-fullscreen-${placementId}`}>
      <ShadowWrapper darkMode={darkMode} fontFamily={fontFamily || ''}>
        {content}
      </ShadowWrapper>
    </Portal>
  );
};

export default FullScreenChatContainer;
