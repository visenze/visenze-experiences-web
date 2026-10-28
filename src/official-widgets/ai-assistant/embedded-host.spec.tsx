import { act, fireEvent, type RenderResult, screen, within } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import App from './app';
import AssistantSurface from './AssistantSurface';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import EmbeddedHost from './embedded-host';
import { ensureOpen } from './entries/assistant-session';
import EntryHost from './entry-host';
import { initWidgetFactory } from '../../common/client/initialization';
import { AppWrapper } from '../../common/components/app-wrapper';
import * as registry from '../../common/components/chat/session/chat-session-registry';
import { getChatSessionStore, peekChatSessionStore } from '../../common/components/chat/session/chat-session-registry';
import { ChatSessionStore } from '../../common/components/chat/session/chat-session-store';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { type WidgetClient, type WidgetConfig, WidgetType } from '../../common/wigmix-core';

const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));
jest.mock('react-webcam', () => {
  const { forwardRef } = jest.requireActual('react');
  return { __esModule: true, default: forwardRef(() => <video data-testid='mock-webcam' />) };
});
// Speech output on/off per test: when on, both the drawer and the embedded full screen show their own mute toggle.
let mockSpeechOutputEnabled = false;
jest.mock('../../common/assistant/use-voice', () => ({
  __esModule: true,
  default: (): unknown => ({
    voiceEnabled: false,
    speechOutputEnabled: mockSpeechOutputEnabled,
    status: 'idle',
    liveTranscript: '',
    hasError: false,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    speak: jest.fn(() => false),
    hasPendingSpeech: jest.fn(() => false),
    stopAudio: jest.fn(),
  }),
}));
// The init-flow test mounts the real App/surface roots: the SDK and the Shadow-DOM AppWrapper are stubbed
// (as in initialization.spec.ts and app.spec.tsx); createMockWidgetClient passes its own SDK factory.
// Built inside the factory: contexts.ts creates a default client while the modules load.
jest.mock('visearch-javascript-sdk', () => {
  const client = {
    setKeys: jest.fn(),
    set: jest.fn(),
    sendEvent: jest.fn(),
    getLastQueryId: jest.fn((cb: (id: string) => void) => cb('query-id')),
    getUid: jest.fn((cb: (uid: string) => void) => cb('uid')),
    getSid: jest.fn((cb: (sid: string) => void) => cb('sid')),
    generateUuid: jest.fn((cb: (id: string) => void) => cb('init-flow-chat-id')),
  };
  return { __esModule: true, ...jest.requireActual('visearch-javascript-sdk'), default: jest.fn(() => client) };
});
jest.mock('../../common/components/app-wrapper', () => {
  const { IntlProvider } = jest.requireActual('react-intl');
  const { WidgetDataContext } = jest.requireActual('../../common/types/contexts');
  const { RootContext } = jest.requireActual('../../common/components/shadow-wrapper');
  return {
    __esModule: true,
    AppWrapper: ({ widgetConfig, widgetClient, defaultTexts, children }: {
      widgetConfig: unknown; widgetClient: unknown; defaultTexts: Record<string, Record<string, string>>; children: ReactNode;
    }): ReactElement => (
      <RootContext.Provider value={globalThis.document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={defaultTexts['en']} locale='en' defaultLocale='en'>{children}</IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>
    ),
  };
});

const texts = DEFAULT_TEXTS['en'];
const QUESTION = 'Which shoes for running?';

interface Stream {
  params: URLSearchParams;
  signal: AbortSignal;
  emit: (event: string, data: unknown) => void;
  close: () => void;
}

// Every SSE call, kept open until the test drives it.
let streams: Stream[] = [];
const streamFor = (q: string): Stream => {
  const stream = streams.find((s) => s.params.get('q') === q);
  if (!stream) throw new Error(`no request for ${q}`);
  return stream;
};

const makeClient = (customizations: Record<string, unknown> = {}, callbacks: WidgetConfig['callbacks'] = {}): { widgetConfig: WidgetConfig; widgetClient: WidgetClient } => {
  const widgetConfig = createWidgetConfig(
    {
      ...DEFAULT_CUSTOMIZATIONS,
      aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, promptBox: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant?.promptBox, suggestedQuestions: [QUESTION] } },
      ...customizations,
    } as WidgetConfig['customizations'],
    { searchSettings: { attrs_to_get: ['product_url', 'title', 'price'] }, callbacks },
  );
  let uuid = 0;
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
    getUid: jest.fn((cb: (uid: string) => void) => cb('uid')),
    getSid: jest.fn((cb: (sid: string) => void) => cb('sid')),
    generateUuid: jest.fn((cb: (id: string) => void) => {
      uuid += 1;
      cb(`chat-${uuid}`);
    }),
  });
  return { widgetConfig, widgetClient };
};

type Ctx = ReturnType<typeof makeClient>;

const renderEmbedded = (ctx: Ctx, query: string): RenderResult => renderWidget(<EmbeddedHost query={query} renderWithoutPortal />, { ...ctx, messages: texts });
const renderSurface = (ctx: Ctx): RenderResult => renderWidget(<AssistantSurface renderWithoutPortal />, { ...ctx, messages: texts });
const renderEntry = (ctx: Ctx, entry: 'launcher' | 'prompt-box'): RenderResult => renderWidget(<EntryHost entry={entry} />, { ...ctx, messages: texts });

const flushSends = (): void => {
  act(() => {
    jest.advanceTimersByTime(0);
  });
};

const reply = async (q: string, text: string, productId?: string): Promise<void> => {
  const stream = streamFor(q);
  stream.emit('chat_id', { value: stream.params.get('chat_id') });
  stream.emit('reqid', { value: `req-${q}` });
  stream.emit('chat_token', { value: productId ? `${text} [[${productId}]]` : text });
  if (productId) {
    stream.emit('product', {
      product_id: productId,
      main_image_url: `https://example.com/${productId}.jpg`,
      data: { product_url: `https://example.com/${productId}`, price: { currency: 'USD', value: '9.99' }, title: 'Cool Shoes' },
    });
  }
  stream.close();
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
};

const seeResults = (result: RenderResult): void => {
  act(() => {
    fireEvent.click(within(result.container).getByRole('button', { name: texts['seeResults'] }));
  });
};

const sendFromComposer = (result: RenderResult, message: string): void => {
  act(() => {
    fireEvent.change(within(result.container).getByRole('textbox', { name: texts['a11yChatInput'] }), { target: { value: message } });
  });
  act(() => {
    fireEvent.click(within(result.container).getByRole('button', { name: texts['a11ySendMessage'] }));
  });
};

const allDialogs = (): HTMLElement[] => screen.queryAllByRole('dialog', { hidden: true });
// The shared chat drawer: the dialog with the drawer's own close button (the embedded full screen has a different one).
const sharedDrawer = (): HTMLElement | undefined => allDialogs().find((d) => within(d).queryByLabelText(texts['a11yCloseChat']));
const muteToggle = (container: HTMLElement): HTMLElement => {
  const toggle = within(container).queryByLabelText(texts['a11yEnableMute']) ?? within(container).queryByLabelText(texts['a11yToggleMute']);
  if (!toggle) throw new Error('no mute toggle');
  return toggle;
};

const embeddedKeys = (spy: jest.SpyInstance): string[] => Array.from(new Set(spy.mock.calls
  .map((call) => call[2] as string | undefined)
  .filter((key): key is string => !!key && key.startsWith('embedded-'))));

beforeEach(() => {
  jest.useFakeTimers();
  streams = [];
  mockSpeechOutputEnabled = false;
  mockFetchEventSource.mockReset();
  mockFetchEventSource.mockImplementation(async (url: string, options: any) => {
    streams.push({
      params: new URLSearchParams(url.split('?')[1]),
      signal: options.signal,
      emit: (event, data): void => {
        act(() => options.onmessage({ event, data: JSON.stringify(data) }));
      },
      close: (): void => {
        act(() => options.onclose());
      },
    });
  });
  Element.prototype.scrollIntoView = jest.fn();
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('ai-assistant EmbeddedHost', () => {
  it('isolation: each embedded element keeps its own conversation, apart from each other and the shared one', async () => {
    const ctx = makeClient();
    renderSurface(ctx);
    const promptBox = renderEntry(ctx, 'prompt-box');
    const first = renderEmbedded(ctx, 'red shoes');
    const second = renderEmbedded(ctx, 'blue boots');
    const shared = getChatSessionStore(ctx.widgetClient);
    const sharedBefore = shared.getSnapshot();

    flushSends();
    expect(streams.map((s) => s.params.get('q')).sort()).toEqual(['blue boots', 'red shoes']);
    expect(streamFor('red shoes').params.get('chat_id')).not.toBe(streamFor('blue boots').params.get('chat_id'));
    await reply('red shoes', 'Reply one', 'p1');
    await reply('blue boots', 'Reply two', 'p2');

    expect(within(first.container).queryByText(/Reply one/)).toBeTruthy();
    expect(within(first.container).queryByText(/Reply two/)).toBeNull();
    expect(within(second.container).queryByText(/Reply two/)).toBeTruthy();
    expect(within(second.container).queryByText(/Reply one/)).toBeNull();

    // A follow-up from the first element's own full screen stays in that element's conversation.
    seeResults(first);
    sendFromComposer(first, 'follow up one');
    expect(streamFor('follow up one').params.get('chat_id')).toBe(streamFor('red shoes').params.get('chat_id'));
    await reply('follow up one', 'Reply three');
    expect(within(first.container).getAllByText(/follow up one|Reply three/).length).toBeGreaterThan(0);
    expect(within(second.container).queryByText(/follow up one|Reply three/)).toBeNull();
    expect(sharedDrawer()).toBeUndefined();
    expect(shared.getSnapshot()).toBe(sharedBefore);
    expect(shared.getSnapshot().isOpen).toBe(false);
    expect(shared.getSnapshot().chats).toEqual([]);

    // The shared conversation (prompt box -> drawer) sees none of the embedded messages, and vice versa.
    act(() => {
      fireEvent.click(within(promptBox.container).getByRole('button', { name: QUESTION }));
    });
    expect(streamFor(QUESTION).params.get('chat_id')).not.toBe(streamFor('red shoes').params.get('chat_id'));
    await reply(QUESTION, 'Shared reply');
    expect(shared.getSnapshot().isOpen).toBe(true);
    expect(shared.getSnapshot().chats.flatMap((c) => c.messages)).toEqual([QUESTION, 'Shared reply']);
    const drawer = sharedDrawer();
    if (!drawer) throw new Error('the shared drawer did not open');
    expect(within(drawer).getAllByText('Shared reply').length).toBeGreaterThan(0);
    expect(within(drawer).queryByText(/Reply one|Reply two|Reply three|follow up one/)).toBeNull();
    expect(within(first.container).queryByText(/Shared reply/)).toBeNull();
    expect(within(second.container).queryByText(/Shared reply/)).toBeNull();
  });

  it('cleanup: unmounting aborts its in-flight stream and drops only its own store', () => {
    const spy = jest.spyOn(registry, 'getChatSessionStore');
    const ctx = makeClient();
    renderSurface(ctx);
    const shared = getChatSessionStore(ctx.widgetClient);
    const embedded = renderEmbedded(ctx, 'red shoes');
    const [key] = embeddedKeys(spy);
    expect(key).toBeDefined();
    flushSends();
    const stream = streamFor('red shoes');
    expect(stream.signal.aborted).toBe(false);
    expect(peekChatSessionStore(ctx.widgetClient, key)).toBeDefined();
    const sharedBefore = shared.getSnapshot();

    embedded.unmount();

    expect(stream.signal.aborted).toBe(true);
    expect(peekChatSessionStore(ctx.widgetClient, key)).toBeUndefined();
    expect(peekChatSessionStore(ctx.widgetClient)).toBe(shared);
    expect(shared.getSnapshot()).toBe(sharedBefore);
  });

  it('cleanup: unmounting before the deferred query send runs cancels it (no request on the disposed store)', () => {
    const ctx = makeClient();
    const embedded = renderEmbedded(ctx, 'red shoes');
    embedded.unmount();
    flushSends();
    expect(mockFetchEventSource).not.toHaveBeenCalled();
    expect(streams).toHaveLength(0);
  });

  it('each embedded element\'s full screen has its own title id, referenced by its own dialog', async () => {
    const ctx = makeClient();
    const first = renderEmbedded(ctx, 'red shoes');
    const second = renderEmbedded(ctx, 'blue boots');
    flushSends();
    await reply('red shoes', 'Reply one', 'p1');
    await reply('blue boots', 'Reply two', 'p2');
    seeResults(first);
    seeResults(second);

    const titleIds = [first, second].map((result) => {
      const dialog = within(result.container).getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby') || '';
      const title = within(dialog).getByRole('heading');
      expect(labelledBy).not.toBe('');
      expect(title.id).toBe(labelledBy);
      expect(document.querySelectorAll(`[id="${labelledBy}"]`)).toHaveLength(1);
      return labelledBy;
    });
    expect(titleIds[0]).not.toBe(titleIds[1]);
  });

  it('"See Results" opens its own full screen; the shared drawer stays closed', async () => {
    const ctx = makeClient();
    renderSurface(ctx);
    renderEntry(ctx, 'launcher');
    const embedded = renderEmbedded(ctx, 'red shoes');
    const shared = getChatSessionStore(ctx.widgetClient);
    flushSends();
    await reply('red shoes', 'Reply one', 'p1');

    seeResults(embedded);

    expect(within(embedded.container).getByTestId('wigmix-fullscreen-header')).toBeTruthy();
    expect(allDialogs()).toEqual([within(embedded.container).getByRole('dialog')]);
    expect(sharedDrawer()).toBeUndefined();
    expect(shared.getSnapshot().isOpen).toBe(false);

    act(() => {
      fireEvent.click(within(embedded.container).getByRole('button', { name: texts['a11yCloseFullScreen'] }));
    });
    expect(allDialogs()).toHaveLength(0);
    expect(shared.getSnapshot().isOpen).toBe(false);
  });

  it('startMuted mutes the embedded element\'s own voice once, never the shared surface\'s', async () => {
    mockSpeechOutputEnabled = true;
    const ctx = makeClient({ chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, startMuted: true } });
    renderSurface(ctx);
    const embedded = renderEmbedded(ctx, 'red shoes');
    flushSends();
    await reply('red shoes', 'Reply one', 'p1');
    seeResults(embedded);
    act(() => ensureOpen(getChatSessionStore(ctx.widgetClient)));

    const embeddedToggle = (): HTMLElement => muteToggle(within(embedded.container).getByTestId('wigmix-fullscreen-header'));
    const drawerToggle = (): HTMLElement => {
      const drawer = sharedDrawer();
      if (!drawer) throw new Error('the shared drawer did not open');
      return muteToggle(drawer);
    };
    // Each surface applied startMuted exactly once to its own voice state.
    expect(embeddedToggle().getAttribute('aria-label')).toBe(texts['a11yEnableMute']);
    expect(drawerToggle().getAttribute('aria-label')).toBe(texts['a11yEnableMute']);

    act(() => {
      fireEvent.click(embeddedToggle());
    });
    expect(embeddedToggle().getAttribute('aria-label')).toBe(texts['a11yToggleMute']);
    expect(drawerToggle().getAttribute('aria-label')).toBe(texts['a11yEnableMute']);
  });

  it('passes widgetConfig.callbacks through to its product cards (onProductClick)', async () => {
    const onProductClick = jest.fn();
    const ctx = makeClient({}, { onProductClick });
    const embedded = renderEmbedded(ctx, 'red shoes');
    flushSends();
    await reply('red shoes', 'Reply one', 'p1');
    seeResults(embedded);

    act(() => {
      fireEvent.click(within(embedded.container).getAllByTestId('wigmix-product-card-anchor')[0]);
    });
    expect(onProductClick).toHaveBeenCalledWith(expect.objectContaining({ product_id: 'p1' }), expect.anything(), 'https://example.com/p1');
  });

  describe('through the init flow', () => {
    const addElement = (dataset: Record<string, string>): HTMLElement => {
      const element = document.createElement('div');
      element.className = 'ps-widget-1234';
      Object.entries(dataset).forEach(([k, v]) => {
        element.dataset[k] = v;
      });
      document.body.appendChild(element);
      return element;
    };

    it('rerender() disposes every embedded store and resets the shared one; the remount starts fresh', async () => {
      const spy = jest.spyOn(registry, 'getChatSessionStore');
      const dispose = jest.spyOn(ChatSessionStore.prototype, 'dispose');
      addElement({ entry: 'embedded', query: 'red shoes' });
      addElement({ entry: 'embedded', query: 'blue boots' });
      addElement({ entry: 'launcher' });
      const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, { displaySettings: { cssSelector: '' } as WidgetConfig['displaySettings'] });
      let client: WidgetClient | undefined;
      act(() => {
        client = initWidgetFactory(
          WidgetType.AI_ASSISTANT,
          '1.0.0',
          ({ config, client: c, element }) => <App widgetConfig={config} widgetClient={c} element={element} />,
          true,
          DEFAULT_CUSTOMIZATIONS,
          {
            surface: ({ config, client: c }) => (
              <AppWrapper widgetConfig={config} widgetClient={c} defaultTexts={DEFAULT_TEXTS} defaultCustomizations={DEFAULT_CUSTOMIZATIONS} enableCustomization>
                <AssistantSurface renderWithoutPortal />
              </AppWrapper>
            ),
          },
        )(widgetConfig, {}, false);
      });
      if (!client) throw new Error('no client');
      const widgetClient = client;
      flushSends();
      expect(streams.map((s) => s.params.get('q')).sort()).toEqual(['blue boots', 'red shoes']);
      const keys = embeddedKeys(spy);
      expect(keys).toHaveLength(2);
      const embeddedStores = keys.map((key) => peekChatSessionStore(widgetClient, key));
      const shared = peekChatSessionStore(widgetClient);
      expect(shared).toBeDefined();
      expect(embeddedStores.every(Boolean)).toBe(true);

      // Embedded sessions are saved like the shared one; clearing storage makes the remount start fresh.
      localStorage.clear();
      act(() => widgetClient.rerender());

      expect(streams.every((s) => s.signal.aborted)).toBe(true);
      expect(dispose.mock.contexts).toEqual(expect.arrayContaining([shared, ...embeddedStores]));
      keys.forEach((key) => expect(peekChatSessionStore(widgetClient, key)).toBeUndefined());
      expect(peekChatSessionStore(widgetClient)).not.toBe(shared);

      // The remounted embedded elements start fresh conversations from their queries.
      flushSends();
      expect(streams.map((s) => s.params.get('q')).sort()).toEqual(['blue boots', 'blue boots', 'red shoes', 'red shoes']);
      act(() => widgetClient.disposeWidget());
    });
  });
});
