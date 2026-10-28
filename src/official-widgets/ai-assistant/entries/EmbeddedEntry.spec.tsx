import { act, fireEvent, type RenderResult } from '@testing-library/react';
import { buildChatIdStorageKey } from '../../../common/components/chat/session/chat-session-storage';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../../common/test-utils';
import { Actions } from '../../../common/types/tracking-constants';
import type { WidgetConfig } from '../../../common/wigmix-core';
import { DEFAULT_TEXTS as ESA_TEXTS } from '../../embedded-shopping-assistant/default-config';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from '../default-config';
import EmbeddedHost from '../embedded-host';

// Ported from embedded-shopping-assistant-chat.spec.tsx (same mocks, helpers and assertions), rendered
// through the ai_assistant widget's EmbeddedHost with the ai_assistant widget's own defaults and texts.
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

jest.mock('react-webcam', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    __esModule: true,
    default: forwardRef((_props: any, ref: any) => {
      useImperativeHandle(ref, () => ({
        getScreenshot: jest.fn(() => 'data:image/png;base64,mockScreenshot'),
      }));
      return <video data-testid='mock-webcam' />;
    }),
  };
});

const mockVoiceState: { onTranscript: ((text: string) => void) | null } = { onTranscript: null };
jest.mock('../../../common/assistant/use-voice', () => ({
  __esModule: true,
  default: (options: { onTranscript: (text: string) => void }): unknown => {
    mockVoiceState.onTranscript = options.onTranscript;
    return {
      voiceEnabled: true,
      speechOutputEnabled: false,
      status: 'idle',
      liveTranscript: '',
      hasError: false,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      speak: jest.fn(() => false),
      hasPendingSpeech: jest.fn(() => false),
      stopAudio: jest.fn(),
    };
  },
}));

describe('ai-assistant EmbeddedEntry', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS['en'];

  const createTestClient = (
    visearchOverrides: Record<string, any> = {},
    customizationOverrides: Partial<WidgetConfig['customizations']> = {},
  ): {
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ReturnType<typeof createMockWidgetClient>['mockVisearchClient'];
  } => {
    const widgetConfig = createWidgetConfig({ ...DEFAULT_CUSTOMIZATIONS, ...customizationOverrides }, {
      searchSettings: {
        attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
      },
    });
    const { widgetClient, mockVisearchClient } = createMockWidgetClient(
      widgetConfig,
      'wigmix_ai_assistant',
      {
        getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
        getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
        generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const renderEmbedded = (
    query: string,
    visearchOverrides: Record<string, any> = {},
    customizationOverrides: Partial<WidgetConfig['customizations']> = {},
    locale = 'en',
  ): ReturnType<typeof createTestClient> => {
    const clientBundle = createTestClient(visearchOverrides, customizationOverrides);
    testComponent = renderWidget(<EmbeddedHost query={query} renderWithoutPortal />, {
      widgetConfig: clientBundle.widgetConfig,
      widgetClient: clientBundle.widgetClient,
      locale,
      messages: DEFAULT_TEXTS[locale],
    });
    return clientBundle;
  };

  const getTextInBody = (text: string): HTMLElement | null => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.includes(text)) {
        return node.parentElement;
      }
      node = walker.nextNode();
    }
    return null;
  };

  const flushDeferredSendAndGetStreamController = (): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
  } => {
    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onmessage = options.onmessage;
      onclose = options.onclose;
    });
    act(() => {
      jest.advanceTimersByTime(0);
    });
    return {
      emitEvent: (event: string, data: any): void => {
        act(() => {
          onmessage({ event, data: JSON.stringify(data) });
        });
      },
      closeStream: (): void => {
        act(() => {
          onclose();
        });
      },
    };
  };

  const revealAll = async (): Promise<void> => {
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
  };

  const mockProductEvent = (productId: string): Record<string, any> => ({
    product_id: productId,
    main_image_url: `https://example.com/${productId}.jpg`,
    data: {
      product_url: `https://example.com/${productId}`,
      price: { currency: 'USD', value: '99.99' },
      title: 'Cool Shoes',
      brand: 'Nike',
    },
  });

  const completeInitialTurn = async (): Promise<void> => {
    const stream = flushDeferredSendAndGetStreamController();
    stream.emitEvent('chat_id', { value: 'chat-1' });
    stream.emitEvent('reqid', { value: 'req-1' });
    stream.emitEvent('chat_token', { value: 'Great picks: [[pid-1]]' });
    stream.emitEvent('product', mockProductEvent('pid-1'));
    stream.closeStream();
    await revealAll();
  };

  const completeInitialTurnAndExpand = async (seeResultsLabel = texts['seeResults']): Promise<void> => {
    await completeInitialTurn();
    act(() => {
      fireEvent.click(testComponent.getByRole('button', { name: seeResultsLabel }));
    });
  };

  const firstRequestParams = (): URLSearchParams => {
    const [url] = mockFetchEventSource.mock.calls[0];
    return new URLSearchParams((url as string).split('?')[1]);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
    Element.prototype.scrollIntoView = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the isExpanded fork', () => {
    it('renders TurnSection content by default (isExpanded false)', () => {
      renderEmbedded('running shoes');
      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(getTextInBody(texts['aiOverviewLabel'])).toBeTruthy();
      expect(testComponent.queryByRole('dialog')).toBeNull();
    });

    it('clicking "See Results" switches rendering to its own FullScreenChatContainer/ChatWindow/ChatComposer', async () => {
      renderEmbedded('running shoes');

      await completeInitialTurnAndExpand();

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByRole('log')).toBeTruthy();
      expect(testComponent.getByRole('textbox', { name: texts['a11yChatInput'] })).toBeTruthy();
    });

    it('TurnSection and the full-screen surface are mutually exclusive', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurn();

      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
      expect(testComponent.queryByRole('dialog')).toBeNull();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['seeResults'] }));
      });

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['seeResults'] })).toBeNull();
    });

    it('closing the full-screen view returns to a fresh "See Results" gate, not a stuck state', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();

      expect(testComponent.getByRole('dialog')).toBeTruthy();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });

      expect(testComponent.queryByRole('dialog')).toBeNull();
      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
    });

    it('does not leave a stray empty divider behind for a follow-up turn asked while expanded', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();

      const input = testComponent.getByRole('textbox', { name: texts['a11yChatInput'] });
      act(() => {
        fireEvent.change(input, { target: { value: 'cheaper options' } });
      });
      let onmessage: (ev: { event: string; data: string }) => void;
      let onclose: () => void;
      mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
        onmessage = options.onmessage;
        onclose = options.onclose;
      });
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11ySendMessage'] }));
      });
      act(() => {
        onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-1' }) });
      });
      act(() => {
        onmessage({ event: 'reqid', data: JSON.stringify({ value: 'req-2' }) });
      });
      act(() => {
        onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Cheaper picks: [[pid-2]]' }) });
      });
      act(() => {
        onmessage({ event: 'product', data: JSON.stringify(mockProductEvent('pid-2')) });
      });
      act(() => {
        onclose();
      });
      await revealAll();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });

      expect(testComponent.queryAllByRole('separator')).toHaveLength(0);
      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
    });

    it('restores focus to the "See Results" button after closing the full-screen view', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });

      expect(document.activeElement).toBe(testComponent.getByRole('button', { name: texts['seeResults'] }));
    });

    it('re-expanding after a collapse still sends a voice transcript that finalizes afterward', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['seeResults'] }));
      });

      mockFetchEventSource.mockClear();
      act(() => {
        mockVoiceState.onTranscript?.('show me in red');
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      expect(firstRequestParams().get('q')).toBe('show me in red');
    });

    it('closing the full-screen view aborts a still-in-flight stream', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();

      let secondSignal: AbortSignal | undefined;
      mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
        secondSignal = options.signal;
      });
      const input = testComponent.getByRole('textbox', { name: texts['a11yChatInput'] });
      act(() => {
        fireEvent.change(input, { target: { value: 'cheaper options' } });
      });
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11ySendMessage'] }));
      });

      expect(secondSignal?.aborted).toBe(false);

      await act(async () => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });

      expect(secondSignal?.aborted).toBe(true);
    });

    it('restores exactly the host page\'s previous inline overflow when the full screen collapses', async () => {
      document.body.style.overflow = 'auto';
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(document.body.style.overflow).toBe('hidden');

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });

      expect(document.body.style.overflow).toBe('auto');
      document.body.style.overflow = '';
    });
  });

  describe('the !query fallback', () => {
    it('renders the "No search query provided" message when query is empty', () => {
      renderEmbedded('');

      expect(getTextInBody(texts['noQueryProvided'])).toBeTruthy();
    });

    it('never sends a request when query is empty', async () => {
      renderEmbedded('');

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockFetchEventSource).not.toHaveBeenCalled();
    });
  });

  describe('normal query flow', () => {
    it('fires chat.open() then a deferred chat.sendMessage(query) on mount', () => {
      const { mockVisearchClient } = renderEmbedded('running shoes');

      expect(mockVisearchClient.generateUuid).toHaveBeenCalled();
      expect(mockFetchEventSource).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      expect(firstRequestParams().get('q')).toBe('running shoes');
    });

    it('sends Actions.LOAD once on mount when a query is present', () => {
      const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
      const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
        generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
      });
      const sendEvent = jest.spyOn(widgetClient, 'sendEvent');
      renderWidget(<EmbeddedHost query='running shoes' renderWithoutPortal />, { widgetConfig, widgetClient, messages: texts });
      expect(sendEvent.mock.calls.filter(([action]) => action === Actions.LOAD)).toHaveLength(1);
    });

    it('sends the mount-triggered message with the chatId open() just generated', () => {
      renderEmbedded('running shoes');

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(firstRequestParams().get('chat_id')).toBe('test-chat-id');
    });

    it('renders the resulting turn via TurnSection once the SSE stream completes', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurn();

      expect(getTextInBody('Great picks:')).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
    });

    it('still renders the "See Results" button when the assistant returns text but no products', async () => {
      renderEmbedded('running shoes');

      const stream = flushDeferredSendAndGetStreamController();
      stream.emitEvent('chat_id', { value: 'chat-1' });
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('chat_token', { value: 'Sorry, I could not find a matching product.' });
      stream.closeStream();
      await revealAll();

      expect(getTextInBody('Sorry, I could not find a matching product.')).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
    });

    it('tags RESULT_LOAD with entry: \'embedded\'', async () => {
      const { widgetClient } = renderEmbedded('running shoes');
      const sendEvent = jest.spyOn(widgetClient, 'sendEvent');
      await completeInitialTurn();

      expect(sendEvent).toHaveBeenCalledWith(Actions.RESULT_LOAD, expect.objectContaining({ queryId: 'req-1', entry: 'embedded' }));
    });
  });

  describe('stored session', () => {
    const originalFetch = global.fetch;
    const sharedKey = buildChatIdStorageKey('1234');

    afterEach(() => {
      global.fetch = originalFetch;
    });

    const embeddedKeys = (): string[] => Object.keys(localStorage).filter((k) => k !== sharedKey && !k.endsWith('__injected'));

    it('never touches the shared chat id: it fetches no history for it, sends the query fresh, and stores its own session under another key', async () => {
      const stored = JSON.stringify({ chatId: 'stored-shared-chat', timestamp: Date.now() });
      localStorage.setItem(sharedKey, stored);
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: { messages: [] } }) });

      const { mockVisearchClient } = renderEmbedded('red sneakers', {}, {
        chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: true },
      });
      await completeInitialTurn();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      expect(firstRequestParams().get('q')).toBe('red sneakers');
      expect(firstRequestParams().get('chat_id')).toBe('test-chat-id');
      expect(localStorage.getItem(sharedKey)).toBe(stored);
      const [embeddedKey] = embeddedKeys();
      expect(embeddedKeys()).toHaveLength(1);
      expect(embeddedKey.startsWith(`${sharedKey}__embedded-`)).toBe(true);
      expect(JSON.parse(localStorage.getItem(embeddedKey) as string).chatId).toBe('test-chat-id');
    });

    it('restores its own conversation after a reload instead of sending the query again', async () => {
      const chatbot = { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: true };
      renderEmbedded('red sneakers', {}, { chatbot });
      await completeInitialTurn();
      testComponent.unmount();
      mockFetchEventSource.mockReset();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          result: {
            messages: [
              { reqid: 'req-1', type: 'human', message: 'red sneakers' },
              { reqid: 'req-1', type: 'ai', message: 'Restored overview' },
            ],
          },
        }),
      });

      renderEmbedded('red sneakers', {}, { chatbot });
      await act(async () => {
        jest.advanceTimersByTime(0);
      });
      await revealAll();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('chat_id=test-chat-id');
      expect(mockFetchEventSource).not.toHaveBeenCalled();
      expect(getTextInBody('Restored overview')).toBeTruthy();
    });

    it('sends the query fresh when the stored session has no history to restore', async () => {
      const chatbot = { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: true };
      renderEmbedded('red sneakers', {}, { chatbot });
      await completeInitialTurn();
      testComponent.unmount();
      mockFetchEventSource.mockReset();
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: { messages: [] } }) });

      renderEmbedded('red sneakers', {}, { chatbot });
      await act(async () => {
        await Promise.resolve();
      });
      await completeInitialTurn();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      expect(firstRequestParams().get('q')).toBe('red sneakers');
    });

    it('starts fresh for a different query, which is stored apart from the first', async () => {
      const chatbot = { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: true };
      renderEmbedded('red sneakers', {}, { chatbot });
      await completeInitialTurn();
      testComponent.unmount();
      mockFetchEventSource.mockReset();
      global.fetch = jest.fn();

      renderEmbedded('blue boots', {}, { chatbot });
      await completeInitialTurn();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(firstRequestParams().get('q')).toBe('blue boots');
      expect(embeddedKeys()).toHaveLength(2);
    });

    it('stores nothing when chatbot.persistChatEnabled is false', async () => {
      renderEmbedded('red sneakers', {}, {
        chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: false },
      });
      await completeInitialTurn();

      expect(Object.keys(localStorage)).toEqual([]);
    });
  });

  describe('the "new chat" button', () => {
    it('is never shown', async () => {
      renderEmbedded('running shoes');
      await completeInitialTurnAndExpand();

      expect(testComponent.queryByRole('button', { name: texts['a11yStartNewChat'] })).toBeNull();
    });
  });

  describe('loading state accessibility', () => {
    it('announces the loading row to screen readers via role="status"/aria-live', () => {
      renderEmbedded('running shoes');
      act(() => {
        jest.advanceTimersByTime(0);
      });

      const status = testComponent.getByRole('status');
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).toContain(texts['gettingOverview']);
    });
  });

  describe('the shadow host marker', () => {
    // RootContext is the .wigmix-shadow-root node inside the element's shadow root (see ShadowWrapper).
    const renderInShadow = (): { host: HTMLElement; result: RenderResult } => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowRootNode = document.createElement('div');
      host.attachShadow({ mode: 'open' }).appendChild(shadowRootNode);
      const { widgetConfig, widgetClient } = createTestClient();
      const result = renderWidget(<EmbeddedHost query='running shoes' />, { widgetConfig, widgetClient, messages: texts, rootElement: shadowRootNode });
      return { host, result };
    };

    it('marks its shadow host data-wigmix-entry="embedded" while mounted, and unmarks it on unmount', () => {
      const { host, result } = renderInShadow();
      expect(host.getAttribute('data-wigmix-entry')).toBe('embedded');
      result.unmount();
      expect(host.hasAttribute('data-wigmix-entry')).toBe(false);
      host.remove();
    });

    it('marks nothing outside a shadow root', () => {
      renderEmbedded('running shoes');
      expect(document.querySelector('[data-wigmix-entry]')).toBeNull();
    });
  });

  describe('texts in other locales', () => {
    // Every text id of the widget that could leak as a raw id: camelCase ids (e.g. seeResults, a11yCloseFullScreen).
    const rawIds = Object.keys(DEFAULT_TEXTS['en']).filter((id) => /[a-z][A-Z0-9]/.test(id));
    const shownStrings = (): string[] => {
      const labels = Array.from(document.body.querySelectorAll('[aria-label],[placeholder]'))
        .flatMap((el) => [el.getAttribute('aria-label') ?? '', el.getAttribute('placeholder') ?? '']);
      return [document.body.textContent ?? '', ...labels];
    };
    const expectNoRawIds = (): void => {
      const shown = shownStrings().join('\n');
      rawIds.forEach((id) => expect(shown).not.toMatch(new RegExp(`\\b${id}\\b`)));
    };

    it.each(['de', 'es'])('renders no raw ids in %s, before and after "See Results", using the locale\'s own seeResults', async (locale) => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      renderEmbedded('running shoes', {}, {}, locale);
      await completeInitialTurn();
      expectNoRawIds();
      expect(getTextInBody(ESA_TEXTS[locale]['aiOverviewLabel'])).toBeTruthy();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: ESA_TEXTS[locale]['seeResults'] }));
      });
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expectNoRawIds();
      expect(testComponent.getByRole('button', { name: DEFAULT_TEXTS[locale]['a11yCloseFullScreen'] })).toBeTruthy();
      expect(error.mock.calls.map(String).filter((call) => call.includes('MISSING_TRANSLATION'))).toEqual([]);
      error.mockRestore();
    });

    it('uses the locale\'s noQueryProvided text', () => {
      renderEmbedded('', {}, {}, 'es');
      expect(getTextInBody(ESA_TEXTS['es']['noQueryProvided'])).toBeTruthy();
      expect(ESA_TEXTS['es']['noQueryProvided']).not.toBe(texts['noQueryProvided']);
    });
  });
});
