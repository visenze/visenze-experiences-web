export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

export const synthesizeSpeech = async (apiKey: string, text: string, voiceId: string): Promise<Blob> => {
  const response = await fetch(`${TTS_ENDPOINT}/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
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
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
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
