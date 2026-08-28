import { act, fireEvent, type RenderResult } from '@testing-library/react';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import EmbeddedShoppingAssistant from './embedded-shopping-assistant';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';

// Mock @microsoft/fetch-event-source to control SSE streaming in tests — same convention as
// ai-search-launcher.spec.tsx.
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

// Mock react-webcam — ChatComposer (mounted post-expansion, chatCameraEnabled) pulls in
// WebcamCapture, which renders a live <Webcam> even when its own drawer isn't open. Same mock as
// ai-search-launcher.spec.tsx.
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

describe('embedded-shopping-assistant-chat', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS['en'];

  const createTestClient = (
    visearchOverrides: Record<string, any> = {},
  ): {
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ReturnType<typeof createMockWidgetClient>['mockVisearchClient'];
  } => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, {
      searchSettings: {
        attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
      },
    });
    const { widgetClient, mockVisearchClient } = createMockWidgetClient(
      widgetConfig,
      'wigmix_embedded_shopping_assistant',
      {
        getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
        getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
        generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const renderEsa = (query: string): ReturnType<typeof createTestClient> => {
    const clientBundle = createTestClient();
    testComponent = renderWidget(<EmbeddedShoppingAssistant query={query} renderWithoutPortal />, {
      widgetConfig: clientBundle.widgetConfig,
      widgetClient: clientBundle.widgetClient,
      locale: 'en',
      messages: texts,
    });
    return clientBundle;
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

  // Captures the options object off the next fetchEventSource call and returns handles to drive
  // its SSE events manually — mirrors ai-search-launcher.spec.tsx's
  // sendMessageAndGetStreamController, adapted for ESA's mount-triggered (not click-triggered)
  // first send: it flushes the existing setTimeout(0) deferral instead of firing a submit event.
  const flushDeferredSendAndGetStreamController = (): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
  } => {
    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onmessage = options.onmessage;
      onclose = options.onclose;
    });
    act(() => {
      jest.advanceTimersByTime(0);
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

  // Same shape as above, for the "new chat" resend — captures the SECOND fetchEventSource call
  // triggered by clicking FullScreenChatContainer's new-chat button.
  const triggerNewChatAndGetStreamController = (): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
  } => {
    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onmessage = options.onmessage;
      onclose = options.onclose;
    });
    const newChatButton = testComponent.getByRole('button', { name: texts['a11yStartNewChat'] });
    act(() => {
      fireEvent.click(newChatButton);
    });
    act(() => {
      jest.advanceTimersByTime(0);
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

  // Response text/products reveal progressively via a stable interval rather than all at once —
  // same helper and rationale as ai-search-launcher.spec.tsx's revealAll.
  const revealAll = async (): Promise<void> => {
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
  };

  const mockProductEvent = (productId: string): Record<string, any> => ({
    product_id: productId,
    main_image_url: `https://example.com/${productId}.jpg`,
    data: {
      product_url: `https://example.com/${productId}`,
      price: { currency: 'USD', value: '99.99' },
      title: 'Cool Shoes',
      brand: 'Nike',
    },
  });

  // Drives one full turn (chat_id/reqid/chat_token with an inline product reference/product
  // event/close) to completion, then clicks "See Results" — the shared setup every post-
  // expansion test needs, since the button only appears once a turn has at least one product.
  const completeInitialTurnAndExpand = async (): Promise<void> => {
    const stream = flushDeferredSendAndGetStreamController();
    stream.emitEvent('chat_id', { value: 'chat-1' });
    stream.emitEvent('reqid', { value: 'req-1' });
    stream.emitEvent('chat_token', { value: 'Great picks: [[pid-1]]' });
    stream.emitEvent('product', mockProductEvent('pid-1'));
    stream.closeStream();
    await revealAll();

    act(() => {
      fireEvent.click(testComponent.getByRole('button', { name: texts['seeResults'] }));
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the isExpanded fork', () => {
    it('renders TurnSection content by default (isExpanded false)', () => {
      renderEsa('running shoes');
      // A turn (and therefore any of TurnSection's content, starting with its loading state)
      // only exists once the deferred initial send has actually pushed the 'user' entry.
      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(getTextInBody(texts['aiOverviewLabel'])).toBeTruthy();
      expect(testComponent.queryByRole('dialog')).toBeNull();
    });

    it('clicking "See Results" flips isExpanded to true and switches rendering to FullScreenChatContainer/ChatWindow/ChatComposer', async () => {
      renderEsa('running shoes');

      await completeInitialTurnAndExpand();

      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.getByRole('log')).toBeTruthy();
      expect(testComponent.getByRole('textbox', { name: texts['a11yChatInput'] })).toBeTruthy();
    });

    it('TurnSection and the full-screen surface are mutually exclusive', async () => {
      renderEsa('running shoes');

      // Drive the stream to completion (without clicking) so "See Results" actually exists to
      // assert on, then check the pre-expansion state before triggering the expansion itself.
      const stream = flushDeferredSendAndGetStreamController();
      stream.emitEvent('chat_id', { value: 'chat-1' });
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('chat_token', { value: 'Great picks: [[pid-1]]' });
      stream.emitEvent('product', mockProductEvent('pid-1'));
      stream.closeStream();
      await revealAll();

      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
      expect(testComponent.queryByRole('dialog')).toBeNull();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: texts['seeResults'] }));
      });

      // After expansion: the dialog is open, and TurnSection's own "See Results" button — which
      // only ever exists inside TurnSection — is gone, proving TurnSection actually unmounted
      // rather than staying present underneath the modal overlay.
      expect(testComponent.getByRole('dialog')).toBeTruthy();
      expect(testComponent.queryByRole('button', { name: texts['seeResults'] })).toBeNull();
    });
  });

  describe('the !query fallback', () => {
    it('renders the "No search query provided" message when query is empty', () => {
      renderEsa('');

      expect(getTextInBody(texts['noQueryProvided'])).toBeTruthy();
    });

    it('never calls chat.sendMessage when query is empty', async () => {
      renderEsa('');

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockFetchEventSource).not.toHaveBeenCalled();
    });
  });

  describe('normal query flow', () => {
    it('fires chat.open() then a deferred chat.sendMessage(query) on mount', () => {
      const { mockVisearchClient } = renderEsa('running shoes');

      // chat.open() has resolved a fresh chatId via generateUuid synchronously on mount.
      expect(mockVisearchClient.generateUuid).toHaveBeenCalled();
      // The send itself is still deferred behind the chatId-race setTimeout(0) — not yet fired.
      expect(mockFetchEventSource).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      const [url] = mockFetchEventSource.mock.calls[0];
      const params = new URLSearchParams((url as string).split('?')[1]);
      expect(params.get('q')).toBe('running shoes');
    });

    it('renders the resulting turn via TurnSection once the SSE stream completes', async () => {
      renderEsa('running shoes');

      const stream = flushDeferredSendAndGetStreamController();
      stream.emitEvent('chat_id', { value: 'chat-1' });
      stream.emitEvent('reqid', { value: 'req-1' });
      stream.emitEvent('chat_token', { value: 'Great picks: [[pid-1]]' });
      stream.emitEvent('product', mockProductEvent('pid-1'));
      stream.closeStream();
      await revealAll();

      // The completed turn's AI text and the "See Results" gate (which only appears once a turn
      // actually has products) are the observable proof the turn committed correctly. Product
      // cards themselves are not asserted here: clicking "See Results" flips isExpanded in the
      // same state update that unmounts TurnSection (per the mutual-exclusivity fix), so
      // TurnSection's own product-grid branch never actually has a chance to paint — it's covered
      // structurally by the "mutually exclusive" test above instead.
      expect(getTextInBody('Great picks:')).toBeTruthy();
      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
    });
  });

  describe('handleNewChat', () => {
    it('calls chat.newChat() and resends the original query via the same race-safe deferral', async () => {
      renderEsa('running shoes');
      await completeInitialTurnAndExpand();
      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);

      const secondStream = triggerNewChatAndGetStreamController();

      expect(mockFetchEventSource).toHaveBeenCalledTimes(2);
      const [secondUrl] = mockFetchEventSource.mock.calls[1];
      const params = new URLSearchParams((secondUrl as string).split('?')[1]);
      expect(params.get('q')).toBe('running shoes');

      secondStream.closeStream();
    });

    it('clears expandedTurnIds, so the new conversation is not pre-expanded once collapsed back to TurnSection', async () => {
      renderEsa('running shoes');
      await completeInitialTurnAndExpand();

      const secondStream = triggerNewChatAndGetStreamController();
      secondStream.emitEvent('chat_id', { value: 'chat-2' });
      secondStream.emitEvent('reqid', { value: 'req-2' });
      secondStream.emitEvent('chat_token', { value: 'New picks: [[pid-2]]' });
      secondStream.emitEvent('product', mockProductEvent('pid-2'));
      secondStream.closeStream();
      await revealAll();

      const closeButton = testComponent.getByRole('button', { name: texts['a11yCloseFullScreen'] });
      act(() => {
        fireEvent.click(closeButton);
      });

      // If expandedTurnIds still held the previous conversation's stale '0' id, the new
      // conversation's own turn 0 would render as already-expanded (no gate, no button) — its
      // presence here proves the id was actually cleared by handleNewChat.
      expect(testComponent.getByRole('button', { name: texts['seeResults'] })).toBeTruthy();
      expect(getTextInBody('New picks:')).toBeTruthy();
    });
  });

  describe('loading state accessibility', () => {
    it('announces the loading row to screen readers via role="status"/aria-live', () => {
      renderEsa('running shoes');
      act(() => {
        jest.advanceTimersByTime(0);
      });

      const status = testComponent.getByRole('status');
      expect(status).toBeTruthy();
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).toContain(texts['gettingOverview']);
    });
  });
});
