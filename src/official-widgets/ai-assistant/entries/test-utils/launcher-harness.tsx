import { act, fireEvent, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { mockFetchEventSource } from './launcher-mocks';
import type { AssistantEntry } from '../../../../common/client/entry';
import { getChatSessionStore } from '../../../../common/components/chat/session/chat-session-registry';
import { getLocaleTexts } from '../../../../common/locales/locale';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../../../common/test-utils';
import type { WidgetConfig } from '../../../../common/wigmix-core';
import AssistantSurface from '../../AssistantSurface';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from '../../default-config';
import EntryHost from '../../entry-host';

// Shared setup of the LauncherEntry specs (core / voice / image / chat): the launcher entry (EntryHost) and the
// shared chat surface (AssistantSurface) are rendered in their own React roots, as in production, on one
// widgetClient. Voice is NOT mocked (unlike the other ai-assistant specs): the mic cases drive the real useVoice
// through a stubbed window.SpeechRecognition. Call createLauncherHarness() inside a describe: it registers the
// fake-timer / storage hooks for that describe.

export type Customizations = WidgetConfig['customizations'];
export type LauncherConfig = NonNullable<NonNullable<Customizations['aiAssistant']>['launcher']>;

// The widget's OWN texts: every label in the specs must resolve from them (no raw ids).
export const texts = DEFAULT_TEXTS['en'];
export const launcherDefaults = DEFAULT_CUSTOMIZATIONS.aiAssistant?.launcher;
export const aiGreeting = launcherDefaults?.greetings?.ai || '';

export const withLauncher = (launcher: LauncherConfig): Partial<Customizations> => ({
  aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, launcher: { ...launcherDefaults, ...launcher } },
});
export const withChatbot = (chatbot: NonNullable<Customizations['chatbot']>): Partial<Customizations> => ({
  chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, ...chatbot },
});

export interface TestClient {
  widgetConfig: WidgetConfig;
  widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
  mockVisearchClient: ViSearchClient;
}

export const createTestClient = (visearchOverrides: Partial<ViSearchClient> = {}, overrides: Partial<Customizations> = {}): TestClient => {
  const widgetConfig = createWidgetConfig(
    { ...DEFAULT_CUSTOMIZATIONS, ...overrides },
    { searchSettings: { attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'] } },
  );
  const { widgetClient, mockVisearchClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant', {
    getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
    getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
    generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
    productMultisearch: jest.fn(),
    ...visearchOverrides,
  });
  return { widgetConfig, widgetClient, mockVisearchClient };
};

export interface RenderOptions {
  visearchOverrides?: Partial<ViSearchClient>;
  overrides?: Partial<Customizations>;
  darkMode?: boolean;
  width?: number;
  // Entries mounted (each in its own root) BEFORE the search bar.
  otherEntries?: Exclude<AssistantEntry, 'embedded'>[];
  // The page locale; its texts are resolved from the widget's own DEFAULT_TEXTS as the init flow does.
  locale?: string;
}

export interface LauncherHarness {
  readonly testComponent: RenderResult;
  renderLauncherEntry: (options?: RenderOptions) => TestClient & { store: ReturnType<typeof getChatSessionStore> };
  renderLauncher: (overrides?: Partial<Customizations>, darkMode?: boolean) => TestClient & { store: ReturnType<typeof getChatSessionStore> };
  getTextInBody: (text: string) => HTMLElement | null;
  countTextInLog: (text: string) => number;
  revealAll: () => Promise<void>;
  openEntryPointAndWait: (labelId: string) => void;
  hideDrawer: (store: ReturnType<typeof getChatSessionStore>) => void;
  closeFullScreen: () => void;
  sendMessageAndGetStreamController: (messageText: string) => { emitEvent: (event: string, data: any) => void; closeStream: () => void };
  installSpeechRecognition: () => () => void;
}

export const createLauncherHarness = (): LauncherHarness => {
  // The render of the launcher EntryHost only. The other entries and the chat surface are separate renders; specs
  // query the whole widget through it only because RTL queries default to document.body (never pass a container).
  let testComponent: RenderResult;
  // Mounts the other entries, the launcher entry and the client's one chat surface, each in its own root.
  const renderLauncherEntry = ({
    visearchOverrides, overrides, darkMode = false, width, otherEntries = [], locale = 'en',
  }: RenderOptions = {}): TestClient & { store: ReturnType<typeof getChatSessionStore> } => {
    const client = createTestClient(visearchOverrides, overrides);
    const wrap = (ui: ReactElement): ReactElement => (width === undefined ? ui : <ResponsiveContext.Provider value={{ width }}>{ui}</ResponsiveContext.Provider>);
    const messages = locale === 'en' ? texts : getLocaleTexts(locale, DEFAULT_TEXTS);
    const options = { widgetConfig: client.widgetConfig, widgetClient: client.widgetClient, messages, darkMode, locale };
    otherEntries.forEach((entry) => renderWidget(<EntryHost entry={entry} />, options));
    testComponent = renderWidget(wrap(<EntryHost entry='launcher' />), options);
    renderWidget(wrap(<AssistantSurface renderWithoutPortal />), options);
    return { ...client, store: getChatSessionStore(client.widgetClient) };
  };

  // Shorthand for renderLauncherEntry with only customization overrides and dark mode.
  const renderLauncher = (overrides: Partial<Customizations> = {}, darkMode = false): ReturnType<typeof renderLauncherEntry> => renderLauncherEntry({ overrides, darkMode });

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

  // Counts `text` as chat bubbles in the message log only (the sr-only live region duplicates the latest message).
  const countTextInLog = (text: string): number => {
    const log = document.body.querySelector('[role="log"]');
    if (!log) {
      return 0;
    }
    const walker = document.createTreeWalker(log, NodeFilter.SHOW_TEXT);
    let count = 0;
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.includes(text)) {
        count += 1;
      }
      node = walker.nextNode();
    }
    return count;
  };

  const revealAll = async (): Promise<void> => {
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
  };

  const openEntryPointAndWait = (labelId: string): void => {
    const button = testComponent.getByRole('button', { name: texts[labelId] });
    act(() => {
      fireEvent.click(button);
    });
  };

  // Hides the drawer and lets react-modal finish its close (it aria-hides the page while open).
  const hideDrawer = (store: ReturnType<typeof getChatSessionStore>): void => {
    act(() => store.hide());
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  };

  const closeFullScreen = (): void => {
    act(() => {
      // hidden: a drawer that was open just before may still be finishing its react-modal close (page aria-hidden).
      fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true }));
    });
  };

  const sendMessageAndGetStreamController = (messageText: string): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
  } => {
    const textarea = document.body.querySelector('input[aria-label]') as HTMLInputElement;
    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onmessage = options.onmessage;
      onclose = options.onclose;
    });
    act(() => {
      fireEvent.change(textarea, { target: { value: messageText } });
    });
    act(() => {
      fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
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

  const installSpeechRecognition = (): () => void => {
    const original = (window as any).SpeechRecognition;
    (window as any).SpeechRecognition = function SpeechRecognitionMock(): void {
      return undefined;
    };
    (window as any).SpeechRecognition.prototype.start = jest.fn();
    (window as any).SpeechRecognition.prototype.stop = jest.fn();
    (window as any).SpeechRecognition.prototype.abort = jest.fn();
    return () => {
      if (original === undefined) {
        delete (window as any).SpeechRecognition;
      } else {
        (window as any).SpeechRecognition = original;
      }
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
    Element.prototype.scrollIntoView = jest.fn();
    localStorage.clear();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  return {
    get testComponent(): RenderResult {
      return testComponent;
    },
    renderLauncherEntry,
    renderLauncher,
    getTextInBody,
    countTextInLog,
    revealAll,
    openEntryPointAndWait,
    hideDrawer,
    closeFullScreen,
    sendMessageAndGetStreamController,
    installSpeechRecognition,
  };
};
