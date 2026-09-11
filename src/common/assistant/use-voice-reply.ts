import { useEffect, useRef, useState } from 'react';
import useVoice, { type VoiceStatus } from './use-voice';

export interface UseVoiceReplyOptions {
  enabled?: boolean;
  appKey: string;
  placementId: string | number;
  baseUrl: string;
  voiceId?: string;
  voiceModelId?: string;
  voiceStability?: number;
  voiceSimilarityBoost?: number;
  onTranscript: (text: string) => void;
  setIsWaiting: (waiting: boolean) => void;
}

export interface UseVoiceReplyResult {
  voiceEnabled: boolean;
  speechOutputEnabled: boolean;
  voiceStatus: VoiceStatus;
  liveTranscript: string;
  hasVoiceError: boolean;
  hasSpeechOutputError: boolean;
  isVoiceReadingEnabled: boolean;
  typewriterText: string;
  isSpeechPlaying: boolean;
  focusedProductId: string | null;
  startVoiceRecording: () => void;
  stopRecording: () => void;
  stopAudio: () => void;
  toggleVoiceReading: () => void;
  interruptSpeech: () => void;
  shouldSpeakReply: () => boolean;
  isVoiceReadingEnabledNow: () => boolean;
  beginReply: () => boolean;
  updateLatestMessage: (text: string) => void;
  speak: (text: string, revealTarget: number, productId: string | null) => boolean;
  hasPendingSpeech: () => boolean;
  deferCommit: (commit: () => void) => void;
  forceRevealTypewriter: (text: string) => void;
  getTypewriterLength: () => number;
  resetReplyState: () => void;
}

// Orchestrates a shopping-assistant reply that may be spoken aloud: it owns the typed/voice
// reply state machine (typewriter reveal, speech playback, deferred chat-commit) on top of the
// low-level recording/synthesis primitives from useVoice.
const useVoiceReply = ({
  enabled,
  appKey,
  placementId,
  baseUrl,
  voiceId,
  voiceModelId,
  voiceStability,
  voiceSimilarityBoost,
  onTranscript,
  setIsWaiting,
}: UseVoiceReplyOptions): UseVoiceReplyResult => {
  const [isVoiceReply, setIsVoiceReply] = useState(false);
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);
  const [isVoiceReadingEnabled, setIsVoiceReadingEnabled] = useState(true);
  const [voiceRevealTarget, setVoiceRevealTarget] = useState(0);
  const [voiceRevealDelayMs, setVoiceRevealDelayMs] = useState(30);
  const [typewriterText, setTypewriterText] = useState('');
  const [latestMessage, setLatestMessage] = useState('');
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);

  const latestMessageRef = useRef('');
  const typewriterTextRef = useRef('');
  const pendingResponseCommitRef = useRef<(() => void) | null>(null);
  const voiceReadingEnabledRef = useRef(true);

  useEffect(() => {
    latestMessageRef.current = latestMessage;
  }, [latestMessage]);

  useEffect(() => {
    typewriterTextRef.current = typewriterText;
  }, [typewriterText]);

  // Typed replies reveal as soon as tokens arrive. Voice replies reveal only while their
  // corresponding audio item is actually playing, and never beyond that item's text boundary.
  // Keeping one monotonically-growing cursor avoids restarting from the beginning whenever a
  // new SSE token extends latestMessage.
  useEffect((): (() => void) | undefined => {
    if (!isVoiceReply) {
      if (typewriterTextRef.current !== latestMessage) {
        typewriterTextRef.current = latestMessage;
        setTypewriterText(latestMessage);
      }
      return undefined;
    }
    if (!isSpeechPlaying) {
      return undefined;
    }
    const revealTarget = Math.min(voiceRevealTarget, latestMessage.length);
    if (typewriterTextRef.current.length >= revealTarget) {
      return undefined;
    }
    const interval = setInterval((): void => {
      const currentLength = typewriterTextRef.current.length;
      if (currentLength >= revealTarget) {
        clearInterval(interval);
        return;
      }
      const next = latestMessage.slice(0, currentLength + 1);
      typewriterTextRef.current = next;
      setTypewriterText(next);
      if (next.length >= revealTarget) {
        clearInterval(interval);
      }
    }, voiceRevealDelayMs);
    return (): void => clearInterval(interval);
  }, [isSpeechPlaying, isVoiceReply, latestMessage, voiceRevealDelayMs, voiceRevealTarget]);

  // A typed reply's chat-commit is deferred (see finalize logic in the caller) whenever the
  // stream closes before the typewriter has caught up to the final text. Fire it the moment
  // the reveal catches up.
  useEffect(() => {
    if (!isVoiceReply && latestMessage && typewriterText.length >= latestMessage.length) {
      const pendingCommit = pendingResponseCommitRef.current;
      if (pendingCommit) {
        pendingResponseCommitRef.current = null;
        pendingCommit();
      }
    }
  }, [isVoiceReply, latestMessage, typewriterText]);

  const {
    voiceEnabled,
    speechOutputEnabled,
    status: voiceStatus,
    liveTranscript,
    hasError: hasVoiceError,
    hasSpeechOutputError,
    startRecording,
    stopRecording,
    speak,
    hasPendingSpeech,
    stopAudio,
  } = useVoice({
    enabled,
    appKey,
    placementId,
    baseUrl,
    voiceId,
    voiceModelId,
    voiceStability,
    voiceSimilarityBoost,
    onTranscript,
    onSpeechStart: (revealTarget, productId, durationMs): void => {
      const remainingCharacters = Math.max(1, revealTarget - typewriterTextRef.current.length);
      const delay = durationMs
        ? Math.max(15, Math.min(80, durationMs / remainingCharacters))
        : 30;
      setVoiceRevealDelayMs(delay);
      setVoiceRevealTarget(revealTarget);
      setIsWaiting(false);
      setIsSpeechPlaying(true);
      setFocusedProductId(productId);
    },
    onSpeechEnd: (revealTarget): void => {
      const revealed = latestMessageRef.current.slice(0, revealTarget);
      typewriterTextRef.current = revealed;
      setTypewriterText(revealed);
      setIsSpeechPlaying(false);
    },
    onSpeechQueueEnd: (): void => {
      setIsSpeechPlaying(false);
      setIsWaiting(false);
      setFocusedProductId(null);
      const pendingCommit = pendingResponseCommitRef.current;
      if (pendingCommit) {
        pendingResponseCommitRef.current = null;
        pendingCommit();
      }
    },
  });

  // Stops whatever is currently playing/queued and flushes (executes) any deferred commit,
  // rather than discarding it — used whenever the user interrupts an in-progress reply.
  const interruptSpeech = (): void => {
    const pendingCommit = pendingResponseCommitRef.current;
    pendingResponseCommitRef.current = null;
    stopAudio();
    setFocusedProductId(null);
    pendingCommit?.();
  };

  const startVoiceRecording = (): void => {
    interruptSpeech();
    startRecording();
  };

  // Same "off" path as the user manually toggling voice reading off — also used below to react
  // to a voice-output failure, since a failing narration API shouldn't keep being retried.
  const disableVoiceReading = (): void => {
    voiceReadingEnabledRef.current = false;
    setIsVoiceReadingEnabled(false);
    interruptSpeech();
    setIsSpeechPlaying(false);
    setIsVoiceReply(false);
    // `setIsWaiting` also drives the chat's "assistant is thinking" indicator (see use-chat.ts),
    // which must stay up while a request is in flight with nothing to show yet. Only clear it
    // here if there's already streamed content to reveal in its place — switching `isVoiceReply`
    // off above will surface it immediately. Otherwise leave it be: the request is still pending,
    // and use-chat.ts's own per-token check clears it once the first token arrives.
    if (latestMessageRef.current) {
      setIsWaiting(false);
    }
  };

  const toggleVoiceReading = (): void => {
    if (voiceReadingEnabledRef.current) {
      disableVoiceReading();
      return;
    }
    voiceReadingEnabledRef.current = true;
    setIsVoiceReadingEnabled(true);
  };

  // A voice-output failure means the narration API itself is unavailable — keep trying would
  // just fail again on the next reply, so switch back to typed replies until the user manually
  // re-enables voice reading.
  useEffect(() => {
    if (hasSpeechOutputError) {
      disableVoiceReading();
    }
  }, [hasSpeechOutputError]);

  const shouldSpeakReply = (): boolean => speechOutputEnabled && voiceReadingEnabledRef.current;
  const isVoiceReadingEnabledNow = (): boolean => voiceReadingEnabledRef.current;

  const beginReply = (): boolean => {
    const shouldSpeak = shouldSpeakReply();
    pendingResponseCommitRef.current = null;
    latestMessageRef.current = '';
    typewriterTextRef.current = '';
    setIsVoiceReply(shouldSpeak);
    setIsSpeechPlaying(false);
    setVoiceRevealTarget(0);
    setTypewriterText('');
    setFocusedProductId(null);
    return shouldSpeak;
  };

  const updateLatestMessage = (text: string): void => {
    latestMessageRef.current = text;
    setLatestMessage(text);
  };

  const forceRevealTypewriter = (text: string): void => {
    typewriterTextRef.current = text;
    setTypewriterText(text);
  };

  const getTypewriterLength = (): number => typewriterTextRef.current.length;

  const deferCommit = (commit: () => void): void => {
    pendingResponseCommitRef.current = commit;
  };

  const resetReplyState = (): void => {
    pendingResponseCommitRef.current = null;
    latestMessageRef.current = '';
    typewriterTextRef.current = '';
    setLatestMessage('');
    setTypewriterText('');
    setIsSpeechPlaying(false);
    setIsVoiceReply(false);
    setVoiceRevealTarget(0);
    setFocusedProductId(null);
  };

  return {
    voiceEnabled,
    speechOutputEnabled,
    voiceStatus,
    liveTranscript,
    hasVoiceError,
    hasSpeechOutputError,
    isVoiceReadingEnabled,
    typewriterText,
    isSpeechPlaying,
    focusedProductId,
    startVoiceRecording,
    stopRecording,
    stopAudio,
    toggleVoiceReading,
    interruptSpeech,
    shouldSpeakReply,
    isVoiceReadingEnabledNow,
    beginReply,
    updateLatestMessage,
    speak,
    hasPendingSpeech,
    deferCommit,
    forceRevealTypewriter,
    getTypewriterLength,
    resetReplyState,
  };
};

export default useVoiceReply;
