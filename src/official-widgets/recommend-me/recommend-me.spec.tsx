import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import RecommendMe from './recommend-me';
import {
  getStandardMultiSearchInvalidImageResponse,
  getStandardMultiSearchSuccessNoResultResponse,
  getStandardMultiSearchSuccessResponse,
} from '../../../mocks/responses';
import { RootContext } from '../../common/components/shadow-wrapper';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';

// Mock @microsoft/fetch-event-source to control SSE streaming in tests
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

describe('recommend-me', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS;

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
      'wigmix_recommend_me',
      {
        getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
        getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
        productMultisearch: jest.fn(),
        productMultisearchComplementary: jest.fn(),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const renderRecommendMe = (
    productId: string,
    visearchOverrides: Partial<ViSearchClient> = {},
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides);
    testComponent = renderWidget(<RecommendMe productId={productId} />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  /**
   * Helper to trigger a query and get stream controller for fine-grained SSE event simulation.
   * This allows testing progressive streaming behavior by emitting events one at a time.
   */
  const sendQueryAndGetStreamController = (
    query: string,
  ): {
    emitEvent: (event: string, data: any) => void;
    emitProduct: (product: { product_id: string; main_image_url: string; data: any }) => void;
    openStream: () => void;
    closeStream: () => void;
    triggerError: (error: Error) => void;
  } => {
    const input = testComponent.container.querySelector('input') as HTMLInputElement;

    let onopen: () => void;
    let onmessage: (ev: { event: string; data: string }) => void;
    let onclose: () => void;
    let onerror: (err: Error) => void;

    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      onopen = options.onopen;
      onmessage = options.onmessage;
      onclose = options.onclose;
      onerror = options.onerror;
    });

    act(() => {
      fireEvent.change(input, { target: { value: query } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    return {
      emitEvent: (event: string, data: any): void => {
        act(() => {
          onmessage({ event, data: JSON.stringify(data) });
        });
      },
      emitProduct: (product: { product_id: string; main_image_url: string; data: any }): void => {
        act(() => {
          onmessage({ event: 'product', data: JSON.stringify(product) });
        });
      },
      openStream: (): void => {
        act(() => {
          onopen();
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

  const createMockProduct = (id: number): { product_id: string; main_image_url: string; data: any } => ({
    product_id: `sse-pid-${id}`,
    main_image_url: `https://example.com/image-${id}.jpg`,
    data: {
      product_url: `https://example.com/product-${id}`,
      price: { currency: 'USD', value: `${10 * id}.00` },
      title: `SSE Product ${id}`,
      brand: `SSE Brand ${id}`,
    },
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- 2.1 Core rendering & snapshot ---

  it('should render without crashing with a valid productId', () => {
    renderRecommendMe('pid-found');
    expect(testComponent.container.querySelector('.pt-4')).toBeTruthy();
  });

  it('should match snapshot for default layout', () => {
    renderRecommendMe('pid-found');
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render search input bar with placeholder text', () => {
    renderRecommendMe('pid-found');
    const input = testComponent.container.querySelector('input');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('placeholder')).toBe('an outfit to go with this');
  });

  it('should render "Similar Products" and "Complementary Products" suggestion buttons', () => {
    renderRecommendMe('pid-found');
    expect(testComponent.getByText('Similar Products')).toBeTruthy();
    expect(testComponent.getByText('Complementary Products')).toBeTruthy();
  });

  it('should display widget title when showWidgetTitle is true', () => {
    renderRecommendMe('pid-found');
    expect(testComponent.getByText('Alternate Picks')).toBeTruthy();
  });

  it('should render empty when RootContext is null', () => {
    const { widgetConfig, widgetClient } = createTestClient();
    testComponent = render(
      <RootContext.Provider value={null}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <RecommendMe productId='pid-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    // The component returns <></> when root is null
    expect(testComponent.container.innerHTML).toBe('');
  });

  // --- 2.2 Search interactions ---

  it('should call multisearch (productMultisearch) when clicking "Similar Products"', () => {
    const mockProductMultisearch = jest.fn();
    renderRecommendMe('pid-found', {
      productMultisearch: mockProductMultisearch,
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    expect(mockProductMultisearch).toHaveBeenCalled();
    const callArgs = mockProductMultisearch.mock.calls[0];
    expect(callArgs[0]).toMatchObject({
      pid: 'pid-found',
      return_fields_mapping: true,
    });
  });

  it('should call multisearchComplementary (productMultisearchComplementary) when clicking "Complementary Products"', () => {
    const mockProductMultisearchComplementary = jest.fn();
    renderRecommendMe('pid-found', {
      productMultisearchComplementary: mockProductMultisearchComplementary,
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Complementary Products'));
    });

    expect(mockProductMultisearchComplementary).toHaveBeenCalled();
    const callArgs = mockProductMultisearchComplementary.mock.calls[0];
    expect(callArgs[0]).toMatchObject({
      pid: 'pid-found',
      return_fields_mapping: true,
    });
  });

  it('should trigger recommendMeWithQuery when typing in search bar and pressing Enter', () => {
    renderRecommendMe('pid-found');

    const input = testComponent.container.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'red dress' } });
    });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    const url = mockFetchEventSource.mock.calls[0][0] as string;
    expect(url).toContain('recommend-me');
    expect(url).toContain('q=red+dress');
    expect(url).toContain('pid=pid-found');
  });

  it('should trigger recommendMeWithQuery when clicking "Show Me" button', () => {
    renderRecommendMe('pid-found');

    const input = testComponent.container.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'blue jacket' } });
    });

    const showMeButton = testComponent.getByText('Show Me');
    act(() => {
      fireEvent.click(showMeButton);
    });

    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    const url = mockFetchEventSource.mock.calls[0][0] as string;
    expect(url).toContain('q=blue+jacket');
  });

  it('should not trigger recommendMeWithQuery when clicking "Show Me" with empty input', () => {
    renderRecommendMe('pid-found');

    const showMeButton = testComponent.getByText('Show Me');
    act(() => {
      fireEvent.click(showMeButton);
    });

    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });

  it('should not trigger recommendMeWithQuery when pressing Enter with empty input', () => {
    renderRecommendMe('pid-found');

    const input = testComponent.container.querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });

  // --- 2.3 Loading & streaming states ---

  it('should render CarouselLoader (skeleton cards) during loading', () => {
    // Mock the visearch call to NOT call the callback immediately (stays loading)
    const mockProductMultisearch = jest.fn(); // Never calls success/error → stays loading
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      jest.runAllTimers();
    });

    // CarouselLoader should be visible (it renders with data-pw='rm-product-loader-row')
    expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeTruthy();
  });

  it('should render 5 skeleton cards in CarouselLoader', () => {
    const mockProductMultisearch = jest.fn(); // Never resolves
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      jest.runAllTimers();
    });

    const loaderRow = testComponent.container.querySelector('[data-pw="rm-product-loader-row"]');
    expect(loaderRow).toBeTruthy();
    const skeletonCards = loaderRow?.querySelectorAll('.wigmix-product-card');
    expect(skeletonCards?.length).toBe(5);
  });

  // --- 2.3.1 SSE Streaming Tests ---

  describe('SSE streaming behavior', () => {
    describe('progressive product streaming', () => {
      it('should show loader when stream opens', () => {
        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('red shoes');
        stream.openStream();

        // Loader should be visible during streaming
        expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeTruthy();
      });

      it('should display products progressively as they stream in', () => {
        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('red shoes');
        stream.openStream();
        stream.emitEvent('reqid', { value: 'req-123' });

        // Initially: loader visible, no products
        expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeTruthy();

        // First product arrives, followed by its [[product_id]] token in the text
        stream.emitProduct(createMockProduct(1));
        stream.emitEvent('chat_token', { value: '[[sse-pid-1]] ' });

        act(() => {
          jest.runAllTimers();
        });

        // Loader still visible during streaming, but product should be queued
        expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeTruthy();

        // Second product arrives, followed by its token
        stream.emitProduct(createMockProduct(2));
        stream.emitEvent('chat_token', { value: '[[sse-pid-2]] ' });

        act(() => {
          jest.runAllTimers();
        });

        // Third product arrives, followed by its token
        stream.emitProduct(createMockProduct(3));
        stream.emitEvent('chat_token', { value: '[[sse-pid-3]] ' });

        act(() => {
          jest.runAllTimers();
        });

        // Stream closes - products should now be displayed
        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        // Loader should be gone
        expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeNull();

        // Products should be visible in carousel
        const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
        expect(carousel).toBeTruthy();
        const productCards = carousel?.querySelectorAll('.wigmix-product-card');
        expect(productCards?.length).toBe(3);
      });

      it('should accumulate multiple products in sequence', () => {
        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('blue jacket');
        stream.openStream();
        stream.emitEvent('reqid', { value: 'req-456' });

        // Emit 5 products one by one, each followed by its [[product_id]] token in the text
        [1, 2, 3, 4, 5].forEach((i) => {
          stream.emitProduct(createMockProduct(i));
          stream.emitEvent('chat_token', { value: `[[sse-pid-${i}]] ` });
        });

        act(() => {
          jest.runAllTimers();
        });

        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
        const productCards = carousel?.querySelectorAll('.wigmix-product-card');
        expect(productCards?.length).toBe(5);
      });

      it('should hide loader and show carousel after stream closes', () => {
        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('green pants');
        stream.openStream();
        stream.emitEvent('reqid', { value: 'req-789' });
        stream.emitProduct(createMockProduct(1));

        // During streaming: loader visible
        expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeTruthy();

        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        // After stream closes: loader gone, carousel visible
        expect(testComponent.container.querySelector('[data-pw="rm-product-loader-row"]')).toBeNull();
        expect(testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]')).toBeTruthy();
      });
    });

    describe('chat_token / heartbeat / stop_token handling', () => {
      it('should order products by first-appearance of their [[product_id]] token, not arrival order', () => {
        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('red shoes');
        stream.openStream();
        stream.emitEvent('reqid', { value: 'req-token-order' });

        // Product 2's payload arrives first...
        stream.emitProduct(createMockProduct(2));
        // ...but its token only appears in the text after product 1's token.
        stream.emitEvent('chat_token', { value: 'Here are two options: ' });
        stream.emitEvent('chat_token', { value: '[[sse-pid-1]] a nice pair. ' });
        // Product 1's payload arrives after its token has already streamed.
        stream.emitProduct(createMockProduct(1));
        stream.emitEvent('chat_token', { value: '[[sse-pid-2]] another pair.' });

        stream.emitEvent('stop_token', {});
        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        const brands = Array.from(testComponent.container.querySelectorAll('.wigmix-product-card-secondary-title'))
          .map((el) => el.textContent);
        expect(brands).toEqual(['SSE Brand 1', 'SSE Brand 2']);
      });

      it('should ignore heartbeat events without affecting streaming state or products', () => {
        renderRecommendMe('pid-found');
        const input = testComponent.container.querySelector('input') as HTMLInputElement;

        const stream = sendQueryAndGetStreamController('red shoes');
        stream.openStream();
        stream.emitEvent('reqid', { value: 'req-heartbeat' });
        stream.emitEvent('heartbeat', {});
        stream.emitEvent('heartbeat', {});

        // Heartbeat should not end the stream or throw
        expect(input.disabled).toBe(true);

        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        expect(input.disabled).toBe(false);
      });

      it('should stop the stream when a stop_token event is received', () => {
        renderRecommendMe('pid-found');
        const input = testComponent.container.querySelector('input') as HTMLInputElement;

        const stream = sendQueryAndGetStreamController('red shoes');
        stream.openStream();
        expect(input.disabled).toBe(true);

        stream.emitEvent('stop_token', {});

        expect(input.disabled).toBe(false);
      });
    });

    describe('stream state management', () => {
      it('should disable input while streaming', () => {
        renderRecommendMe('pid-found');

        const input = testComponent.container.querySelector('input') as HTMLInputElement;
        expect(input.disabled).toBe(false);

        const stream = sendQueryAndGetStreamController('test query');
        stream.openStream();

        // Input should be disabled during streaming
        expect(input.disabled).toBe(true);

        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        // Input should be re-enabled after stream closes
        expect(input.disabled).toBe(false);
      });

      it('should disable "Show Me" button while streaming', () => {
        renderRecommendMe('pid-found');

        const input = testComponent.container.querySelector('input') as HTMLInputElement;
        act(() => {
          fireEvent.change(input, { target: { value: 'some query' } });
        });

        const showMeButton = testComponent.container.querySelector('[data-pw="rm-recommend-me-button"]') as HTMLButtonElement;

        const stream = sendQueryAndGetStreamController('test query');
        stream.openStream();

        // Button should be disabled during streaming
        expect(showMeButton.disabled).toBe(true);

        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        // Button should be re-enabled after stream closes
        expect(showMeButton.disabled).toBe(false);
      });

      it('should handle empty stream response gracefully', () => {
        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('empty query');
        stream.openStream();
        stream.emitEvent('reqid', { value: 'req-empty' });
        // No products emitted
        stream.closeStream();

        act(() => {
          jest.runAllTimers();
        });

        // Should not crash, carousel should be visible but empty
        const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
        expect(carousel).toBeTruthy();
        const productCards = carousel?.querySelectorAll('.wigmix-product-card');
        expect(productCards?.length).toBe(0);
      });

      it('should handle stream error without crashing', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        renderRecommendMe('pid-found');

        const stream = sendQueryAndGetStreamController('error query');
        stream.openStream();
        stream.triggerError(new Error('Stream connection failed'));

        // Should not crash
        expect(testComponent.container.querySelector('.pt-4')).toBeTruthy();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('SSE request parameters', () => {
      it('should include correct params in SSE request URL', () => {
        renderRecommendMe('pid-found');

        sendQueryAndGetStreamController('test query');

        expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
        const url = mockFetchEventSource.mock.calls[0][0] as string;

        expect(url).toContain('app_key=test-app-key');
        expect(url).toContain('placement_id=1234');
        expect(url).toContain('pid=pid-found');
        expect(url).toContain('q=test+query');
        expect(url).toContain('va_uid=test-uid');
        expect(url).toContain('va_sid=test-sid');
        expect(url).toContain('recommend-me');
      });

      it('should include attrs_to_get in SSE request URL', () => {
        renderRecommendMe('pid-found');

        sendQueryAndGetStreamController('attrs query');

        const url = mockFetchEventSource.mock.calls[0][0] as string;
        expect(url).toContain('attrs_to_get=');
        expect(url).toContain('product_url');
        expect(url).toContain('title');
        expect(url).toContain('brand');
        expect(url).toContain('price');
      });
    });
  });

  describe('token processing', () => {
    it('recognizes a [[product_id]] token that arrives split across multiple chat_token chunks', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();
      stream.emitEvent('reqid', { value: 'req-split-token' });
      stream.emitProduct(createMockProduct(1));

      // The real backend splits tokens mid-string across chunks (e.g. "Levi's" as "L", "ev", "i's").
      stream.emitEvent('chat_token', { value: 'Here is a match: ' });
      stream.emitEvent('chat_token', { value: '[[sse-' });
      stream.emitEvent('chat_token', { value: 'pid-1' });
      stream.emitEvent('chat_token', { value: ']]' });
      stream.emitEvent('stop_token', {});
      stream.closeStream();

      act(() => {
        jest.runAllTimers();
      });

      const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
      const productCards = carousel?.querySelectorAll('.wigmix-product-card');
      expect(productCards?.length).toBe(1);
    });

    it('does not crash or render a card for a [[product_id]] token whose product event never arrives', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();
      stream.emitEvent('reqid', { value: 'req-missing-payload' });
      stream.emitEvent('chat_token', { value: 'Here is something: [[sse-pid-missing]]' });
      stream.emitEvent('stop_token', {});
      stream.closeStream();

      act(() => {
        jest.runAllTimers();
      });

      const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
      expect(carousel).toBeTruthy();
      const productCards = carousel?.querySelectorAll('.wigmix-product-card');
      expect(productCards?.length).toBe(0);
    });

    it('does not duplicate a product when its [[product_id]] token appears twice in the streamed text', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();
      stream.emitEvent('reqid', { value: 'req-dup-token' });
      stream.emitProduct(createMockProduct(1));
      stream.emitEvent('chat_token', { value: 'Check this out: [[sse-pid-1]]. ' });
      stream.emitEvent('chat_token', { value: 'Again, [[sse-pid-1]] is great.' });
      stream.emitEvent('stop_token', {});
      stream.closeStream();

      act(() => {
        jest.runAllTimers();
      });

      const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
      const productCards = carousel?.querySelectorAll('.wigmix-product-card');
      expect(productCards?.length).toBe(1);
    });

    it('never leaks raw [[...]] or ((...)) markers into the visible text', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();
      stream.emitEvent('reqid', { value: 'req-no-leak' });
      stream.emitProduct(createMockProduct(1));
      stream.emitEvent('chat_token', { value: 'Try this: [[sse-pid-1]] and maybe ((a red dress)) too.' });
      stream.emitEvent('stop_token', {});
      stream.closeStream();

      act(() => {
        jest.runAllTimers();
      });

      expect(testComponent.container.textContent).not.toContain('[[');
      expect(testComponent.container.textContent).not.toContain('((');
    });

    it('orders three products by first token appearance even when their product events arrive in a different sequence', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();
      stream.emitEvent('reqid', { value: 'req-order-three' });

      // Arrival order is 3, 1, 2 - token order in the text will be 2, 3, 1.
      stream.emitProduct(createMockProduct(3));
      stream.emitProduct(createMockProduct(1));
      stream.emitEvent('chat_token', { value: 'Recommended: [[sse-pid-2]] then ' });
      stream.emitProduct(createMockProduct(2));
      stream.emitEvent('chat_token', { value: '[[sse-pid-3]] then [[sse-pid-1]].' });
      stream.emitEvent('stop_token', {});
      stream.closeStream();

      act(() => {
        jest.runAllTimers();
      });

      const brands = Array.from(testComponent.container.querySelectorAll('.wigmix-product-card-secondary-title'))
        .map((el) => el.textContent);
      expect(brands).toEqual(['SSE Brand 2', 'SSE Brand 3', 'SSE Brand 1']);
    });
  });

  describe('accessibility', () => {
    it('announces the loading state via the sr-only status region while streaming', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();

      const status = testComponent.getByRole('status');
      expect(status.textContent).toBe('Loading recommendations');
    });

    it('announces the result count and streamed message in the sr-only status region once streaming ends', () => {
      renderRecommendMe('pid-found');

      const stream = sendQueryAndGetStreamController('red shoes');
      stream.openStream();
      stream.emitEvent('reqid', { value: 'req-status-update' });
      stream.emitProduct(createMockProduct(1));
      stream.emitEvent('chat_token', { value: 'Here you go: [[sse-pid-1]].' });
      stream.emitEvent('stop_token', {});
      stream.closeStream();

      act(() => {
        jest.runAllTimers();
      });

      const status = testComponent.getByRole('status');
      expect(status.textContent).toContain('Product results shown: 1');
      expect(status.textContent).toContain('Here you go:');
    });

    it('marks the visible error message with role="alert"', () => {
      const mockProductMultisearch = jest.fn().mockImplementation((_params, _success, errorHandler) => {
        errorHandler('Invalid image or im_url.');
      });
      const { widgetConfig, widgetClient } = createTestClient({
        productMultisearch: mockProductMultisearch,
      });
      testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
        widgetConfig,
        widgetClient,
        messages: texts['en'],
      });

      act(() => {
        fireEvent.click(testComponent.getByText('Similar Products'));
      });

      const alertEl = testComponent.getByRole('alert');
      expect(alertEl.textContent).toBe('The image or query was not found. Please try again later.');
    });

    it('exposes a real aria-label on the free-text search input', () => {
      renderRecommendMe('pid-found');

      const input = testComponent.container.querySelector('input') as HTMLInputElement;
      const label = input.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label).toBe('Type your recommendation query');
    });

    it('exposes role="list" on the carousel and role="listitem" on each product wrapper', () => {
      const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
        successHandler(getStandardMultiSearchSuccessResponse());
      });
      const { widgetConfig, widgetClient } = createTestClient({
        productMultisearch: mockProductMultisearch,
      });
      testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
        widgetConfig,
        widgetClient,
        messages: texts['en'],
      });

      act(() => {
        fireEvent.click(testComponent.getByText('Similar Products'));
      });

      act(() => {
        jest.runAllTimers();
      });

      const list = testComponent.container.querySelector('[data-pw="rm-product-result-row"]');
      expect(list?.getAttribute('role')).toBe('list');
      const listItems = list?.querySelectorAll('[role="listitem"]');
      expect(listItems?.length).toBeGreaterThan(0);
    });
  });

  // --- 2.4 Error handling ---

  it('should display error message on API failure (invalid image)', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, _success, errorHandler) => {
      errorHandler('Invalid image or im_url.');
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    expect(testComponent.getByText('The image or query was not found. Please try again later.')).toBeTruthy();
  });

  it('should display system error message on generic API failure', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, _success, errorHandler) => {
      errorHandler('A system error is reported.');
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    expect(testComponent.getByText('Something went wrong. Please try again later.')).toBeTruthy();
  });

  it('should display error when response status is fail', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchInvalidImageResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    // The error handler interprets the fail status and shows error
    const errorEl = testComponent.container.querySelector('.text-red-500');
    expect(errorEl).toBeTruthy();
  });

  it('should render empty carousel when results are empty (0 products)', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessNoResultResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      jest.runAllTimers();
    });

    // Should show the carousel container but no product cards
    const carousel = testComponent.container.querySelector('[data-pw="rm-product-result-carousel"]');
    expect(carousel).toBeTruthy();
    const productCards = carousel?.querySelectorAll('.wigmix-product-card');
    expect(productCards?.length).toBe(0);
  });

  // --- 2.5 Carousel sub-component ---

  it('should render correct number of ProductCard components in Carousel', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      jest.runAllTimers();
    });

    const carouselRow = testComponent.container.querySelector('[data-pw="rm-product-result-row"]');
    expect(carouselRow).toBeTruthy();
    // The mock response has 20 products
    const productCards = carouselRow?.querySelectorAll('.wigmix-product-card');
    expect(productCards?.length).toBeGreaterThan(0);
  });

  it('should render product titles in Carousel from search results', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((img) => fireEvent.load(img));
    });

    // The standard mock response has "Product Brand 1", "Product Brand 2", etc.
    expect(testComponent.getByText('Product Brand 1')).toBeTruthy();
  });

  it('should render Carousel with horizontal scroll container', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      jest.runAllTimers();
    });

    const scrollContainer = testComponent.container.querySelector('[data-pw="rm-product-result-row"]');
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer?.className).toContain('overflow-x-auto');
  });

  // --- 2.6 Additional interactions & edge cases ---

  it('should not trigger search if already loading when clicking suggestion button', () => {
    // First click -> loading; second click while loading -> should not trigger
    const mockProductMultisearch = jest.fn(); // Never resolves — stays loading
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });
    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    // Should only be called once since second click is ignored while loading
    expect(mockProductMultisearch).toHaveBeenCalledTimes(1);
  });

  it('should show "Show Me" button with correct text', () => {
    renderRecommendMe('pid-found');
    expect(testComponent.getByText('Show Me')).toBeTruthy();
  });

  it('should render search bar instructions text', () => {
    renderRecommendMe('pid-found');
    expect(testComponent.getByText('Or type your own recommendation query below')).toBeTruthy();
  });

  it('should handle complementary search returning success', () => {
    const mockProductMultisearchComplementary = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearchComplementary: mockProductMultisearchComplementary,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Complementary Products'));
    });

    act(() => {
      jest.runAllTimers();
    });

    const carouselRow = testComponent.container.querySelector('[data-pw="rm-product-result-row"]');
    expect(carouselRow).toBeTruthy();
    const productCards = carouselRow?.querySelectorAll('.wigmix-product-card');
    expect(productCards?.length).toBeGreaterThan(0);
  });

  it('should call preprocessResponse callback when defined', () => {
    const preprocessResponse = jest.fn();
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessResponse());
    });
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, {
      searchSettings: {
        attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
      },
      callbacks: {
        preprocessResponse,
      },
    });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_recommend_me', {
      getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
      productMultisearch: mockProductMultisearch,
      productMultisearchComplementary: jest.fn(),
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    expect(preprocessResponse).toHaveBeenCalledTimes(1);
  });

  it('should handle error message containing "no outfit"', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, _success, errorHandler) => {
      errorHandler('no outfit found for this product');
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    expect(testComponent.getByText('The image or query was not found. Please try again later.')).toBeTruthy();
  });

  it('should match snapshot after loading search results', () => {
    const mockProductMultisearch = jest.fn().mockImplementation((_params, successHandler) => {
      successHandler(getStandardMultiSearchSuccessResponse());
    });
    const { widgetConfig, widgetClient } = createTestClient({
      productMultisearch: mockProductMultisearch,
    });
    testComponent = renderWidget(<RecommendMe productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      fireEvent.click(testComponent.getByText('Similar Products'));
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((img) => fireEvent.load(img));
    });

    expect(testComponent.asFragment()).toMatchSnapshot();
  });
});
