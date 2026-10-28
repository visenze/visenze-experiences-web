import { cn } from '@heroui/theme';
import { type FC, type RefObject, useContext, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useAssistantSession } from './assistant-session';
import type { EntryProps } from './entry-props';
import type { EntryPointKey } from '../../../common/components/chat/session/chat-session-store';
import EntryLogo from '../../../common/components/entry-logo/EntryLogo';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import CameraIcon from '../../../common/icons/CameraIcon';
import MicrophoneIcon from '../../../common/icons/MicrophoneIcon';
import { WidgetDataContext } from '../../../common/types/contexts';

// The entry bar of ai-search-launcher (camera / mic / Ask AI buttons): each button opens the shared
// conversation in the full-screen chat, which AssistantSurface renders in its own root.
const SearchBarEntry: FC<EntryProps> = ({ productId }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const searchBar = customizations.aiAssistant?.searchBar;
  const intl = useIntl();
  const { store } = useAssistantSession();
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const aiButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRefs: Record<EntryPointKey, RefObject<HTMLButtonElement>> = { image: imageButtonRef, mic: micButtonRef, ai: aiButtonRef };

  const fontColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');

  const openEntryPoint = (entryPoint: EntryPointKey): void => {
    store.setActiveEntry('search-bar', productId);
    // A chat id means there is a conversation to resume (from any entry, or restored after a reload):
    // the three entry points and the other entries share one conversation.
    const resuming = Boolean(store.getChatId());
    // The image / mic entry screens exist only in the full-screen chat, so in drawer mode only
    // Ask AI carries an activation (its greeting); camera and mic just open the drawer.
    const isDrawer = searchBar?.chatMode === 'drawer';
    store.openSurface({
      mode: isDrawer ? 'drawer' : 'fullscreen',
      activation: isDrawer && entryPoint !== 'ai' ? undefined : {
        entryPoint,
        isResumed: resuming,
        userMessageBaseline: store.getSnapshot().chats.filter((c) => c.author === 'user').length,
      },
      // Focus returns to the button that opened the chat, even though another root hosts the surface.
      onClosed: () => buttonRefs[entryPoint].current?.focus(),
    });
    // Same handshake as ai-search-launcher: in the full screen camera/mic never mint a chat id just for
    // opening (reopen only flips isOpen; sendMessage mints it lazily); Ask AI resumes an existing session
    // or starts a fresh one. The drawer has no entry screens to send from, only its composer, which a
    // fresh session (open()) enables, so there camera/mic start one too.
    if (resuming || (entryPoint !== 'ai' && !isDrawer)) {
      store.reopen();
      // reopen() only flips isOpen, and a fresh session has input disabled until open() runs: enable it so
      // the mic's text fallback (and the image screen's composer) can send, which mints the chat id lazily.
      if (!resuming) {
        store.setState({ allowUserInput: true });
      }
    } else {
      store.open();
    }
  };

  // The "Ask AI" button shows its text unless a logo is configured; with a logo, `layout`
  // (default ICON) decides whether the text is dropped or placed before/after it. A logo-only
  // button keeps the camera button's 38px height (a 32px-tall logo, a 2px inset and the 1px
  // border); its width follows the logo's aspect ratio, so the inset is even on all sides.
  const askAiEntryIcon = searchBar?.askAiEntryIcon;
  const askAiLayout = askAiEntryIcon?.url ? (askAiEntryIcon.layout || 'ICON') : 'TEXT';
  const isAskAiLogoOnly = askAiLayout === 'ICON';
  const askAiText = intl.formatMessage({ id: 'triggerAskAi' });
  // Configured padding overrides the button's default inset, only when a logo is shown, so the
  // text-only button always keeps the camera/mic buttons' styling.
  const askAiPadding = askAiEntryIcon?.url && askAiLayout !== 'TEXT' ? askAiEntryIcon.padding : undefined;
  const askAiLogo = askAiEntryIcon?.url && askAiLayout !== 'TEXT' && (
    <EntryLogo
      url={askAiEntryIcon.url}
      color={darkMode ? askAiEntryIcon.colorDark : askAiEntryIcon.color}
      height={askAiEntryIcon.height || (isAskAiLogoOnly ? 32 : 22)}
      width={askAiEntryIcon.width}
      className={cn('object-contain', !askAiEntryIcon.width && 'w-auto max-w-[240px]')}
    />
  );

  return (
    <div className='flex items-center gap-2 p-2'>
      {searchBar?.cameraEntryEnabled !== false && (
        <button
          ref={imageButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenImageSearch' })}
          className={cn(
            'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
            FOCUS_VISIBLE_CLASSES,
          )}
          onClick={() => openEntryPoint('image')}
        >
          <CameraIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
      )}
      {searchBar?.micEntryEnabled !== false && (
        <button
          ref={micButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenVoiceSearch' })}
          className={cn(
            'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
            FOCUS_VISIBLE_CLASSES,
          )}
          onClick={() => openEntryPoint('mic')}
        >
          <MicrophoneIcon className='size-5 cursor-pointer' color={fontColor} />
        </button>
      )}
      {searchBar?.askAiEntryEnabled !== false && (
        <button
          ref={aiButtonRef}
          type='button'
          aria-label={intl.formatMessage({ id: 'a11yOpenAskAi' })}
          style={{
            color: fontColor,
            paddingLeft: askAiPadding?.x,
            paddingRight: askAiPadding?.x,
            paddingTop: askAiPadding?.y,
            paddingBottom: askAiPadding?.y,
          }}
          className={cn(
            // Same border, background and height as the camera/mic buttons; a logo-only button only
            // swaps the padding for a thin inset so the logo can fill it.
            isAskAiLogoOnly
              ? 'flex min-h-[38px] min-w-[38px] items-center justify-center overflow-hidden rounded-lg border border-gray bg-buttonSecondary p-0.5 shadow-sm'
              : 'flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-gray bg-buttonSecondary px-3 py-2 shadow-sm',
            askAiLayout === 'ICON_TEXT' || askAiLayout === 'TEXT_ICON' ? 'gap-2' : '',
            FOCUS_VISIBLE_CLASSES,
          )}
          onClick={() => openEntryPoint('ai')}
        >
          {askAiLayout === 'TEXT_ICON' && askAiText}
          {askAiLogo}
          {(askAiLayout === 'TEXT' || askAiLayout === 'ICON_TEXT') && askAiText}
        </button>
      )}
    </div>
  );
};

export default SearchBarEntry;
