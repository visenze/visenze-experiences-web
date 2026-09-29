export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';
export const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';
export const DEFAULT_VOICE_STABILITY = 0.5;
export const DEFAULT_VOICE_SIMILARITY_BOOST = 0.75;

const OUTPUT_FORMAT = 'mp3_44100_128';

const RATE_LIMIT_STATUS = 429;
// A long reply can complete many sentences in the same streamed burst (see use-voice.ts's
// per-sentence synthesis), which is enough to trip the voice provider's rate limit even with
// concurrency capped. Retrying a 429 a couple of times, honoring its Retry-After when given,
// resolves the transient overload instead of silently dropping that sentence's narration.
const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RATE_LIMIT_RETRY_DELAY_MS = 1000;

export interface VoiceSynthesisOptions {
  voiceModelId?: string;
  stability?: number;
  similarityBoost?: number;
}

const wait = (ms: number, signal?: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Aborted', 'AbortError'));
    return;
  }
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', (): void => {
    clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  }, { once: true });
});

const getRetryAfterMs = (response: Response): number | null => {
  const header = response.headers.get('Retry-After');
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : null;
};

// Calls the Product Search voice proxy (see shopping-assistant-voice-proxy.md) instead of the
// voice provider directly, so no voice provider key is ever present in browser code.
export const synthesizeSpeech = async (
  baseUrl: string,
  appKey: string,
  placementId: string | number,
  text: string,
  voiceId: string,
  options?: VoiceSynthesisOptions,
  signal?: AbortSignal,
): Promise<Blob> => {
  const params = new URLSearchParams({
    app_key: appKey,
    placement_id: String(placementId),
    output_format: OUTPUT_FORMAT,
  });

  const url = `${baseUrl}/v1/voice/synthesize/${encodeURIComponent(voiceId)}?${params.toString()}`;
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: options?.voiceModelId || DEFAULT_MODEL_ID,
      voice_settings: {
        stability: options?.stability ?? DEFAULT_VOICE_STABILITY,
        similarity_boost: options?.similarityBoost ?? DEFAULT_VOICE_SIMILARITY_BOOST,
      },
    }),
    signal,
  };

  let response = await fetch(url, requestInit);
  let attempt = 0;
  while (!response.ok && response.status === RATE_LIMIT_STATUS && attempt < MAX_RATE_LIMIT_RETRIES) {
    const delayMs = getRetryAfterMs(response) ?? DEFAULT_RATE_LIMIT_RETRY_DELAY_MS * 2 ** attempt;
    await wait(delayMs, signal);
    attempt += 1;
    response = await fetch(url, requestInit);
  }

  if (!response.ok) {
    let message = `Voice synthesis failed with HTTP ${response.status}`;
    try {
      const error = await response.json();
      message = error.error?.message || message;
    } catch {
      // Response body wasn't JSON (e.g. a plain proxy/gateway error page) — keep the generic message.
    }
    throw new Error(message);
  }

  return response.blob();
};

export const sanitizeTextForSpeech = (text: string): string => text
    .replaceAll(/\*\*/g, '')
    .split('\n')
    .map((line) => line.replace(/^(?:\d+\. |- )/, ''))
    .join(' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
