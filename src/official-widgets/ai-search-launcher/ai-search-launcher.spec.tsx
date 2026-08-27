import { act, fireEvent, render, type RenderResult, within } from '@testing-library/react';
import { type FC, type ReactNode, useCallback, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import AiSearchLauncher from './ai-search-launcher';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { RootContext } from '../../common/components/shadow-wrapper';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';
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

// Mock @heroui/input Textarea/Input
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
    darkMode = false,
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides, callbacks, customizationOverrides);
    testComponent = renderWidget(<AiSearchLauncher renderWithoutPortal />, {
      widgetConfig,
      widgetClient,
      locale,
      messages: texts[locale],
      darkMode,
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
    const textarea = document.body.querySelector('input[aria-label]') as HTMLInputElement;

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

    it('should always label the AI entry-bar trigger with the fixed "AI Mode" copy, independent of the configured dialog title', () => {
      renderLauncher({}, 'en', {}, { chat: { title: 'Custom Dialog Title' } });

      const aiTrigger = testComponent.getByRole('button', { name: texts['en']['a11yOpenAskAi'] });
      expect(aiTrigger.textContent).toBe(texts['en']['triggerAskAi']);
      expect(aiTrigger.textContent).not.toBe('Custom Dialog Title');

      openEntryPointAndWait('a11yOpenAskAi');
      expect(getTextInBody('Custom Dialog Title')).toBeTruthy();
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

    // Regression test for C1: RootContext (src/common/components/shadow-wrapper.tsx) always
    // starts out null and is only filled in via a ref callback on the FIRST commit, so a
    // component reading it with useContext(RootContext) always renders once with root === null,
    // then re-renders with it set. `renderWidget`'s default wrapper always supplies a non-null
    // root, so it structurally can't exercise this path — this test uses its own small wrapper
    // that mimics ShadowWrapper's actual null-then-filled behavior instead. Before the fix, an
    // early `if (!root) { return <></>; }` guard placed BEFORE a hook call further down the
    // component meant the first render (root === null) skipped that hook while the second render
    // (root set) called it, changing the number of hooks called between renders — a hard React
    // violation that crashes the widget on mount.
    it('should not throw when RootContext starts null and is filled in on the very first commit', () => {
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
              <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
                <AiSearchLauncher renderWithoutPortal />
              </IntlProvider>
            </WidgetDataContext.Provider>
          </NullThenFilledRootWrapper>,
        );
      }).not.toThrow();
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
      // No chat to reset yet on the welcome screen, so the "new chat" trigger stays hidden.
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yStartNewChat'] })).toBeNull();
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
      // No chat to reset yet on the welcome screen, so the "new chat" trigger stays hidden.
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yStartNewChat'] })).toBeNull();
    });

    it('should open the full-screen surface showing the chat surface directly for the ask-ai entry point', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByTestId('chat-textarea')).toBeTruthy();
      // Ask AI has no dedicated welcome screen, so the "new chat" trigger is available right away.
      expect(testComponent.getByRole('button', { name: texts['en']['a11yStartNewChat'] })).toBeTruthy();
      // Camera/upload are combined behind a single "Add image" trigger inside the input pill,
      // mirroring shopping-assistant's chat footer but collapsed to one icon (see the "chat footer
      // — combined image icon" describe block for the popover's own behavior).
      expect(testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeNull();
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

  describe('customizable dialog chrome', () => {
    it('applies generalLayout.backgroundColor to the full-screen dialog background', () => {
      renderLauncher({}, 'en', {}, {
        generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, backgroundColor: '#ff00ff' },
      });
      openEntryPointAndWait('a11yOpenAskAi');

      expect(testComponent.getByRole('dialog').style.backgroundColor).toBe('rgb(255, 0, 255)');
    });

    it('applies generalLayout.backgroundColorDark to the full-screen dialog background in dark mode', () => {
      renderLauncher({}, 'en', {}, {
        generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, backgroundColorDark: '#00ff00' },
      }, true);
      openEntryPointAndWait('a11yOpenAskAi');

      expect(testComponent.getByRole('dialog').style.backgroundColor).toBe('rgb(0, 255, 0)');
    });

    it('applies generalLayout.border to the header separator', () => {
      renderLauncher({}, 'en', {}, {
        generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, border: { width: 3, color: '#123456', colorDark: '#654321' } },
      });
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

    const getMicButton = (): HTMLElement => testComponent.getByRole('button', { name: texts['en']['a11yVoicePending'], hidden: true });

    beforeEach(() => {
      mockRecognitionInstances = [];
      (window as any).SpeechRecognition = MockSpeechRecognition;
    });

    afterEach(() => {
      delete (window as any).SpeechRecognition;
    });

    it('gives the mic button a visible circular border', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');

      const micButton = getMicButton();
      expect(micButton.className).toMatch(/rounded-full/);
      expect(micButton.className).toMatch(/\bborder\b/);
      expect(micButton.className).not.toMatch(/border-0/);
    });

    it('applies generalLayout.border to the mic button', () => {
      renderLauncher({}, 'en', {}, {
        generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, border: { width: 2, color: '#123456', colorDark: '#654321' } },
      });
      openEntryPointAndWait('a11yOpenVoiceSearch');

      const micButton = getMicButton();
      expect(micButton.style.borderColor).toBe('#123456');
      expect(micButton.style.borderWidth).toBe('2px');
    });

    it('uses chat.inputBar.voiceRecordingColor for the recording-state icon instead of a hardcoded red', () => {
      renderLauncher({}, 'en', {}, {
        chat: { ...DEFAULT_CUSTOMIZATIONS.chat, inputBar: { ...DEFAULT_CUSTOMIZATIONS.chat?.inputBar, voiceRecordingColor: '#123456' } },
      });
      openEntryPointAndWait('a11yOpenVoiceSearch');

      const micButton = getMicButton();
      act(() => {
        fireEvent.click(micButton);
      });

      const recordingIcon = micButton.querySelector('.animate-pulse') as HTMLElement;
      expect(recordingIcon.style.color).toBe('rgb(18, 52, 86)');
    });

    it('starts recording immediately when clicked, without waiting for the auto-start gate', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');

      const micButton = getMicButton();
      act(() => {
        fireEvent.click(micButton);
      });

      expect(mockRecognitionInstances).toHaveLength(1);
      expect(mockRecognitionInstances[0].start).toHaveBeenCalled();
    });

    it('does not stop recording before the default 5-second duration elapses', () => {
      renderLauncher();
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
      renderLauncher();
      openEntryPointAndWait('a11yOpenVoiceSearch');

      act(() => {
        fireEvent.click(getMicButton());
      });
      act(() => {
        jest.advanceTimersByTime(5310);
      });

      expect(mockRecognitionInstances[0].stop).toHaveBeenCalled();
    });

    it('honors a configured auto-stop duration instead of the default', () => {
      renderLauncher({}, 'en', {}, { launcher: { voiceRecordingMaxDurationSeconds: 2 } });
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
  });

  describe('image entry point — camera-search-style upload UI', () => {
    it('should show the drag-to-search prompt and a camera link styled like camera-search\'s upload screen', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenImageSearch');

      expect(getTextInBody(texts['en']['dragImageToSearch'])).toBeTruthy();
      expect(getTextInBody(texts['en']['useCamera'])).toBeTruthy();
      // The camera trigger must keep its original accessible name (a11yTakePhoto) even though its
      // visible label now reads like camera-search's "useCamera" copy.
      expect(testComponent.getByRole('button', { name: texts['en']['a11yTakePhoto'] })).toBeTruthy();
    });

    it('should render the default sample gallery images out-of-the-box, matching camera-search', () => {
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
      renderLauncher({}, 'en', {}, {
        imageUpload: {
          enable: true,
          icon: { color: '#929292', colorDark: '#929292' },
          images: DEFAULT_CUSTOMIZATIONS.imageUpload?.images || [],
          galleryColumns: 3,
        },
      });
      openEntryPointAndWait('a11yOpenImageSearch');

      expect(testComponent.getByTestId('asl-gallery-grid').className).toMatch(/grid-cols-3/);
    });

    it('should not render the preset image gallery when imageUpload images are configured empty', () => {
      renderLauncher({}, 'en', {}, {
        imageUpload: { enable: true, icon: { color: '#000000', colorDark: '#FFFFFF' }, images: [] },
      });
      openEntryPointAndWait('a11yOpenImageSearch');

      expect(testComponent.queryByTestId('wigmix-gallery-image-1')).toBeNull();
    });

    it('should render configured gallery images and send the selected one as the initial chat message, as an im_url with no client-side fetch', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn();
      mockFetchEventSource.mockImplementation(async () => {});

      try {
        renderLauncher({}, 'en', {}, {
          imageUpload: {
            enable: true,
            icon: { color: '#000000', colorDark: '#FFFFFF' },
            images: [{ url: 'https://example.com/shoe.jpg', label: 'Shoes' }],
          },
        });
        openEntryPointAndWait('a11yOpenImageSearch');

        const galleryImage = testComponent.getByAltText('Shoes');
        await act(async () => {
          fireEvent.click(galleryImage);
        });

        // The gallery URL must reach the backend as `im_url` for it to fetch server-side —
        // the browser never fetches it directly, so a gallery host without CORS headers
        // (typical for a client's product-catalog CDN, which only needs to serve <img> tags)
        // still works.
        expect(global.fetch).not.toHaveBeenCalled();
        const [calledUrl] = mockFetchEventSource.mock.calls[0];
        expect(decodeURIComponent(calledUrl as string)).toContain('im_url=https://example.com/shoe.jpg');
        const uploadedImage = testComponent.getByAltText(texts['en']['a11yUploadedImage']) as HTMLImageElement;
        expect(uploadedImage.src).toBe('https://example.com/shoe.jpg');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('main chat surface — camera drawer', () => {
    it('should open a camera drawer over the chat footer and send the captured photo into the chat', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['image-bytes'], { type: 'image/png' })),
      }) as unknown as typeof fetch;
      mockFetchEventSource.mockImplementation(async () => {});

      try {
        renderLauncher();
        openEntryPointAndWait('a11yOpenAskAi');

        const addImageButton = testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] });
        act(() => {
          fireEvent.click(addImageButton);
        });

        const cameraButton = testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'] });
        act(() => {
          fireEvent.click(cameraButton);
        });

        expect(testComponent.getByTestId('mock-webcam')).toBeTruthy();
        // The popover closes itself once an option is chosen.
        expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeNull();

        const takePhotoButton = testComponent.getByRole('button', { name: texts['en']['a11yTakePhoto'] });
        await act(async () => {
          fireEvent.click(takePhotoButton);
        });

        expect(mockFetchEventSource).toHaveBeenCalled();
        // The drawer closes itself right after capture (unlike the image entry point's fullscreen
        // WebcamCapture, which relies on the caller unmounting it).
        expect(testComponent.queryByTestId('mock-webcam')).toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // Full narration-interruption coverage (a new message flushing rather than silently dropping a
  // previous reply still deferred behind pending speech) lives at the use-chat.ts hook level —
  // see use-chat.spec.ts — since that scenario now requires the API call to still be in flight,
  // which is exactly what the disabled state below (correctly) blocks from the UI.
  describe('image upload while a search is already in progress', () => {
    it('disables the "Add image" trigger while waiting on a reply, and re-enables it once one arrives', async () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      const addImageButton = testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] }) as HTMLButtonElement;
      expect(addImageButton.disabled).toBe(false);

      const stream = sendMessageAndGetStreamController('Find me a jacket');

      // The API call is now in flight — new-image upload must be blocked exactly like the text
      // composer's send button already is, not just left to silently misbehave if clicked.
      expect(addImageButton.disabled).toBe(true);
      act(() => {
        fireEvent.click(addImageButton);
      });
      expect(testComponent.queryByText(texts['en']['a11yUploadImage'])).toBeNull();
      expect(testComponent.queryByText(texts['en']['a11yOpenCamera'])).toBeNull();

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

      expect(testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] })).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeNull();
      expect(testComponent.queryByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeNull();
    });

    it('reveals "Open camera" and "Upload image" options when the Add image trigger is clicked', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] }));
      });

      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeTruthy();
      expect(testComponent.getByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('closes the menu without opening the camera or upload picker when clicking outside it', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] }));
      });
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeTruthy();

      act(() => {
        fireEvent.mouseDown(document.body);
      });

      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeNull();
      expect(testComponent.queryByTestId('mock-webcam')).toBeNull();
    });

    it('closes the menu when Escape is pressed', () => {
      renderLauncher();
      openEntryPointAndWait('a11yOpenAskAi');

      const addImageButton = testComponent.getByRole('button', { name: texts['en']['a11yAddImage'] });
      act(() => {
        fireEvent.click(addImageButton);
      });
      expect(testComponent.getByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeTruthy();

      act(() => {
        fireEvent.keyDown(document.body, { key: 'Escape' });
      });

      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeNull();
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

      // Only the newest turn's chips remain — the first turn's must not linger (they used to
      // render twice: once as a per-turn row and once as the trailing "live" row, and once fixed,
      // real usage showed users don't want stale chips from earlier searches sticking around).
      expect(getTextInBody('See more shoes')).toBeNull();
      expect(getTextInBody('See more hats')).toBeTruthy();
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

  describe('configurable entry modes and voice controls', () => {
    it('should not render the image entry-bar button when cameraEntryEnabled is disabled', () => {
      renderLauncher({}, 'en', {}, { launcher: { cameraEntryEnabled: false } });
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenImageSearch'] })).toBeNull();
    });

    it('should not render the mic entry-bar button when micEntryEnabled is disabled', () => {
      renderLauncher({}, 'en', {}, { launcher: { micEntryEnabled: false } });
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenVoiceSearch'] })).toBeNull();
    });

    it('should not render the Ask AI entry-bar button when askAiEntryEnabled is disabled', () => {
      renderLauncher({}, 'en', {}, { launcher: { askAiEntryEnabled: false } });
      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenAskAi'] })).toBeNull();
    });

    it('should hide the in-chat footer camera button (but keep upload) when chatCameraEnabled is disabled', () => {
      renderLauncher({}, 'en', {}, { launcher: { chatCameraEnabled: false } });
      openEntryPointAndWait('a11yOpenAskAi');

      expect(testComponent.queryByRole('button', { name: texts['en']['a11yOpenCamera'] })).toBeNull();
      expect(testComponent.getByLabelText(texts['en']['a11yUploadImage'], { selector: 'input' })).toBeTruthy();
    });

    it('should hide the in-chat footer mic button and the mute toggle when voiceEnabled is disabled', () => {
      const OriginalSpeechRecognition = (window as any).SpeechRecognition;
      (window as any).SpeechRecognition = function SpeechRecognitionMock(): void {
        return undefined;
      };
      (window as any).SpeechRecognition.prototype.start = jest.fn();
      (window as any).SpeechRecognition.prototype.stop = jest.fn();
      (window as any).SpeechRecognition.prototype.abort = jest.fn();

      try {
        renderLauncher({}, 'en', {}, { chat: { voiceEnabled: false } });
        openEntryPointAndWait('a11yOpenAskAi');

        expect(testComponent.queryByRole('button', { name: texts['en']['a11yVoicePending'], hidden: true })).toBeNull();
        expect(testComponent.queryByRole('button', { name: texts['en']['a11yToggleMute'] })).toBeNull();
      } finally {
        (window as any).SpeechRecognition = OriginalSpeechRecognition;
      }
    });
  });

  // These render directly (rather than via renderLauncher/renderWidget) so the tree can be wrapped
  // in react-responsive's Context, which is how every other widget's spec in this repo forces a
  // breakpoint — see similar-search.spec.tsx. Default breakpoints put 600 in mobile, 1200 desktop.
  describe('splitlayout engagement rule', () => {
    const renderAtWidth = (width: number, customizationOverrides: Partial<WidgetConfig['customizations']> = {}): RenderResult => {
      const { widgetConfig, widgetClient } = createTestClient({}, {}, { ...DEFAULT_CUSTOMIZATIONS, ...customizationOverrides });
      return render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <ResponsiveContext.Provider value={{ width }}>
                <AiSearchLauncher renderWithoutPortal />
              </ResponsiveContext.Provider>
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
      );
    };

    const openAskAi = (result: RenderResult): void => {
      act(() => {
        fireEvent.click(result.getByRole('button', { name: texts['en']['a11yOpenAskAi'] }));
      });
    };

    // Streams a turn that produces one product, stopping short of onclose so the assertion can
    // observe the mid-stream (pre-commit) state.
    const streamProductsWithoutClosing = (): void => {
      const textarea = document.body.querySelector('input[aria-label]') as HTMLInputElement;
      let onmessage: (ev: { event: string; data: string }) => void = () => {};
      mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
        onmessage = options.onmessage;
      });
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Show me shoes' } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });
      act(() => {
        onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-1' }) });
      });
      act(() => {
        onmessage({ event: 'reqid', data: JSON.stringify({ value: 'req-1' }) });
      });
      act(() => {
        onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Here: [[pid-1]]' }) });
      });
      act(() => {
        onmessage({
          event: 'product',
          data: JSON.stringify({
            product_id: 'pid-1',
            main_image_url: 'https://example.com/shoe.jpg',
            data: { product_url: 'https://example.com/shoe', price: { currency: 'USD', value: '99.99' }, title: 'Shoe' },
          }),
        });
      });
    };

    it('renders chat-only at desktop width with the default chatlayout config', () => {
      const result = renderAtWidth(1200);
      openAskAi(result);
      expect(result.queryByTestId('asl-split-layout')).toBeNull();
    });

    it('renders chat-only at desktop width with splitlayout configured but no results yet', () => {
      const result = renderAtWidth(1200, { chat: { ...DEFAULT_CUSTOMIZATIONS.chat, layout: 'splitlayout' } });
      openAskAi(result);
      expect(result.queryByTestId('asl-split-layout')).toBeNull();
    });

    it('renders SplitLayout once results arrive at desktop width with splitlayout configured', () => {
      const result = renderAtWidth(1200, { chat: { ...DEFAULT_CUSTOMIZATIONS.chat, layout: 'splitlayout' } });
      openAskAi(result);
      expect(result.queryByTestId('asl-split-layout')).toBeNull();

      streamProductsWithoutClosing();

      // Mid-stream, before onclose/commit: streamingProducts is already non-empty, so the
      // engagement rule (breadcrumbs.length > 0 || streamingProducts.length > 0) is already true.
      expect(result.queryByTestId('asl-split-layout')).toBeTruthy();
    });

    it('renders chat-only at a mobile width even with splitlayout configured and results present', () => {
      const result = renderAtWidth(600, { chat: { ...DEFAULT_CUSTOMIZATIONS.chat, layout: 'splitlayout' } });
      openAskAi(result);
      streamProductsWithoutClosing();
      expect(result.queryByTestId('asl-split-layout')).toBeNull();
    });

    it('applies chat.splitLayout.paneWidth to the chat pane width', () => {
      const result = renderAtWidth(1200, {
        chat: { ...DEFAULT_CUSTOMIZATIONS.chat, layout: 'splitlayout', splitLayout: { paneWidth: 500 } },
      });
      openAskAi(result);
      streamProductsWithoutClosing();

      expect(result.getByTestId('asl-split-chat-pane').style.width).toBe('500px');
    });

    it('applies chat.splitLayout.divider to the border between the chat and products panes', () => {
      const result = renderAtWidth(1200, {
        chat: {
          ...DEFAULT_CUSTOMIZATIONS.chat,
          layout: 'splitlayout',
          splitLayout: { divider: { width: 4, color: '#123456', colorDark: '#654321' } },
        },
      });
      openAskAi(result);
      streamProductsWithoutClosing();

      const pane = result.getByTestId('asl-split-chat-pane');
      expect(pane.style.borderRightColor).toBe('#123456');
      expect(pane.style.borderRightWidth).toBe('4px');
    });
  });

  describe('breadcrumb / hint-line sync (splitlayout, desktop)', () => {
    const renderSplitAtDesktop = (): RenderResult => {
      const { widgetConfig, widgetClient } = createTestClient({}, {}, {
        ...DEFAULT_CUSTOMIZATIONS,
        chat: { ...DEFAULT_CUSTOMIZATIONS.chat, layout: 'splitlayout' },
      });
      return render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <ResponsiveContext.Provider value={{ width: 1200 }}>
                <AiSearchLauncher renderWithoutPortal />
              </ResponsiveContext.Provider>
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
      );
    };

    const emitProductsTurn = (message: string, requestId: string): void => {
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
      act(() => {
        onclose();
      });
    };

    it('clicking an earlier breadcrumb makes it the active crumb without removing later ones', async () => {
      const result = renderSplitAtDesktop();
      act(() => {
        fireEvent.click(result.getByRole('button', { name: texts['en']['a11yOpenAskAi'] }));
      });

      emitProductsTurn('blue jeans', 'req-1');
      await revealAll();
      emitProductsTurn('blue jeans but cropped', 'req-2');
      await revealAll();

      const trail = within(result.getByRole('navigation', { name: texts['en']['a11yBreadcrumbTrail'] }));
      // Refinement (shares "jeans"), so the trail has both crumbs and the newest is active
      // (rendered as non-interactive text, not a button).
      expect(trail.getByText('blue jeans but cropped').getAttribute('aria-current')).toBe('true');

      const olderCrumb = trail.getByRole('button', { name: /Show results for: blue jeans$/ });
      act(() => {
        fireEvent.click(olderCrumb);
      });

      // Clicking the older crumb shows its results and makes it the active, non-interactive
      // entry — the newer crumb stays in the trail, just no longer marked active.
      expect(trail.getByText('blue jeans').getAttribute('aria-current')).toBe('true');
      expect(trail.getByRole('button', { name: /blue jeans but cropped/ }).getAttribute('aria-current')).toBeNull();
    });

    it('clicking an in-chat hint line activates the matching crumb, keeping both entry points in sync', async () => {
      const result = renderSplitAtDesktop();
      act(() => {
        fireEvent.click(result.getByRole('button', { name: texts['en']['a11yOpenAskAi'] }));
      });

      emitProductsTurn('blue jeans', 'req-1');
      await revealAll();
      emitProductsTurn('blue jeans but cropped', 'req-2');
      await revealAll();

      // Two turns => two hint lines in the chat pane (one per 'products' chat entry). Scoped to
      // buttons so it can't also match the sr-only live-region status text.
      const hintLines = result.getAllByRole('button', { name: /results shown/ });
      expect(hintLines).toHaveLength(2);

      act(() => {
        fireEvent.click(hintLines[0]);
      });

      // Clicking the FIRST turn's hint line activates the FIRST crumb — same handler/state as a
      // direct crumb click, so the two entry points can't drift apart.
      const trail = within(result.getByRole('navigation', { name: texts['en']['a11yBreadcrumbTrail'] }));
      expect(trail.getByText('blue jeans').getAttribute('aria-current')).toBe('true');
      expect(trail.getByRole('button', { name: /blue jeans but cropped/ })).not.toBeNull();
    });
  });

  describe('product results skeleton (splitlayout, desktop)', () => {
    const renderSplitAtDesktop = (): RenderResult => {
      const { widgetConfig, widgetClient } = createTestClient({}, {}, {
        ...DEFAULT_CUSTOMIZATIONS,
        chat: { ...DEFAULT_CUSTOMIZATIONS.chat, layout: 'splitlayout' },
      });
      return render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <ResponsiveContext.Provider value={{ width: 1200 }}>
                <AiSearchLauncher renderWithoutPortal />
              </ResponsiveContext.Provider>
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
      );
    };

    it('shows skeleton placeholders while a query is in flight, and swaps them for real products once results stream in', async () => {
      const result = renderSplitAtDesktop();
      act(() => {
        fireEvent.click(result.getByRole('button', { name: texts['en']['a11yOpenAskAi'] }));
      });

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

      // Query sent, nothing has streamed back yet: skeleton placeholders fill the grid area
      // instead of leaving it blank.
      expect(result.queryByTestId('asl-product-grid-skeleton')).not.toBeNull();
      expect(result.queryByTestId('wigmix-product-card-anchor')).toBeNull();

      act(() => {
        onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-1' }) });
      });
      act(() => {
        onmessage({ event: 'reqid', data: JSON.stringify({ value: 'req-1' }) });
      });

      // 'reqid' has arrived but no product yet: still nothing to show, so the skeleton stays up.
      expect(result.queryByTestId('asl-product-grid-skeleton')).not.toBeNull();

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

      // First product has streamed in: the skeleton is replaced by the real (streaming) grid.
      expect(result.queryByTestId('asl-product-grid-skeleton')).toBeNull();
      // ProductGrid reveals streamed-in cards one at a time on an interval — advance past it.
      await revealAll();
      expect(result.queryAllByTestId('wigmix-product-card-anchor').length).toBeGreaterThan(0);
    });
  });
});
