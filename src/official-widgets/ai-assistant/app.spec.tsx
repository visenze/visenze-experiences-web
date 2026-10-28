import { act, fireEvent, render, type RenderResult, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import App from './app';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { getChatSessionStore } from '../../common/components/chat/session/chat-session-registry';
import { createMockWidgetClient, createWidgetConfig } from '../../common/test-utils';
import type { WidgetClient, WidgetConfig } from '../../common/wigmix-core';

const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));
jest.mock('react-webcam', () => {
  const { forwardRef } = jest.requireActual('react');
  return { __esModule: true, default: forwardRef(() => <video data-testid='mock-webcam' />) };
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
// The real AppWrapper mounts a Shadow DOM that needs the bundle's style template; App's own job
// (picking the entry, tracking data-pid) only needs the context it provides.
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

type PromptBoxCustomizations = NonNullable<WidgetConfig['customizations']['aiAssistant']>['promptBox'];

const renderApp = (
  dataset: Record<string, string> = {},
  promptBox: PromptBoxCustomizations = {},
): { result: RenderResult; element: HTMLElement; widgetClient: WidgetClient } => {
  const widgetConfig: WidgetConfig = createWidgetConfig(
    {
      ...DEFAULT_CUSTOMIZATIONS,
      aiAssistant: {
        ...DEFAULT_CUSTOMIZATIONS.aiAssistant,
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
  const element = document.createElement('div');
  Object.entries(dataset).forEach(([key, value]) => {
    element.dataset[key] = value;
  });
  const result = render(<App widgetConfig={widgetConfig} widgetClient={widgetClient} element={element} />);
  return { result, element, widgetClient };
};

const clickChip = async (result: RenderResult): Promise<void> => {
  const chip = result.getByRole('button', { name: QUESTION }) as HTMLButtonElement;
  await waitFor(() => expect(chip.disabled).toBe(false));
  await act(async () => {
    fireEvent.click(chip);
  });
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
  jest.restoreAllMocks();
});

describe('ai-assistant App', () => {
  it("renders the prompt-box panel for data-entry='prompt-box'", () => {
    const { result } = renderApp({ entry: 'prompt-box', pid: 'p1' });
    expect(result.getByLabelText(texts['a11yChatInput'])).toBeTruthy();
    expect(result.getByRole('button', { name: QUESTION })).toBeTruthy();
    expect(result.queryByTestId('wigmix-popup-trigger-button')).toBeNull();
  });

  it('renders the launcher trigger when there is no data-entry', () => {
    const { result } = renderApp();
    expect(result.getByTestId('wigmix-popup-trigger-button').getAttribute('aria-label')).toBe(texts['triggerCTA']);
    expect(result.queryByLabelText(texts['a11yChatInput'])).toBeNull();
  });

  it('renders the launcher and warns for an unknown data-entry', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderApp({ entry: 'sidebar' });
    expect(result.getByTestId('wigmix-popup-trigger-button')).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('sidebar'));
  });

  it('sends the current data-pid with each message, continuing the same conversation when it changes', async () => {
    const { result, element, widgetClient } = renderApp({ entry: 'prompt-box', pid: 'p1' });
    await clickChip(result);
    expect(lastRequestParams().get('pid')).toBe('p1');
    const store = getChatSessionStore(widgetClient);
    const chatId = store.getChatId();
    const firstChats = store.getSnapshot().chats;

    await act(async () => {
      element.dataset['pid'] = 'p2';
    });
    expect(store.getChatId()).toBe(chatId);
    expect(store.getSnapshot().chats).toBe(firstChats);

    await clickChip(result);
    expect(lastRequestParams().get('pid')).toBe('p2');
    expect(lastRequestParams().get('chat_id')).toBe(chatId);
    expect(store.getSnapshot().chats).toHaveLength(2);
    expect(Object.keys(localStorage)).toEqual(['visenze_shopping_assistant_chat_id_1234']);
  });

  it('a data-pid change reaches follow-ups sent without a product id (e.g. from the drawer)', async () => {
    const { result, element, widgetClient } = renderApp({ entry: 'prompt-box', pid: 'p1' });
    await clickChip(result);
    const store = getChatSessionStore(widgetClient);
    await act(async () => {
      await store.sendMessage('and in blue?');
    });
    expect(lastRequestParams().get('pid')).toBe('p1');
    await act(async () => {
      element.dataset['pid'] = 'p2';
    });
    await act(async () => {
      await store.sendMessage('and in red?');
    });
    expect(lastRequestParams().get('q')).toBe('and in red?');
    expect(lastRequestParams().get('pid')).toBe('p2');
  });

  it('sends no pid when data-pid is missing', async () => {
    const { result } = renderApp({ entry: 'prompt-box' });
    await clickChip(result);
    expect(lastRequestParams().has('pid')).toBe(false);
  });

  it.each(['', '   ', 'undefined', 'null', '{{ product.id }}', '<product-id>'])('treats data-pid %j as no product: no pid sent, no Find Similar', async (pid) => {
    const { result } = renderApp({ entry: 'prompt-box', pid }, { findSimilar: { enabled: true } });
    expect(result.queryByText(texts['promptBoxFindSimilar'])).toBeNull();
    await clickChip(result);
    expect(lastRequestParams().has('pid')).toBe(false);
  });

  it('treats a data-pid change to a blank or placeholder value as no product', async () => {
    const { result, element } = renderApp({ entry: 'prompt-box', pid: 'p1' });
    await act(async () => {
      element.dataset['pid'] = '{{ product.id }}';
    });
    await clickChip(result);
    expect(lastRequestParams().has('pid')).toBe(false);
  });

  it('picks up a product id that appears after starting without one', async () => {
    const { result, element } = renderApp({ entry: 'prompt-box' }, { findSimilar: { enabled: true } });
    expect(result.queryByText(texts['promptBoxFindSimilar'])).toBeNull();
    await act(async () => {
      element.dataset['pid'] = ' p9 ';
    });
    expect(result.getByText(texts['promptBoxFindSimilar'])).toBeTruthy();
    await clickChip(result);
    expect(lastRequestParams().get('pid')).toBe('p9');
  });

  it("renders the embedded entry for data-entry='embedded', auto-sending its data-query", async () => {
    const { result } = renderApp({ entry: 'embedded', query: 'red running shoes' });
    expect(result.queryByTestId('wigmix-popup-trigger-button')).toBeNull();
    await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalledTimes(1));
    expect(lastRequestParams().get('q')).toBe('red running shoes');
  });

  it.each(['undefined', '{{ product.title }}', '   '])('treats data-query %j on an embedded element as no query: noQueryProvided, nothing sent', async (query) => {
    const { result } = renderApp({ entry: 'embedded', query });
    expect(result.getByText(texts['noQueryProvided'])).toBeTruthy();
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });
    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });

  it('starts a fresh embedded conversation when data-query or data-pid changes', async () => {
    const { element } = renderApp({ entry: 'embedded', query: 'red running shoes', pid: 'p1' });
    await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalledTimes(1));
    expect(lastRequestParams().get('pid')).toBe('p1');

    await act(async () => {
      element.dataset['pid'] = 'p2';
    });
    await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalledTimes(2));
    expect(lastRequestParams().get('q')).toBe('red running shoes');
    expect(lastRequestParams().get('pid')).toBe('p2');

    await act(async () => {
      element.dataset['query'] = 'blue boots';
    });
    await waitFor(() => expect(mockFetchEventSource).toHaveBeenCalledTimes(3));
    expect(lastRequestParams().get('q')).toBe('blue boots');
  });

  it("shows noQueryProvided for data-entry='embedded' without a data-query, and sends nothing", async () => {
    const { result } = renderApp({ entry: 'embedded' });
    expect(result.getByText(texts['noQueryProvided'])).toBeTruthy();
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });
    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });
});
