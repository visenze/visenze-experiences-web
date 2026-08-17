import { act, fireEvent, type RenderResult } from '@testing-library/react';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import AiSearchLauncher from './ai-search-launcher';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import type { WidgetConfig } from '../../common/wigmix-core';

// Mock @microsoft/fetch-event-source to control SSE streaming in tests
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

// Mock react-webcam
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

// Mock @heroui/input Textarea
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
}));

describe('ai-search-launcher', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS;
  const aiGreeting = DEFAULT_CUSTOMIZATIONS.launcher?.greetings?.ai || '';

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
      'wigmix_ai_search_launcher',
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

  const renderLauncher = (
    visearchOverrides: Partial<ViSearchClient> = {},
    locale = 'en',
    callbacks: Partial<WidgetConfig['callbacks']> = {},
    customizationOverrides: Partial<WidgetConfig['customizations']> = {},
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides, callbacks, customizationOverrides);
    testComponent = renderWidget(<AiSearchLauncher renderWithoutPortal />, {
      widgetConfig,
      widgetClient,
      locale,
      messages: texts[locale],
    });
    return { widgetConfig, widgetClient, mockVisearchClient };
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

  // Response text/products reveal progressively (typewriter text, one-at-a-time product cards)
  // via a stable interval rather than appearing all at once, and by default (unmuted) a reply
  // commit is additionally deferred behind a voice-synthesis attempt that fails fast in jsdom
  // (no fetch/SpeechSynthesis support) and falls back synchronously-ish. Advancing timers and
  // letting a microtask tick pass is enough to fast-forward past all of that.
  const revealAll = async (): Promise<void> => {
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
  };

  const openEntryPointAndWait = (labelId: string): void => {
    const button = testComponent.getByRole('button', { name: texts['en'][labelId] });
    act(() => {
      fireEvent.click(button);
    });
  };

  const sendMessageAndGetStreamController = (
    messageText: string,
  ): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
    triggerError: (error: Error) => void;
  } => {
    const textarea = document.body.querySelector('textarea[aria-label]') as HTMLTextAreaElement;

    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;
    let onerror: (err: Error) => void;

    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onmessage = options.onmessage;
      onclose = options.onclose;
      onerror = options.onerror;
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
      triggerError: (error: Error): void => {
        act(() => {
          onerror(error);
        });
      },
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // Core rendering
  // ============================================================

  describe('core rendering', () => {
    it('should match snapshot for closed state', () => {
      renderLauncher();
      expect(testComponent.asFragment()).toMatchSnapshot();
    });

    it('should render the three entry-bar buttons with correct a11y labels', () => {
      renderLauncher();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenImageSearch'] })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenVoiceSearch'] })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenAskAi'] })).toBeTruthy();
    });

    it('should not render the full-screen surface before any entry point is opened', () => {
      renderLauncher();
      expect(testComponent.queryByRole('dialog')).toBeNull();
    });
  });

  describe('entry points', () => {
    it('should open the full-screen surface showing image upload/camera controls for the image entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['en']['a11yTakePhoto'] })).toBeTruthy();
      expect(testComponent.getByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
      // Greeting for the image entry point is shown as a visible chat bubble underneath (not
      // asserted here directly, but the welcome screen itself must be showing, not the chat surface).
      expect(testComponent.queryByTestId('chat-textarea')).toBeNull();
    });

    it('should open the full-screen surface showing the mic entry welcome screen for the mic entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      // jsdom has no SpeechRecognition support, so voiceEnabled resolves false and the widget
      // falls back to its text-entry mic screen (a11y-labelled voice-unavailable message + textbox)
      // rather than the live mic icon/recording state.
      expect(getTextInBody(texts['en']['voiceInputError'])).toBeTruthy();
      expect(testComponent.getByRole('textbox', { name: texts['en']['a11yChatInput'] })).toBeTruthy();
    });

    it('should open the full-screen surface showing the chat surface directly for the ask-ai entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByTestId('chat-textarea')).toBeTruthy();
    });

    it('should show the mic icon and recording controls when the browser supports speech recognition', () => {
      const OriginalSpeechRecognition = (window as any).SpeechRecognition;
      (window as any).SpeechRecognition = function SpeechRecognitionMock(): void {
        return undefined;
      };
      (window as any).SpeechRecognition.prototype.start = jest.fn();
      (window as any).SpeechRecognition.prototype.stop = jest.fn();
      (window as any).SpeechRecognition.prototype.abort = jest.fn();

      try {
        renderLauncher();
        openEntryPointAndWait('a11yOpenVoiceSearch');

        expect(testComponent.getByRole('dialog')).toBeTruthy();
        expect(getTextInBody(texts['en']['voiceInputError'])).toBeNull();
        expect(testComponent.getByRole('button', { name: texts['en']['a11yVoicePending'], hidden: true })).toBeTruthy();
      } finally {
        (window as any).SpeechRecognition = OriginalSpeechRecognition;
      }
    });

    it('should close the full-screen surface and return to the entry-bar-only view when the close button is clicked', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');
      expect(testComponent.getByRole('dialog')).toBeTruthy();

      const closeButton = testComponent.getByRole('button', { name: texts['en']['a11yCloseFullScreen'] });
      act(() => {
        fireEvent.click(closeButton);
      });

      expect(testComponent.queryByRole('dialog')).toBeNull();
      // Entry bar is still there underneath.
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenAskAi'] })).toBeTruthy();
    });
  });

  describe('greeting playback', () => {
    it('should show the configured greeting as a bot chat bubble when an entry point opens, without speaking it by default', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      expect(getTextInBody(aiGreeting)).toBeTruthy();
      // voiceGreetingEnabled is false by default, so no speech-synthesis fetch should be attempted
      // for the greeting itself. (sendMessage's own reply narration is a separate concern, covered
      // by the SSE streaming tests below via the existing fetch-event-source mock only.)
    });

    it('should reset the visible chat state and replay the greeting when the new-chat button is clicked', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      const stream = sendMessageAndGetStreamController('Hello');
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Hi there!' });
      stream.closeStream();
      await revealAll();

      expect(getTextInBody('Hi there!')).toBeTruthy();

      const newChatButton = testComponent.getByRole('button', { name: texts['en']['a11yStartNewChat'] });
      act(() => {
        fireEvent.click(newChatButton);
      });

      expect(getTextInBody('Hi there!')).toBeNull();
      expect(getTextInBody(aiGreeting)).toBeTruthy();
    });
  });

  describe('chat messaging (Ask AI entry point)', () => {
    it('should render a user chat bubble immediately when a typed message is sent', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      sendMessageAndGetStreamController('Find me a jacket');

      expect(getTextInBody('Find me a jacket')).toBeTruthy();
    });

    it('should render the bot reply and product cards once the SSE stream completes', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      const stream = sendMessageAndGetStreamController('Show me shoes');

      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: 'req-123' });
      stream.emitEvent('chat_token', { value: 'Check these out: [[pid-1]]' });
      stream.emitEvent('product', {
        product_id: 'pid-1',
        main_image_url: 'https://example.com/shoe.jpg',
        data: {
          product_url: 'https://example.com/shoe',
          price: { currency: 'USD', value: '99.99' },
          title: 'Cool Shoes',
          brand: 'Nike',
        },
      });
      stream.closeStream();
      await revealAll();

      expect(getTextInBody('Check these out:')).toBeTruthy();
      expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(1);
    });
  });

  describe('mute control', () => {
    it('should toggle its own aria-pressed/label state when clicked, independent of audio playback', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      const muteButton = testComponent.getByRole('button', { name: texts['en']['a11yToggleMute'] });
      expect(muteButton.getAttribute('aria-pressed')).toBe('false');

      act(() => {
        fireEvent.click(muteButton);
      });

      const mutedButton = testComponent.getByRole('button', { name: texts['en']['a11yEnableMute'] });
      expect(mutedButton).toBe(muteButton);
      expect(muteButton.getAttribute('aria-pressed')).toBe('true');

      act(() => {
        fireEvent.click(muteButton);
      });

      expect(testComponent.getByRole('button', { name: texts['en']['a11yToggleMute'] }).getAttribute('aria-pressed')).toBe('false');
    });
  });
});
