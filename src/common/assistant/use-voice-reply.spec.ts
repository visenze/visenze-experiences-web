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

describe('useVoiceReply - toggling voice reading off mid-reply', () => {
  const setIsWaiting = jest.fn();

  const baseProps = {
    enabled: true,
    appKey: 'test-app-key',
    placementId: '1234',
    baseUrl: 'https://api.example.com',
    onTranscript: jest.fn(),
    setIsWaiting,
  };

  beforeEach(() => {
    setIsWaiting.mockClear();
  });

  it('does not stop the "waiting" indicator when no reply content has streamed in yet', () => {
    const { result } = renderHook(() => useVoiceReply(baseProps));

    act(() => {
      result.current.beginReply();
    });
    act(() => {
      result.current.toggleVoiceReading();
    });

    expect(setIsWaiting).not.toHaveBeenCalledWith(false);
  });

  it('stops the "waiting" indicator once reply content has streamed in', () => {
    const { result } = renderHook(() => useVoiceReply(baseProps));

    act(() => {
      result.current.beginReply();
    });
    act(() => {
      result.current.updateLatestMessage('Great choice!');
    });
    act(() => {
      result.current.toggleVoiceReading();
    });

    expect(setIsWaiting).toHaveBeenCalledWith(false);
  });
});
