import { act, fireEvent, type RenderResult, screen, waitFor, within } from '@testing-library/react';
import AssistantSurface from './AssistantSurface';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import EntryHost from './entry-host';
import { getChatSessionStore } from '../../common/components/chat/session/chat-session-registry';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';

// SSE / webcam / voice mocks.
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
jest.mock('../../common/assistant/use-voice', () => ({
  __esModule: true,
  default: (): unknown => ({
    voiceEnabled: false,
    speechOutputEnabled: false,
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
const QUESTION = 'Which shoes for running?';

type AiAssistantCustomizations = NonNullable<WidgetConfig['customizations']['aiAssistant']>;

const makeClient = (
  aiAssistant: Omit<AiAssistantCustomizations, 'promptBox'> = {},
  promptBox: AiAssistantCustomizations['promptBox'] = {},
): { widgetConfig: WidgetConfig; widgetClient: WidgetClient } => {
  const widgetConfig = createWidgetConfig(
    {
      ...DEFAULT_CUSTOMIZATIONS,
      aiAssistant: {
        ...DEFAULT_CUSTOMIZATIONS.aiAssistant,
        ...aiAssistant,
        promptBox: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant?.promptBox, suggestedQuestions: [QUESTION], ...promptBox },
      },
    },
    { searchSettings: { attrs_to_get: ['product_url', 'title', 'price'] } },
  );
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
    getUid: jest.fn((cb: (uid: string) => void) => cb('uid')),
    getSid: jest.fn((cb: (sid: string) => void) => cb('sid')),
    generateUuid: jest.fn((cb: (uuid: string) => void) => cb('chat-id')),
  });
  return { widgetConfig, widgetClient };
};

// Clients whose single chat surface is already mounted.
const clientsWithSurface = new WeakSet<WidgetClient>();

// Each host gets its own React root, as each host element does in production. The client's one chat
// surface gets a root of its own too, mounted once, after the first host (as the init flow does).
const renderHost = (
  ctx: { widgetConfig: WidgetConfig; widgetClient: WidgetClient },
  entry: 'launcher' | 'prompt-box',
  productId?: string,
): RenderResult => {
  const host = renderWidget(<EntryHost entry={entry} productId={productId} />, { ...ctx, messages: texts });
  if (!clientsWithSurface.has(ctx.widgetClient)) {
    clientsWithSurface.add(ctx.widgetClient);
    renderWidget(<AssistantSurface renderWithoutPortal />, { ...ctx, messages: texts });
  }
  return host;
};

const dialogs = (): HTMLElement[] => screen.queryAllByRole('dialog', { hidden: true });
const drawer = (): HTMLElement => screen.getByRole('dialog', { hidden: true });

const clickChip = async (): Promise<void> => {
  const chip = screen.getByRole('button', { name: QUESTION }) as HTMLButtonElement;
  await waitFor(() => expect(chip.disabled).toBe(false));
  await act(async () => {
    fireEvent.click(chip);
  });
};

// A follow-up typed into the shared drawer's own composer (no per-message pid).
const sendFromDrawer = async (text: string): Promise<void> => {
  const input = within(drawer()).getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { value: text } });
  });
  await act(async () => {
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  });
};

const hideDrawer = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(within(drawer()).getByLabelText(texts['a11yCloseChat']));
  });
  await waitFor(() => expect(dialogs()).toHaveLength(0));
};

const lastRequestParams = (): URLSearchParams => {
  const url = mockFetchEventSource.mock.calls[mockFetchEventSource.mock.calls.length - 1][0] as string;
  return new URLSearchParams(url.split('?')[1]);
};

const originalFetch = global.fetch;

beforeEach(() => {
  mockFetchEventSource.mockReset();
  // Each reply completes straight away (no text), so input is enabled again for the next send.
  mockFetchEventSource.mockImplementation(async (_url: string, options: { onclose: () => void }) => options.onclose());
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ result: { messages: [] } }) });
  localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('ai-assistant EntryHost: several entries, one conversation', () => {
  it('a prompt-box send shows the user message in the single shared drawer, and the launcher re-shows the same conversation', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box', 'p1');
    expect(dialogs()).toHaveLength(0);

    await clickChip();
    expect(dialogs()).toHaveLength(1);
    expect(within(drawer()).getByText(QUESTION)).toBeTruthy();
    expect(lastRequestParams().get('q')).toBe(QUESTION);
    expect(lastRequestParams().get('pid')).toBe('p1');
    const store = getChatSessionStore(ctx.widgetClient);
    const chatId = store.getChatId();

    await hideDrawer();
    expect(store.getSnapshot().isOpen).toBe(false);

    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-popup-trigger-button'));
    });
    expect(dialogs()).toHaveLength(1);
    expect(within(drawer()).getByText(QUESTION)).toBeTruthy();
    expect(store.getChatId()).toBe(chatId);
    expect(store.getSnapshot().chats).toHaveLength(1);
  });

  it('the launcher opens a fresh session when there is none yet', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-popup-trigger-button'));
    });
    expect(dialogs()).toHaveLength(1);
    expect(getChatSessionStore(ctx.widgetClient).getChatId()).toBe('chat-id');
  });

  it('a prompt box without a product id sends no pid', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'prompt-box');
    await clickChip();
    expect(lastRequestParams().has('pid')).toBe(false);
  });

  it('a changed product id goes with the next message while the conversation continues under the unsuffixed storage key', async () => {
    const ctx = makeClient();
    const host = renderHost(ctx, 'prompt-box', 'p1');
    await clickChip();
    const store = getChatSessionStore(ctx.widgetClient);
    const chatId = store.getChatId();
    const firstChats = store.getSnapshot().chats;
    await hideDrawer();

    host.rerender(<EntryHost entry='prompt-box' productId='p2' />);
    expect(store.getChatId()).toBe(chatId);
    expect(store.getSnapshot().chats).toBe(firstChats);

    await clickChip();
    expect(lastRequestParams().get('pid')).toBe('p2');
    expect(lastRequestParams().get('chat_id')).toBe(chatId);
    expect(store.getSnapshot().chats).toEqual([...firstChats, expect.objectContaining({ author: 'user', messages: [QUESTION] })]);
    expect(Object.keys(localStorage)).toEqual(['visenze_shopping_assistant_chat_id_1234']);
  });

  it('tags the session with the entry the shopper used', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box');
    const store = getChatSessionStore(ctx.widgetClient);
    const setActiveEntry = jest.spyOn(store, 'setActiveEntry');
    await clickChip();
    expect(setActiveEntry).toHaveBeenLastCalledWith('prompt-box', undefined);
    await hideDrawer();
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-popup-trigger-button'));
    });
    expect(setActiveEntry).toHaveBeenLastCalledWith('launcher', undefined);
  });
});

describe('ai-assistant EntryHost: widgetClient triggers', () => {
  it('sendChatMessage sends into the shared drawer', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box');
    await act(async () => {
      ctx.widgetClient.sendChatMessage('hello there');
    });
    expect(dialogs()).toHaveLength(1);
    expect(within(drawer()).getByText('hello there')).toBeTruthy();
    expect(lastRequestParams().get('q')).toBe('hello there');
  });

  it('openWithMessage opens the shared drawer with the given message and next steps', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box');
    await act(async () => {
      ctx.widgetClient.openWithMessage('Welcome back', ['Show deals']);
    });
    expect(dialogs()).toHaveLength(1);
    expect(within(drawer()).getAllByText('Welcome back').length).toBeGreaterThan(0);
    expect(within(drawer()).getByText('Show deals')).toBeTruthy();
    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });

  it('closeWidget hides the drawer without ending the session, and openWidget re-shows it', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box');
    await clickChip();
    const store = getChatSessionStore(ctx.widgetClient);
    const chatId = store.getChatId();

    await act(async () => {
      ctx.widgetClient.closeWidget();
    });
    await waitFor(() => expect(dialogs()).toHaveLength(0));
    expect(store.getSnapshot().chats).toHaveLength(1);

    await act(async () => {
      ctx.widgetClient.openWidget('');
    });
    expect(dialogs()).toHaveLength(1);
    expect(store.getChatId()).toBe(chatId);
    expect(within(drawer()).getByText(QUESTION)).toBeTruthy();
  });
});

describe('ai-assistant EntryHost: product context for follow-ups', () => {
  it('a drawer follow-up after a prompt-box ask carries that prompt box\'s product id', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box', 'p1');
    await clickChip();
    await sendFromDrawer('and in blue?');
    expect(lastRequestParams().get('q')).toBe('and in blue?');
    expect(lastRequestParams().get('pid')).toBe('p1');
  });

  it('a changed product id goes with the next drawer follow-up', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    const box = renderHost(ctx, 'prompt-box', 'p1');
    await clickChip();
    box.rerender(<EntryHost entry='prompt-box' productId='p2' />);
    await sendFromDrawer('and in blue?');
    expect(lastRequestParams().get('pid')).toBe('p2');
  });

  it('using the launcher afterwards drops the product context', async () => {
    const ctx = makeClient();
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box', 'p1');
    await clickChip();
    await hideDrawer();
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-popup-trigger-button'));
    });
    await sendFromDrawer('anything else?');
    expect(lastRequestParams().has('pid')).toBe(false);
  });
});

describe('ai-assistant EntryHost: data-pid on the launcher', () => {
  const clickLauncher = async (): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-popup-trigger-button'));
    });
  };

  it('only opens the drawer: nothing is sent on click', async () => {
    renderHost(makeClient(), 'launcher', 'p1');
    await clickLauncher();
    expect(dialogs()).toHaveLength(1);
    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });

  it('carries data-pid into drawer follow-ups', async () => {
    renderHost(makeClient(), 'launcher', 'p1');
    await clickLauncher();
    await sendFromDrawer('does it come in blue?');
    expect(lastRequestParams().get('pid')).toBe('p1');
  });
});

describe('ai-assistant EntryHost: restoring a stored conversation', () => {
  const storeChatId = (): void => {
    localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
  };
  const history = { result: { messages: [{ reqid: 'r1', type: 'human', message: 'old question' }] } };

  it('restores a stored conversation by default', async () => {
    storeChatId();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(history) });
    const ctx = makeClient();
    renderHost(ctx, 'prompt-box');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getChatSessionStore(ctx.widgetClient).getSnapshot().chats).toHaveLength(1));
    expect(getChatSessionStore(ctx.widgetClient).getChatId()).toBe('old-chat');
  });

  it('does not restore it when chatbot.persistChatEnabled is false', async () => {
    storeChatId();
    const ctx = makeClient();
    ctx.widgetConfig.customizations.chatbot = { ...ctx.widgetConfig.customizations.chatbot, persistChatEnabled: false };
    renderHost(ctx, 'launcher');
    renderHost(ctx, 'prompt-box');
    await act(async () => {});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(getChatSessionStore(ctx.widgetClient).getChatId()).toBe('');
  });

  it('keeps the prompt box disabled while the restore is in flight, and enables it once it settles', async () => {
    storeChatId();
    let settle: (value: unknown) => void = () => {};
    global.fetch = jest.fn(() => new Promise((resolve) => {
      settle = resolve;
    })) as unknown as typeof fetch;
    const ctx = makeClient();
    renderHost(ctx, 'prompt-box', 'p1');
    const chip = screen.getByRole('button', { name: QUESTION }) as HTMLButtonElement;
    const input = screen.getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(getChatSessionStore(ctx.widgetClient).getChatId()).toBe('old-chat');
    expect(chip.disabled).toBe(true);
    expect(input.disabled).toBe(true);
    await act(async () => {
      settle({ ok: true, json: () => Promise.resolve(history) });
    });
    await waitFor(() => expect(chip.disabled).toBe(false));
    expect(input.disabled).toBe(false);
  });
});

describe('ai-assistant EntryHost: the prompt-box entry', () => {
  // The prompt-box panel itself (the drawer has a composer with the same labels).
  const panel = (): HTMLElement => document.querySelector(`section[aria-label="${texts['promptBoxTitle']}"]`) as HTMLElement;
  const typeAndSubmit = async (text: string): Promise<void> => {
    const input = within(panel()).getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await act(async () => {
      fireEvent.change(input, { target: { value: text } });
    });
    await act(async () => {
      fireEvent.submit(input.closest('form') as HTMLFormElement);
    });
  };

  it('sends typed text with the product id, opening the shared drawer', async () => {
    renderHost(makeClient(), 'prompt-box', 'p1');
    await typeAndSubmit('is it waterproof?');
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    expect(lastRequestParams().get('q')).toBe('is it waterproof?');
    expect(lastRequestParams().get('pid')).toBe('p1');
    expect(within(drawer()).getByText('is it waterproof?')).toBeTruthy();
  });

  it('does not send whitespace-only text', async () => {
    renderHost(makeClient(), 'prompt-box', 'p1');
    await typeAndSubmit('   ');
    expect(mockFetchEventSource).not.toHaveBeenCalled();
    expect(dialogs()).toHaveLength(0);
  });

  it('sends Find Similar with the product id, opening the shared drawer', async () => {
    renderHost(makeClient({}, { findSimilar: { enabled: true } }), 'prompt-box', 'p1');
    const button = within(panel()).getByText(texts['promptBoxFindSimilar']).closest('button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    expect(lastRequestParams().get('q')).toBe('find similar products');
    expect(lastRequestParams().get('pid')).toBe('p1');
    expect(within(drawer()).getByText('find similar products')).toBeTruthy();
  });

  it('disables Find Similar while a reply is in flight, so it cannot be double-sent', async () => {
    mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
    renderHost(makeClient({}, { findSimilar: { enabled: true } }), 'prompt-box', 'p1');
    const button = within(panel()).getByText(texts['promptBoxFindSimilar']).closest('button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button.disabled).toBe(true);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
  });

  it('has no maximize icon: asking is what opens the shared drawer, and the launcher re-shows the same conversation', async () => {
    renderHost(makeClient(), 'prompt-box', 'p1');
    expect(within(panel()).queryByLabelText('Open chat panel')).toBeNull();
    await clickChip();
    await hideDrawer();
    expect(within(panel()).queryByLabelText('Open chat panel')).toBeNull();
    expect(within(panel()).getByLabelText(texts['a11yStartNewChat'])).toBeTruthy();
  });

  it('new chat resets the panel and aborts the reply, and a new question can then be sent', async () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementationOnce((_url: string, options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    renderHost(makeClient(), 'prompt-box', 'p1');
    await clickChip();
    await hideDrawer();
    await act(async () => {
      fireEvent.click(within(panel()).getByLabelText(texts['a11yStartNewChat']));
    });
    expect(signal?.aborted).toBe(true);
    expect(within(panel()).getByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeTruthy();
    expect(within(panel()).queryByLabelText(texts['a11yStartNewChat'])).toBeNull();

    await clickChip();
    expect(mockFetchEventSource).toHaveBeenCalledTimes(2);
    expect(lastRequestParams().get('q')).toBe(QUESTION);
  });

  it('saves the conversation by default, so a reload can restore it', async () => {
    renderHost(makeClient(), 'prompt-box', 'p1');
    await clickChip();
    expect(localStorage.getItem('visenze_shopping_assistant_chat_id_1234')).toBeTruthy();
  });

  it('does not save it when chatbot.persistChatEnabled is false', async () => {
    const ctx = makeClient();
    ctx.widgetConfig.customizations.chatbot = { ...ctx.widgetConfig.customizations.chatbot, persistChatEnabled: false };
    renderHost(ctx, 'prompt-box', 'p1');
    await clickChip();
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('visenze_shopping_assistant_chat_id_1234')).toBeNull();
  });

  describe('after a reload with a stored conversation', () => {
    const history = { result: { messages: [{ reqid: 'r1', type: 'human', message: 'earlier question' }, { reqid: 'r1', type: 'ai', message: 'earlier answer' }] } };
    beforeEach(() => {
      localStorage.setItem('visenze_shopping_assistant_chat_id_1234', JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(history) });
    });

    it('keeps the panel as it is, with the old chat one click away in the drawer through the launcher', async () => {
      const ctx = makeClient();
      renderHost(ctx, 'launcher');
      renderHost(ctx, 'prompt-box', 'p1');
      await waitFor(() => expect(getChatSessionStore(ctx.widgetClient).getSnapshot().chats.length).toBeGreaterThan(0));
      expect(dialogs()).toHaveLength(0);
      expect(within(panel()).getByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeTruthy();
      expect(screen.queryByText('earlier question')).toBeNull();
      await act(async () => {
        fireEvent.click(screen.getByTestId('wigmix-popup-trigger-button'));
      });
      expect(within(drawer()).getByText('earlier question')).toBeTruthy();
      expect(within(drawer()).getAllByText('earlier answer').length).toBeGreaterThan(0);
    });

    it('continues the restored conversation, old messages included, when something is asked', async () => {
      const ctx = makeClient();
      renderHost(ctx, 'prompt-box', 'p1');
      await waitFor(() => expect(getChatSessionStore(ctx.widgetClient).getSnapshot().chats.length).toBeGreaterThan(0));
      await typeAndSubmit('follow-up');
      expect(lastRequestParams().get('chat_id')).toBe('old-chat');
      expect(within(drawer()).getByText('earlier question')).toBeTruthy();
      expect(within(drawer()).getByText('follow-up')).toBeTruthy();
    });
  });
});
