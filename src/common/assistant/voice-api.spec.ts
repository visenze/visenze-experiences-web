import { DEFAULT_VOICE_ID, sanitizeTextForSpeech, synthesizeSpeech } from './voice-api';

describe('voice-api', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  describe('synthesizeSpeech', () => {
    it('sends text to the voice proxy endpoint with the correct URL, headers, and body', async () => {
      const mockBlob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      }) as unknown as typeof fetch;

      const result = await synthesizeSpeech('https://api.example.com', 'app-key', 'placement-1', 'Hello there', 'voice-123');

      expect(result).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/voice/synthesize/voice-123?app_key=app-key&placement_id=placement-1&output_format=mp3_44100_128',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: 'Hello there',
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      );
    });

    it('forwards a custom model ID and voice settings when provided', async () => {
      const mockBlob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      }) as unknown as typeof fetch;

      await synthesizeSpeech(
        'https://api.example.com',
        'app-key',
        'placement-1',
        'Hello there',
        'voice-123',
        { voiceModelId: 'eleven_turbo_v2.5', stability: 0.2, similarityBoost: 0.9 },
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/voice/synthesize/voice-123?app_key=app-key&placement_id=placement-1&output_format=mp3_44100_128',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({
            text: 'Hello there',
            model_id: 'eleven_turbo_v2.5',
            voice_settings: { stability: 0.2, similarity_boost: 0.9 },
          }),
        },
      );
    });

    it('throws the proxy error message when the response body is JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 413,
        json: jest.fn().mockResolvedValue({ error: { code: 413, message: 'Voice synthesis text is too large.' } }),
      }) as unknown as typeof fetch;
      await expect(synthesizeSpeech('https://api.example.com', 'app-key', 'placement-1', 'text', DEFAULT_VOICE_ID))
        .rejects.toThrow('Voice synthesis text is too large.');
    });

    it('falls back to a generic message when the response body is not JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('not json')),
      }) as unknown as typeof fetch;
      await expect(synthesizeSpeech('https://api.example.com', 'app-key', 'placement-1', 'text', DEFAULT_VOICE_ID))
        .rejects.toThrow('Voice synthesis failed with HTTP 500');
    });

    it('retries after a 429 and returns the blob once the retry succeeds', async () => {
      jest.useFakeTimers();
      const mockBlob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
      const rateLimitedResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn().mockReturnValue(null) },
      };
      const okResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      };
      global.fetch = jest.fn()
        .mockResolvedValueOnce(rateLimitedResponse)
        .mockResolvedValueOnce(okResponse) as unknown as typeof fetch;

      const resultPromise = synthesizeSpeech('https://api.example.com', 'app-key', 'placement-1', 'text', DEFAULT_VOICE_ID);
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('waits for the duration given in a Retry-After header before retrying', async () => {
      jest.useFakeTimers();
      const mockBlob = new Blob(['audio-bytes'], { type: 'audio/mpeg' });
      const rateLimitedResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn().mockReturnValue('5') },
      };
      const okResponse = {
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      };
      global.fetch = jest.fn()
        .mockResolvedValueOnce(rateLimitedResponse)
        .mockResolvedValueOnce(okResponse) as unknown as typeof fetch;

      const resultPromise = synthesizeSpeech('https://api.example.com', 'app-key', 'placement-1', 'text', DEFAULT_VOICE_ID);

      await Promise.resolve();
      await Promise.resolve();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000);
      const result = await resultPromise;

      expect(result).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('gives up after exhausting retries on repeated 429s', async () => {
      jest.useFakeTimers();
      const rateLimitedResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn().mockReturnValue(null) },
        json: jest.fn().mockResolvedValue({ error: { message: 'Rate limit exceeded' } }),
      };
      global.fetch = jest.fn().mockResolvedValue(rateLimitedResponse) as unknown as typeof fetch;

      const resultPromise = synthesizeSpeech('https://api.example.com', 'app-key', 'placement-1', 'text', DEFAULT_VOICE_ID);
      const assertion = expect(resultPromise).rejects.toThrow('Rate limit exceeded');

      await jest.runAllTimersAsync();
      await assertion;

      expect(global.fetch).toHaveBeenCalledTimes(3);
      jest.useRealTimers();
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
