import { act, renderHook } from '@testing-library/react';
import useVoice from './use-voice';

describe('useVoice - speech output failure', () => {
  const originalFetch = global.fetch;
  const originalSpeechSynthesis = (window as any).speechSynthesis;
  const originalSpeechSynthesisUtterance = (window as any).SpeechSynthesisUtterance;

  const baseProps = {
    enabled: true,
    appKey: 'test-app-key',
    placementId: '1234',
    baseUrl: 'https://api.example.com',
    onTranscript: jest.fn(),
  };

  const mockSpeechSynthesis = { speak: jest.fn(), cancel: jest.fn() };
  const MockSpeechSynthesisUtterance = jest.fn().mockImplementation(function mockUtteranceImpl(this: any, text?: string): void {
    this.text = text;
  });

  beforeEach(() => {
    mockSpeechSynthesis.speak.mockClear();
    mockSpeechSynthesis.cancel.mockClear();
    (window as any).speechSynthesis = mockSpeechSynthesis;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    global.fetch = jest.fn().mockRejectedValue(new Error('voice proxy unavailable'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (window as any).speechSynthesis = originalSpeechSynthesis;
    (window as any).SpeechSynthesisUtterance = originalSpeechSynthesisUtterance;
    jest.useRealTimers();
  });

  it('does not fall back to the browser speech synthesis API when the voice proxy call fails', async () => {
    const { result } = renderHook(() => useVoice(baseProps));

    await act(async () => {
      result.current.speak('Great choice!', 13, null);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
  });

  it('sets hasSpeechOutputError when the voice proxy call fails', async () => {
    const { result } = renderHook(() => useVoice(baseProps));

    await act(async () => {
      result.current.speak('Great choice!', 13, null);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.hasSpeechOutputError).toBe(true);
  });

  it('clears hasSpeechOutputError on its own a few seconds after the failure', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    const { result } = renderHook(() => useVoice(baseProps));

    await act(async () => {
      result.current.speak('Great choice!', 13, null);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.hasSpeechOutputError).toBe(true);

    act(() => {
      jest.runAllTimers();
    });

    expect(result.current.hasSpeechOutputError).toBe(false);
  });
});

describe('useVoice - synthesis concurrency', () => {
  const originalFetch = global.fetch;

  const baseProps = {
    enabled: true,
    appKey: 'test-app-key',
    placementId: '1234',
    baseUrl: 'https://api.example.com',
    onTranscript: jest.fn(),
  };

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('caps how many synthesis requests are in flight at once for a long, multi-sentence reply', async () => {
    const pendingRejects: Array<(err: Error) => void> = [];
    global.fetch = jest.fn().mockImplementation(() => new Promise((_resolve, reject) => {
      pendingRejects.push(reject);
    })) as unknown as typeof fetch;

    const { result } = renderHook(() => useVoice(baseProps));

    await act(async () => {
      result.current.speak('First sentence.', 10, null);
      result.current.speak('Second sentence.', 20, null);
      result.current.speak('Third sentence.', 30, null);
    });

    // Third sentence's synthesis call must not start until a slot frees up.
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      pendingRejects[0](new Error('voice proxy unavailable'));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
