import { useEffect, useRef, useState } from 'react';
import { DEFAULT_VOICE_ID, sanitizeTextForSpeech, synthesizeSpeech } from './voice-api';

export type VoiceStatus = 'idle' | 'recording' | 'transcribing';

export interface UseVoiceOptions {
  enabled?: boolean;
  appKey: string;
  placementId: string | number;
  baseUrl: string;
  voiceId?: string;
  voiceModelId?: string;
  voiceStability?: number;
  voiceSimilarityBoost?: number;
  onTranscript: (text: string) => void;
  onSpeechStart?: (revealTarget: number, productId: string | null, durationMs?: number) => void;
  onSpeechEnd?: (revealTarget: number, productId: string | null) => void;
  onSpeechQueueEnd?: () => void;
}

export interface UseVoiceResult {
  voiceEnabled: boolean;
  speechOutputEnabled: boolean;
  status: VoiceStatus;
  liveTranscript: string;
  hasError: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  speak: (text: string, revealTarget: number, productId: string | null) => boolean;
  hasPendingSpeech: () => boolean;
  stopAudio: () => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionWindow {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

interface QueuedSpeech {
  promise: Promise<Blob>;
  session: number;
  revealTarget: number;
  productId: string | null;
  text: string;
}

// Waited before actually stopping recognition on release, so trailing words aren't clipped.
const STOP_GRACE_MS = 300;
// Waited after stop() before reading the final transcript, so the last onresult can land.
const FINALIZE_GRACE_MS = 300;
// Small pause between queued speech segments, so back-to-back sentences don't run together.
const SPEECH_GAP_MS = 200;

const getSpeechRecognitionCtor = (): (new () => SpeechRecognitionLike) | undefined => {
  const w = window as unknown as SpeechRecognitionWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
};

const isVoiceSupported = (): boolean => !!getSpeechRecognitionCtor();

// Used as a last resort when the voice proxy call fails (offline, quota, outage, etc.)
// so a reply is still narrated, just with the browser's own voice instead of the cloned one.
const isBrowserSpeechSynthesisSupported = (): boolean => typeof window !== 'undefined'
  && !!window.speechSynthesis
  && typeof SpeechSynthesisUtterance !== 'undefined';

const useVoice = ({
  enabled,
  appKey,
  placementId,
  baseUrl,
  voiceId,
  voiceModelId,
  voiceStability,
  voiceSimilarityBoost,
  onTranscript,
  onSpeechStart,
  onSpeechEnd,
  onSpeechQueueEnd,
}: UseVoiceOptions): UseVoiceResult => {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasError, setHasError] = useState(false);

  const statusRef = useRef<VoiceStatus>('idle');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechQueueRef = useRef<QueuedSpeech[]>([]);
  const pendingSynthesisRef = useRef<Set<AbortController>>(new Set());
  const isPlayingRef = useRef(false);
  const playSessionRef = useRef(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const onSpeechQueueEndRef = useRef(onSpeechQueueEnd);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
    onSpeechQueueEndRef.current = onSpeechQueueEnd;
  }, [onSpeechEnd, onSpeechQueueEnd, onSpeechStart, onTranscript]);

  const voiceEnabled = !!enabled && isVoiceSupported();
  const speechOutputEnabled = !!enabled;

  const updateStatus = (next: VoiceStatus): void => {
    statusRef.current = next;
    setStatus(next);
  };

  const stopAudio = (): void => {
    playSessionRef.current += 1;
    speechQueueRef.current = [];
    isPlayingRef.current = false;
    pendingSynthesisRef.current.forEach((controller) => controller.abort());
    pendingSynthesisRef.current.clear();
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (utteranceRef.current) {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    }
  };

  const clearTimers = (): void => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  };

  const abortRecognition = (): void => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  };

  const finishRecording = (): void => {
    clearTimers();
    const text = finalTranscriptRef.current;
    abortRecognition();
    updateStatus('idle');
    setLiveTranscript('');
    if (text) {
      onTranscriptRef.current(text);
    }
  };

  const stopRecording = (): void => {
    if (statusRef.current !== 'recording') {
      return;
    }
    updateStatus('transcribing');
    stopTimerRef.current = setTimeout((): void => {
      recognitionRef.current?.stop();
      finalizeTimerRef.current = setTimeout(finishRecording, FINALIZE_GRACE_MS);
    }, STOP_GRACE_MS);
  };

  const startRecording = (): void => {
    if (!enabled || statusRef.current !== 'idle') {
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      return;
    }
    stopAudio();
    clearTimers();
    setHasError(false);
    setLiveTranscript('');
    finalTranscriptRef.current = '';

    const recognition = new Ctor();
    recognition.continuous = !/Android/i.test(navigator.userAgent);
    recognition.interimResults = true;
    recognition.onresult = (event: SpeechRecognitionEventLike): void => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      finalTranscriptRef.current = finalText.trim();
      setLiveTranscript((finalText + interimText).trim());
    };
    recognition.onerror = (event: SpeechRecognitionErrorEventLike): void => {
      console.error(event.error);
      clearTimers();
      abortRecognition();
      setHasError(true);
      updateStatus('idle');
      setLiveTranscript('');
    };
    recognition.onend = (): void => {
      // The recognizer is inactive the moment this fires — null it out without calling
      // abort()/stop() on it, and finalize directly instead of routing through
      // stopRecording(), which would try to stop() an instance that already stopped.
      recognitionRef.current = null;
      if (statusRef.current === 'recording') {
        updateStatus('transcribing');
        finalizeTimerRef.current = setTimeout(finishRecording, FINALIZE_GRACE_MS);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      updateStatus('recording');
    } catch (err) {
      console.error(err);
      setHasError(true);
    }
  };

  // Plays queued segments one at a time, in the order they completed, so a sentence that
  // finishes streaming in while an earlier one is still playing doesn't cut it off or
  // overlap it. Synthesis itself (see `speak`) starts eagerly and in parallel — only
  // playback is serialized — so the next segment is usually already synthesized and ready
  // the moment the current one ends.
  const playNext = (): void => {
    if (isPlayingRef.current) {
      return;
    }
    const item = speechQueueRef.current.shift();
    if (!item) {
      onSpeechQueueEndRef.current?.();
      return;
    }
    isPlayingRef.current = true;
    item.promise
      .then((blob) => {
        // A session bump (stopAudio) always sets isPlayingRef itself, and may already have
        // let a newer session start playing — a stale continuation must never touch it.
        if (item.session !== playSessionRef.current) {
          return;
        }
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        const advance = (): void => {
          URL.revokeObjectURL(url);
          if (audioUrlRef.current === url) {
            audioUrlRef.current = null;
          }
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          if (item.session !== playSessionRef.current) {
            return;
          }
          isPlayingRef.current = false;
          onSpeechEndRef.current?.(item.revealTarget, item.productId);
          gapTimerRef.current = setTimeout((): void => {
            gapTimerRef.current = null;
            playNext();
          }, SPEECH_GAP_MS);
        };
        audio.onended = advance;
        audio.onerror = advance;
        audio.play()
          .then((): void => {
            if (item.session !== playSessionRef.current) {
              return;
            }
            const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
              ? audio.duration * 1000
              : undefined;
            onSpeechStartRef.current?.(item.revealTarget, item.productId, durationMs);
          })
          .catch((err) => {
            console.error(err);
            advance();
          });
      })
      .catch((err) => {
        if (item.session !== playSessionRef.current) {
          return;
        }
        console.error(err);
        if (!isBrowserSpeechSynthesisSupported()) {
          isPlayingRef.current = false;
          onSpeechEndRef.current?.(item.revealTarget, item.productId);
          playNext();
          return;
        }
        // The voice API call itself failed (network, quota, outage) — fall back to the
        // browser's own speech synthesis so the reply is still narrated, just without the
        // cloned voice.
        const utterance = new SpeechSynthesisUtterance(item.text);
        utteranceRef.current = utterance;
        const advance = (): void => {
          if (utteranceRef.current === utterance) {
            utteranceRef.current = null;
          }
          if (item.session !== playSessionRef.current) {
            return;
          }
          isPlayingRef.current = false;
          onSpeechEndRef.current?.(item.revealTarget, item.productId);
          gapTimerRef.current = setTimeout((): void => {
            gapTimerRef.current = null;
            playNext();
          }, SPEECH_GAP_MS);
        };
        utterance.onstart = (): void => {
          if (item.session === playSessionRef.current) {
            onSpeechStartRef.current?.(item.revealTarget, item.productId);
          }
        };
        utterance.onend = advance;
        utterance.onerror = advance;
        window.speechSynthesis.speak(utterance);
      });
  };

  const speak = (text: string, revealTarget: number, productId: string | null): boolean => {
    if (!enabled) {
      return false;
    }
    const sanitized = sanitizeTextForSpeech(text);
    if (!sanitized) {
      return false;
    }
    const session = playSessionRef.current;
    const controller = new AbortController();
    pendingSynthesisRef.current.add(controller);
    const promise = synthesizeSpeech(
      baseUrl,
      appKey,
      placementId,
      sanitized,
      voiceId || DEFAULT_VOICE_ID,
      { voiceModelId, stability: voiceStability, similarityBoost: voiceSimilarityBoost },
      controller.signal,
    );
    promise
      .catch(() => {})
      .finally(() => {
        pendingSynthesisRef.current.delete(controller);
      });
    speechQueueRef.current.push({ promise, session, revealTarget, productId, text: sanitized });
    playNext();
    return true;
  };

  const hasPendingSpeech = (): boolean => isPlayingRef.current
    || speechQueueRef.current.length > 0
    || !!gapTimerRef.current;

  useEffect((): void => {
    // A live config update can turn voice off mid-session — tear down whatever's active
    // (recognizer, queued/playing audio, in-flight synthesis) rather than just hiding the UI.
    if (enabled) {
      return;
    }
    clearTimers();
    abortRecognition();
    stopAudio();
    setHasError(false);
    setLiveTranscript('');
    updateStatus('idle');
  }, [enabled]);

  useEffect((): (() => void) => (): void => {
    clearTimers();
    abortRecognition();
    stopAudio();
  }, []);

  return {
    voiceEnabled,
    speechOutputEnabled,
    status,
    liveTranscript,
    hasError,
    startRecording,
    stopRecording,
    speak,
    hasPendingSpeech,
    stopAudio,
  };
};

export default useVoice;
