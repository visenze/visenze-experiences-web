// Part of the LauncherEntry specs (see test-utils/launcher-harness.tsx for the shared setup).
import { act, fireEvent, render, within } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { RootContext } from '../../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../../common/types/contexts';
import { DEFAULT_CUSTOMIZATIONS } from '../default-config';
import EntryHost from '../entry-host';
import { chatTexts } from '../test-utils/chat-assertions';
import {
  aiGreeting,
  createLauncherHarness,
  createTestClient,
  type Customizations,
  type LauncherConfig,
  launcherDefaults,
  texts,
  withChatbot,
  withLauncher,
} from './test-utils/launcher-harness';
import { mockFetchEventSource } from './test-utils/launcher-mocks';

jest.mock('@microsoft/fetch-event-source', () => jest.requireActual('./test-utils/launcher-mocks').fetchEventSourceModule);
jest.mock('react-webcam', () => jest.requireActual('./test-utils/launcher-mocks').webcamModule);
jest.mock('@heroui/input', () => jest.requireActual('./test-utils/launcher-mocks').heroUiInputModule);

describe('ai-assistant launcher entry', () => {
  const harness = createLauncherHarness();
  const {
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
  } = harness;

  describe('entry bar', () => {
    it('renders the three entry-bar buttons, labelled from the widget\'s own default texts', () => {
      renderLauncher();
      const labels = ['a11yOpenImageSearch', 'a11yOpenVoiceSearch', 'a11yOpenAskAi'];
      labels.forEach((id) => {
        expect(texts[id]).toBeTruthy();
        expect(texts[id]).not.toBe(id);
        expect(harness.testComponent.getByRole('button', { name: texts[id] })).toBeTruthy();
      });
      const aiTrigger = harness.testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      expect(texts['triggerAskAi']).toBeTruthy();
      expect(aiTrigger.textContent).toBe(texts['triggerAskAi']);
    });

    it.each([
      ['cameraEntryEnabled', 'a11yOpenImageSearch'],
      ['micEntryEnabled', 'a11yOpenVoiceSearch'],
      ['askAiEntryEnabled', 'a11yOpenAskAi'],
    ])('does not render a button whose %s is false, and keeps the others', (flag, labelId) => {
      renderLauncher(withLauncher({ [flag]: false }));
      expect(harness.testComponent.queryByRole('button', { name: texts[labelId] })).toBeNull();
      expect(harness.testComponent.getAllByRole('button')).toHaveLength(2);
    });

    it('always labels the Ask AI trigger with the fixed copy, independent of the configured dialog title', () => {
      renderLauncher(withChatbot({ title: 'Custom Dialog Title' }));
      const aiTrigger = harness.testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      expect(aiTrigger.textContent).toBe(texts['triggerAskAi']);
      expect(aiTrigger.textContent).not.toBe('Custom Dialog Title');
      openEntryPointAndWait('a11yOpenAskAi');
      expect(getTextInBody('Custom Dialog Title')).toBeTruthy();
    });

    it('does not render the full-screen surface before any entry point is opened', () => {
      renderLauncher();
      expect(harness.testComponent.queryByRole('dialog')).toBeNull();
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
                <EntryHost entry='launcher' />
              </IntlProvider>
            </WidgetDataContext.Provider>
          </NullThenFilledRootWrapper>,
        );
      }).not.toThrow();
    });

    describe('Ask AI entry logo', () => {
      const LOGO_URL = 'https://example.com/ask-brand.svg';

      const renderWithEntryIcon = (askAiEntryIcon: LauncherConfig['askAiEntryIcon'], darkMode = false): HTMLElement => {
        renderLauncher(withLauncher({ askAiEntryIcon }), darkMode);
        return harness.testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
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
        harness.testComponent.unmount();

        const iconText = renderWithEntryIcon({ url: LOGO_URL, layout: 'ICON_TEXT' });
        expect(iconText.firstElementChild?.tagName).toBe('IMG');
        expect(iconText.lastChild?.textContent).toBe(texts['triggerAskAi']);
        expect(iconText.className).toContain('gap-2');
      });

      it('shows text only for the TEXT layout or when no logo url is set', () => {
        const textLayout = renderWithEntryIcon({ url: LOGO_URL, layout: 'TEXT' });
        expect(textLayout.querySelector('img')).toBeNull();
        expect(textLayout.textContent).toBe(texts['triggerAskAi']);
        harness.testComponent.unmount();

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
        harness.testComponent.unmount();
        const beside = renderWithEntryIcon({ url: LOGO_URL, layout: 'ICON_TEXT' });
        expect(beside.querySelector('img')?.style.height).toBe('22px');
        expect(beside.querySelector('img')?.style.width).toBe('');
        expect(beside.className).toContain('px-3 py-2');
        harness.testComponent.unmount();
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
        harness.testComponent.unmount();

        const textOnly = renderWithEntryIcon({ url: LOGO_URL, layout: 'TEXT', padding: { x: 8, y: 4 } });
        expect(textOnly.style.paddingLeft).toBe('');
        expect(textOnly.style.paddingTop).toBe('');
      });

      it('tints the logo with color, or colorDark in dark mode', () => {
        const icon = { url: LOGO_URL, color: 'rgb(255, 0, 0)', colorDark: 'rgb(0, 0, 255)' };
        const tintOf = (trigger: HTMLElement): string | undefined => trigger.querySelector<HTMLElement>('.wigmix-entry-logo > span')?.style.backgroundColor;

        expect(tintOf(renderWithEntryIcon(icon))).toBe('rgb(255, 0, 0)');
        harness.testComponent.unmount();
        expect(tintOf(renderWithEntryIcon(icon, true))).toBe('rgb(0, 0, 255)');
      });
    });
  });

  describe('opening the shared session', () => {
    it('Ask AI on a fresh session starts one with open() and opens the full screen for the ai entry point', () => {
      const { store } = renderLauncher();
      const open = jest.spyOn(store, 'open');
      const reopen = jest.spyOn(store, 'reopen');
      openEntryPointAndWait('a11yOpenAskAi');
      expect(open).toHaveBeenCalledTimes(1);
      expect(reopen).not.toHaveBeenCalled();
      expect(store.getChatId()).toBe('test-chat-id');
      expect(store.getActiveEntry()).toBe('launcher');
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

    it('mic on a fresh session enables input, so its text fallback can start the conversation', () => {
      const { store } = renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');
      expect(store.getSnapshot().allowUserInput).toBe(true);
      const input = harness.testComponent.getByRole('textbox', { name: texts['a11yChatInput'] });
      act(() => {
        fireEvent.change(input, { target: { value: 'find me a red dress' } });
      });
      act(() => {
        fireEvent.keyDown(input, { code: 'Enter', shiftKey: false });
      });
      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      expect(store.getChatId()).toBe('test-chat-id');
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

    it('tags RESULT_LOAD with entry: launcher after a launcher interaction', async () => {
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
      const expected = { queryId: 'req-1', cat: 'Result', entry: 'launcher' };
      expect(widgetClient.sendEvent).toHaveBeenCalledWith('result_load', expected);
      expect(widgetClient.setLastTrackingMeta).toHaveBeenCalledWith(expected);
    });
  });

  describe('closing and the other entries', () => {
    it('closes the full screen and returns to the entry-bar-only view', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.getByRole('dialog')).toBeTruthy();
      closeFullScreen();
      expect(harness.testComponent.queryByRole('dialog')).toBeNull();
      expect(harness.testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] })).toBeTruthy();
    });

    it.each([
      ['a11yOpenImageSearch'],
      ['a11yOpenVoiceSearch'],
      ['a11yOpenAskAi'],
    ])('returns focus to the %s button that opened it, with two entry hosts mounted', (labelId) => {
      renderLauncherEntry({ otherEntries: ['basic'] });
      const button = harness.testComponent.getByRole('button', { name: texts[labelId] });
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
      expect(harness.testComponent.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(button);
    });

    it('after the full screen closes, the basic entry opens the drawer on the same conversation', async () => {
      const { store } = renderLauncherEntry({ otherEntries: ['basic'] });
      openEntryPointAndWait('a11yOpenAskAi');
      // The reply stays in flight (the stream is never closed).
      sendMessageAndGetStreamController('red shoes');
      const chatId = store.getChatId();
      const { chats } = store.getSnapshot();
      // Closing aborts the in-flight reply; its settling is async.
      await act(async () => {
        fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] }));
      });
      act(() => {
        fireEvent.click(harness.testComponent.getByTestId('wigmix-popup-trigger-button'));
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', isOpen: true }));
      expect(store.getChatId()).toBe(chatId);
      expect(store.getSnapshot().chats).toBe(chats);
      const dialogs = harness.testComponent.getAllByRole('dialog', { hidden: true });
      expect(dialogs).toHaveLength(1);
      expect(within(dialogs[0]).getByLabelText(texts['a11yCloseChat'])).toBeTruthy();
      expect(within(dialogs[0]).getByText('red shoes')).toBeTruthy();
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yCloseFullScreen'] })).toBeNull();
    });

    it('from an open drawer, a launcher button switches to the full screen; closing restores focus and the host\'s overflow', () => {
      const { store } = renderLauncherEntry({ otherEntries: ['basic'] });
      document.body.style.overflow = 'auto';
      act(() => {
        fireEvent.click(harness.testComponent.getByTestId('wigmix-popup-trigger-button'));
      });
      expect(store.getSnapshot().surfaceMode).toBe('drawer');
      expect(document.body.style.overflow).toBe('hidden');

      // hidden: react-modal aria-hides the page behind the open drawer (jsdom has no shadow roots to keep it out).
      const micButton = harness.testComponent.getByRole('button', { name: texts['a11yOpenVoiceSearch'], hidden: true });
      act(() => {
        fireEvent.click(micButton);
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'fullscreen', isOpen: true }));
      expect(harness.testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true })).toBeTruthy();
      // The drawer's react-modal close transition, then only the full screen is left.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(harness.testComponent.queryByLabelText(texts['a11yCloseChat'])).toBeNull();
      expect(document.body.style.overflow).toBe('hidden');

      closeFullScreen();
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(harness.testComponent.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
      expect(document.activeElement).toBe(micButton);
      expect(document.body.style.overflow).toBe('auto');
    });

    it('closeWidget() closes an open full screen like its close button: back to drawer mode, reply aborted, focus returned', async () => {
      const { store, widgetClient } = renderLauncherEntry();
      const askAiButton = harness.testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
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
      expect(harness.testComponent.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
      expect(document.activeElement).toBe(askAiButton);
    });

    it('closeWidget() then openWithMessage() after the camera entry shows the message in the drawer, not the image welcome screen', async () => {
      const { store, widgetClient } = renderLauncherEntry();
      const cameraButton = harness.testComponent.getByRole('button', { name: texts['a11yOpenImageSearch'] });
      act(() => {
        fireEvent.click(cameraButton);
      });
      expect(harness.testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();

      await act(async () => {
        widgetClient.closeWidget();
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', activation: null, isOpen: false }));
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true })).toBeNull();
      expect(document.activeElement).toBe(cameraButton);

      await act(async () => {
        widgetClient.openWithMessage('hello', ['a']);
      });
      expect(store.getSnapshot()).toEqual(expect.objectContaining({ surfaceMode: 'drawer', isOpen: true }));
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yCloseFullScreen'], hidden: true })).toBeNull();
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yTakePhoto'], hidden: true })).toBeNull();
      const dialogs = harness.testComponent.getAllByRole('dialog', { hidden: true });
      expect(dialogs).toHaveLength(1);
      expect(within(dialogs[0]).getByLabelText(texts['a11yCloseChat'])).toBeTruthy();
      expect(within(dialogs[0]).getAllByText('hello').length).toBeGreaterThan(0);
    });

    it('closeWidget() with only the drawer open still just hides it, keeping the conversation', async () => {
      const { store, widgetClient } = renderLauncherEntry({ otherEntries: ['basic'] });
      act(() => {
        fireEvent.click(harness.testComponent.getByTestId('wigmix-popup-trigger-button'));
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
      // The opening greeting (a fresh drawer conversation) plus the pushed message, both kept.
      expect(chatTexts(store)).toEqual([aiGreeting, 'kept']);
    });

    it('titles the full screen from the widget\'s own default texts when chatbot.title is unset', () => {
      expect(DEFAULT_CUSTOMIZATIONS.chatbot?.title).toBeFalsy();
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      const title = harness.testComponent.getByRole('heading').textContent || '';
      expect(title.trim()).not.toBe('');
      expect(title).not.toBe('widgetTitle');
      expect(title).toBe(texts['widgetTitle']);
    });
  });

  describe('entry points', () => {
    it('opens the full-screen surface showing image upload/camera controls for the image entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(harness.testComponent.getByRole('dialog')).toBeTruthy();
      expect(harness.testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();
      expect(harness.testComponent.getByLabelText(texts['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
      expect(harness.testComponent.queryByTestId('chat-textarea')).toBeNull();
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yStartNewChat'] })).toBeNull();
    });

    it('opens the full-screen surface showing the mic entry welcome screen for the mic entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');
      expect(harness.testComponent.getByRole('dialog')).toBeTruthy();
      expect(getTextInBody(texts['voiceInputError'])).toBeTruthy();
      expect(harness.testComponent.getByRole('textbox', { name: texts['a11yChatInput'] })).toBeTruthy();
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yStartNewChat'] })).toBeNull();
    });

    it('opens the full-screen surface showing the chat surface directly for the ask-ai entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.getByRole('dialog')).toBeTruthy();
      expect(harness.testComponent.getByTestId('chat-textarea')).toBeTruthy();
      expect(harness.testComponent.getByRole('button', { name: texts['a11yStartNewChat'] })).toBeTruthy();
      expect(harness.testComponent.getByRole('button', { name: texts['a11yAddImage'] })).toBeTruthy();
      expect(harness.testComponent.queryByRole('button', { name: texts['a11yOpenCamera'] })).toBeNull();
    });

    it('shows the mic icon and recording controls when the browser supports speech recognition', () => {
      const restore = installSpeechRecognition();
      try {
        renderLauncher(withChatbot({ voiceEnabled: true }));
        openEntryPointAndWait('a11yOpenVoiceSearch');
        expect(harness.testComponent.getByRole('dialog')).toBeTruthy();
        expect(getTextInBody(texts['voiceInputError'])).toBeNull();
        expect(harness.testComponent.getByRole('button', { name: texts['a11yTapToRecord'], hidden: true })).toBeTruthy();
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
      const imageGreeting = launcherDefaults?.greetings?.image || '';
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
      expect(harness.testComponent.getByRole('button', { name: texts['a11yTakePhoto'] })).toBeTruthy();
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
        fireEvent.click(harness.testComponent.getByAltText('Shoes'));
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
        const micGreeting = launcherDefaults?.greetings?.mic || '';
        expect(micGreeting).toBeTruthy();
        expect(getTextInBody(micGreeting)).toBeTruthy();
        act(() => {
          fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yTapToRecord'], hidden: true }));
        });
        expect(capturedOnresult).toBeTruthy();
        act(() => {
          capturedOnresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: 'red sneakers' } }] });
        });
        mockFetchEventSource.mockImplementation(async () => {});
        act(() => {
          fireEvent.click(harness.testComponent.getByRole('button', { name: texts['a11yStopVoiceInput'], hidden: true }));
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
      const imageGreeting = launcherDefaults?.greetings?.image || '';
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
        fireEvent.click(harness.testComponent.getByAltText('Shoes'));
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
      expect(harness.testComponent.getByRole('dialog').style.backgroundColor).toBe('rgb(255, 0, 255)');
    });

    it('applies generalLayout.backgroundColorDark to the full-screen dialog background in dark mode', () => {
      renderLauncher({ generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, backgroundColorDark: '#00ff00' } }, true);
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.getByRole('dialog').style.backgroundColor).toBe('rgb(0, 255, 0)');
    });

    it('applies generalLayout.border to the header separator', () => {
      renderLauncher({ generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, border: { width: 3, color: '#123456', colorDark: '#654321' } } });
      openEntryPointAndWait('a11yOpenAskAi');
      const header = harness.testComponent.getByTestId('wigmix-fullscreen-header');
      expect(header.style.borderBottomColor).toBe('#123456');
      expect(header.style.borderBottomWidth).toBe('3px');
    });
  });

  describe('full-screen title', () => {
    const openTitle = (overrides: Partial<Customizations>): string => {
      renderLauncherEntry({ overrides });
      openEntryPointAndWait('a11yOpenAskAi');
      return harness.testComponent.getByRole('heading').textContent || '';
    };

    it('uses aiAssistant.chatTitle first (as the drawer does)', () => {
      expect(openTitle({ ...withLauncher({}), aiAssistant: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant, chatTitle: ' Ask us ' }, ...withChatbot({ title: 'Bot' }) })).toBe('Ask us');
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
});
