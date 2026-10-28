import type { ViSearchClient } from 'visearch-javascript-sdk';
import { getChatSessionStore, resetChatSessionStore } from './chat-session-registry';
import { ChatSessionStore } from './chat-session-store';
import { NULL_VOICE_BRIDGE } from './voice-bridge';
import { DEFAULT_CUSTOMIZATIONS } from '../../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../../test-utils';
import type { WidgetConfig } from '../../../wigmix-core';

// Same technique as use-chat.spec.ts: control the SSE call directly.
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

const fakeClient = (): any => ({});

describe('ChatSessionStore core', () => {
  it('notifies subscribers on change and keeps the snapshot identity otherwise', () => {
    const store = new ChatSessionStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();
    store.setState({ isWaiting: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot().isWaiting).toBe(true);
    const after = store.getSnapshot();
    store.setState({ isWaiting: true });
    expect(store.getSnapshot()).toBe(after);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.setState({ isWaiting: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports functional updates', () => {
    const store = new ChatSessionStore();
    store.setState((s) => ({ wishlistPids: [...s.wishlistPids, 'a'] }));
    expect(store.getSnapshot().wishlistPids).toEqual(['a']);
  });
});

describe('getChatSessionStore', () => {
  it('returns the same store for the same client and distinct stores for distinct clients', () => {
    const a = fakeClient();
    const b = fakeClient();
    expect(getChatSessionStore(a)).toBe(getChatSessionStore(a));
    expect(getChatSessionStore(a)).not.toBe(getChatSessionStore(b));
  });
});

describe('ChatSessionStore actions', () => {
  const originalFetch = global.fetch;

  const makeStore = (
    deps: { pid?: string; persistChatEnabled?: boolean } = {},
    chatbotOverrides: Partial<NonNullable<WidgetConfig['customizations']['chatbot']>> = {},
    visearchOverrides: Partial<ViSearchClient> = {},
  ): { store: ChatSessionStore; mockVisearchClient: ViSearchClient } => {
    const widgetConfig = createWidgetConfig(
      { ...DEFAULT_CUSTOMIZATIONS, chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, ...chatbotOverrides } },
      { searchSettings: { attrs_to_get: ['product_url', 'title'] } },
    );
    const { widgetClient, mockVisearchClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher', {
      getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
      generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
      ...visearchOverrides,
    });
    const store = new ChatSessionStore();
    store.configure({
      widgetClient,
      widgetConfig,
      persistChatEnabled: deps.persistChatEnabled ?? false,
      pid: deps.pid,
    });
    return { store, mockVisearchClient };
  };

  const calledParams = (): URLSearchParams => {
    const calledUrl = mockFetchEventSource.mock.calls[mockFetchEventSource.mock.calls.length - 1][0] as string;
    return new URLSearchParams(calledUrl.split('?')[1]);
  };

  beforeEach(() => {
    mockFetchEventSource.mockReset();
    mockFetchEventSource.mockResolvedValue(undefined);
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('open() mints a chat id, opens the session and empties chats', () => {
    const { store, mockVisearchClient } = makeStore();
    store.pushAssistantMessage('old');
    store.open();
    expect(mockVisearchClient.generateUuid).toHaveBeenCalled();
    const state = store.getSnapshot();
    expect(state.chatId).toBe('test-chat-id');
    expect(store.getChatId()).toBe('test-chat-id');
    expect(state.isOpen).toBe(true);
    expect(state.allowUserInput).toBe(true);
    expect(state.chats).toEqual([]);
  });

  it('sendMessage appends a user chat, waits, and calls the chat endpoint once with chat_id and q', () => {
    const { store } = makeStore();
    store.open();
    store.sendMessage('hi');
    const state = store.getSnapshot();
    expect(state.chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hi'] })]);
    expect(state.isWaiting).toBe(true);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    const params = calledParams();
    expect(params.get('chat_id')).toBe('test-chat-id');
    expect(params.get('q')).toBe('hi');
    expect(params.has('pid')).toBe(false);
  });

  it('a per-message pid is sent as pid and is never drawn as an image', () => {
    const { store } = makeStore();
    store.open();
    store.sendMessage('hi', { pid: 'p9' });
    expect(calledParams().get('pid')).toBe('p9');
    expect(store.getSnapshot().chats[0]?.image).toBeUndefined();
  });

  it('sends the configured pid when the message carries none, and the per-message pid wins', () => {
    const { store } = makeStore({ pid: 'p1' });
    store.open();
    store.sendMessage('hi');
    expect(calledParams().get('pid')).toBe('p1');
    store.sendMessage('again', { pid: 'p2' });
    expect(calledParams().getAll('pid')).toEqual(['p2']);
  });

  it('restoreIfStored() is idempotent: two calls trigger one history fetch', async () => {
    localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({ result: { messages: [] } }),
    } as unknown as Response);
    global.fetch = fetchMock;
    const { store } = makeStore({ persistChatEnabled: true }, { persistChatEnabled: true });
    store.restoreIfStored();
    store.restoreIfStored();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Reads a store's configured deps so a test can re-point another store at them, as a later
  // hook's configure() would.
  const depsOf = (store: ChatSessionStore): Parameters<ChatSessionStore['configure']>[0] => (
    (store as unknown as { configuredDeps: Parameters<ChatSessionStore['configure']>[0] }).configuredDeps
  );

  it('restoreIfStored() does not latch while persistence is off, so a later call with persistence on still restores', async () => {
    localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({ result: { messages: [] } }),
    } as unknown as Response);
    global.fetch = fetchMock;
    const { store } = makeStore({ persistChatEnabled: false }, { persistChatEnabled: true });
    store.restoreIfStored();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getChatId()).toBe('');
    store.configure(depsOf(makeStore({ persistChatEnabled: true }, { persistChatEnabled: true }).store));
    store.restoreIfStored();
    expect(store.getChatId()).toBe('old-chat');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });

  it('restoreIfStored() before configure() is a no-op that does not latch', () => {
    localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({ result: { messages: [] } }),
    } as unknown as Response);
    const unconfigured = new ChatSessionStore();
    expect(() => unconfigured.restoreIfStored()).not.toThrow();
    unconfigured.configure(depsOf(makeStore({ persistChatEnabled: true }, { persistChatEnabled: true }).store));
    unconfigured.restoreIfStored();
    expect(unconfigured.getChatId()).toBe('old-chat');
  });

  it('keeps a message sent while the history fetch is pending, with the restored history before it', async () => {
    localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
    let resolveFetch: (value: unknown) => void = () => {};
    global.fetch = jest.fn(() => new Promise((resolve) => {
      resolveFetch = resolve;
    })) as unknown as typeof fetch;
    const { store } = makeStore({ persistChatEnabled: true }, { persistChatEnabled: true });
    store.restoreIfStored();
    expect(store.getChatId()).toBe('old-chat');
    store.sendMessage('new message');
    resolveFetch({
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({
        result: {
          messages: [
            { reqid: 'req-1', type: 'human', message: 'find me a dress' },
            { reqid: 'req-1', type: 'ai', message: 'Sure, here you go!' },
          ],
        },
      }),
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(store.getSnapshot().chats).toEqual([
      expect.objectContaining({ author: 'user', messages: ['find me a dress'] }),
      expect.objectContaining({ author: 'bot', messages: ['Sure, here you go!'] }),
      expect.objectContaining({ author: 'user', messages: ['new message'] }),
    ]);
  });

  it('resetChatSessionStore() aborts the in-flight stream and the client then gets a new, empty store', () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const { store: configured } = makeStore();
    const widgetClient = depsOf(configured).widgetClient;
    const store = getChatSessionStore(widgetClient);
    store.configure(depsOf(configured));
    const interruptSpeech = jest.fn();
    store.attachVoice({ ...NULL_VOICE_BRIDGE, interruptSpeech });
    store.open();
    store.sendMessage('hi');
    expect(signal?.aborted).toBe(false);
    resetChatSessionStore(widgetClient);
    expect(signal?.aborted).toBe(true);
    expect(interruptSpeech).toHaveBeenCalledTimes(1);
    const fresh = getChatSessionStore(widgetClient);
    expect(fresh).not.toBe(store);
    expect(fresh.getSnapshot().chats).toEqual([]);
    expect(fresh.getChatId()).toBe('');
  });

  it('resetChatSessionStore() is a no-op for a client without a store', () => {
    expect(() => resetChatSessionStore(fakeClient())).not.toThrow();
  });

  describe('after dispose()', () => {
    it('ignores sendMessage, open, newChat and the programmatic openers, and notifies no one', () => {
      const { store } = makeStore({ persistChatEnabled: true }, { persistChatEnabled: true });
      store.open();
      const listener = jest.fn();
      store.subscribe(listener);
      mockFetchEventSource.mockClear();
      store.dispose();
      const before = store.getSnapshot();

      store.sendMessage('late');
      store.open();
      store.newChat();
      store.openWithMessage('late');
      store.sendChatMessage('late');
      store.pushAssistantMessage('late');
      store.playGreeting('late');

      expect(mockFetchEventSource).not.toHaveBeenCalled();
      expect(store.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not persist an injected message for the stale chat', () => {
      const { store } = makeStore({ persistChatEnabled: true }, { persistChatEnabled: true });
      store.open();
      store.dispose();
      store.pushAssistantMessage('late');
      expect(localStorage.getItem('visenze_shopping_assistant_chat_id_1234__injected')).toBeNull();
    });

    it('does not start a history restore', () => {
      localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
      global.fetch = jest.fn();
      const { store } = makeStore({ persistChatEnabled: true }, { persistChatEnabled: true });
      store.dispose();
      store.restoreIfStored();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('close() aborts the in-flight stream and keeps chats', () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const { store } = makeStore();
    store.open();
    store.sendMessage('hi');
    expect(signal?.aborted).toBe(false);
    store.close();
    expect(signal?.aborted).toBe(true);
    expect(store.getSnapshot().isOpen).toBe(false);
    expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hi'] })]);
  });

  it('hide() hides the surface without aborting the stream, interrupting speech or clearing chats', () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const { store } = makeStore();
    const interruptSpeech = jest.fn();
    store.attachVoice({ ...NULL_VOICE_BRIDGE, interruptSpeech });
    store.open();
    store.sendMessage('hi');
    store.hide();
    expect(signal?.aborted).toBe(false);
    expect(interruptSpeech).not.toHaveBeenCalled();
    expect(store.getSnapshot().isOpen).toBe(false);
    expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hi'] })]);
    store.reopen();
    expect(store.getSnapshot().isOpen).toBe(true);
  });

  it('openWithMessage() on a fresh store opens a session showing only the assistant message with nextSteps', () => {
    const { store } = makeStore();
    store.openWithMessage('Hello there', ['One', 'Two']);
    const state = store.getSnapshot();
    expect(state.isOpen).toBe(true);
    expect(store.getChatId()).toBe('test-chat-id');
    expect(state.chats).toEqual([expect.objectContaining({ author: 'bot', messages: ['Hello there'] })]);
    expect(state.suggestions).toEqual(['One', 'Two']);
  });

  it('openWithMessage() appends to an existing conversation by default', () => {
    const { store } = makeStore();
    store.open();
    store.sendMessage('hi');
    store.close();
    store.openWithMessage('Welcome back', ['Next']);
    const state = store.getSnapshot();
    expect(state.isOpen).toBe(true);
    expect(state.chats).toEqual([
      expect.objectContaining({ author: 'user', messages: ['hi'] }),
      expect.objectContaining({ author: 'bot', messages: ['Welcome back'] }),
    ]);
  });

  it('openWithMessage() with { newChat: true } clears prior chats', () => {
    const ids = ['old-id', 'new-chat-id'];
    const { store } = makeStore({}, {}, { generateUuid: jest.fn((cb: (uuid: string) => void) => cb(ids.shift() ?? 'x')) });
    store.open();
    store.sendMessage('hi');
    const staleId = store.getChatId();
    store.openWithMessage('Fresh start', ['Go'], { newChat: true });
    expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'bot', messages: ['Fresh start'] })]);
    expect(store.getSnapshot().suggestions).toEqual(['Go']);
    expect(store.getChatId()).toBe('new-chat-id');
    expect(store.getChatId()).not.toBe(staleId);
  });

  it('sendChatMessage() on a fresh store opens it and sends the message with a chat id', () => {
    const { store } = makeStore();
    store.sendChatMessage('find shoes');
    expect(store.getSnapshot().isOpen).toBe(true);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    const params = calledParams();
    expect(params.get('q')).toBe('find shoes');
    expect(params.get('chat_id')).toBe('test-chat-id');
  });

  it('sendChatMessage() with a pid sends pid and draws no image', () => {
    const { store } = makeStore();
    store.sendChatMessage('tell me more', { pid: 'p2' });
    expect(calledParams().get('pid')).toBe('p2');
    expect(store.getSnapshot().chats[0]?.image).toBeUndefined();
  });

  describe('with a history restore pending', () => {
    const STORAGE_KEY = 'visenze_shopping_assistant_chat_id_1234';
    const historyResponse = (messages: unknown[]): Response => ({
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({ result: { messages } }),
    } as unknown as Response);
    const history = [
      { reqid: 'req-1', type: 'human', message: 'old question' },
      { reqid: 'req-1', type: 'ai', message: 'old answer' },
    ];
    const flush = (): Promise<void> => new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const setup = (): { store: ChatSessionStore; settle: (value: unknown) => void; fail: () => void } => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
      let resolveFetch: (value: unknown) => void = () => {};
      let rejectFetch: (reason: unknown) => void = () => {};
      global.fetch = jest.fn(() => new Promise((resolve, reject) => {
        resolveFetch = resolve;
        rejectFetch = reject;
      })) as unknown as typeof fetch;
      const { store } = makeStore({ persistChatEnabled: true }, { persistChatEnabled: true });
      store.restoreIfStored();
      return { store, settle: (value) => resolveFetch(value), fail: () => rejectFetch(new Error('boom')) };
    };

    it('a restore superseded by newChat() does not leak its last request id into the new chat\'s injected messages', async () => {
      const { store, settle } = setup();
      store.newChat();
      settle(historyResponse(history));
      await flush();
      store.pushAssistantMessage('Hello again');
      const stored = JSON.parse(localStorage.getItem('visenze_shopping_assistant_chat_id_1234__injected') ?? 'null');
      expect(stored?.messages?.[0]?.afterRequestId ?? '').toBe('');
    });

    it('anchors a message injected after a completed restore to the last restored request id', async () => {
      const { store, settle } = setup();
      settle(historyResponse(history));
      await flush();
      store.pushAssistantMessage('After restore');
      const stored = JSON.parse(localStorage.getItem('visenze_shopping_assistant_chat_id_1234__injected') ?? 'null');
      expect(stored?.messages?.[0]?.afterRequestId).toBe('req-1');
    });

    it('anchors later injected messages to the restored history even when one was injected while the fetch was pending', async () => {
      const { store, settle } = setup();
      store.pushAssistantMessage('During fetch');
      settle(historyResponse(history));
      await flush();
      store.pushAssistantMessage('After restore');
      const stored = JSON.parse(localStorage.getItem('visenze_shopping_assistant_chat_id_1234__injected') ?? 'null');
      expect(stored.messages.map((m: { afterRequestId: string }) => m.afterRequestId)).toEqual(['', 'req-1']);
    });

    it('newChat openWithMessage discards the stale history when the fetch resolves with history', async () => {
      const { store, settle } = setup();
      store.openWithMessage('Fresh', ['Go'], { newChat: true });
      settle(historyResponse(history));
      await flush();
      expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'bot', messages: ['Fresh'] })]);
      expect(store.getSnapshot().suggestions).toEqual(['Go']);
      expect(store.getChatId()).toBe('test-chat-id');
    });

    it.each([['empty', false], ['rejected', true]])('keeps the new chat id when the stale fetch is %s', async (_label, rejects) => {
      const { store, settle, fail } = setup();
      store.openWithMessage('Fresh', [], { newChat: true });
      if (rejects) {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        fail();
      } else {
        settle(historyResponse([]));
      }
      await flush();
      expect(store.getChatId()).toBe('test-chat-id');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null').chatId).toBe('test-chat-id');
      store.sendMessage('next');
      expect(calledParams().get('chat_id')).toBe('test-chat-id');
      expect(store.getSnapshot().isWaiting).toBe(true);
    });

    it('default openWithMessage keeps the restored history in front of the new message', async () => {
      const { store, settle } = setup();
      store.openWithMessage('Welcome', ['Go']);
      settle(historyResponse(history));
      await flush();
      expect(store.getChatId()).toBe('old-chat');
      expect(store.getSnapshot().chats).toEqual([
        expect.objectContaining({ author: 'user', messages: ['old question'] }),
        expect.objectContaining({ author: 'bot', messages: ['old answer'] }),
        expect.objectContaining({ author: 'bot', messages: ['Welcome'] }),
      ]);
    });

    it('sendChatMessage keeps the restored history in front of the sent message', async () => {
      const { store, settle } = setup();
      store.sendChatMessage('hello');
      settle(historyResponse(history));
      await flush();
      expect(calledParams().get('chat_id')).toBe('old-chat');
      expect(store.getSnapshot().chats).toEqual([
        expect.objectContaining({ author: 'user', messages: ['old question'] }),
        expect.objectContaining({ author: 'bot', messages: ['old answer'] }),
        expect.objectContaining({ author: 'user', messages: ['hello'] }),
      ]);
    });

    type StreamOptions = { onmessage: (ev: { event: string; data: string }) => void; onclose: () => void };
    // Keeps the SSE open until the test drives it, so the restore can settle mid-reply.
    const holdStream = (): { stream: () => StreamOptions } => {
      let captured: StreamOptions | null = null;
      mockFetchEventSource.mockImplementation((_url: string, options: StreamOptions) => {
        captured = options;
        return new Promise(() => {});
      });
      return { stream: (): StreamOptions => captured as unknown as StreamOptions };
    };

    it('a send made while the restore is pending keeps its waiting flags when the history arrives', async () => {
      const { stream } = holdStream();
      const { store, settle } = setup();
      store.sendChatMessage('hello');
      settle(historyResponse(history));
      await flush();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ isWaiting: true, allowUserInput: false }));
      expect(store.getSnapshot().chats.map((c) => c.messages[0])).toEqual(['old question', 'old answer', 'hello']);
      stream().onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Hi there' }) });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ isWaiting: false, allowUserInput: false }));
      stream().onclose();
      expect(store.getSnapshot().allowUserInput).toBe(true);
    });

    it.each([['empty', false], ['rejected', true]])('a send made while the restore is pending keeps its waiting flags when the fetch is %s', async (_label, rejects) => {
      holdStream();
      const { store, settle, fail } = setup();
      store.sendChatMessage('hello');
      if (rejects) {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        fail();
      } else {
        settle(historyResponse([]));
      }
      await flush();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ isWaiting: true, allowUserInput: false }));
    });

    it.each([['with history', true], ['empty', false]])('with no send meanwhile, the restore still clears the waiting flags (%s)', async (_label, hasHistory) => {
      const { store, settle } = setup();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ isWaiting: true, allowUserInput: false }));
      settle(historyResponse(hasHistory ? history : []));
      await flush();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ isWaiting: false, allowUserInput: true }));
    });
  });
});

describe('ChatSessionStore analytics entry', () => {
  const makeStore = (): { store: ChatSessionStore; widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'] } => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, { searchSettings: { attrs_to_get: ['product_url', 'title'] } });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
      getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
      generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
    });
    widgetClient.sendEvent = jest.fn();
    widgetClient.setLastTrackingMeta = jest.fn();
    const store = new ChatSessionStore();
    store.configure({ widgetClient, widgetConfig, persistChatEnabled: false });
    return { store, widgetClient };
  };

  // Streams one reply that recommends one product, so commitResponse fires RESULT_LOAD.
  const streamReplyWithProduct = (): void => {
    mockFetchEventSource.mockImplementation(async (_url: string, options: { onmessage: (ev: { event: string; data: string }) => void; onclose: () => void }) => {
      options.onmessage({ event: 'reqid', data: JSON.stringify({ value: 'req-1' }) });
      options.onmessage({ event: 'product', data: JSON.stringify({ product_id: 'p1', main_image_url: 'https://example.com/p1.jpg', data: {} }) });
      options.onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Try this [[p1]]' }) });
      options.onclose();
    });
  };

  beforeEach(() => {
    mockFetchEventSource.mockReset();
    localStorage.clear();
  });

  it('adds the active entry to the RESULT_LOAD metadata', async () => {
    streamReplyWithProduct();
    const { store, widgetClient } = makeStore();
    store.setActiveEntry('prompt-box');
    store.open();
    await store.sendMessage('shoes');
    const expected = { queryId: 'req-1', cat: 'Result', entry: 'prompt-box' };
    expect(widgetClient.sendEvent).toHaveBeenCalledWith('result_load', expected);
    expect(widgetClient.setLastTrackingMeta).toHaveBeenCalledWith(expected);
  });

  it('adds no entry key when no entry was set', async () => {
    streamReplyWithProduct();
    const { store, widgetClient } = makeStore();
    store.open();
    await store.sendMessage('shoes');
    expect(widgetClient.sendEvent).toHaveBeenCalledWith('result_load', { queryId: 'req-1', cat: 'Result' });
    expect((widgetClient.sendEvent as jest.Mock).mock.calls[0][1]).not.toHaveProperty('entry');
  });
});

describe('ChatSessionStore active product id', () => {
  const makeStore = (depsPid?: string): ChatSessionStore => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, { searchSettings: { attrs_to_get: ['product_url', 'title'] } });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
      getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
      generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
    });
    const store = new ChatSessionStore();
    store.configure({ widgetClient, widgetConfig, persistChatEnabled: false, pid: depsPid });
    store.open();
    return store;
  };

  const lastPids = (): string[] => {
    const calledUrl = mockFetchEventSource.mock.calls[mockFetchEventSource.mock.calls.length - 1][0] as string;
    return new URLSearchParams(calledUrl.split('?')[1]).getAll('pid');
  };

  beforeEach(() => {
    mockFetchEventSource.mockReset();
    mockFetchEventSource.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('sends the active entry\'s product id with messages that carry none, and exposes the active entry', () => {
    const store = makeStore();
    store.setActiveEntry('prompt-box', 'p1');
    expect(store.getActiveEntry()).toBe('prompt-box');
    store.sendMessage('follow up');
    expect(lastPids()).toEqual(['p1']);
  });

  it('an entry set without a product id clears the previous one', () => {
    const store = makeStore();
    store.setActiveEntry('prompt-box', 'p1');
    store.setActiveEntry('launcher');
    store.sendMessage('hi');
    expect(lastPids()).toEqual([]);
  });

  it('the configured pid option wins over the active product id, and a per-message pid wins over both', () => {
    const store = makeStore('deps-pid');
    store.setActiveEntry('prompt-box', 'p1');
    store.sendMessage('hi');
    expect(lastPids()).toEqual(['deps-pid']);
    store.sendMessage('again', { pid: 'msg-pid' });
    expect(lastPids()).toEqual(['msg-pid']);
    const withoutDeps = makeStore();
    withoutDeps.setActiveEntry('prompt-box', 'p1');
    withoutDeps.sendMessage('third', { pid: 'msg-pid' });
    expect(lastPids()).toEqual(['msg-pid']);
  });
});

describe('ChatSessionStore surface mode and activation', () => {
  const activation = { entryPoint: 'ai' as const, isResumed: true, userMessageBaseline: 2 };

  const makeStore = (): ChatSessionStore => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, { searchSettings: { attrs_to_get: ['product_url', 'title'] } });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
      getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
      generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
    });
    const store = new ChatSessionStore();
    store.configure({ widgetClient, widgetConfig, persistChatEnabled: false });
    return store;
  };

  beforeEach(() => {
    mockFetchEventSource.mockReset();
    mockFetchEventSource.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('starts in drawer mode with no activation', () => {
    const state = new ChatSessionStore().getSnapshot();
    expect(state.surfaceMode).toBe('drawer');
    expect(state.activation).toBeNull();
  });

  it('setSurfaceMode() switches the mode, and switching to drawer clears the activation', () => {
    const store = makeStore();
    store.openSurface({ mode: 'fullscreen', activation });
    store.setSurfaceMode('fullscreen');
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'fullscreen', activation }));
    store.setSurfaceMode('drawer');
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null }));
  });

  it('openSurface() sets the mode and activation without opening the session or minting a chat id', () => {
    const store = makeStore();
    store.openSurface({ mode: 'fullscreen', activation, onClosed: jest.fn() });
    const state = store.getSnapshot();
    expect(state).toEqual(expect.objectContaining({ surfaceMode: 'fullscreen', activation, isOpen: false, chatId: '' }));
    expect(store.getChatId()).toBe('');
  });

  it('closeSurface() aborts the in-flight stream, closes, clears the activation, keeps chats and calls onClosed exactly once', () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const store = makeStore();
    const onClosed = jest.fn();
    store.openSurface({ mode: 'fullscreen', activation, onClosed });
    store.open();
    store.sendMessage('hi');
    expect(signal?.aborted).toBe(false);
    store.closeSurface();
    expect(signal?.aborted).toBe(true);
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ isOpen: false, activation: null, surfaceMode: 'drawer' }));
    expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hi'] })]);
    expect(onClosed).toHaveBeenCalledTimes(1);
    store.closeSurface();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('a later openSurface() without onClosed forgets the earlier callback', () => {
    const store = makeStore();
    const onClosed = jest.fn();
    store.openSurface({ mode: 'fullscreen', activation, onClosed });
    store.openSurface({ mode: 'fullscreen', activation });
    store.closeSurface();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('resetActivation() starts the activation afresh with the given baseline', () => {
    const store = makeStore();
    store.openSurface({ mode: 'fullscreen', activation });
    store.resetActivation(0);
    expect(store.getSnapshot().activation).toEqual({ entryPoint: 'ai', isResumed: false, userMessageBaseline: 0 });
  });

  it('closeSurface() puts the surface back in drawer mode, and a later openSurface() sets fullscreen again', () => {
    const store = makeStore();
    store.openSurface({ mode: 'fullscreen', activation });
    store.open();
    store.closeSurface();
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: false }));
    store.openSurface({ mode: 'fullscreen', activation });
    store.reopen();
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'fullscreen', activation, isOpen: true }));
  });

  it('closeSurface() with the drawer open keeps the drawer mode and closes', () => {
    const store = makeStore();
    store.open();
    store.closeSurface();
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: false }));
  });

  it('setSurfaceMode(\'drawer\') forgets an onClosed whose full screen never opened, so a later drawer close does not run it', () => {
    const store = makeStore();
    const onClosed = jest.fn();
    store.openSurface({ mode: 'fullscreen', activation, onClosed });
    store.setSurfaceMode('drawer');
    store.open();
    store.closeSurface();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it('setSurfaceMode(\'fullscreen\') keeps the registered onClosed', () => {
    const store = makeStore();
    const onClosed = jest.fn();
    store.openSurface({ mode: 'fullscreen', activation, onClosed });
    store.setSurfaceMode('fullscreen');
    store.open();
    store.closeSurface();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('resetActivation() is a no-op without an activation', () => {
    const store = makeStore();
    store.resetActivation(0);
    expect(store.getSnapshot().activation).toBeNull();
  });
});
