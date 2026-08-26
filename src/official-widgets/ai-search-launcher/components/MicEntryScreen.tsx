import { Textarea } from '@heroui/input';
import { cn } from '@heroui/theme';
import { type FC, type ReactElement, useContext, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import MicrophoneIcon from '../../../common/icons/MicrophoneIcon';
import StopIcon from '../../../common/icons/StopIcon';
import SubmitChatIcon from '../../../common/icons/SubmitChatIcon';
import { WidgetDataContext } from '../../../common/types/contexts';

interface MicEntryScreenProps {
  chat: UseChatResult;
}

// How often the auto-start gate below polls for any greeting to have finished playing.
const GREETING_GATE_POLL_MS = 120;

// Fallback when `customizations.launcher.voiceRecordingMaxDurationSeconds` is unset.
const DEFAULT_VOICE_RECORDING_MAX_DURATION_SECONDS = 5;

// Fallback when `customizations.chat.inputBar.voiceRecordingColor(Dark)` is unset — mirrors
// ChatComposer.tsx's own default for the same recording-state icon color.
const DEFAULT_VOICE_RECORDING_COLOR = '#EF4444';

// Full-screen welcome state for the microphone entry point (spec §5.2).
//
// Recording auto-starts once any greeting for this entry point (played by a sibling effect in
// `ai-search-launcher.tsx`, see B6a) has fully finished — this is an ENGINEERING DEFAULT carried
// forward from the plan, not a confirmed product decision (see this task's report): `useVoice`'s
// `startRecording()` calls `stopAudio()` internally as its first step, so starting to record while
// a greeting is still playing/queued would silently cut the greeting off mid-word. Until that gate
// clears, this screen shows a neutral, static mic icon rather than the recording state — unless
// the user clicks the mic themselves, which starts recording immediately regardless of the gate.
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
    ? customizations.chat?.inputBar?.voiceRecordingColorDark
    : customizations.chat?.inputBar?.voiceRecordingColor) || DEFAULT_VOICE_RECORDING_COLOR;

  // Mirrors the `sendMessageRef` pattern already used in use-chat.ts: keeps a live view
  // of `chat` for the polling interval below, without needing to tear down/recreate that interval
  // on every render (most of `chat`'s functions are recreated each render since they aren't
  // memoized upstream, and re-running the effect on every render would restart the poll from
  // scratch each time).
  const chatRef = useRef(chat);
  useEffect(() => {
    chatRef.current = chat;
  });

  const hasAutoStartedRef = useRef(false);

  // The configured greeting (played into `chat.chats` as a bot bubble by the parent's greeting
  // effect, which fires from the same commit that renders this screen) is the single source of
  // truth for this screen's welcome copy — shown as an extra caption above the mic controls. No
  // fallback default text is needed here (unlike ImageEntryScreen's `imageEntryPrompt`): the
  // status text below (`a11yVoicePending`/`a11yListening`/etc.) already covers the no-greeting case.
  const greetingMessage = chat.chats.find((c) => c.author === 'bot')?.messages[0];

  useEffect(() => {
    if (!chat.voiceEnabled) {
      return undefined;
    }
    // Deliberately does NOT check isSpeechPlaying/hasPendingSpeech synchronously on mount: the
    // greeting (if any) is triggered by a sibling effect in ai-search-launcher.tsx that may not
    // have run yet within this same commit (effect order between sibling/parent effects isn't
    // something to build a race on). Only checking on the interval's later ticks — each a fresh
    // macrotask — guarantees that sibling effect has already had its chance to fire and enqueue
    // the greeting's speech before the very first check here.
    const interval = setInterval((): void => {
      if (hasAutoStartedRef.current) {
        clearInterval(interval);
        return;
      }
      const { current } = chatRef;
      if (current.isSpeechPlaying || current.hasPendingSpeech()) {
        return;
      }
      hasAutoStartedRef.current = true;
      clearInterval(interval);
      current.startVoiceRecording();
    }, GREETING_GATE_POLL_MS);
    return (): void => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.voiceEnabled]);

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

  const handleMicClick = (): void => {
    if (chat.voiceStatus === 'recording') {
      chat.stopRecording();
      return;
    }
    // A manual click always starts recording right away — including while a greeting is still
    // playing (startVoiceRecording() cuts it off) or before the auto-start poll above has fired —
    // and also covers the retry affordance after an error/idle state. Marking the gate as already
    // fired stops the poll from starting a second, redundant recording later.
    if (chat.voiceStatus === 'idle') {
      hasAutoStartedRef.current = true;
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
          <p className='m-0 max-w-xs text-center text-base' style={{ color: iconColor }}>
            {greetingMessage}
          </p>
        )}
        <p className='m-0 max-w-xs text-center text-base' style={{ color: iconColor }}>
          {intl.formatMessage({ id: 'voiceInputError' })}
        </p>
        <div className='flex w-full max-w-sm flex-col gap-2'>
          <Textarea
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
        <p className='m-0 max-w-sm text-center text-base' style={{ color: iconColor }}>
          {greetingMessage}
        </p>
      )}
      <button
        type='button'
        aria-label={intl.formatMessage({ id: chat.voiceStatus === 'recording' ? 'a11yStopVoiceInput' : 'a11yVoicePending' })}
        aria-pressed={chat.voiceStatus === 'recording'}
        disabled={chat.voiceStatus === 'transcribing'}
        className={cn('rounded-full border border-gray-200 bg-transparent p-6 disabled:opacity-50 dark:border-neutral-700', FOCUS_VISIBLE_CLASSES)}
        style={{ borderColor: borderColor || undefined, borderWidth: border?.width ? `${border.width}px` : undefined }}
        onClick={handleMicClick}
      >
        {renderMicIcon()}
      </button>
      <p role='status' aria-live='polite' className='m-0 min-h-6 max-w-sm text-center text-sm' style={{ color: iconColor }}>
        {chat.voiceStatus === 'transcribing' && intl.formatMessage({ id: 'a11yTranscribingVoice' })}
        {chat.voiceStatus === 'recording' && (chat.liveTranscript || intl.formatMessage({ id: 'a11yListening' }))}
        {chat.voiceStatus === 'idle' && intl.formatMessage({ id: 'a11yVoicePending' })}
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
