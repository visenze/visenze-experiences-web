import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, type ReactElement, useContext, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import { AUTO_FOCUS_CLASSES, FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import MicrophoneIcon from '../../../common/icons/MicrophoneIcon';
import StopIcon from '../../../common/icons/StopIcon';
import SubmitChatIcon from '../../../common/icons/SubmitChatIcon';
import { WidgetDataContext } from '../../../common/types/contexts';

interface MicEntryScreenProps {
  chat: UseChatResult;
}

// Fallback when `customizations.launcher.voiceRecordingMaxDurationSeconds` is unset.
const DEFAULT_VOICE_RECORDING_MAX_DURATION_SECONDS = 5;

// Fallback when `customizations.chatbot.inputBar.voiceRecordingColor(Dark)` is unset — mirrors
// ChatComposer.tsx's own default for the same recording-state icon color.
const DEFAULT_VOICE_RECORDING_COLOR = '#EF4444';

// Full-screen welcome state for the microphone entry point (spec §5.2).
//
// Recording is user-triggered only: the screen shows a neutral, static mic icon (any greeting for
// this entry point plays via a sibling effect in `ai-search-launcher.tsx`, see B6a) and recording
// starts only once the user clicks/taps the mic themselves — matching the wake-on-press pattern of
// Siri/Google Assistant rather than auto-starting on the user's behalf. `useVoice`'s
// `startRecording()` calls `stopAudio()` internally as its first step, so a click while a greeting
// is still playing/queued cuts it off immediately, which is expected here.
const MicEntryScreen: FC<MicEntryScreenProps> = ({ chat }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const iconColor = darkMode
    ? (customizations.generalLayout?.fontColorDark || '')
    : (customizations.generalLayout?.fontColor || '');
  const border = customizations.generalLayout?.border;
  const borderColor = darkMode ? border?.colorDark : border?.color;
  const voiceRecordingColor = (darkMode
    ? customizations.chatbot?.inputBar?.voiceRecordingColorDark
    : customizations.chatbot?.inputBar?.voiceRecordingColor) || DEFAULT_VOICE_RECORDING_COLOR;
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Deferred so it wins the race against FullScreenChatContainer's own mount-focus effect.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      micButtonRef.current?.focus();
      fallbackTextareaRef.current?.focus();
    }, 0);
    return (): void => window.clearTimeout(timeoutId);
  }, []);

  // Mirrors the `sendMessageRef` pattern already used in use-chat.ts: keeps a live view of `chat`
  // for the auto-stop timeout below, without re-running that effect (and restarting the timer)
  // just because `chat`'s functions are recreated each render (they aren't memoized upstream).
  const chatRef = useRef(chat);
  useEffect(() => {
    chatRef.current = chat;
  });

  // The configured greeting (played into `chat.chats` as a bot bubble by the parent's greeting
  // effect, which fires from the same commit that renders this screen) is the single source of
  // truth for this screen's welcome copy — shown as an extra caption above the mic controls. No
  // fallback default text is needed here (unlike ImageEntryScreen's `imageEntryPrompt`): the
  // status text below (`a11yTapToRecord`/`a11yListening`/etc.) already covers the no-greeting case.
  const greetingMessage = chat.chats.find((c) => c.author === 'bot')?.messages[0];

  // Auto-stop (F1): the full-screen recording state isn't press-and-hold like the chat footer's
  // mic button, so without a cap the user could leave it recording indefinitely. Configurable via
  // `customizations.launcher.voiceRecordingMaxDurationSeconds` (default 5s).
  useEffect(() => {
    if (chat.voiceStatus !== 'recording') {
      return undefined;
    }
    const maxDurationSeconds = customizations.launcher?.voiceRecordingMaxDurationSeconds
      ?? DEFAULT_VOICE_RECORDING_MAX_DURATION_SECONDS;
    const timeoutId = window.setTimeout(() => {
      chatRef.current.stopRecording();
    }, maxDurationSeconds * 1000);
    return (): void => window.clearTimeout(timeoutId);
  }, [chat.voiceStatus, customizations.launcher?.voiceRecordingMaxDurationSeconds]);

  const renderMicIcon = (): ReactElement => {
    if (chat.voiceStatus === 'transcribing') {
      return <MicrophoneIcon className='size-16 opacity-60' color={iconColor} />;
    }
    if (chat.voiceStatus === 'recording') {
      return <StopIcon className='size-16 animate-pulse' color={voiceRecordingColor} />;
    }
    return <MicrophoneIcon className='size-16' color={iconColor} />;
  };

  // 'idle' and 'transcribing' used to share the aria-label 'a11yTapToRecord', which is
  // inaccurate for the disabled transcribing state (nothing is "tap"-able then) — mirrors the
  // 3-way distinction ChatComposer.tsx's own mic button makes.
  const getMicButtonLabelId = (): 'a11yStopVoiceInput' | 'a11yTranscribingVoice' | 'a11yTapToRecord' => {
    if (chat.voiceStatus === 'recording') {
      return 'a11yStopVoiceInput';
    }
    if (chat.voiceStatus === 'transcribing') {
      return 'a11yTranscribingVoice';
    }
    return 'a11yTapToRecord';
  };
  const micButtonLabelId = getMicButtonLabelId();

  const handleMicClick = (): void => {
    if (chat.voiceStatus === 'recording') {
      chat.stopRecording();
      return;
    }
    // A click always starts recording right away — including while a greeting is still playing
    // (startVoiceRecording() cuts it off) — and also covers the retry affordance after an
    // error/idle state.
    if (chat.voiceStatus === 'idle') {
      chat.startVoiceRecording();
    }
  };

  if (!chat.voiceEnabled) {
    const handleSend = (): void => {
      if (!chat.allowUserInput) {
        return;
      }
      chat.sendMessage(chat.message);
    };
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-6'>
        {greetingMessage && (
          <p role='status' aria-live='polite' className='m-0 max-w-xs text-center text-base' style={{ color: iconColor }}>
            {greetingMessage}
          </p>
        )}
        <p className='m-0 max-w-xs text-center text-base' style={{ color: iconColor }}>
          {intl.formatMessage({ id: 'voiceInputError' })}
        </p>
        <div className='flex w-full max-w-sm flex-col gap-2'>
          <Textarea
            ref={fallbackTextareaRef}
            aria-label={intl.formatMessage({ id: 'a11yChatInput' })}
            value={chat.message}
            placeholder={intl.formatMessage({ id: 'chatBoxPlaceholder' })}
            minRows={1}
            onChange={(e) => chat.setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.code === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            endContent={
              <button
                type='button'
                aria-label={intl.formatMessage({ id: 'a11ySendMessage' })}
                title={intl.formatMessage({ id: 'a11ySendMessage' })}
                disabled={!chat.allowUserInput}
                className={cn('p-0 bg-transparent border-0 disabled:opacity-50', FOCUS_VISIBLE_CLASSES)}
                onClick={handleSend}
              >
                <SubmitChatIcon className='size-6' color={iconColor} />
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-4 p-6'>
      {greetingMessage && (
        <p role='status' aria-live='polite' className='m-0 max-w-sm text-center text-base' style={{ color: iconColor }}>
          {greetingMessage}
        </p>
      )}
      <button
        ref={micButtonRef}
        type='button'
        aria-label={intl.formatMessage({ id: micButtonLabelId })}
        aria-pressed={chat.voiceStatus === 'recording'}
        disabled={chat.voiceStatus === 'transcribing'}
        className={cn('rounded-full border border-gray-200 bg-transparent p-6 disabled:opacity-50 dark:border-neutral-700', AUTO_FOCUS_CLASSES)}
        style={{ borderColor: borderColor || undefined, borderWidth: border?.width ? `${border.width}px` : undefined }}
        onClick={handleMicClick}
      >
        {renderMicIcon()}
      </button>
      <p role='status' aria-live='polite' className='m-0 min-h-6 max-w-sm text-center text-sm' style={{ color: iconColor }}>
        {chat.voiceStatus === 'transcribing' && intl.formatMessage({ id: 'a11yTranscribingVoice' })}
        {chat.voiceStatus === 'recording' && (chat.liveTranscript || intl.formatMessage({ id: 'a11yListening' }))}
        {chat.voiceStatus === 'idle' && intl.formatMessage({ id: 'a11yTapToRecord' })}
      </p>
      {chat.hasVoiceError && (
        <p role='alert' className='m-0 text-center text-sm text-red-600 dark:text-red-400'>
          {intl.formatMessage({ id: 'voiceInputError' })}
        </p>
      )}
    </div>
  );
};

export default MicEntryScreen;
