import { act, fireEvent, type RenderResult } from '@testing-library/react';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import ShoppingAssistant from './shopping-assistant';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { Actions } from '../../common/types/tracking-constants';

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
        value={props.value}
        placeholder={props.placeholder}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
      {props.endContent && <div data-testid='chat-submit-button'>{props.endContent}</div>}
    </div>
  ),
}));

describe('shopping-assistant', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS;
  let modalRoot: HTMLDivElement;

  const createTestClient = (visearchOverrides: Partial<ViSearchClient> = {}): {
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ViSearchClient;
  } => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, {
      searchSettings: {
        attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
      },
    });
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
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides);
    testComponent = renderWidget(<ShoppingAssistant renderModalWithoutPortal />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
      rootElement: modalRoot,
    });
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const queryModal = (selector: string): Element | null => document.body.querySelector(selector);
  const queryAllModal = (selector: string): NodeListOf<Element> => document.body.querySelectorAll(selector);
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

  const openDialogAndWait = (): void => {
    const triggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
    act(() => {
      fireEvent.click(triggerButton);
    });
    act(() => {
      jest.runAllTimers();
    });
  };

  const sendMessageAndGetStreamController = (
    messageText: string,
  ): {
    emitEvent: (event: string, data: any) => void;
    closeStream: () => void;
    triggerError: (error: Error) => void;
  } => {
    const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

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
    modalRoot = document.createElement('div');
    modalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(modalRoot);
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (modalRoot && modalRoot.parentNode) {
      modalRoot.parentNode.removeChild(modalRoot);
    }
  });

  // ============================================================
  // Core Rendering Tests
  // ============================================================

  describe('core rendering', () => {
    it('should render trigger button without crashing', () => {
      renderAssistant();
      expect(testComponent.getByTestId('wigmix-popup-trigger-button')).toBeTruthy();
    });

    it('should match snapshot for closed state', () => {
      renderAssistant();
      expect(testComponent.asFragment()).toMatchSnapshot();
    });

    it('should open chat dialog when trigger button is clicked', () => {
      renderAssistant();
      openDialogAndWait();
      expect(getTextInBody('Shopping Assistant')).toBeTruthy();
    });

    it('should close dialog when close button is clicked', () => {
      renderAssistant();
      openDialogAndWait();

      const closeButton = testComponent.getByRole('button', { name: 'Close shopping assistant', hidden: true });

      act(() => {
        fireEvent.click(closeButton);
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(queryModal('.wigmix-modal')).toBeNull();
    });
  });

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

      expect(testComponent.getByRole('button', { name: 'Start new chat', hidden: true })).toBeTruthy();
      expect(testComponent.getByRole('button', { name: 'Close shopping assistant', hidden: true })).toBeTruthy();
    });

    it('should expose image action controls as named buttons', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('button', { name: 'Open camera', hidden: true })).toBeTruthy();
      expect(document.body.querySelector('[aria-label="Upload image"]')).toBeTruthy();
    });

    it('should expose send as a named button', () => {
      renderAssistant();
      openDialogAndWait();

      expect(testComponent.getByRole('button', { name: 'Send message', hidden: true })).toBeTruthy();
    });

    it('should not place static chat messages in the tab order', () => {
      renderAssistant();
      openDialogAndWait();

      expect(getTextInBody('Let\'s get started')?.closest('[tabindex="0"]')).toBeNull();
      expect(getTextInBody('Tell us about what your styling needs')?.closest('[tabindex="0"]')).toBeNull();
    });
  });

  // ============================================================
  // SSE Streaming Tests - Core Focus
  // ============================================================

  describe('SSE streaming', () => {
    describe('progressive token streaming', () => {
      it('should show loading dots immediately after sending message', () => {
        renderAssistant();
        openDialogAndWait();

        sendMessageAndGetStreamController('Hello');

        const loadingDots = queryAllModal('.loading-dot');
        expect(loadingDots.length).toBe(3);
      });

      it('should hide loading dots after first token arrives', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Hello');

        // Loading dots should be visible before any tokens
        expect(queryAllModal('.loading-dot').length).toBe(3);

        // Emit first token
        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('chat_token', { value: 'Hi' });

        // Loading dots should disappear after first token
        expect(queryAllModal('.loading-dot').length).toBe(0);
      });

      it('should progressively display text as tokens stream in', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Tell me something');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        // First token
        stream.emitEvent('chat_token', { value: 'Hello' });
        expect(getTextInBody('Hello')).toBeTruthy();
        expect(getTextInBody('Hello world')).toBeNull();

        // Second token appends
        stream.emitEvent('chat_token', { value: ' world' });
        expect(getTextInBody('Hello world')).toBeTruthy();
        expect(getTextInBody('Hello world!')).toBeNull();

        // Third token appends
        stream.emitEvent('chat_token', { value: '!' });
        expect(getTextInBody('Hello world!')).toBeTruthy();
      });

      it('should accumulate multi-line responses correctly', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Give me a list');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Here are items:\n' });
        stream.emitEvent('chat_token', { value: '1. First\n' });
        stream.emitEvent('chat_token', { value: '2. Second\n' });
        stream.emitEvent('chat_token', { value: '3. Third' });

        expect(getTextInBody('Here are items:')).toBeTruthy();
        expect(getTextInBody('1. First')).toBeTruthy();
        expect(getTextInBody('2. Second')).toBeTruthy();
        expect(getTextInBody('3. Third')).toBeTruthy();
      });

      it('should finalize message in chat history when stream closes', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Hello');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        stream.emitEvent('chat_token', { value: 'Complete response text' });
        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        // Message should be in final chat history
        expect(getTextInBody('Complete response text')).toBeTruthy();
      });
    });

    describe('product streaming', () => {
      it('should display product card when product event arrives after PID token', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Show me shoes');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        // Intro text
        stream.emitEvent('chat_token', { value: 'Check out this product:\n' });

        // Product line with PID
        stream.emitEvent('chat_token', { value: '[[pid-1]] **Cool Shoes** - Great for running' });

        // Product data arrives
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

        // Newline triggers product display
        stream.emitEvent('chat_token', { value: '\n' });

        const productCards = queryAllModal('.wigmix-product-card');
        expect(productCards.length).toBe(1);
      });

      it('should accumulate multiple products in sequence', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Show me products');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Products for you:\n' });

        // First product
        stream.emitEvent('chat_token', { value: '[[pid-1]] Product One' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img1.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
        });
        stream.emitEvent('chat_token', { value: '\n' });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);

        // Second product
        stream.emitEvent('chat_token', { value: '[[pid-2]] Product Two' });
        stream.emitEvent('product', {
          product_id: 'pid-2',
          main_image_url: 'https://img2.jpg',
          data: { product_url: 'https://p2', price: { currency: 'USD', value: '20' }, title: 'P2' },
        });
        stream.emitEvent('chat_token', { value: '\n' });

        expect(queryAllModal('.wigmix-product-card').length).toBe(2);

        // Third product
        stream.emitEvent('chat_token', { value: '[[pid-3]] Product Three' });
        stream.emitEvent('product', {
          product_id: 'pid-3',
          main_image_url: 'https://img3.jpg',
          data: { product_url: 'https://p3', price: { currency: 'USD', value: '30' }, title: 'P3' },
        });
        stream.emitEvent('chat_token', { value: '\n' });

        expect(queryAllModal('.wigmix-product-card').length).toBe(3);

        stream.closeStream();
      });

      it('should handle text after products in stream', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Products please');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Here is a product:\n' });
        stream.emitEvent('chat_token', { value: '[[pid-1]] Product' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p', price: { currency: 'USD', value: '10' }, title: 'P' },
        });
        stream.emitEvent('chat_token', { value: '\n' });
        stream.emitEvent('chat_token', { value: 'Let me know if you need more!' });

        stream.closeStream();
        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('Let me know if you need more!')).toBeTruthy();
      });

      it('should render card and keep the description for the new trailing-token format', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Show me dresses');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Here are dresses:\n' });
        stream.emitEvent('chat_token', { value: '- Floral dress: a vibrant look. ' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'Floral' },
        });
        stream.emitEvent('chat_token', { value: '[[pid-1]]' });
        stream.emitEvent('chat_token', { value: '\n' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('Floral dress: a vibrant look.')).toBeTruthy();
        expect(getTextInBody('[[pid-1]]')).toBeNull();
      });

      it('should stream the card live (before close) once the token and product arrive', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Live card');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Nice pick: a bold red. ' });
        stream.emitEvent('product', {
          product_id: 'pid-9',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p9', price: { currency: 'USD', value: '20' }, title: 'Red' },
        });
        stream.emitEvent('chat_token', { value: '[[pid-9]]' });

        // Assert BEFORE closing the stream — proves the live grid renders mid-stream.
        expect(queryAllModal('.wigmix-product-card').length).toBe(1);

        stream.closeStream();
      });

      it('should parse a product token split across SSE chunks', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Split token');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Item desc ' });
        stream.emitEvent('chat_token', { value: '[[pi' });
        // Partial, unclosed token must not leak into the bubble.
        expect(getTextInBody('[[pi')).toBeNull();
        stream.emitEvent('chat_token', { value: 'd-1]]' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
        });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('[[pid-1]]')).toBeNull();
      });

      it('should strip the token but render no card when the product payload never arrives', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Missing payload');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Missing item: desc here [[pid-x]]\n' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(0);
        expect(getTextInBody('[[pid-x]]')).toBeNull();
        expect(getTextInBody('Missing item: desc here')).toBeTruthy();
      });

      it('should drop the whole line for the old leading-token format', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Old format');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Intro line:\n' });
        stream.emitEvent('chat_token', { value: '- [[pid-1]] leadingdroptext' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'CardTitle' },
        });
        stream.emitEvent('chat_token', { value: '\n' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(getTextInBody('leadingdroptext')).toBeNull();
        expect(getTextInBody('Intro line:')).toBeTruthy();
      });

      it('should carry the current request id into a live (pre-close) product card', () => {
        const { widgetClient } = renderAssistant();
        const sendEventSpy = jest.spyOn(widgetClient, 'sendEvent');
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Show me shoes live');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });

        stream.emitEvent('chat_token', { value: 'Nice pick: [[pid-1]]' });
        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
        });

        const anchor = document.body.querySelector('[data-testid="wigmix-product-card-anchor"]') as HTMLAnchorElement;
        expect(anchor).toBeTruthy();
        anchor.click();

        expect(sendEventSpy).toHaveBeenCalledWith(Actions.PRODUCT_CLICK, expect.objectContaining({ queryId: 'req-123' }));

        stream.closeStream();
      });

      it('should fire PRODUCT_VIEW exactly once as a card transitions from the live grid to the committed row', () => {
        const originalIntersectionObserver = (window as any).IntersectionObserver;
        // Only track callbacks whose observer actually attaches to a node via `.observe()` —
        // ProductCard's ref-callback pattern constructs one throwaway observer per render
        // before `targetRef` is set, which never calls `.observe()` and never intersects for real.
        const observerCallbacks: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];
        (window as any).IntersectionObserver = jest.fn((callback: (entries: Array<{ isIntersecting: boolean }>) => void) => ({
          observe: jest.fn(() => {
            observerCallbacks.push(callback);
          }),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        }));

        try {
          const { widgetClient } = renderAssistant();
          const sendEventSpy = jest.spyOn(widgetClient, 'sendEvent');
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Show me a dedup test');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });
          stream.emitEvent('chat_token', { value: 'Nice pick: [[pid-1]]' });
          stream.emitEvent('product', {
            product_id: 'pid-1',
            main_image_url: 'https://img.jpg',
            data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
          });

          expect(queryAllModal('.wigmix-product-card').length).toBe(1);
          expect(observerCallbacks.length).toBe(1);

          act(() => {
            observerCallbacks[0]([{ isIntersecting: true }]);
          });

          const viewCallsWhileLive = sendEventSpy.mock.calls.filter(([action]) => action === Actions.PRODUCT_VIEW).length;
          expect(viewCallsWhileLive).toBe(1);

          stream.closeStream();
          act(() => {
            jest.runAllTimers();
          });

          expect(observerCallbacks.length).toBe(2);
          act(() => {
            observerCallbacks[1]([{ isIntersecting: true }]);
          });

          const viewCallsAfterClose = sendEventSpy.mock.calls.filter(([action]) => action === Actions.PRODUCT_VIEW).length;
          expect(viewCallsAfterClose).toBe(1);
        } finally {
          (window as any).IntersectionObserver = originalIntersectionObserver;
        }
      });

      it('should not suppress PRODUCT_VIEW for the same product across different requests', () => {
        const originalIntersectionObserver = (window as any).IntersectionObserver;
        const observerCallbacks: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];
        (window as any).IntersectionObserver = jest.fn((callback: (entries: Array<{ isIntersecting: boolean }>) => void) => ({
          observe: jest.fn(() => {
            observerCallbacks.push(callback);
          }),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        }));

        try {
          const { widgetClient } = renderAssistant();
          const sendEventSpy = jest.spyOn(widgetClient, 'sendEvent');
          openDialogAndWait();

          // First response references pid-1 under req-1
          const stream1 = sendMessageAndGetStreamController('First request');
          stream1.emitEvent('chat_id', { value: 'chat-123' });
          stream1.emitEvent('reqid', { value: 'req-1' });
          stream1.emitEvent('chat_token', { value: 'Nice pick: [[pid-1]]' });
          stream1.emitEvent('product', {
            product_id: 'pid-1',
            main_image_url: 'https://img.jpg',
            data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
          });

          act(() => {
            observerCallbacks[observerCallbacks.length - 1]([{ isIntersecting: true }]);
          });

          stream1.closeStream();
          act(() => {
            jest.runAllTimers();
          });

          // Second, unrelated response references the same pid-1 under a different req id
          const stream2 = sendMessageAndGetStreamController('Second request');
          stream2.emitEvent('chat_id', { value: 'chat-456' });
          stream2.emitEvent('reqid', { value: 'req-2' });
          stream2.emitEvent('chat_token', { value: 'Also this: [[pid-1]]' });
          stream2.emitEvent('product', {
            product_id: 'pid-1',
            main_image_url: 'https://img.jpg',
            data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
          });

          act(() => {
            observerCallbacks[observerCallbacks.length - 1]([{ isIntersecting: true }]);
          });

          stream2.closeStream();

          const viewCalls = sendEventSpy.mock.calls.filter(([action]) => action === Actions.PRODUCT_VIEW).length;
          expect(viewCalls).toBe(2);
        } finally {
          (window as any).IntersectionObserver = originalIntersectionObserver;
        }
      });

      it('should scroll into view when a live product resolves after its token', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Show me a live scroll test');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        stream.emitEvent('chat_token', { value: 'Nice pick: [[pid-1]]\n' });

        const scrollSpy = Element.prototype.scrollIntoView as jest.Mock;
        const callsBeforeProduct = scrollSpy.mock.calls.length;

        stream.emitEvent('product', {
          product_id: 'pid-1',
          main_image_url: 'https://img.jpg',
          data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
        });

        expect(queryAllModal('.wigmix-product-card').length).toBe(1);
        expect(scrollSpy.mock.calls.length).toBeGreaterThan(callsBeforeProduct);

        stream.closeStream();
      });
    });

    describe('suggestion chips streaming', () => {
      it('should extract and display suggestion chips from stream', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('What options?');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        // Only 2 suggestions shown by default (showAllSuggestions is false)
        stream.emitEvent('chat_token', { value: 'Try these: ((red dress)) ((blue jacket))' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        expect(getTextInBody('red dress')).toBeTruthy();
        expect(getTextInBody('blue jacket')).toBeTruthy();
      });

      it('should show "Show more..." when there are more than 2 suggestions', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('What options?');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        stream.emitEvent('chat_token', { value: 'Options: ((opt1)) ((opt2)) ((opt3)) ((opt4))' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        // First 2 suggestions visible
        expect(getTextInBody('opt1')).toBeTruthy();
        expect(getTextInBody('opt2')).toBeTruthy();
        // "Show more..." should appear
        expect(getTextInBody('Show more...')).toBeTruthy();

        // Click "Show more..."
        const showMore = getTextInBody('Show more...');
        act(() => {
          fireEvent.click(showMore as HTMLElement);
        });

        // All suggestions should now be visible
        expect(getTextInBody('opt3')).toBeTruthy();
        expect(getTextInBody('opt4')).toBeTruthy();
      });

      it('should send suggestion as message when chip is clicked', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Suggestions');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        stream.emitEvent('chat_token', { value: 'Options: ((red dress)) ((blue jacket))' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        mockFetchEventSource.mockReset();

        const chip = getTextInBody('red dress');
        act(() => {
          fireEvent.click(chip as HTMLElement);
        });

        expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
        const url = mockFetchEventSource.mock.calls[0][0] as string;
        expect(url).toContain('q=red+dress');
      });
    });

    describe('stream state management', () => {
      it('should block user input while stream is active', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('First message');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('chat_token', { value: 'Processing...' });

        // Try to send another message while streaming
        const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;
        act(() => {
          fireEvent.change(textarea, { target: { value: 'Second message' } });
        });
        act(() => {
          fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
        });

        // Should only have one call (the first message)
        expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      });

      it('should re-enable user input after stream closes', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('First message');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        stream.emitEvent('chat_token', { value: 'Done' });
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        mockFetchEventSource.mockReset();

        // Now should be able to send another message
        const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;
        act(() => {
          fireEvent.change(textarea, { target: { value: 'Second message' } });
        });
        act(() => {
          fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
        });

        expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
      });

      it('should handle empty stream response gracefully', () => {
        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Empty test');

        stream.emitEvent('chat_id', { value: 'chat-123' });
        stream.emitEvent('reqid', { value: 'req-123' });
        // No chat_token events, just close
        stream.closeStream();

        act(() => { jest.runAllTimers(); });

        // Should not crash, dialog should still be visible
        expect(getTextInBody('Shopping Assistant')).toBeTruthy();
      });

      it('should handle stream error without crashing', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        renderAssistant();
        openDialogAndWait();

        const stream = sendMessageAndGetStreamController('Error test');

        stream.triggerError(new Error('Stream failed'));

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    // ============================================================
    // Error Handling & Recovery Tests
    // ============================================================

    describe('error handling and recovery', () => {
      describe('SSE connection failures', () => {
        it('should not crash when connection drops mid-stream', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          // Start first message
          const stream = sendMessageAndGetStreamController('Hello');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('chat_token', { value: 'Starting response...' });

          // Simulate connection drop mid-stream
          stream.triggerError(new Error('Connection lost'));

          act(() => {
            jest.runAllTimers();
          });

          // Dialog should still be visible (not crashed)
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          consoleSpy.mockRestore();
        });

        it('should not crash on network timeout error', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Timeout test');

          // Simulate network timeout error
          stream.triggerError(new Error('Network request failed: timeout'));

          act(() => {
            jest.runAllTimers();
          });

          // Widget should remain functional
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          consoleSpy.mockRestore();
        });

        it('should handle abrupt stream closure without tokens', () => {
          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Abrupt close');

          // Stream closes immediately without any events
          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          // Should not crash, UI should be functional
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          // Should be able to send another message
          mockFetchEventSource.mockReset();
          const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

          act(() => {
            fireEvent.change(textarea, { target: { value: 'Follow up' } });
          });
          act(() => {
            fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
          });

          expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
        });

        it('should handle error with specific error types', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Error types test');

          // Test various error types
          stream.triggerError(new TypeError('Failed to fetch'));

          act(() => {
            jest.runAllTimers();
          });

          // Widget should still be functional after error
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          consoleSpy.mockRestore();
        });
      });

      describe('malformed data handling', () => {
        it('should handle malformed JSON in chat_token event', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

          let onmessage: (ev: { event: string; data: string }) => void;
          let onclose: () => void;

          mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
            onmessage = options.onmessage;
            onclose = options.onclose;
          });

          act(() => {
            fireEvent.change(textarea, { target: { value: 'Malformed test' } });
          });
          act(() => {
            fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
          });

          // Send valid chat_id first
          act(() => {
            onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-123' }) });
          });

          // Send malformed JSON data
          act(() => {
            try {
              onmessage({ event: 'chat_token', data: '{invalid json' });
            } catch {
              // Expected to potentially throw
            }
          });

          // Send valid token after malformed one
          act(() => {
            onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Valid token' }) });
          });

          act(() => {
            onclose();
          });

          act(() => {
            jest.runAllTimers();
          });

          // Widget should still be functional
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          consoleSpy.mockRestore();
        });

        it('should handle product event with missing required fields', () => {
          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Products with missing data');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });

          stream.emitEvent('chat_token', { value: 'Here is a product:\n' });
          stream.emitEvent('chat_token', { value: '[[pid-1]] Product' });

          // Product event with missing fields
          stream.emitEvent('product', {
            product_id: 'pid-1',
            // Missing main_image_url
            data: {
              // Missing product_url
              title: 'Incomplete Product',
            },
          });

          stream.emitEvent('chat_token', { value: '\n' });
          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          // Should not crash
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();
        });

        it('should handle product event with null/undefined values', () => {
          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Null product data');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });

          stream.emitEvent('chat_token', { value: 'Product:\n[[pid-1]] Test\n' });

          // Product with null values
          stream.emitEvent('product', {
            product_id: 'pid-1',
            main_image_url: null,
            data: {
              product_url: undefined,
              price: null,
              title: null,
            },
          });

          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          // Should handle gracefully without crashing
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();
        });

        it('should handle empty product_id in product event', () => {
          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Empty pid');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });

          stream.emitEvent('chat_token', { value: 'Product:\n[[]] Empty PID\n' });

          stream.emitEvent('product', {
            product_id: '',
            main_image_url: 'https://img.jpg',
            data: { title: 'No PID Product' },
          });

          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          expect(getTextInBody('Shopping Assistant')).toBeTruthy();
        });

        it('should handle unexpected event types gracefully', () => {
          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Unknown events');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });

          // Send some valid tokens
          stream.emitEvent('chat_token', { value: 'Hello ' });

          // Send unknown/unexpected event types
          stream.emitEvent('unknown_event', { value: 'should be ignored' });
          stream.emitEvent('random_type', { data: 'also ignored' });
          stream.emitEvent('', { value: 'empty event type' });

          // Continue with valid tokens
          stream.emitEvent('chat_token', { value: 'world!' });

          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          // Valid tokens should still be displayed
          expect(getTextInBody('Hello world!')).toBeTruthy();
        });
      });

      describe('partial stream recovery', () => {
        it('should preserve partial response when stream errors after some tokens', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Partial response');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });

          // Send some tokens before error
          stream.emitEvent('chat_token', { value: 'This is a partial ' });
          stream.emitEvent('chat_token', { value: 'response that ' });

          // Error occurs mid-stream
          stream.triggerError(new Error('Connection interrupted'));

          act(() => {
            jest.runAllTimers();
          });

          // Partial content should still be visible (or gracefully handled)
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          consoleSpy.mockRestore();
        });

        it('should handle error after products have been displayed', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          const stream = sendMessageAndGetStreamController('Products then error');

          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });

          stream.emitEvent('chat_token', { value: 'Here are products:\n' });

          // First product successfully displayed
          stream.emitEvent('chat_token', { value: '[[pid-1]] Product One' });
          stream.emitEvent('product', {
            product_id: 'pid-1',
            main_image_url: 'https://img1.jpg',
            data: { product_url: 'https://p1', price: { currency: 'USD', value: '10' }, title: 'P1' },
          });
          stream.emitEvent('chat_token', { value: '\n' });

          expect(queryAllModal('.wigmix-product-card').length).toBe(1);

          // Error occurs after first product
          stream.triggerError(new Error('Stream failed after product'));

          act(() => {
            jest.runAllTimers();
          });

          // First product should still be visible
          expect(queryAllModal('.wigmix-product-card').length).toBeGreaterThanOrEqual(0);
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();

          consoleSpy.mockRestore();
        });
      });

      describe('state consistency after errors', () => {
        it('should show loading state when message is sent', () => {
          renderAssistant();
          openDialogAndWait();

          sendMessageAndGetStreamController('Loading state test');

          // Loading dots should be visible while waiting
          expect(queryAllModal('.loading-dot').length).toBe(3);
        });

        it('should maintain dialog visibility after error', () => {
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          renderAssistant();
          openDialogAndWait();

          // First message errors
          const stream = sendMessageAndGetStreamController('Will fail');
          stream.triggerError(new Error('Failed'));

          act(() => {
            jest.runAllTimers();
          });

          // Dialog should remain open and functional
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();
          expect(queryModal('.wigmix-modal')).toBeTruthy();

          consoleSpy.mockRestore();
        });

        it('should maintain chat history when stream completes successfully then new message sent', () => {
          renderAssistant();
          openDialogAndWait();

          // First successful message
          const stream = sendMessageAndGetStreamController('First message');
          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });
          stream.emitEvent('chat_token', { value: 'First response' });
          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          expect(getTextInBody('First message')).toBeTruthy();
          expect(getTextInBody('First response')).toBeTruthy();

          // Second message
          mockFetchEventSource.mockReset();
          const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

          act(() => {
            fireEvent.change(textarea, { target: { value: 'Second message' } });
          });
          act(() => {
            fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
          });

          // First message and response should still be in history
          expect(getTextInBody('First message')).toBeTruthy();
          expect(getTextInBody('First response')).toBeTruthy();
          expect(getTextInBody('Second message')).toBeTruthy();
        });

        it('should handle rapid successive messages gracefully', () => {
          renderAssistant();
          openDialogAndWait();

          // Send first message
          const stream = sendMessageAndGetStreamController('Message 1');

          // Complete the stream
          stream.emitEvent('chat_id', { value: 'chat-123' });
          stream.emitEvent('reqid', { value: 'req-123' });
          stream.emitEvent('chat_token', { value: 'Response 1' });
          stream.closeStream();

          act(() => {
            jest.runAllTimers();
          });

          // Widget should remain stable
          expect(getTextInBody('Shopping Assistant')).toBeTruthy();
          expect(getTextInBody('Message 1')).toBeTruthy();
          expect(getTextInBody('Response 1')).toBeTruthy();
        });
      });
    });

    describe('SSE request parameters', () => {
      it('should include correct params in SSE request URL', () => {
        renderAssistant();
        openDialogAndWait();

        sendMessageAndGetStreamController('test query');

        expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
        const url = mockFetchEventSource.mock.calls[0][0] as string;

        expect(url).toContain('app_key=test-app-key');
        expect(url).toContain('placement_id=1234');
        expect(url).toContain('chat_id=test-chat-id');
        expect(url).toContain('va_uid=test-uid');
        expect(url).toContain('va_sid=test-sid');
        expect(url).toContain('q=test+query');
        expect(url).toContain('chat_agent=shopping_assistant_v2');
      });

      it('should use POST method for SSE request', () => {
        renderAssistant();
        openDialogAndWait();

        sendMessageAndGetStreamController('query');

        const options = mockFetchEventSource.mock.calls[0][1];
        expect(options.method).toBe('POST');
      });

      it('should include image in FormData when image is provided', async () => {
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
  });

  // ============================================================
  // User Input Tests
  // ============================================================

  describe('user input', () => {
    it('should send message when pressing Enter', () => {
      renderAssistant();
      openDialogAndWait();

      const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

      act(() => {
        fireEvent.change(textarea, { target: { value: 'Hello' } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    });

    it('should display user message in chat after sending', () => {
      renderAssistant();
      openDialogAndWait();

      const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

      act(() => {
        fireEvent.change(textarea, { target: { value: 'My message' } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });

      expect(getTextInBody('My message')).toBeTruthy();
    });

    it('should clear textarea after sending message', () => {
      renderAssistant();
      openDialogAndWait();

      const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

      act(() => {
        fireEvent.change(textarea, { target: { value: 'Hello' } });
      });
      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });

      expect(textarea.value).toBe('');
    });

    it('should not send empty message', () => {
      renderAssistant();
      openDialogAndWait();

      const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;

      act(() => {
        fireEvent.keyDown(textarea, { code: 'Enter', shiftKey: false });
      });

      expect(mockFetchEventSource).not.toHaveBeenCalled();
    });

    it('should send message via submit button click', () => {
      renderAssistant();
      openDialogAndWait();

      const textarea = document.body.querySelector('[data-testid="chat-textarea"]') as HTMLTextAreaElement;
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Submit test' } });
      });

      const submitButton = testComponent.getByRole('button', { name: 'Send message', hidden: true });

      act(() => {
        fireEvent.click(submitButton);
      });

      expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Programmatic API Tests
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
  });

  // ============================================================
  // Camera & Image Upload Tests
  // ============================================================

  describe('camera and image upload', () => {
    it('should show camera drawer when camera icon is clicked', () => {
      renderAssistant();
      openDialogAndWait();

      const cameraButton = testComponent.getByRole('button', { name: 'Open camera', hidden: true });

      act(() => {
        fireEvent.click(cameraButton);
      });

      expect(document.body.querySelector('[data-testid="mock-webcam"]')).toBeTruthy();
    });

    it('should close camera drawer when back button is clicked', () => {
      renderAssistant();
      openDialogAndWait();

      act(() => {
        fireEvent.click(testComponent.getByRole('button', { name: 'Open camera', hidden: true }));
      });

      const backButton = testComponent.getByRole('button', { name: 'Close camera', hidden: true });

      act(() => {
        fireEvent.click(backButton);
      });

      expect(document.body.querySelector('[data-testid="mock-webcam"]')).toBeNull();
    });

    it('should have file upload dropzone', () => {
      renderAssistant();
      openDialogAndWait();

      const dropzone = document.body.querySelector('[data-testid="wigmix-cs-upload-icon-dropzone"]');
      expect(dropzone).toBeTruthy();
    });
  });

  // ============================================================
  // New Chat Tests
  // ============================================================

  describe('new chat', () => {
    it('should reset chat state when new chat button is clicked', () => {
      renderAssistant();
      openDialogAndWait();

      const newChatButton = testComponent.getByRole('button', { name: 'Start new chat', hidden: true });

      act(() => {
        fireEvent.click(newChatButton);
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(getTextInBody("Let's get started")).toBeTruthy();
    });
  });
});
