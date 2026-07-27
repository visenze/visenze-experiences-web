import { DEFAULT_VOICE_ID, sanitizeTextForSpeech, synthesizeSpeech } from './elevenlabs-api';

describe('elevenlabs-api', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  describe('synthesizeSpeech', () => {
    it('sends text to the ElevenLabs TTS endpoint with the correct URL, headers, and body', async () => {
      const mockBlob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      }) as unknown as typeof fetch;

      const result = await synthesizeSpeech('test-key', 'Hello there', 'voice-123');

      expect(result).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/voice-123?output_format=mp3_44100_128',
        {
          method: 'POST',
          headers: { 'xi-api-key': 'test-key', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Hello there',
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      );
    });

    it('throws when the response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
      await expect(synthesizeSpeech('key', 'text', DEFAULT_VOICE_ID)).rejects.toThrow('ElevenLabs TTS failed: 500');
    });
  });

  describe('sanitizeTextForSpeech', () => {
    it('strips bold markdown markers', () => {
      expect(sanitizeTextForSpeech('This is **bold** text')).toBe('This is bold text');
    });

    it('strips leading list markers from each line but leaves plain leading numbers alone', () => {
      expect(sanitizeTextForSpeech('- first item\n1. second item\n2 not a list')).toBe('first item second item 2 not a list');
    });

    it('collapses newlines and repeated whitespace into single spaces', () => {
      expect(sanitizeTextForSpeech('line one\n\nline   two')).toBe('line one line two');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeTextForSpeech('  hello  ')).toBe('hello');
    });
  });
});
