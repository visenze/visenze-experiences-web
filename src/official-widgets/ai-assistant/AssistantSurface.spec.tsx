import { act, fireEvent, type RenderResult, screen, within } from '@testing-library/react';
import { Context as ResponsiveContext } from 'react-responsive';
import AssistantSurface from './AssistantSurface';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { ensureOpen } from './entries/assistant-session';
import EntryHost from './entry-host';
import { getChatSessionStore } from '../../common/components/chat/session/chat-session-registry';
import type { EntryPointKey } from '../../common/components/chat/session/chat-session-store';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';
import { DEFAULT_CUSTOMIZATIONS as LAUNCHER_CUSTOMIZATIONS, DEFAULT_TEXTS as LAUNCHER_TEXTS } from '../ai-search-launcher/default-config';

const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));
jest.mock('react-webcam', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    __esModule: true,
    default: forwardRef((_props: any, ref: any) => {
      useImperativeHandle(ref, () => ({ getScreenshot: jest.fn(() => 'data:image/png;base64,mock') }));
      return <video data-testid='mock-webcam' />;
    }),
  };
});
// Speech output on/off per test: when on, the drawer shows its mute toggle, which reflects the
// voice-owning surface's own voice-reading state.
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

const texts = DEFAULT_TEXTS['en'];

type Customizations = Parameters<typeof createWidgetConfig>[0];

const makeClient = (overrides: Record<string, unknown> = {}): { widgetConfig: WidgetConfig; widgetClient: WidgetClient } => {
  const widgetConfig = createWidgetConfig({ ...DEFAULT_CUSTOMIZATIONS, ...overrides } as Customizations, { searchSettings: { attrs_to_get: ['product_url', 'title', 'price'] } });
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
    getUid: jest.fn((cb: (uid: string) => void) => cb('uid')),
    getSid: jest.fn((cb: (sid: string) => void) => cb('sid')),
    generateUuid: jest.fn((cb: (uuid: string) => void) => cb('chat-id')),
  });
  return { widgetConfig, widgetClient };
};

const setup = (overrides: Record<string, unknown> = {}): {
  result: RenderResult;
  store: ReturnType<typeof getChatSessionStore>;
  rerenderFresh: () => void;
} => {
  const { widgetConfig, widgetClient } = makeClient(overrides);
  let result = renderWidget(<AssistantSurface renderWithoutPortal />, { widgetConfig, widgetClient, messages: texts });
  // Unmounts the surface and mounts a fresh one on the same client (as rerender() does).
  const rerenderFresh = (): void => {
    result.unmount();
    result = renderWidget(<AssistantSurface renderWithoutPortal />, { widgetConfig, widgetClient, messages: texts });
  };
  return { get result(): RenderResult { return result; }, store: getChatSessionStore(widgetClient), rerenderFresh };
};

describe('AssistantSurface', () => {
  beforeEach(() => {
    mockFetchEventSource.mockReset();
    mockSpeechOutputEnabled = false;
    localStorage.clear();
  });

  it('renders the drawer content and composer once the shared session is open', () => {
    const { result, store } = setup();
    act(() => store.open());
    const dialog = result.getByRole('dialog', { hidden: true });
    expect(within(dialog).getByLabelText(texts['a11yCloseChat'])).toBeTruthy();
    expect(within(dialog).getByLabelText(texts['a11yChatInput'])).toBeTruthy();
  });

  it('closing the drawer hides it, keeps the chats and does not abort the in-flight stream', async () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    const { result, store } = setup();
    act(() => store.open());
    act(() => {
      store.sendMessage('hello').catch(() => undefined);
    });
    expect(signal?.aborted).toBe(false);
    await act(async () => {
      fireEvent.click(within(result.getByRole('dialog', { hidden: true })).getByLabelText(texts['a11yCloseChat']));
    });
    expect(store.getSnapshot().isOpen).toBe(false);
    expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hello'] })]);
    expect(signal?.aborted).toBe(false);
  });

  describe('configuration', () => {
    const drawer = (r: RenderResult): HTMLElement => r.getByRole('dialog', { hidden: true });

    it.each([
      ['aiAssistant.chatPosition', { aiAssistant: { chatPosition: 'left' }, popup: { position: 'bottom' } }, 'left'],
      ['popup.position', { aiAssistant: { chatPosition: undefined }, popup: { position: 'bottom' } }, 'bottom'],
      ['right', { aiAssistant: { chatPosition: undefined }, popup: { position: undefined } }, 'right'],
    ])('positions the drawer by %s', (_n, overrides, expected) => {
      const ctx = setup(overrides);
      const { store } = ctx;
      const { result } = ctx;
      act(() => store.open());
      expect(drawer(result).className).toContain(`wigmix-modal-position-${expected}`);
    });

    it('titles the drawer from aiAssistant.chatTitle, then chatbot.title', () => {
      const first = setup({ aiAssistant: { chatTitle: ' Ask us ' }, chatbot: { title: 'Bot' } });
      act(() => first.store.open());
      expect(within(drawer(first.result)).getByRole('heading', { hidden: true }).textContent).toBe('Ask us');
      first.result.unmount();
      const second = setup({ aiAssistant: { chatTitle: '' }, chatbot: { title: 'Bot' } });
      act(() => second.store.open());
      expect(within(drawer(second.result)).getByRole('heading', { hidden: true }).textContent).toBe('Bot');
    });

    it('shows aiAssistant.chatTitleIcon beside the drawer title, or alone with layout ICON (the title text stays for screen readers)', () => {
      const url = 'https://example.com/logo.gif';
      const first = setup({ aiAssistant: { chatTitle: 'Ask us', chatTitleIcon: { url, height: 40 } } });
      act(() => first.store.open());
      const heading = within(drawer(first.result)).getByRole('heading', { hidden: true });
      expect(heading.textContent).toBe('Ask us');
      const img = heading.querySelector('img') as HTMLImageElement;
      expect(img.getAttribute('src')).toBe(url);
      expect(img.style.height).toBe('40px');
      first.result.unmount();
      const second = setup({ aiAssistant: { chatTitle: 'Ask us', chatTitleIcon: { url, layout: 'ICON' } } });
      act(() => second.store.open());
      const iconOnly = within(drawer(second.result)).getByRole('heading', { hidden: true });
      expect(iconOnly.querySelector('img')).not.toBeNull();
      expect(iconOnly.querySelector('.sr-only')?.textContent).toBe('Ask us');
    });

    it('sizes the drawer title text from aiAssistant.chatTitleFontSize', () => {
      const { result, store } = setup({ aiAssistant: { chatTitle: 'Ask us', chatTitleFontSize: 22 } });
      act(() => store.open());
      const text = within(drawer(result)).getByText('Ask us');
      expect(text.style.fontSize).toBe('22px');
    });

    it('titles the drawer with the widget\'s default widgetTitle text when neither is set, as the full screen does', () => {
      const { result, store } = setup({ aiAssistant: { chatTitle: '  ' }, chatbot: { title: undefined } });
      act(() => store.open());
      const title = within(drawer(result)).getByRole('heading', { hidden: true }).textContent || '';
      expect(title).toBe(texts['widgetTitle']);
      expect(title.trim()).not.toBe('');
      expect(title).not.toBe('widgetTitle');
    });
  });

  it('keeps the conversation when the surface moves to a fresh mount, and the new drawer can hide again', async () => {
    mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
    const ctx = setup();
    act(() => ctx.store.open());
    act(() => {
      ctx.store.sendMessage('hello').catch(() => undefined);
    });
    ctx.rerenderFresh();
    expect(ctx.store.getSnapshot().isOpen).toBe(true);
    expect(ctx.store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hello'] })]);
    await act(async () => {
      fireEvent.click(within(ctx.result.getByRole('dialog', { hidden: true })).getByLabelText(texts['a11yCloseChat']));
    });
    expect(ctx.store.getSnapshot().isOpen).toBe(false);
    expect(ctx.store.getSnapshot().chats).toHaveLength(1);
  });

  describe('beside several entry hosts', () => {
    // Each host and the surface get their own React root, as in production.
    const renderAll = (ctx: { widgetConfig: WidgetConfig; widgetClient: WidgetClient }): { hosts: RenderResult[]; surface: RenderResult } => {
      const hosts = [
        renderWidget(<EntryHost entry='launcher' />, { ...ctx, messages: texts }),
        renderWidget(<EntryHost entry='prompt-box' productId='p1' />, { ...ctx, messages: texts }),
      ];
      const surface = renderWidget(<AssistantSurface renderWithoutPortal />, { ...ctx, messages: texts });
      return { hosts, surface };
    };

    it('applies chatbot.startMuted once: the voice-owning drawer starts muted with two entry hosts mounted', () => {
      mockSpeechOutputEnabled = true;
      const ctx = makeClient({ chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, startMuted: true } });
      renderAll(ctx);
      act(() => getChatSessionStore(ctx.widgetClient).open());
      expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);
      const muteToggle = within(screen.getByRole('dialog', { hidden: true })).getByLabelText(texts['a11yEnableMute']);
      expect(muteToggle.getAttribute('aria-pressed')).toBe('true');
    });

    it('leaves voice reading on without chatbot.startMuted', () => {
      mockSpeechOutputEnabled = true;
      const ctx = makeClient({ chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, startMuted: false } });
      renderAll(ctx);
      act(() => getChatSessionStore(ctx.widgetClient).open());
      const muteToggle = within(screen.getByRole('dialog', { hidden: true })).getByLabelText(texts['a11yToggleMute']);
      expect(muteToggle.getAttribute('aria-pressed')).toBe('false');
    });

    it('does not depend on the hosts: with every entry host unmounted the open drawer and the conversation remain', () => {
      mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
      const ctx = makeClient();
      const { hosts } = renderAll(ctx);
      const store = getChatSessionStore(ctx.widgetClient);
      act(() => store.open());
      act(() => {
        store.sendMessage('hello').catch(() => undefined);
      });
      hosts.forEach((host) => host.unmount());
      expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);
      expect(within(screen.getByRole('dialog', { hidden: true })).getByText('hello')).toBeTruthy();
      expect(store.getSnapshot().isOpen).toBe(true);
      expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hello'] })]);
    });
  });
});

describe('AssistantSurface fullscreen', () => {
  // The search-bar texts land in the ai-assistant pack in a later task; until then take them from ai-search-launcher.
  const fsTexts = { ...LAUNCHER_TEXTS['en'], ...texts };
  const { chatbot } = DEFAULT_CUSTOMIZATIONS;

  const setupFs = (overrides: Record<string, unknown> = {}, width = 1200): {
    result: RenderResult;
    store: ReturnType<typeof getChatSessionStore>;
  } => {
    const { widgetConfig, widgetClient } = makeClient({ breakpoints: LAUNCHER_CUSTOMIZATIONS.breakpoints, ...overrides });
    const result = renderWidget(
      <ResponsiveContext.Provider value={{ width }}>
        <AssistantSurface renderWithoutPortal />
      </ResponsiveContext.Provider>,
      { widgetConfig, widgetClient, messages: fsTexts },
    );
    return { result, store: getChatSessionStore(widgetClient) };
  };

  const openFullscreen = (
    store: ReturnType<typeof getChatSessionStore>,
    entryPoint: EntryPointKey = 'ai',
    onClosed?: () => void,
    { isResumed = false, userMessageBaseline = 0 } = {},
  ): void => {
    act(() => {
      store.openSurface({ mode: 'fullscreen', activation: { entryPoint, isResumed, userMessageBaseline }, onClosed });
      if (store.getChatId()) {
        store.reopen();
      } else {
        store.open();
      }
    });
  };

  const streamForever = (): { signal: () => AbortSignal | undefined } => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    return { signal: () => signal };
  };

  const send = (store: ReturnType<typeof getChatSessionStore>, message: string): void => {
    act(() => {
      store.sendMessage(message).catch(() => undefined);
    });
  };

  const closeButton = (): HTMLElement => screen.getByLabelText(fsTexts['a11yCloseFullScreen']);
  const headerInner = (): HTMLElement => screen.getByTestId('wigmix-fullscreen-header').firstElementChild as HTMLElement;

  beforeEach(() => {
    mockFetchEventSource.mockReset();
    mockSpeechOutputEnabled = false;
    localStorage.clear();
    document.body.style.overflow = '';
  });

  it('opens the single-column full-screen chat and no drawer when the store is in fullscreen mode', () => {
    const { store } = setupFs();
    openFullscreen(store);
    expect(screen.getAllByRole('dialog', { hidden: true })).toHaveLength(1);
    expect(closeButton()).toBeTruthy();
    expect(screen.getByLabelText(fsTexts['a11yChatMessages'])).toBeTruthy();
    expect(screen.getByLabelText(fsTexts['a11yChatInput'])).toBeTruthy();
    expect(screen.queryByLabelText(fsTexts['a11yCloseChat'])).toBeNull();
    expect(screen.queryByTestId('asl-split-layout')).toBeNull();
    expect(headerInner().className).toContain('max-w-[820px]');
  });

  it('titles the full screen from chatbot.title, then the widgetTitle text', () => {
    const first = setupFs({ chatbot: { ...chatbot, title: 'Bot' } });
    openFullscreen(first.store);
    expect(screen.getByRole('heading').textContent).toBe('Bot');
    first.result.unmount();
    // The first mount persisted its chat id; without this the next mount restores it asynchronously (outside act).
    localStorage.clear();
    const second = setupFs({ chatbot: { ...chatbot, title: '' } });
    openFullscreen(second.store);
    expect(screen.getByRole('heading').textContent).toBe(fsTexts['widgetTitle']);
  });

  it('shows aiAssistant.chatTitleIcon beside the full-screen title', () => {
    const { store } = setupFs({ aiAssistant: { chatTitleIcon: { url: 'https://example.com/logo.png' } }, chatbot: { ...chatbot, title: 'Bot' } });
    openFullscreen(store);
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toBe('Bot');
    expect((heading.querySelector('img') as HTMLImageElement).getAttribute('src')).toBe('https://example.com/logo.png');
  });

  describe('split layout', () => {
    const withResults = (store: ReturnType<typeof getChatSessionStore>): void => {
      act(() => store.setState({ breadcrumbs: [{ requestId: 'r1', label: 'shoes', products: [] }] }));
    };

    it('renders the split view full width above mobile once there are results', () => {
      const { store } = setupFs({ chatbot: { ...chatbot, layout: 'splitlayout' } });
      openFullscreen(store);
      expect(screen.queryByTestId('asl-split-layout')).toBeNull();
      withResults(store);
      expect(screen.getByTestId('asl-split-layout')).toBeTruthy();
      expect(screen.getByTestId('asl-split-chat-pane')).toBeTruthy();
      expect(headerInner().className).not.toContain('max-w-[820px]');
    });

    it('falls back to the single column on mobile', () => {
      const { store } = setupFs({ chatbot: { ...chatbot, layout: 'splitlayout' } }, 600);
      openFullscreen(store);
      withResults(store);
      expect(closeButton()).toBeTruthy();
      expect(screen.queryByTestId('asl-split-layout')).toBeNull();
      expect(screen.getByLabelText(fsTexts['a11yChatMessages'])).toBeTruthy();
    });

    it('stays single column with the chat layout', () => {
      const { store } = setupFs({ chatbot: { ...chatbot, layout: 'chatlayout' } });
      openFullscreen(store);
      withResults(store);
      expect(closeButton()).toBeTruthy();
      expect(screen.queryByTestId('asl-split-layout')).toBeNull();
    });
  });

  describe('entry point welcome screens', () => {
    const greetings = { image: 'Snap a photo', mic: 'Say something', ai: 'Hello from AI' };
    const aiAssistant = { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, searchBar: { greetings } };

    it.each([
      ['image', 'Snap a photo'],
      ['mic', 'Say something'],
    ] as const)('shows the %s welcome screen until a message is sent during the activation, then the chat', (entryPoint, greeting) => {
      mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
      const { store } = setupFs({ aiAssistant });
      openFullscreen(store, entryPoint);
      expect(screen.getByText(greeting)).toBeTruthy();
      expect(screen.queryByLabelText(fsTexts['a11yChatMessages'])).toBeNull();
      expect(screen.queryByLabelText(fsTexts['a11yStartNewChat'])).toBeNull();
      // Narration only: the image/mic greeting never enters the conversation.
      expect(store.getSnapshot().chats).toEqual([]);
      send(store, 'red shoes');
      expect(screen.queryByText(greeting)).toBeNull();
      expect(screen.getByLabelText(fsTexts['a11yChatMessages'])).toBeTruthy();
      expect(screen.getByLabelText(fsTexts['a11yStartNewChat'])).toBeTruthy();
    });

    it('shows the welcome screen again for a resumed conversation until a new message is sent', () => {
      mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
      const { store } = setupFs({ aiAssistant });
      act(() => store.open());
      send(store, 'earlier');
      openFullscreen(store, 'image', undefined, { isResumed: true, userMessageBaseline: 1 });
      expect(screen.getByText('Snap a photo')).toBeTruthy();
      send(store, 'now');
      expect(screen.queryByText('Snap a photo')).toBeNull();
    });

    it('plays the ai greeting once for a new conversation, but not for a resumed one', () => {
      const fresh = setupFs({ aiAssistant, chatbot: { ...chatbot, welcomeScreen: undefined } });
      openFullscreen(fresh.store, 'ai');
      expect(fresh.store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'bot', messages: ['Hello from AI'] })]);
      fresh.result.unmount();
      // The first mount persisted its chat id; without this the next mount restores it asynchronously (outside act).
      localStorage.clear();
      const resumed = setupFs({ aiAssistant, chatbot: { ...chatbot, welcomeScreen: undefined } });
      openFullscreen(resumed.store, 'ai', undefined, { isResumed: true });
      expect(resumed.store.getSnapshot().chats).toEqual([]);
    });

    it('does not replay the ai greeting when the surface moves to a fresh mount mid-activation', () => {
      const overrides = { aiAssistant, chatbot: { ...chatbot, welcomeScreen: undefined } };
      const { widgetConfig, widgetClient } = makeClient({ breakpoints: LAUNCHER_CUSTOMIZATIONS.breakpoints, ...overrides });
      const store = getChatSessionStore(widgetClient);
      const first = renderWidget(<AssistantSurface renderWithoutPortal />, { widgetConfig, widgetClient, messages: fsTexts });
      openFullscreen(store, 'ai');
      first.unmount();
      renderWidget(<AssistantSurface renderWithoutPortal />, { widgetConfig, widgetClient, messages: fsTexts });
      expect(closeButton()).toBeTruthy();
      expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'bot', messages: ['Hello from AI'] })]);
    });

    it('new chat clears the conversation, restarts the activation and replays the ai greeting', () => {
      mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
      const { store } = setupFs({ aiAssistant, chatbot: { ...chatbot, welcomeScreen: undefined } });
      openFullscreen(store, 'ai', undefined, { isResumed: true, userMessageBaseline: 3 });
      send(store, 'hello');
      act(() => {
        fireEvent.click(screen.getByLabelText(fsTexts['a11yStartNewChat']));
      });
      expect(store.getSnapshot().activation).toEqual({ entryPoint: 'ai', isResumed: false, userMessageBaseline: 0 });
      expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'bot', messages: ['Hello from AI'] })]);
    });
  });

  it('closing aborts the in-flight stream, keeps the chats and calls onClosed exactly once', async () => {
    const stream = streamForever();
    const onClosed = jest.fn();
    // No ai greeting (the widget's defaults now have one), so the chats are just the user's message.
    const { store } = setupFs({ aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, searchBar: {} } });
    openFullscreen(store, 'ai', onClosed);
    send(store, 'hello');
    expect(stream.signal()?.aborted).toBe(false);
    await act(async () => {
      fireEvent.click(closeButton());
    });
    expect(stream.signal()?.aborted).toBe(true);
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ isOpen: false, activation: null }));
    expect(store.getSnapshot().chats).toEqual([expect.objectContaining({ author: 'user', messages: ['hello'] })]);
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
  });

  it('mutes through the surface\'s own voice state', () => {
    mockSpeechOutputEnabled = true;
    const { store } = setupFs({ chatbot: { ...chatbot, startMuted: false } });
    openFullscreen(store);
    const toggle = within(screen.getByTestId('wigmix-fullscreen-header')).getByLabelText(fsTexts['a11yToggleMute']);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    act(() => {
      fireEvent.click(toggle);
    });
    expect(screen.getByLabelText(fsTexts['a11yEnableMute']).getAttribute('aria-pressed')).toBe('true');
  });

  it('switches fullscreen -> drawer on the same conversation, one container at a time, without leaving the page scroll-locked', async () => {
    streamForever();
    const { store } = setupFs();
    openFullscreen(store);
    send(store, 'hello');
    expect(document.body.style.overflow).toBe('hidden');
    await act(async () => {
      fireEvent.click(closeButton());
    });
    expect(document.body.style.overflow).not.toBe('hidden');
    act(() => ensureOpen(store));
    expect(store.getSnapshot().surfaceMode).toBe('drawer');
    const dialogs = screen.getAllByRole('dialog', { hidden: true });
    expect(dialogs).toHaveLength(1);
    expect(within(dialogs[0]).getByLabelText(fsTexts['a11yCloseChat'])).toBeTruthy();
    expect(within(dialogs[0]).getByText('hello')).toBeTruthy();
    expect(screen.queryByLabelText(fsTexts['a11yCloseFullScreen'])).toBeNull();
    await act(async () => {
      fireEvent.click(within(dialogs[0]).getByLabelText(fsTexts['a11yCloseChat']));
    });
    expect(store.getSnapshot().isOpen).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  describe('after a fullscreen close the surface rests in drawer mode', () => {
    const closeFullscreen = async (): Promise<void> => {
      await act(async () => {
        fireEvent.click(closeButton());
      });
    };

    it('closing leaves no dialog, no scroll lock and the drawer mode', async () => {
      const { store } = setupFs();
      openFullscreen(store);
      expect(document.body.style.overflow).toBe('hidden');
      await closeFullscreen();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: false }));
      expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
      expect(document.body.style.overflow).not.toBe('hidden');
    });

    it('closing restores the host page\'s own inline overflow exactly', async () => {
      const { store } = setupFs();
      // The host page's own inline value when the full screen opens (set after mount: the closed drawer's
      // pre-existing mount effect writes its own initial '' once, when the surface mounts).
      document.body.style.overflow = 'auto';
      openFullscreen(store);
      expect(document.body.style.overflow).toBe('hidden');
      await closeFullscreen();
      expect(store.getSnapshot().surfaceMode).toBe('drawer');
      expect(document.body.style.overflow).toBe('auto');
    });

    it('unmounting the surface while the full screen is open restores the previous overflow', () => {
      const { result, store } = setupFs();
      // The host page's own inline value when the full screen opens (set after mount: the closed drawer's
      // pre-existing mount effect writes its own initial '' once, when the surface mounts).
      document.body.style.overflow = 'auto';
      openFullscreen(store);
      expect(document.body.style.overflow).toBe('hidden');
      result.unmount();
      expect(document.body.style.overflow).toBe('auto');
    });

    describe('drawer open -> full screen', () => {
      const fsActivation = { entryPoint: 'ai' as const, isResumed: true, userMessageBaseline: 0 };

      const openDrawerWithHostOverflow = (): ReturnType<typeof getChatSessionStore> => {
        const { store } = setupFs();
        document.body.style.overflow = 'auto';
        act(() => ensureOpen(store));
        expect(screen.getByLabelText(fsTexts['a11yCloseChat'])).toBeTruthy();
        expect(document.body.style.overflow).toBe('hidden');
        return store;
      };

      it('switching in one batch keeps the page locked under the full screen and restores the host value on close', async () => {
        const store = openDrawerWithHostOverflow();
        act(() => {
          store.openSurface({ mode: 'fullscreen', activation: fsActivation });
          store.reopen();
        });
        expect(closeButton()).toBeTruthy();
        expect(document.body.style.overflow).toBe('hidden');
        await closeFullscreen();
        expect(document.body.style.overflow).toBe('auto');
      });

      it('hiding the drawer first, then opening the full screen, keeps the same lock semantics', async () => {
        const store = openDrawerWithHostOverflow();
        act(() => store.hide());
        act(() => {
          store.openSurface({ mode: 'fullscreen', activation: fsActivation });
          store.reopen();
        });
        expect(closeButton()).toBeTruthy();
        expect(document.body.style.overflow).toBe('hidden');
        await closeFullscreen();
        expect(document.body.style.overflow).toBe('auto');
      });
    });

    it.each([
      ['openWithMessage', (store: ReturnType<typeof getChatSessionStore>): void => store.openWithMessage('hi', ['a'])],
      ['sendChatMessage', (store: ReturnType<typeof getChatSessionStore>): void => store.sendChatMessage('x')],
    ])('%s then opens the drawer, not the full screen', async (_name, openProgrammatically) => {
      mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
      const { store } = setupFs();
      openFullscreen(store);
      await closeFullscreen();
      act(() => openProgrammatically(store));
      expect(store.getSnapshot().isOpen).toBe(true);
      const dialogs = screen.getAllByRole('dialog', { hidden: true });
      expect(dialogs).toHaveLength(1);
      expect(within(dialogs[0]).getByLabelText(fsTexts['a11yCloseChat'])).toBeTruthy();
      expect(screen.queryByLabelText(fsTexts['a11yCloseFullScreen'])).toBeNull();
    });

    it('a second fullscreen opening after a close shows the full screen again', async () => {
      const { store } = setupFs();
      openFullscreen(store);
      await closeFullscreen();
      openFullscreen(store, 'ai');
      expect(store.getSnapshot().surfaceMode).toBe('fullscreen');
      expect(closeButton()).toBeTruthy();
      expect(screen.queryByLabelText(fsTexts['a11yCloseChat'])).toBeNull();
    });
  });

  describe('ensureOpen', () => {
    it('switches a closed fullscreen surface to the drawer', () => {
      const { store } = setupFs();
      act(() => store.openSurface({ mode: 'fullscreen', activation: { entryPoint: 'ai', isResumed: false, userMessageBaseline: 0 } }));
      act(() => ensureOpen(store));
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: true }));
    });

    it('leaves an open fullscreen chat as it is (it covers the page)', () => {
      const { store } = setupFs();
      openFullscreen(store);
      act(() => ensureOpen(store));
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'fullscreen', isOpen: true }));
      expect(closeButton()).toBeTruthy();
    });
  });
});
