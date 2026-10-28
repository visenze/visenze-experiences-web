import { act, fireEvent, render, type RenderResult, within } from '@testing-library/react';
import { type FC, type ReactElement, type ReactNode, useCallback, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import type { AssistantEntry } from '../../../common/client/entry';
import { getChatSessionStore } from '../../../common/components/chat/session/chat-session-registry';
import { RootContext } from '../../../common/components/shadow-wrapper';
import { getLocaleTexts } from '../../../common/locales/locale';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../../common/test-utils';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { WidgetConfig } from '../../../common/wigmix-core';
import AssistantSurface from '../AssistantSurface';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from '../default-config';
import EntryHost from '../entry-host';

// Ported from ai-search-launcher.spec.tsx: the search-bar entry (EntryHost) and the shared chat surface
// (AssistantSurface) are rendered in their own React roots, as in production, on one widgetClient.
// Voice is NOT mocked here (unlike the other ai-assistant specs): the mic cases drive the real useVoice
// through a stubbed window.SpeechRecognition, exactly as the standalone spec does.

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

jest.mock('@heroui/input', () => ({
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  Textarea: (props: any) => (
    <div data-testid='chat-textarea-wrapper'>
      <textarea
        data-testid='chat-textarea'
        aria-label={props['aria-label']}
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
      {props.endContent && <div data-testid='chat-submit-button'>{props.endContent}</div>}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  Input: (props: any) => (
    <div data-testid='chat-textarea-wrapper'>
      <input
        data-testid='chat-textarea'
        aria-label={props['aria-label']}
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
      {props.endContent && <div data-testid='chat-submit-button'>{props.endContent}</div>}
    </div>
  ),
}));

type Customizations = WidgetConfig['customizations'];
type SearchBarConfig = NonNullable<NonNullable<Customizations['aiAssistant']>['searchBar']>;

// The widget's OWN texts: every label below must resolve from them (no raw ids).
const texts = DEFAULT_TEXTS['en'];
const searchBarDefaults = DEFAULT_CUSTOMIZATIONS.aiAssistant?.searchBar;
const aiGreeting = searchBarDefaults?.greetings?.ai || '';

const withSearchBar = (searchBar: SearchBarConfig): Partial<Customizations> => ({
  aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, searchBar: { ...searchBarDefaults, ...searchBar } },
});
const withChatbot = (chatbot: NonNullable<Customizations['chatbot']>): Partial<Customizations> => ({
  chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, ...chatbot },
});

interface TestClient {
  widgetConfig: WidgetConfig;
  widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
  mockVisearchClient: ViSearchClient;
}

const createTestClient = (visearchOverrides: Partial<ViSearchClient> = {}, overrides: Partial<Customizations> = {}): TestClient => {
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

describe('ai-assistant search-bar entry', () => {
  let testComponent: RenderResult;

  interface RenderOptions {
    visearchOverrides?: Partial<ViSearchClient>;
    overrides?: Partial<Customizations>;
    darkMode?: boolean;
    width?: number;
    // Entries mounted (each in its own root) BEFORE the search bar.
    otherEntries?: Exclude<AssistantEntry, 'embedded'>[];
    // The page locale; its texts are resolved from the widget's own DEFAULT_TEXTS as the init flow does.
    locale?: string;
  }

  // Mounts the other entries, the search-bar entry and the client's one chat surface, each in its own root.
  const renderSearchBar = ({
    visearchOverrides, overrides, darkMode = false, width, otherEntries = [], locale = 'en',
  }: RenderOptions = {}): TestClient & { store: ReturnType<typeof getChatSessionStore> } => {
    const client = createTestClient(visearchOverrides, overrides);
    const wrap = (ui: ReactElement): ReactElement => (width === undefined ? ui : <ResponsiveContext.Provider value={{ width }}>{ui}</ResponsiveContext.Provider>);
    const messages = locale === 'en' ? texts : getLocaleTexts(locale, DEFAULT_TEXTS);
    const options = { widgetConfig: client.widgetConfig, widgetClient: client.widgetClient, messages, darkMode, locale };
    otherEntries.forEach((entry) => renderWidget(<EntryHost entry={entry} />, options));
    testComponent = renderWidget(wrap(<EntryHost entry='search-bar' />), options);
    renderWidget(wrap(<AssistantSurface renderWithoutPortal />), options);
    return { ...client, store: getChatSessionStore(client.widgetClient) };
  };

  // The standalone spec's renderLauncher(visearchOverrides, locale, callbacks, customizationOverrides, darkMode).
  const renderLauncher = (overrides: Partial<Customizations> = {}, darkMode = false): ReturnType<typeof renderSearchBar> => renderSearchBar({ overrides, darkMode });

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
      (window as any).SpeechRecognition = original;
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

  // ============================================================
  // Entry bar
  // ============================================================

  describe('entry bar', () => {
    it('renders the three entry-bar buttons, labelled from the widget\'s own default texts', () => {
      renderLauncher();
      const labels = ['a11yOpenImageSearch', 'a11yOpenVoiceSearch', 'a11yOpenAskAi'];
      labels.forEach((id) => {
        expect(texts[id]).toBeTruthy();
        expect(texts[id]).not.toBe(id);
        expect(testComponent.getByRole('button', { name: texts[id] })).toBeTruthy();
      });
      const aiTrigger = testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      expect(texts['triggerAskAi']).toBeTruthy();
      expect(aiTrigger.textContent).toBe(texts['triggerAskAi']);
    });

    it.each([
      ['cameraEntryEnabled', 'a11yOpenImageSearch'],
      ['micEntryEnabled', 'a11yOpenVoiceSearch'],
      ['askAiEntryEnabled', 'a11yOpenAskAi'],
    ])('does not render a button whose %s is false, and keeps the others', (flag, labelId) => {
      renderLauncher(withSearchBar({ [flag]: false }));
      expect(testComponent.queryByRole('button', { name: texts[labelId] })).toBeNull();
      expect(testComponent.getAllByRole('button')).toHaveLength(2);
    });

    it('always labels the Ask AI trigger with the fixed copy, independent of the configured dialog title', () => {
      renderLauncher(withChatbot({ title: 'Custom Dialog Title' }));
      const aiTrigger = testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      expect(aiTrigger.textContent).toBe(texts['triggerAskAi']);
      expect(aiTrigger.textContent).not.toBe('Custom Dialog Title');
      openEntryPointAndWait('a11yOpenAskAi');
      expect(getTextInBody('Custom Dialog Title')).toBeTruthy();
    });

    it('does not render the full-screen surface before any entry point is opened', () => {
      renderLauncher();
      expect(testComponent.queryByRole('dialog')).toBeNull();
    });

    it('does not throw when RootContext starts null and is filled in on the very first commit', () => {
      const { widgetConfig, widgetClient } = createTestClient();
      const NullThenFilledRootWrapper: FC<{ children: ReactNode }> = ({ children }) => {
        const [rootNode, setRootNode] = useState<HTMLElement | null>(null);
        const onRefChange = useCallback((ref: HTMLDivElement | null) => {
          if (ref) {
            setRootNode(ref);
          }
        }, []);
        return (
          <div ref={onRefChange}>
            <RootContext.Provider value={rootNode}>{children}</RootContext.Provider>
          </div>
        );
      };
      expect(() => {
        render(
          <NullThenFilledRootWrapper>
            <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
              <IntlProvider messages={texts} locale='en' defaultLocale='en'>
                <EntryHost entry='search-bar' />
              </IntlProvider>
            </WidgetDataContext.Provider>
          </NullThenFilledRootWrapper>,
        );
      }).not.toThrow();
    });

    describe('Ask AI entry logo', () => {
      const LOGO_URL = 'https://example.com/ask-brand.svg';

      const renderWithEntryIcon = (askAiEntryIcon: SearchBarConfig['askAiEntryIcon'], darkMode = false): HTMLElement => {
        renderLauncher(withSearchBar({ askAiEntryIcon }), darkMode);
        return testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      };

      it('replaces the text with the configured logo by default, keeping the accessible name', () => {
        const aiTrigger = renderWithEntryIcon({ url: LOGO_URL });
        expect(aiTrigger.querySelector('img')?.getAttribute('src')).toBe(LOGO_URL);
        expect(aiTrigger.textContent).toBe('');
      });

      it('places the text before or after the logo per layout', () => {
        const textIcon = renderWithEntryIcon({ url: LOGO_URL, layout: 'TEXT_ICON' });
        expect(textIcon.firstChild?.textContent).toBe(texts['triggerAskAi']);
        expect(textIcon.lastElementChild?.tagName).toBe('IMG');
        expect(textIcon.className).toContain('gap-2');
        testComponent.unmount();

        const iconText = renderWithEntryIcon({ url: LOGO_URL, layout: 'ICON_TEXT' });
        expect(iconText.firstElementChild?.tagName).toBe('IMG');
        expect(iconText.lastChild?.textContent).toBe(texts['triggerAskAi']);
        expect(iconText.className).toContain('gap-2');
      });

      it('shows text only for the TEXT layout or when no logo url is set', () => {
        const textLayout = renderWithEntryIcon({ url: LOGO_URL, layout: 'TEXT' });
        expect(textLayout.querySelector('img')).toBeNull();
        expect(textLayout.textContent).toBe(texts['triggerAskAi']);
        testComponent.unmount();

        const noUrl = renderWithEntryIcon({ layout: 'ICON' });
        expect(noUrl.querySelector('img')).toBeNull();
        expect(noUrl.textContent).toBe(texts['triggerAskAi']);
      });

      it('fills a logo-only button by default, and sizes the logo by height', () => {
        const logoOnly = renderWithEntryIcon({ url: LOGO_URL });
        expect(logoOnly.querySelector('img')?.style.height).toBe('32px');
        expect(logoOnly.querySelector('img')?.style.width).toBe('');
        expect(logoOnly.className).not.toContain('px-3');
        expect(logoOnly.className).toContain('border-gray');
        testComponent.unmount();
        const beside = renderWithEntryIcon({ url: LOGO_URL, layout: 'ICON_TEXT' });
        expect(beside.querySelector('img')?.style.height).toBe('22px');
        expect(beside.querySelector('img')?.style.width).toBe('');
        expect(beside.className).toContain('px-3 py-2');
        testComponent.unmount();
        const sized = renderWithEntryIcon({ url: LOGO_URL, height: 32, width: 113 }).querySelector('img');
        expect(sized?.style.height).toBe('32px');
        expect(sized?.style.width).toBe('113px');
      });

      it('applies the configured padding only when a logo is shown', () => {
        const padded = renderWithEntryIcon({ url: LOGO_URL, padding: { x: 8, y: 4 } });
        expect(padded.style.paddingLeft).toBe('8px');
        expect(padded.style.paddingRight).toBe('8px');
        expect(padded.style.paddingTop).toBe('4px');
        expect(padded.style.paddingBottom).toBe('4px');
        testComponent.unmount();

        const textOnly = renderWithEntryIcon({ url: LOGO_URL, layout: 'TEXT', padding: { x: 8, y: 4 } });
        expect(textOnly.style.paddingLeft).toBe('');
        expect(textOnly.style.paddingTop).toBe('');
      });

      it('tints the logo with color, or colorDark in dark mode', () => {
        const icon = { url: LOGO_URL, color: 'rgb(255, 0, 0)', colorDark: 'rgb(0, 0, 255)' };
        const tintOf = (trigger: HTMLElement): string | undefined => trigger.querySelector<HTMLElement>('.wigmix-entry-logo > span')?.style.backgroundColor;

        expect(tintOf(renderWithEntryIcon(icon))).toBe('rgb(255, 0, 0)');
        testComponent.unmount();
        expect(tintOf(renderWithEntryIcon(icon, true))).toBe('rgb(0, 0, 255)');
      });
    });
  });

  // ============================================================
  // Opening the shared session (store handshake)
  // ============================================================

  describe('opening the shared session', () => {
    it('Ask AI on a fresh session starts one with open() and opens the full screen for the ai entry point', () => {
      const { store } = renderLauncher();
      const open = jest.spyOn(store, 'open');
      const reopen = jest.spyOn(store, 'reopen');
      openEntryPointAndWait('a11yOpenAskAi');
      expect(open).toHaveBeenCalledTimes(1);
      expect(reopen).not.toHaveBeenCalled();
      expect(store.getChatId()).toBe('test-chat-id');
      expect(store.getActiveEntry()).toBe('search-bar');
      expect(store.getSnapshot()).toEqual(expect.objectContaining({
        isOpen: true,
        surfaceMode: 'fullscreen',
        activation: { entryPoint: 'ai', isResumed: false, userMessageBaseline: 0 },
      }));
    });

    it('Ask AI with an existing chat id resumes it with reopen()', () => {
      const { store } = renderLauncher();
      act(() => store.open());
      hideDrawer(store);
      const open = jest.spyOn(store, 'open');
      const reopen = jest.spyOn(store, 'reopen');
      openEntryPointAndWait('a11yOpenAskAi');
      expect(open).not.toHaveBeenCalled();
      expect(reopen).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot().activation).toEqual({ entryPoint: 'ai', isResumed: true, userMessageBaseline: 0 });
      expect(store.getSnapshot().surfaceMode).toBe('fullscreen');
    });

    it('captures the user-authored turn count as the activation baseline', () => {
      mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
      const { store } = renderLauncher();
      act(() => store.open());
      act(() => {
        store.sendMessage('one').catch(() => undefined);
      });
      hideDrawer(store);
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(store.getSnapshot().activation).toEqual({ entryPoint: 'image', isResumed: true, userMessageBaseline: 1 });
    });

    it.each([
      ['camera', 'a11yOpenImageSearch', 'image'],
      ['mic', 'a11yOpenVoiceSearch', 'mic'],
    ] as const)('%s on a fresh session opens the full screen without minting a chat id', (_name, labelId, entryPoint) => {
      const { store, mockVisearchClient } = renderLauncher();
      const open = jest.spyOn(store, 'open');
      openEntryPointAndWait(labelId);
      expect(open).not.toHaveBeenCalled();
      expect(store.getChatId()).toBe('');
      expect(mockVisearchClient.generateUuid).not.toHaveBeenCalled();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({
        isOpen: true,
        surfaceMode: 'fullscreen',
        activation: { entryPoint, isResumed: false, userMessageBaseline: 0 },
      }));
    });

    it('tags RESULT_LOAD with entry: search-bar after a search-bar interaction', async () => {
      const { widgetClient } = renderLauncher();
      widgetClient.sendEvent = jest.fn();
      widgetClient.setLastTrackingMeta = jest.fn();
      openEntryPointAndWait('a11yOpenAskAi');
      const stream = sendMessageAndGetStreamController('Show me shoes');
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('product', { product_id: 'p1', main_image_url: 'https://example.com/p1.jpg', data: {} });
      stream.emitEvent('chat_token', { value: 'Try this [[p1]]' });
      stream.closeStream();
      await revealAll();
      const expected = { queryId: 'req-1', cat: 'Result', entry: 'search-bar' };
      expect(widgetClient.sendEvent).toHaveBeenCalledWith('result_load', expected);
      expect(widgetClient.setLastTrackingMeta).toHaveBeenCalledWith(expected);
    });
  });

  // ============================================================
  // Closing, focus and the other entries
  // ============================================================

  describe('closing and the other entries', () => {
    it('closes the full screen and returns to the entry-bar-only view', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      closeFullScreen();
      expect(testComponent.queryByRole('dialog')).toBeNull();
      expect(testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] })).toBeTruthy();
    });

    it.each([
      ['a11yOpenImageSearch'],
      ['a11yOpenVoiceSearch'],
      ['a11yOpenAskAi'],
    ])('returns focus to the %s button that opened it, with two entry hosts mounted', (labelId) => {
      renderSearchBar({ otherEntries: ['launcher'] });
      const button = testComponent.getByRole('button', { name: texts[labelId] });
      act(() => {
        fireEvent.click(button);
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(document.activeElement).not.toBe(button);
      closeFullScreen();
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(testComponent.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(button);
    });

    it('after the full screen closes, the launcher entry opens the drawer on the same conversation', async () => {
      const { store } = renderSearchBar({ otherEntries: ['launcher'] });
      openEntryPointAndWait('a11yOpenAskAi');
      // The reply stays in flight (the stream is never closed).
      sendMessageAndGetStreamController('red shoes');
      const chatId = store.getChatId();
      const { chats } = store.getSnapshot();
      // Closing aborts the in-flight reply; its settling is async.
      await act(async () => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });
      act(() => {
        fireEvent.click(testComponent.getByTestId('wigmix-popup-trigger-button'));
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', isOpen: true }));
      expect(store.getChatId()).toBe(chatId);
      expect(store.getSnapshot().chats).toBe(chats);
      const dialogs = testComponent.getAllByRole('dialog', { hidden: true });
      expect(dialogs).toHaveLength(1);
      expect(within(dialogs[0]).getByLabelText(texts['a11yCloseChat'])).toBeTruthy();
      expect(within(dialogs[0]).getByText('red shoes')).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['a11yCloseFullScreen'] })).toBeNull();
    });

    it('from an open drawer, a search-bar button switches to the full screen; closing restores focus and the host\'s overflow', () => {
      const { store } = renderSearchBar({ otherEntries: ['launcher'] });
      document.body.style.overflow = 'auto';
      act(() => {
        fireEvent.click(testComponent.getByTestId('wigmix-popup-trigger-button'));
      });
      expect(store.getSnapshot().surfaceMode).toBe('drawer');
      expect(document.body.style.overflow).toBe('hidden');

      // hidden: react-modal aria-hides the page behind the open drawer (jsdom has no shadow roots to keep it out).
      const micButton = testComponent.getByRole('button', { name: texts['a11yOpenVoiceSearch'], hidden: true });
      act(() => {
        fireEvent.click(micButton);
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'fullscreen', isOpen: true }));
      expect(testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true })).toBeTruthy();
      // The drawer's react-modal close transition, then only the full screen is left.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(testComponent.queryByLabelText(texts['a11yCloseChat'])).toBeNull();
      expect(document.body.style.overflow).toBe('hidden');

      closeFullScreen();
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(testComponent.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
      expect(document.activeElement).toBe(micButton);
      expect(document.body.style.overflow).toBe('auto');
    });

    it('closeWidget() closes an open full screen like its close button: back to drawer mode, reply aborted, focus returned', async () => {
      const { store, widgetClient } = renderSearchBar();
      const askAiButton = testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      act(() => {
        fireEvent.click(askAiButton);
      });
      let signal: AbortSignal | undefined;
      mockFetchEventSource.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
        signal = options.signal;
        return new Promise(() => {});
      });
      const textarea = document.body.querySelector('input[aria-label]') as HTMLInputElement;
      act(() => {
        fireEvent.change(textarea, { target: { value: 'red shoes' } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });
      expect(signal?.aborted).toBe(false);

      await act(async () => {
        widgetClient.closeWidget();
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(signal?.aborted).toBe(true);
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: false }));
      expect(testComponent.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
      expect(document.activeElement).toBe(askAiButton);
    });

    it('closeWidget() then openWithMessage() after the camera entry shows the message in the drawer, not the image welcome screen', async () => {
      const { store, widgetClient } = renderSearchBar();
      const cameraButton = testComponent.getByRole('button', { name: texts['a11yOpenImageSearch'] });
      act(() => {
        fireEvent.click(cameraButton);
      });
      expect(testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();

      await act(async () => {
        widgetClient.closeWidget();
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: false }));
      expect(testComponent.queryByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true })).toBeNull();
      expect(document.activeElement).toBe(cameraButton);

      await act(async () => {
        widgetClient.openWithMessage('hello', ['a']);
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', isOpen: true }));
      expect(testComponent.queryByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true })).toBeNull();
      expect(testComponent.queryByRole('button', { name: texts['a11yTakePhoto'], hidden: true })).toBeNull();
      const dialogs = testComponent.getAllByRole('dialog', { hidden: true });
      expect(dialogs).toHaveLength(1);
      expect(within(dialogs[0]).getByLabelText(texts['a11yCloseChat'])).toBeTruthy();
      expect(within(dialogs[0]).getAllByText('hello').length).toBeGreaterThan(0);
    });

    it('closeWidget() with only the drawer open still just hides it, keeping the conversation', async () => {
      const { store, widgetClient } = renderSearchBar({ otherEntries: ['launcher'] });
      act(() => {
        fireEvent.click(testComponent.getByTestId('wigmix-popup-trigger-button'));
      });
      act(() => store.pushAssistantMessage('kept'));
      const hide = jest.spyOn(store, 'hide');
      const closeSurface = jest.spyOn(store, 'closeSurface');
      await act(async () => {
        widgetClient.closeWidget();
      });
      // Each mounted host registers the closer, so it may run once per host (hide() is idempotent).
      expect(hide).toHaveBeenCalled();
      expect(closeSurface).not.toHaveBeenCalled();
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', isOpen: false }));
      expect(store.getSnapshot().chats).toHaveLength(1);
    });

    it('titles the full screen from the widget\'s own default texts when chatbot.title is unset', () => {
      expect(DEFAULT_CUSTOMIZATIONS.chatbot?.title).toBeFalsy();
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const title = testComponent.getByRole('heading').textContent || '';
      expect(title.trim()).not.toBe('');
      expect(title).not.toBe('widgetTitle');
      expect(title).toBe(texts['widgetTitle']);
    });
  });

  // ============================================================
  // Entry points (ported)
  // ============================================================

  describe('entry points', () => {
    it('opens the full-screen surface showing image upload/camera controls for the image entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();
      expect(testComponent.getByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
      expect(testComponent.queryByTestId('chat-textarea')).toBeNull();
      expect(testComponent.queryByRole('button', { name: texts['a11yStartNewChat'] })).toBeNull();
    });

    it('opens the full-screen surface showing the mic entry welcome screen for the mic entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(getTextInBody(texts['voiceInputError'])).toBeTruthy();
      expect(testComponent.getByRole('textbox', { name: texts['a11yChatInput'] })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['a11yStartNewChat'] })).toBeNull();
    });

    it('opens the full-screen surface showing the chat surface directly for the ask-ai entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByTestId('chat-textarea')).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['a11yStartNewChat'] })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['a11yAddImage'] })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
    });

    it('shows the mic icon and recording controls when the browser supports speech recognition', () => {
      const restore = installSpeechRecognition();
      try {
        renderLauncher(withChatbot({ voiceEnabled: true }));
        openEntryPointAndWait('a11yOpenVoiceSearch');
        expect(testComponent.getByRole('dialog')).toBeTruthy();
        expect(getTextInBody(texts['voiceInputError'])).toBeNull();
        expect(testComponent.getByRole('button', { name: texts['a11yTapToRecord'], hidden: true })).toBeTruthy();
      } finally {
        restore();
      }
    });
  });

  describe('session persistence', () => {
    it('resumes the same conversation instead of regenerating the chat id or replaying the greeting', () => {
      const { mockVisearchClient } = renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(getTextInBody(aiGreeting)).toBeTruthy();
      closeFullScreen();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(countTextInLog(aiGreeting)).toBe(1);
    });

    it('shows the image entry point\'s own capture UI, not the full chat surface, when opened during a resumed session', async () => {
      const imageGreeting = searchBarDefaults?.greetings?.image || '';
      const { mockVisearchClient } = renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const stream = sendMessageAndGetStreamController('Hello');
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Hi there!' });
      stream.closeStream();
      await revealAll();
      expect(getTextInBody('Hi there!')).toBeTruthy();
      closeFullScreen();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();
      expect(getTextInBody('Hi there!')).toBeNull();
      expect(imageGreeting).toBeTruthy();
      expect(getTextInBody(imageGreeting)).toBeTruthy();
    });

    it('sends a photo captured during a resumed session into the existing conversation, not a new one', async () => {
      const { mockVisearchClient } = renderLauncher({
        imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [{ url: 'https://example.com/shoe.jpg', label: 'Shoes' }] },
      });
      openEntryPointAndWait('a11yOpenAskAi');
      closeFullScreen();
      openEntryPointAndWait('a11yOpenImageSearch');
      await act(async () => {
        fireEvent.click(testComponent.getByAltText('Shoes'));
      });
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      const [calledUrl] = mockFetchEventSource.mock.calls[0];
      expect(new URLSearchParams((calledUrl as string).split('?')[1]).get('chat_id')).toBe('test-chat-id');
    });

    it('sends a voice transcript captured during a resumed session into the existing conversation, not a new one', () => {
      let capturedOnresult: ((event: any) => void) | null = null;
      const originalSpeechRecognition = (window as any).SpeechRecognition;
      (window as any).SpeechRecognition = function SpeechRecognitionMock(this: any): void {
        Object.defineProperty(this, 'onresult', {
          set: (handler: (event: any) => void) => { capturedOnresult = handler; },
          get: () => capturedOnresult,
        });
      };
      (window as any).SpeechRecognition.prototype.start = jest.fn();
      (window as any).SpeechRecognition.prototype.stop = jest.fn();
      (window as any).SpeechRecognition.prototype.abort = jest.fn();

      try {
        const { mockVisearchClient } = renderLauncher(withChatbot({ voiceEnabled: true }));
        openEntryPointAndWait('a11yOpenAskAi');
        closeFullScreen();
        openEntryPointAndWait('a11yOpenVoiceSearch');
        const micGreeting = searchBarDefaults?.greetings?.mic || '';
        expect(micGreeting).toBeTruthy();
        expect(getTextInBody(micGreeting)).toBeTruthy();
        act(() => {
          fireEvent.click(testComponent.getByRole('button', { name: texts['a11yTapToRecord'], hidden: true }));
        });
        expect(capturedOnresult).toBeTruthy();
        act(() => {
          capturedOnresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: 'red sneakers' } }] });
        });
        mockFetchEventSource.mockImplementation(async () => {});
        act(() => {
          fireEvent.click(testComponent.getByRole('button', { name: texts['a11yStopVoiceInput'], hidden: true }));
        });
        act(() => {
          jest.advanceTimersByTime(700);
        });
        expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
        const [calledUrl] = mockFetchEventSource.mock.calls[0];
        const params = new URLSearchParams((calledUrl as string).split('?')[1]);
        expect(params.get('chat_id')).toBe('test-chat-id');
        expect(params.get('q')).toBe('red sneakers');
      } finally {
        (window as any).SpeechRecognition = originalSpeechRecognition;
      }
    });

    it('does not mint or persist a chat id just from opening the camera entry point', () => {
      const { mockVisearchClient } = renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(mockVisearchClient.generateUuid).not.toHaveBeenCalled();
      expect(localStorage.length).toBe(0);
    });

    it('does not mint or persist a chat id just from opening the mic entry point', () => {
      const { mockVisearchClient } = renderLauncher(withChatbot({ voiceEnabled: true }));
      openEntryPointAndWait('a11yOpenVoiceSearch');
      expect(mockVisearchClient.generateUuid).not.toHaveBeenCalled();
      expect(localStorage.length).toBe(0);
    });

    it('leaves no trace in chat history when the camera entry point is opened and abandoned', () => {
      const imageGreeting = searchBarDefaults?.greetings?.image || '';
      const { mockVisearchClient } = renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(getTextInBody(imageGreeting)).toBeTruthy();
      closeFullScreen();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(countTextInLog(aiGreeting)).toBe(1);
      expect(getTextInBody(imageGreeting)).toBeNull();
    });

    it('sends the first message from a camera session with a chat id minted lazily on submit', async () => {
      const { mockVisearchClient } = renderLauncher({
        imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [{ url: 'https://example.com/shoe.jpg', label: 'Shoes' }] },
      });
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(mockVisearchClient.generateUuid).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.click(testComponent.getByAltText('Shoes'));
      });
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      const [calledUrl] = mockFetchEventSource.mock.calls[0];
      expect(new URLSearchParams((calledUrl as string).split('?')[1]).get('chat_id')).toBe('test-chat-id');
    });
  });

  describe('customizable dialog chrome', () => {
    it('applies generalLayout.backgroundColor to the full-screen dialog background', () => {
      renderLauncher({ generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, backgroundColor: '#ff00ff' } });
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('dialog').style.backgroundColor).toBe('rgb(255, 0, 255)');
    });

    it('applies generalLayout.backgroundColorDark to the full-screen dialog background in dark mode', () => {
      renderLauncher({ generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, backgroundColorDark: '#00ff00' } }, true);
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('dialog').style.backgroundColor).toBe('rgb(0, 255, 0)');
    });

    it('applies generalLayout.border to the header separator', () => {
      renderLauncher({ generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, border: { width: 3, color: '#123456', colorDark: '#654321' } } });
      openEntryPointAndWait('a11yOpenAskAi');
      const header = testComponent.getByTestId('wigmix-fullscreen-header');
      expect(header.style.borderBottomColor).toBe('#123456');
      expect(header.style.borderBottomWidth).toBe('3px');
    });
  });

  describe('mic entry screen — recording controls', () => {
    let mockRecognitionInstances: MockSpeechRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;

      interimResults = false;

      onresult: ((event: any) => void) | null = null;

      onerror: ((event: any) => void) | null = null;

      onend: (() => void) | null = null;

      start = jest.fn();

      stop = jest.fn();

      abort = jest.fn();

      constructor() {
        mockRecognitionInstances.push(this);
      }
    }

    const getMicButton = (): HTMLElement => testComponent.getByRole('button', { name: texts['a11yTapToRecord'], hidden: true });
    const voiceOn = withChatbot({ voiceEnabled: true });

    beforeEach(() => {
      mockRecognitionInstances = [];
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    afterEach(() => {
      delete (window as any).SpeechRecognition;
    });

    it('gives the mic button a visible circular border', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      const micButton = getMicButton();
      expect(micButton.className).toMatch(/rounded-full/);
      expect(micButton.className).toMatch(/\bborder\b/);
      expect(micButton.className).not.toMatch(/border-0/);
    });

    it('applies generalLayout.border to the mic button', () => {
      renderLauncher({ ...voiceOn, generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, border: { width: 2, color: '#123456', colorDark: '#654321' } } });
      openEntryPointAndWait('a11yOpenVoiceSearch');
      const micButton = getMicButton();
      expect(micButton.style.borderColor).toBe('#123456');
      expect(micButton.style.borderWidth).toBe('2px');
    });

    it('uses chatbot.inputBar.voiceRecordingColor for the recording-state icon', () => {
      renderLauncher(withChatbot({ voiceEnabled: true, inputBar: { ...DEFAULT_CUSTOMIZATIONS.chatbot?.inputBar, voiceRecordingColor: '#123456' } }));
      openEntryPointAndWait('a11yOpenVoiceSearch');
      const micButton = getMicButton();
      act(() => {
        fireEvent.click(micButton);
      });
      const recordingIcon = micButton.querySelector('.animate-pulse') as HTMLElement;
      expect(recordingIcon.style.color).toBe('rgb(18, 52, 86)');
    });

    it('starts recording immediately when clicked', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      expect(mockRecognitionInstances).toHaveLength(1);
      expect(mockRecognitionInstances[0].start).toHaveBeenCalled();
    });

    it('does not stop recording before the default 5-second duration elapses', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(4900);
      });
      expect(mockRecognitionInstances[0].stop).not.toHaveBeenCalled();
    });

    it('automatically stops recording once the default 5-second duration elapses', () => {
      renderLauncher(voiceOn);
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(5310);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });

    it('honours aiAssistant.searchBar.voiceRecordingMaxDurationSeconds instead of the default', () => {
      renderLauncher({ ...voiceOn, ...withSearchBar({ voiceRecordingMaxDurationSeconds: 2 }) });
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(1900);
      });
      expect(mockRecognitionInstances[0].stop).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(2310 - 1900);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });

    it('a set searchBar duration wins over any customizations.launcher duration', () => {
      renderLauncher({ ...voiceOn, ...withSearchBar({ voiceRecordingMaxDurationSeconds: 8 }), launcher: { voiceRecordingMaxDurationSeconds: 2 } });
      openEntryPointAndWait('a11yOpenVoiceSearch');
      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(7900);
      });
      expect(mockRecognitionInstances[0].stop).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });
  });

  describe('image entry point — camera-search-style upload UI', () => {
    it('shows the drag-to-search prompt and a camera link', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(getTextInBody(texts['dragImageToSearch'])).toBeTruthy();
      expect(getTextInBody(texts['useCamera'])).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();
    });

    it('renders the default sample gallery images out-of-the-box', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(testComponent.getByTestId('wigmix-gallery-image-1')).toBeTruthy();
    });

    it('defaults the gallery grid to 2 columns', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(testComponent.getByTestId('asl-gallery-grid').className).toMatch(/grid-cols-2/);
    });

    it('applies imageUpload.galleryColumns to the gallery grid column count', () => {
      renderLauncher({
        imageUpload: { enable: true, icon: { color: '#929292', colorDark: '#929292' }, images: DEFAULT_CUSTOMIZATIONS.imageUpload?.images || [], galleryColumns: 3 },
      });
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(testComponent.getByTestId('asl-gallery-grid').className).toMatch(/grid-cols-3/);
    });

    it('does not render the preset image gallery when imageUpload images are configured empty', () => {
      renderLauncher({ imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [] } });
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(testComponent.queryByTestId('wigmix-gallery-image-1')).toBeNull();
    });

    it('sends a selected gallery image as the initial chat message, as an im_url with no client-side fetch', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn();
      mockFetchEventSource.mockImplementation(async () => {});
      try {
        renderLauncher({
          imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [{ url: 'https://example.com/shoe.jpg', label: 'Shoes' }] },
        });
        openEntryPointAndWait('a11yOpenImageSearch');
        await act(async () => {
          fireEvent.click(testComponent.getByAltText('Shoes'));
        });
        expect(global.fetch).not.toHaveBeenCalled();
        const [calledUrl] = mockFetchEventSource.mock.calls[0];
        expect(decodeURIComponent(calledUrl as string)).toContain('im_url=https://example.com/shoe.jpg');
        const uploadedImage = testComponent.getByAltText(texts['a11yUploadedImage']) as HTMLImageElement;
        expect(uploadedImage.src).toBe('https://example.com/shoe.jpg');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('main chat surface — camera drawer', () => {
    it('opens a camera drawer over the chat footer and sends the captured photo into the chat', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' })),
      }) as unknown as typeof fetch;
      mockFetchEventSource.mockImplementation(async () => {});
      try {
        renderLauncher();
        openEntryPointAndWait('a11yOpenAskAi');
        act(() => {
          fireEvent.click(testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
        });
        act(() => {
          fireEvent.click(testComponent.getByRole('button', { name: texts['a11yOpenCamera'] }));
        });
        expect(testComponent.getByTestId('mock-webcam')).toBeTruthy();
        expect(testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
        await act(async () => {
          fireEvent.click(testComponent.getByRole('button', { name: texts['a11yTakePhoto'] }));
        });
        expect(mockFetchEventSource).toHaveBeenCalled();
        expect(testComponent.queryByTestId('mock-webcam')).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('image upload while a search is already in progress', () => {
    it('disables the "Add image" trigger while waiting on a reply, and re-enables it once one arrives', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const addImageButton = testComponent.getByRole('button', { name: texts['a11yAddImage'] }) as HTMLButtonElement;
      expect(addImageButton.disabled).toBe(false);
      const stream = sendMessageAndGetStreamController('Find me a jacket');
      expect(addImageButton.disabled).toBe(true);
      act(() => {
        fireEvent.click(addImageButton);
      });
      expect(testComponent.queryByText(texts['a11yUploadImage'])).toBeNull();
      expect(testComponent.queryByText(texts['a11yOpenCamera'])).toBeNull();
      stream.emitEvent('chat_id', { value: 'chat-1' });
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('chat_token', { value: 'Here is a great jacket' });
      stream.closeStream();
      await revealAll();
      expect(addImageButton.disabled).toBe(false);
    });
  });

  describe('chat footer — combined image icon', () => {
    it('shows a single "Add image" trigger instead of separate camera/upload buttons', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('button', { name: texts['a11yAddImage'] })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
      expect(testComponent.queryByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeNull();
    });

    it('reveals "Open camera" and "Upload image" options when the Add image trigger is clicked', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
      });
      expect(testComponent.getByRole('button', { name: texts['a11yOpenCamera'] })).toBeTruthy();
      expect(testComponent.getByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('closes the menu without opening the camera or upload picker when clicking outside it', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
      });
      expect(testComponent.getByRole('button', { name: texts['a11yOpenCamera'] })).toBeTruthy();
      act(() => {
        fireEvent.mouseDown(document.body);
      });
      expect(testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
      expect(testComponent.queryByTestId('mock-webcam')).toBeNull();
    });

    it('closes the menu when Escape is pressed', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yAddImage'] }));
      });
      expect(testComponent.getByRole('button', { name: texts['a11yOpenCamera'] })).toBeTruthy();
      act(() => {
        fireEvent.keyDown(document.body, { key: 'Escape' });
      });
      expect(testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
    });
  });

  describe('greeting playback', () => {
    it('shows the configured ai greeting as a bot chat bubble when Ask AI opens', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(aiGreeting).toBeTruthy();
      expect(getTextInBody(aiGreeting)).toBeTruthy();
    });

    it('resets the visible chat state and replays the greeting when the new-chat button is clicked', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const stream = sendMessageAndGetStreamController('Hello');
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Hi there!' });
      stream.closeStream();
      await revealAll();
      expect(getTextInBody('Hi there!')).toBeTruthy();
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['a11yStartNewChat'] }));
      });
      expect(getTextInBody('Hi there!')).toBeNull();
      expect(getTextInBody(aiGreeting)).toBeTruthy();
    });
  });

  describe('chat messaging (Ask AI entry point)', () => {
    it('renders a user chat bubble immediately when a typed message is sent', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      sendMessageAndGetStreamController('Find me a jacket');
      expect(getTextInBody('Find me a jacket')).toBeTruthy();
    });

    it('renders the bot reply and product cards once the SSE stream completes', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const stream = sendMessageAndGetStreamController('Show me shoes');
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Check these out: [[pid-1]]' });
      stream.emitEvent('product', {
        product_id: 'pid-1',
        main_image_url: 'https://example.com/shoe.jpg',
        data: { product_url: 'https://example.com/shoe', price: { currency: 'USD', value: '99.99' }, title: 'Cool Shoes', brand: 'Nike' },
      });
      stream.closeStream();
      await revealAll();
      expect(getTextInBody('Check these out:')).toBeTruthy();
      expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(1);
    });

    it('shows only the latest turn\'s suggestion chips, not earlier turns\'', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const firstStream = sendMessageAndGetStreamController('Show me shoes');
      firstStream.emitEvent('chat_id', { value: 'chat-1' });
      firstStream.emitEvent('reqid', { value: 'req-1' });
      firstStream.emitEvent('chat_token', { value: 'Here: [[pid-1]] ((See more shoes))' });
      firstStream.emitEvent('product', {
        product_id: 'pid-1',
        main_image_url: 'https://example.com/shoe.jpg',
        data: { product_url: 'https://example.com/shoe', price: { currency: 'USD', value: '99.99' }, title: 'Shoe' },
      });
      firstStream.closeStream();
      await revealAll();
      expect(getTextInBody('See more shoes')).toBeTruthy();

      const secondStream = sendMessageAndGetStreamController('Now show me hats');
      secondStream.emitEvent('chat_id', { value: 'chat-1' });
      secondStream.emitEvent('reqid', { value: 'req-2' });
      secondStream.emitEvent('chat_token', { value: 'Here: [[pid-2]] ((See more hats))' });
      secondStream.emitEvent('product', {
        product_id: 'pid-2',
        main_image_url: 'https://example.com/hat.jpg',
        data: { product_url: 'https://example.com/hat', price: { currency: 'USD', value: '19.99' }, title: 'Hat' },
      });
      secondStream.closeStream();
      await revealAll();
      expect(getTextInBody('See more shoes')).toBeNull();
      expect(getTextInBody('See more hats')).toBeTruthy();
    });
  });

  describe('mute control', () => {
    it('toggles its own aria-pressed/label state when clicked', () => {
      renderLauncher(withChatbot({ voiceEnabled: true, startMuted: false }));
      openEntryPointAndWait('a11yOpenAskAi');
      const muteButton = testComponent.getByRole('button', { name: texts['a11yToggleMute'] });
      expect(muteButton.getAttribute('aria-pressed')).toBe('false');
      act(() => {
        fireEvent.click(muteButton);
      });
      expect(testComponent.getByRole('button', { name: texts['a11yEnableMute'] })).toBe(muteButton);
      expect(muteButton.getAttribute('aria-pressed')).toBe('true');
      act(() => {
        fireEvent.click(muteButton);
      });
      expect(testComponent.getByRole('button', { name: texts['a11yToggleMute'] }).getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('configurable voice and camera controls', () => {
    it('hides the in-chat footer camera button (but keeps upload) when chatCameraEnabled is disabled', () => {
      renderLauncher(withSearchBar({ chatCameraEnabled: false }));
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
      expect(testComponent.getByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('hides the in-chat footer mic button and the mute toggle when voiceEnabled is disabled', () => {
      const restore = installSpeechRecognition();
      try {
        renderLauncher(withChatbot({ voiceEnabled: false }));
        openEntryPointAndWait('a11yOpenAskAi');
        expect(testComponent.queryByRole('button', { name: texts['a11yTapToRecord'], hidden: true })).toBeNull();
        expect(testComponent.queryByRole('button', { name: texts['a11yToggleMute'] })).toBeNull();
      } finally {
        restore();
      }
    });
  });

  // ============================================================
  // Split layout (desktop), ported
  // ============================================================

  describe('splitlayout', () => {
    const splitOn = withChatbot({ layout: 'splitlayout' });

    const emitProductsTurn = (message: string, requestId: string, close = true): void => {
      const textarea = document.body.querySelector('input[aria-label]') as HTMLInputElement;
      let onmessage: (ev: { event: string; data: string }) => void = () => {};
      let onclose: () => void = () => {};
      mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
        onmessage = options.onmessage;
        onclose = options.onclose;
      });
      act(() => {
        fireEvent.change(textarea, { target: { value: message } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });
      act(() => {
        onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-1' }) });
      });
      act(() => {
        onmessage({ event: 'reqid', data: JSON.stringify({ value: requestId }) });
      });
      act(() => {
        onmessage({ event: 'chat_token', data: JSON.stringify({ value: `Here: [[pid-${requestId}]]` }) });
      });
      act(() => {
        onmessage({
          event: 'product',
          data: JSON.stringify({
            product_id: `pid-${requestId}`,
            main_image_url: 'https://example.com/shoe.jpg',
            data: { product_url: 'https://example.com/shoe', price: { currency: 'USD', value: '99.99' }, title: `Shoe ${requestId}` },
          }),
        });
      });
      if (close) {
        act(() => {
          onclose();
        });
      }
    };

    it('renders SplitLayout mid-stream once products arrive at desktop width', () => {
      renderSearchBar({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.queryByTestId('asl-split-layout')).toBeNull();
      emitProductsTurn('Show me shoes', 'req-1', false);
      expect(testComponent.queryByTestId('asl-split-layout')).toBeTruthy();
    });

    it('applies chatbot.splitLayout.paneWidth to the chat pane width', () => {
      renderSearchBar({ overrides: withChatbot({ layout: 'splitlayout', splitLayout: { paneWidth: 500 } }), width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('Show me shoes', 'req-1', false);
      expect(testComponent.getByTestId('asl-split-chat-pane').style.width).toBe('500px');
    });

    it('applies chatbot.splitLayout.divider to the border between the chat and products panes', () => {
      renderSearchBar({
        overrides: withChatbot({ layout: 'splitlayout', splitLayout: { divider: { width: 4, color: '#123456', colorDark: '#654321' } } }),
        width: 1200,
      });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('Show me shoes', 'req-1', false);
      const pane = testComponent.getByTestId('asl-split-chat-pane');
      expect(pane.style.borderRightColor).toBe('#123456');
      expect(pane.style.borderRightWidth).toBe('4px');
    });

    it('clicking an earlier breadcrumb makes it the active crumb without removing later ones', async () => {
      renderSearchBar({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('blue jeans', 'req-1');
      await revealAll();
      emitProductsTurn('blue jeans but cropped', 'req-2');
      await revealAll();
      const trail = within(testComponent.getByRole('navigation', { name: texts['a11yBreadcrumbTrail'] }));
      expect(trail.getByText('blue jeans but cropped').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      act(() => {
        fireEvent.click(trail.getByRole('button', { name: /Show results for: blue jeans$/ }));
      });
      expect(trail.getByText('blue jeans').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      expect(trail.getByRole('button', { name: /blue jeans but cropped/ }).getAttribute('aria-current')).toBeNull();
    });

    it('clicking an in-chat hint line activates the matching crumb', async () => {
      renderSearchBar({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('blue jeans', 'req-1');
      await revealAll();
      emitProductsTurn('blue jeans but cropped', 'req-2');
      await revealAll();
      const hintLines = testComponent.getAllByRole('button', { name: /results shown/ });
      expect(hintLines).toHaveLength(2);
      act(() => {
        fireEvent.click(hintLines[0]);
      });
      const trail = within(testComponent.getByRole('navigation', { name: texts['a11yBreadcrumbTrail'] }));
      expect(trail.getByText('blue jeans').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      expect(trail.getByRole('button', { name: /blue jeans but cropped/ })).not.toBeNull();
    });

    it('shows skeleton placeholders while a query is in flight, and swaps them for real products once results stream in', async () => {
      renderSearchBar({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      let onmessage: (ev: { event: string; data: string }) => void = () => {};
      mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
        onmessage = options.onmessage;
      });
      const textarea = document.body.querySelector('input[aria-label]') as HTMLInputElement;
      act(() => {
        fireEvent.change(textarea, { target: { value: 'blue jeans' } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });
      expect(testComponent.queryByTestId('asl-product-grid-skeleton')).not.toBeNull();
      expect(testComponent.queryByTestId('wigmix-product-card-anchor')).toBeNull();
      act(() => {
        onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-1' }) });
      });
      act(() => {
        onmessage({ event: 'reqid', data: JSON.stringify({ value: 'req-1' }) });
      });
      expect(testComponent.queryByTestId('asl-product-grid-skeleton')).not.toBeNull();
      act(() => {
        onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Here: [[pid-req-1]]' }) });
      });
      act(() => {
        onmessage({
          event: 'product',
          data: JSON.stringify({
            product_id: 'pid-req-1',
            main_image_url: 'https://example.com/shoe.jpg',
            data: { product_url: 'https://example.com/shoe', price: { currency: 'USD', value: '99.99' }, title: 'Shoe' },
          }),
        });
      });
      expect(testComponent.queryByTestId('asl-product-grid-skeleton')).toBeNull();
      await revealAll();
      expect(testComponent.queryAllByTestId('wigmix-product-card-anchor').length).toBeGreaterThan(0);
    });
  });
  // ============================================================
  // Fix round 1: locales, full-screen title, default layout
  // ============================================================

  describe('non-English locales', () => {
    it.each(['de', 'fr', 'ja', 'de-DE'])('%s: search-bar texts the locale lacks fall back to English, never raw ids', (locale) => {
      renderSearchBar({ locale });
      const aiButton = testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      expect(aiButton.textContent).toBe(texts['triggerAskAi']);
      expect(testComponent.getByRole('button', { name: texts['a11yOpenImageSearch'] })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['a11yOpenVoiceSearch'] })).toBeTruthy();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(getTextInBody(texts['dragImageToSearch'])).toBeTruthy();
      expect(getTextInBody('dragImageToSearch')).toBeNull();
      // The locale's own label after the merge (embedded-shopping-assistant's translation of the same English text).
      const closeLabel = getLocaleTexts(locale, DEFAULT_TEXTS)['a11yCloseFullScreen'];
      expect(closeLabel).not.toBe('a11yCloseFullScreen');
      const closeButton = testComponent.getByRole('button', { name: closeLabel });
      act(() => {
        fireEvent.click(closeButton);
      });
      openEntryPointAndWait('a11yOpenAskAi');
      const title = testComponent.getByRole('heading').textContent || '';
      expect(title.trim()).not.toBe('');
      expect(title).not.toBe('widgetTitle');
    });

    it('de: a key the locale defines keeps its German text (no English overwrite)', () => {
      const deTitle = DEFAULT_TEXTS['de']?.['widgetTitle'];
      expect(deTitle).toBeTruthy();
      expect(deTitle).not.toBe(texts['widgetTitle']);
      renderSearchBar({ locale: 'de' });
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('heading').textContent).toBe(deTitle);
    });
  });

  describe('full-screen title', () => {
    const openTitle = (overrides: Partial<Customizations>): string => {
      renderSearchBar({ overrides });
      openEntryPointAndWait('a11yOpenAskAi');
      return testComponent.getByRole('heading').textContent || '';
    };

    it('uses aiAssistant.chatTitle first (as the drawer does)', () => {
      expect(openTitle({ ...withSearchBar({}), aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, chatTitle: ' Ask us ' }, ...withChatbot({ title: 'Bot' }) })).toBe('Ask us');
    });

    it('falls back to chatbot.title without a chatTitle', () => {
      expect(openTitle({ aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, chatTitle: '  ' }, ...withChatbot({ title: 'Bot' }) })).toBe('Bot');
    });

    it('falls back to the widget\'s default widgetTitle text with neither', () => {
      const title = openTitle({ aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, chatTitle: undefined }, ...withChatbot({ title: undefined }) });
      expect(title).toBe(texts['widgetTitle']);
      expect(title.trim()).not.toBe('');
      expect(title).not.toBe('widgetTitle');
    });
  });

  it('the widget\'s own default config renders the single-column chat (default chatbot.layout)', () => {
    mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
    expect(DEFAULT_CUSTOMIZATIONS.chatbot?.layout).toBe('chatlayout');
    const { store } = renderSearchBar({ width: 1200 });
    openEntryPointAndWait('a11yOpenAskAi');
    act(() => store.setState({ breadcrumbs: [{ requestId: 'r1', label: 'shoes', products: [] }] }));
    expect(testComponent.queryByTestId('asl-split-layout')).toBeNull();
    expect(testComponent.getByLabelText(texts['a11yChatMessages'])).toBeTruthy();
  });
});
