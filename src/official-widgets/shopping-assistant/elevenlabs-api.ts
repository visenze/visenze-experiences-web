export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const OUTPUT_FORMAT = 'mp3_44100_128';

// Calls the Product Search voice proxy (see shopping-assistant-voice-proxy-api.md) instead of
// ElevenLabs directly, so no ElevenLabs key is ever present in browser code.
export const synthesizeSpeech = async (
  baseUrl: string,
  appKey: string,
  placementId: string | number,
  text: string,
  voiceId: string,
): Promise<Blob> => {
  const params = new URLSearchParams({
    app_key: appKey,
    placement_id: String(placementId),
    output_format: OUTPUT_FORMAT,
  });

  const response = await fetch(`${baseUrl}/v1/voice/synthesize/${encodeURIComponent(voiceId)}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

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
