import { act, fireEvent, type RenderResult } from '@testing-library/react';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import ShoppingAssistant from './shopping-assistant';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import type { WidgetConfig } from '../../common/wigmix-core';

// Mock @microsoft/fetch-event-source to control SSE streaming in tests
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

// Mock react-webcam — ChatComposer's WebcamCapture (variant='drawer') renders a live <Webcam> once
// the "Add image" > "Open camera" drawer is open. Same mock as ai-search-launcher.spec.tsx and
// embedded-shopping-assistant-chat.spec.tsx, which consume the exact same shared component.
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

describe('shopping-assistant', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS;
  let modalRoot: HTMLDivElement;

  const createTestClient = (
    visearchOverrides: Partial<ViSearchClient> = {},
    callbacks: Partial<WidgetConfig['callbacks']> = {},
    customizationOverrides: Partial<WidgetConfig['customizations']> = {},
  ): {
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ViSearchClient;
  } => {
    const widgetConfig = createWidgetConfig(
      { ...DEFAULT_CUSTOMIZATIONS, ...customizationOverrides },
      {
        searchSettings: {
          attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
        },
        callbacks,
      },
    );
    const { widgetClient, mockVisearchClient } = createMockWidgetClient(
      widgetConfig,
      'wigmix_shopping_assistant',
      {
        getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
        getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
        generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
        productMultisearch: jest.fn(),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const renderAssistant = (
    visearchOverrides: Partial<ViSearchClient> = {},
    locale = 'en',
    callbacks: Partial<WidgetConfig['callbacks']> = {},
    customizationOverrides: Partial<WidgetConfig['customizations']> = {},
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides, callbacks, customizationOverrides);
    testComponent = renderWidget(<ShoppingAssistant renderModalWithoutPortal />, {
      widgetConfig,
      widgetClient,
      locale,
      messages: texts[locale],
      rootElement: modalRoot,
    });
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const queryModal = (selector: string): Element | null => document.body.querySelector(selector);
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

  // Assistant text/products reveal progressively (typewriter text, one-at-a-time product cards) via
  // a stable interval rather than appearing all at once, and by default (unmuted) a reply commit is
  // additionally deferred behind a voice-synthesis attempt that fails fast in jsdom (no fetch/
  // SpeechSynthesis support) and falls back synchronously-ish. Advancing timers is enough to
  // fast-forward past all of it.
  const revealAll = async (): Promise<void> => {
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
  };

  const openDialogAndWait = (): void => {
    const triggerButton = testComponent.container.querySelector('.wigmix-popup-trigger-button') as HTMLButtonElement;
    expect(triggerButton).toBeTruthy();
    act(() => {
      fireEvent.click(triggerButton);
    });
    // Flushes the scripted two-part opening greeting (openingMessage1 at ~2s, openingMessage2 at
    // ~4s) and the post-mount input-focus deferral.
    act(() => {
      jest.runAllTimers();
    });
  };

  // Opens the composer's combined "Add image" popover (camera + upload) — ChatComposer is the same
  // shared component ai-search-launcher/embedded-shopping-assistant consume, so this mirrors
  // ai-search-launcher.spec.tsx's own "chat footer — combined image icon" helper.
  const openImageMenu = (): void => {
    const addImageButton = testComponent.getByRole('button', { name: texts['en']['a11yAddImage'], hidden: true });
    act(() => {
      fireEvent.click(addImageButton);
    });
  };

  const sendMessageAndGetStreamController = (
    messageText: string,
  ): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
  } => {
    const chatInput = testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true });

    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;

    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onmessage = options.onmessage;
      onclose = options.onclose;
    });

    act(() => {
      fireEvent.change(chatInput, { target: { value: messageText } });
    });
    act(() => {
      fireEvent.keyDown(chatInput, { code: 'Enter', shiftKey: false });
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

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
    modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
    Element.prototype.scrollIntoView = jest.fn();
    // Otherwise a test can read a resumable chat id left in localStorage by a previous test.
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (modalRoot && modalRoot.parentNode) {
      modalRoot.parentNode.removeChild(modalRoot);
    }
  });

  // ============================================================
  // Core rendering
  // ============================================================

  describe('core rendering', () => {
    it('should render trigger button without crashing', () => {
      renderAssistant();
      expect(testComponent.getByRole('button', { name: texts['en']['triggerCTA'] })).toBeTruthy();
    });

    it('should match snapshot for closed state', () => {
      renderAssistant();
      expect(testComponent.asFragment()).toMatchSnapshot();
    });

    it('should open the dialog and play the scripted two-part opening greeting when the trigger button is clicked', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('dialog', { name: texts['en']['widgetTitle'], hidden: true })).toBeTruthy();
      expect(getTextInBody(texts['en']['openingMessage1'])).toBeTruthy();
      expect(getTextInBody(texts['en']['openingMessage2'])).toBeTruthy();
    });

    it('should close the dialog and restore focus to the trigger button when the close button is clicked', () => {
      renderAssistant();
      const triggerButton = testComponent.container.querySelector('.wigmix-popup-trigger-button') as HTMLButtonElement;
      openDialogAndWait();

      const closeButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseShoppingAssistant'], hidden: true });
      act(() => {
        fireEvent.click(closeButton);
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(queryModal('.wigmix-modal')).toBeNull();
      expect(document.activeElement).toBe(triggerButton);
    });
  });

  // ============================================================
  // Session persistence
  // ============================================================

  describe('session persistence', () => {
    it('resumes the existing conversation instead of regenerating the chat id or replaying the opening greeting when closed and reopened', () => {
      const { mockVisearchClient } = renderAssistant();
      openDialogAndWait();
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(getTextInBody(texts['en']['openingMessage1'])).toBeTruthy();

      const closeButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseShoppingAssistant'], hidden: true });
      act(() => {
        fireEvent.click(closeButton);
      });
      act(() => {
        jest.runAllTimers();
      });

      openDialogAndWait();
      // Reopening must not mint a second chat id or replay the opening greeting.
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      expect(getTextInBody(texts['en']['openingMessage1'])).toBeTruthy();
    });

    it('shows the normal opening greeting instead of a blank surface when a stored session from a previous visit has no real history to resume', async () => {
      // A stale localStorage entry with no backend history must not leave the widget stuck trying
      // to resume a blank surface forever.
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: (): Promise<unknown> => Promise.resolve({ result: { messages: [] } }),
      } as unknown as Response);
      localStorage.setItem(
        'visenze_shopping_assistant_chat_id_1234',
        JSON.stringify({ chatId: 'stale-chat-id', timestamp: Date.now() }),
      );

      const { mockVisearchClient } = renderAssistant({
        generateUuid: jest.fn((cb: (uuid: string) => void) => cb('fresh-chat-id')),
      });
      // Let the mount-time restore fetch resolve before the user clicks.
      await act(async () => {
        await Promise.resolve();
      });

      openDialogAndWait();

      expect(getTextInBody(texts['en']['openingMessage1'])).toBeTruthy();
      expect(mockVisearchClient.generateUuid).toHaveBeenCalledTimes(1);
      global.fetch = originalFetch;
    });

    it('never writes to localStorage when customizations.chatbot.persistChatEnabled is false', () => {
      const { widgetConfig, widgetClient } = createTestClient();
      widgetConfig.customizations = {
        ...DEFAULT_CUSTOMIZATIONS,
        chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: false },
      };
      testComponent = renderWidget(<ShoppingAssistant renderModalWithoutPortal />, {
        widgetConfig, widgetClient, locale: 'en', messages: texts['en'], rootElement: modalRoot,
      });

      openDialogAndWait();
      expect(localStorage.length).toBe(0);

      const closeButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseShoppingAssistant'], hidden: true });
      act(() => {
        fireEvent.click(closeButton);
      });
      act(() => {
        jest.runAllTimers();
      });
      expect(localStorage.length).toBe(0);
    });

    it('slides the resumable-session TTL forward when closed via widgetClient.closeWidget(), not just the in-widget close button', () => {
      // persistChatEnabled defaults to disabled — opt in explicitly, same as the "never writes to
      // localStorage" test above.
      const { widgetConfig, widgetClient } = createTestClient();
      widgetConfig.customizations = {
        ...DEFAULT_CUSTOMIZATIONS,
        chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: true },
      };
      testComponent = renderWidget(<ShoppingAssistant renderModalWithoutPortal />, {
        widgetConfig, widgetClient, locale: 'en', messages: texts['en'], rootElement: modalRoot,
      });

      act(() => {
        widgetClient.openWidget('');
      });
      act(() => {
        jest.runAllTimers();
      });
      expect(localStorage.getItem('visenze_shopping_assistant_chat_id_1234')).toBeTruthy();
      // Isolate the assertion to the close path: if closeDialog's externally-registered callback
      // never re-persists, this stays empty.
      localStorage.removeItem('visenze_shopping_assistant_chat_id_1234');

      act(() => {
        widgetClient.closeWidget();
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(localStorage.getItem('visenze_shopping_assistant_chat_id_1234')).toBeTruthy();
    });
  });

  // ============================================================
  // Accessibility
  // ============================================================

  describe('accessibility', () => {
    it('should expose an accessible name for the popup trigger', () => {
      renderAssistant();

      expect(testComponent.getByRole('button', { name: texts['en']['triggerCTA'] })).toBeTruthy();
    });

    it('should expose a named dialog after opening', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('dialog', { name: texts['en']['widgetTitle'], hidden: true })).toBeTruthy();
    });

    it('should expose header actions as named buttons', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('button', { name: texts['en']['a11yStartNewChat'], hidden: true })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yCloseShoppingAssistant'], hidden: true })).toBeTruthy();
    });

    it('should expose image action controls as named buttons once the "Add image" menu is open', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();

      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeTruthy();
      expect(testComponent.getByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('should expose send as a named button', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('button', { name: texts['en']['a11ySendMessage'], hidden: true })).toBeTruthy();
    });

    it('should expose an accessible name for the chat input', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true })).toBeTruthy();
    });

    it('should expose the dialog title as a heading', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('heading', { name: texts['en']['widgetTitle'], hidden: true })).toBeTruthy();
    });

    it('should localize accessible names for non-English locales', () => {
      renderAssistant({}, 'es');
      openDialogAndWait();

      expect(testComponent.getByRole('button', { name: texts['es']['a11yStartNewChat'], hidden: true })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['es']['a11yAddImage'], hidden: true })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['es']['a11ySendMessage'], hidden: true })).toBeTruthy();
      expect(testComponent.getByRole('textbox', { name: texts['es']['a11yChatInput'], hidden: true })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yStartNewChat'], hidden: true })).toBeNull();
    });

    it('should not place static chat messages in the tab order', () => {
      renderAssistant();
      openDialogAndWait();

      expect(getTextInBody('Let\'s get started')?.closest('[tabindex="0"]')).toBeNull();
      expect(getTextInBody('Tell us about what your styling needs')?.closest('[tabindex="0"]')).toBeNull();
    });

    it('should expose the camera drawer as a labelled dialog and restore focus to the "Add image" trigger when closed', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();

      const openCameraButton = testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true });
      act(() => {
        fireEvent.click(openCameraButton);
      });

      const cameraDialog = testComponent.getByRole('dialog', { name: texts['en']['a11yCameraDrawer'], hidden: true });
      const closeCameraButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseCamera'], hidden: true });
      expect(cameraDialog).toBeTruthy();
      expect(document.activeElement).toBe(closeCameraButton);

      act(() => {
        fireEvent.keyDown(cameraDialog, { key: 'Escape', code: 'Escape' });
      });

      expect(testComponent.queryByRole('dialog', { name: texts['en']['a11yCameraDrawer'], hidden: true })).toBeNull();
      // Focus returns to ChatComposer's own "Add image" trigger (the camera drawer's opener), not
      // the popover's "Open camera" menu item — that item no longer exists once the drawer is open,
      // since opening it also closes the popover.
      expect(document.activeElement).toBe(testComponent.getByRole('button', { name: texts['en']['a11yAddImage'], hidden: true }));
    });

    it('should trap keyboard focus inside the camera drawer', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true }));
      });

      const cameraDialog = testComponent.getByRole('dialog', { name: texts['en']['a11yCameraDrawer'], hidden: true });
      const closeCameraButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseCamera'], hidden: true });
      const takePhotoButton = testComponent.getByRole('button', { name: texts['en']['a11yTakePhoto'], hidden: true });
      const switchCameraButton = testComponent.getByRole('button', { name: texts['en']['a11ySwitchCamera'], hidden: true });

      expect(document.activeElement).toBe(closeCameraButton);

      act(() => {
        fireEvent.keyDown(cameraDialog, { key: 'Tab', code: 'Tab' });
      });
      expect(document.activeElement).toBe(takePhotoButton);

      act(() => {
        fireEvent.keyDown(cameraDialog, { key: 'Tab', code: 'Tab' });
      });
      expect(document.activeElement).toBe(switchCameraButton);

      act(() => {
        fireEvent.keyDown(cameraDialog, { key: 'Tab', code: 'Tab' });
      });
      expect(document.activeElement).toBe(closeCameraButton);

      act(() => {
        fireEvent.keyDown(cameraDialog, { key: 'Tab', code: 'Tab', shiftKey: true });
      });
      expect(document.activeElement).toBe(switchCameraButton);
    });

    it('should expose a polite status for waiting and committed assistant responses', async () => {
      renderAssistant();
      openDialogAndWait();

      const stream = sendMessageAndGetStreamController('Hello');

      expect(testComponent.getByRole('status', { hidden: true }).textContent).toBe(texts['en']['a11yAssistantThinking']);

      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Here is a jacket.' });
      stream.closeStream();
      await revealAll();

      expect(testComponent.getByRole('status', { hidden: true }).textContent).toContain('Here is a jacket.');
    });

    it('should announce committed product result counts without relying on visual cards', async () => {
      renderAssistant();
      openDialogAndWait();

      const stream = sendMessageAndGetStreamController('Find a jacket');

      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Here is one option. [[product-1]]' });
      stream.emitEvent('product', {
        product_id: 'product-1',
        main_image_url: 'https://image-1',
        data: { title: 'Jacket' },
      });
      stream.closeStream();
      await revealAll();

      expect(testComponent.getByRole('status', { hidden: true }).textContent).toContain('Product results shown: 1');
    });
  });

  // ============================================================
  // Chat wiring (SSE via the shared useChat hook)
  // ============================================================

  // Token-by-token SSE parsing, product/action-token extraction, and suggestion-chip logic are
  // useChat's own responsibility now (see src/common/components/chat/use-chat.ts), fully covered by
  // use-chat.spec.ts. These two tests only confirm shopping-assistant wires useChat/ChatWindow/
  // ChatComposer together correctly — not every SSE edge case.
  describe('chat wiring', () => {
    it('renders the user message immediately, then the streamed bot reply and product card once the stream completes', async () => {
      renderAssistant();
      openDialogAndWait();

      const stream = sendMessageAndGetStreamController('Find me a jacket');
      expect(getTextInBody('Find me a jacket')).toBeTruthy();

      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Here is a jacket: [[pid-1]]' });
      stream.emitEvent('product', {
        product_id: 'pid-1',
        main_image_url: 'https://example.com/jacket.jpg',
        data: {
          product_url: 'https://example.com/jacket',
          price: { currency: 'USD', value: '59.99' },
          title: 'Cool Jacket',
          brand: 'Nike',
        },
      });
      stream.closeStream();
      await revealAll();

      expect(getTextInBody('Here is a jacket:')).toBeTruthy();
      expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(1);
    });

    it('blocks the composer while a reply is streaming and re-enables it once the reply commits', async () => {
      renderAssistant();
      openDialogAndWait();

      const stream = sendMessageAndGetStreamController('First message');
      const sendButton = testComponent.getByRole('button', { name: texts['en']['a11ySendMessage'], hidden: true }) as HTMLButtonElement;
      expect(sendButton.disabled).toBe(true);

      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Done' });
      stream.closeStream();
      await revealAll();

      expect(sendButton.disabled).toBe(false);
    });
  });

  // ============================================================
  // User input
  // ============================================================

  describe('user input', () => {
    it('should send message when pressing Enter', () => {
      renderAssistant();
      openDialogAndWait();

      const chatInput = testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true });
      act(() => {
        fireEvent.change(chatInput, { target: { value: 'Hello' } });
      });
      act(() => {
        fireEvent.keyDown(chatInput, { code: 'Enter', shiftKey: false });
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    });

    it('should display user message in chat after sending', () => {
      renderAssistant();
      openDialogAndWait();

      const chatInput = testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true });
      act(() => {
        fireEvent.change(chatInput, { target: { value: 'My message' } });
      });
      act(() => {
        fireEvent.keyDown(chatInput, { code: 'Enter', shiftKey: false });
      });

      expect(getTextInBody('My message')).toBeTruthy();
    });

    it('should clear the input after sending a message', () => {
      renderAssistant();
      openDialogAndWait();

      const chatInput = testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true }) as HTMLInputElement;
      act(() => {
        fireEvent.change(chatInput, { target: { value: 'Hello' } });
      });
      act(() => {
        fireEvent.keyDown(chatInput, { code: 'Enter', shiftKey: false });
      });

      expect(chatInput.value).toBe('');
    });

    it('should not send an empty message', () => {
      renderAssistant();
      openDialogAndWait();

      const chatInput = testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true });
      act(() => {
        fireEvent.keyDown(chatInput, { code: 'Enter', shiftKey: false });
      });

      expect(mockFetchEventSource).not.toHaveBeenCalled();
    });

    it('should send message via submit button click', () => {
      renderAssistant();
      openDialogAndWait();

      const chatInput = testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'], hidden: true });
      act(() => {
        fireEvent.change(chatInput, { target: { value: 'Submit test' } });
      });

      const submitButton = testComponent.getByRole('button', { name: texts['en']['a11ySendMessage'], hidden: true });
      act(() => {
        fireEvent.click(submitButton);
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Programmatic API
  // ============================================================

  describe('programmatic API', () => {
    it('should open dialog via widgetClient.openWidget()', () => {
      const { widgetClient } = renderAssistant();

      act(() => {
        widgetClient.openWidget('');
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(getTextInBody('Shopping Assistant')).toBeTruthy();
    });

    it('should close dialog via widgetClient.closeWidget()', () => {
      const { widgetClient } = renderAssistant();

      act(() => {
        widgetClient.openWidget('');
      });
      act(() => {
        jest.runAllTimers();
      });

      act(() => {
        widgetClient.closeWidget();
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(queryModal('.wigmix-modal')).toBeNull();
    });

    it('should send message via widgetClient.sendChatMessage()', async () => {
      const { widgetClient } = renderAssistant();

      await act(async () => {
        widgetClient.sendChatMessage('API message');
      });
      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      const url = mockFetchEventSource.mock.calls[0][0] as string;
      expect(url).toContain('q=API+message');
    });

    it('should include the image in the request FormData when widgetClient.sendChatMessage() is called with an image', async () => {
      const { widgetClient } = renderAssistant();

      const imagePayload = { files: [new File(['img'], 'test.png', { type: 'image/png' })] };
      await act(async () => {
        widgetClient.sendChatMessage('Find similar', imagePayload);
      });
      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      const options = mockFetchEventSource.mock.calls[0][1];
      const body = options.body as FormData;
      expect(body.get('image')).toBeTruthy();
    });
  });

  // ============================================================
  // Camera & image upload
  // ============================================================

  describe('camera and image upload', () => {
    it('shows a single "Add image" trigger instead of separate camera/upload buttons', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('button', { name: texts['en']['a11yAddImage'], hidden: true })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeNull();
    });

    it('reveals "Open camera" and "Upload image" options when the "Add image" trigger is clicked', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();

      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeTruthy();
      expect(testComponent.getByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('closes the menu without opening the camera or upload picker when clicking outside it', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeTruthy();

      act(() => {
        fireEvent.mouseDown(document.body);
      });

      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeNull();
      expect(testComponent.queryByTestId('mock-webcam')).toBeNull();
    });

    it('closes the menu when Escape is pressed', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeTruthy();

      act(() => {
        fireEvent.keyDown(document.body, { key: 'Escape' });
      });

      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true })).toBeNull();
    });

    it('disables the "Add image" trigger while waiting on a reply, and re-enables it once one arrives', async () => {
      renderAssistant();
      openDialogAndWait();

      const addImageButton = testComponent.getByRole('button', { name: texts['en']['a11yAddImage'], hidden: true }) as HTMLButtonElement;
      expect(addImageButton.disabled).toBe(false);

      const stream = sendMessageAndGetStreamController('Find me a jacket');
      expect(addImageButton.disabled).toBe(true);

      stream.emitEvent('chat_id', { value: 'chat-1' });
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('chat_token', { value: 'Here is a jacket' });
      stream.closeStream();
      await revealAll();

      expect(addImageButton.disabled).toBe(false);
    });

    it('should show the camera drawer when the "Open camera" option is clicked', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true }));
      });

      expect(testComponent.getByRole('dialog', { name: texts['en']['a11yCameraDrawer'], hidden: true })).toBeTruthy();
    });

    it('should close the camera drawer when the back button is clicked', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();
      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true }));
      });

      const backButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseCamera'], hidden: true });
      act(() => {
        fireEvent.click(backButton);
      });

      expect(testComponent.queryByRole('dialog', { name: texts['en']['a11yCameraDrawer'], hidden: true })).toBeNull();
    });

    it('should have a file upload dropzone inside the "Add image" menu', () => {
      renderAssistant();
      openDialogAndWait();
      openImageMenu();

      expect(testComponent.getByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('captures a photo and sends it into the chat, closing the drawer afterward', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' })),
      }) as unknown as typeof fetch;
      mockFetchEventSource.mockImplementation(async () => {});

      try {
        renderAssistant();
        openDialogAndWait();
        openImageMenu();
        act(() => {
          fireEvent.click(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'], hidden: true }));
        });

        expect(testComponent.getByTestId('mock-webcam')).toBeTruthy();

        const takePhotoButton = testComponent.getByRole('button', { name: texts['en']['a11yTakePhoto'], hidden: true });
        await act(async () => {
          fireEvent.click(takePhotoButton);
        });

        expect(mockFetchEventSource).toHaveBeenCalled();
        // The drawer closes itself right after capture (variant='drawer').
        expect(testComponent.queryByTestId('mock-webcam')).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // ============================================================
  // New chat
  // ============================================================

  describe('new chat', () => {
    it('should reset the visible chat state and replay the opening greeting when the new-chat button is clicked', async () => {
      renderAssistant();
      openDialogAndWait();

      const stream = sendMessageAndGetStreamController('Hello');
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Hi there!' });
      stream.closeStream();
      await revealAll();
      expect(getTextInBody('Hi there!')).toBeTruthy();

      const newChatButton = testComponent.getByRole('button', { name: texts['en']['a11yStartNewChat'], hidden: true });
      act(() => {
        fireEvent.click(newChatButton);
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(getTextInBody('Hi there!')).toBeNull();
      expect(getTextInBody(texts['en']['openingMessage1'])).toBeTruthy();
    });
  });

  // ============================================================
  // Voice input and output
  // ============================================================

  // Full voice-recording/narration mechanics (barge-in, sentence-by-sentence narration, typewriter
  // reveal, transcript-to-send, recording auto-stop) are ChatComposer's/useVoiceReply's job now —
  // already covered by ChatComposer.spec.tsx and use-voice-reply.spec.ts. These tests only confirm
  // shopping-assistant's own header voice-reading toggle and the composer's mic button are wired to
  // the right customization flag and the right chat callbacks.
  describe('voice input and output', () => {
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

    const renderWithVoice = (chatbotExtra: { voiceEnabled?: boolean } = { voiceEnabled: true }): void => {
      renderAssistant({}, 'en', {}, { chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, ...chatbotExtra } });
    };

    beforeEach(() => {
      mockRecognitionInstances = [];
    });

    afterEach(() => {
      delete (window as any).SpeechRecognition;
    });

    it('does not render the mic button or the header voice-reading toggle when chatbot.voiceEnabled is off (the default)', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.queryByRole('button', { name: texts['en']['holdMicToRecord'], hidden: true })).toBeNull();
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yDisableVoiceReading'], hidden: true })).toBeNull();
    });

    it('does not render the mic button when chatbot.voiceEnabled is on but the browser has no speech-recognition support', () => {
      renderWithVoice();
      openDialogAndWait();

      expect(testComponent.queryByRole('button', { name: texts['en']['holdMicToRecord'], hidden: true })).toBeNull();
    });

    it('renders the mic button once chatbot.voiceEnabled is on and the browser supports speech recognition, wiring press/release to chat.startVoiceRecording/stopRecording', () => {
      (window as any).SpeechRecognition = MockSpeechRecognition;
      renderWithVoice();
      openDialogAndWait();

      const micButton = testComponent.getByRole('button', { name: texts['en']['holdMicToRecord'], hidden: true });
      act(() => {
        fireEvent.mouseDown(micButton);
      });

      expect(mockRecognitionInstances).toHaveLength(1);
      expect(mockRecognitionInstances[0].start).toHaveBeenCalled();

      act(() => {
        fireEvent.mouseUp(micButton);
        // stopRecording defers the actual recognition.stop() call by a short grace period.
        jest.advanceTimersByTime(400);
      });
      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });

    it('renders the header voice-reading toggle when chatbot.voiceEnabled is on, and flips its label/aria-pressed when clicked', () => {
      renderWithVoice();
      openDialogAndWait();

      const muteButton = testComponent.getByRole('button', { name: texts['en']['a11yDisableVoiceReading'], hidden: true });
      expect(muteButton.getAttribute('aria-pressed')).toBe('true');

      act(() => {
        fireEvent.click(muteButton);
      });

      const afterToggle = testComponent.getByRole('button', { name: texts['en']['a11yEnableVoiceReading'], hidden: true });
      expect(afterToggle).toBe(muteButton);
      expect(muteButton.getAttribute('aria-pressed')).toBe('false');
    });
  });
});
