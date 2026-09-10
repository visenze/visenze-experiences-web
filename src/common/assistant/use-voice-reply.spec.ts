import { act, renderHook } from '@testing-library/react';
import useVoiceReply from './use-voice-reply';

describe('useVoiceReply - speech output failure', () => {
  const originalFetch = global.fetch;

  const baseProps = {
    enabled: true,
    appKey: 'test-app-key',
    placementId: '1234',
    baseUrl: 'https://api.example.com',
    onTranscript: jest.fn(),
    setIsWaiting: jest.fn(),
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockRejectedValue(new Error('voice proxy unavailable'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('turns off voice reading when the voice-output API fails', async () => {
    const { result } = renderHook(() => useVoiceReply(baseProps));

    expect(result.current.isVoiceReadingEnabled).toBe(true);

    await act(async () => {
      result.current.speak('Great choice!', 13, null);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isVoiceReadingEnabled).toBe(false);
    expect(result.current.shouldSpeakReply()).toBe(false);
  });
});
