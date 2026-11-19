// Part of the LauncherEntry specs (see test-utils/launcher-harness.tsx for the shared setup).
import { act, fireEvent, within } from '@testing-library/react';
import { getLocaleTexts } from '../../../common/locales/locale';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from '../default-config';
import { createLauncherHarness, texts, withChatbot } from './test-utils/launcher-harness';
import { mockFetchEventSource } from './test-utils/launcher-mocks';

jest.mock('@microsoft/fetch-event-source', () => jest.requireActual('./test-utils/launcher-mocks').fetchEventSourceModule);
jest.mock('react-webcam', () => jest.requireActual('./test-utils/launcher-mocks').webcamModule);
jest.mock('@heroui/input', () => jest.requireActual('./test-utils/launcher-mocks').heroUiInputModule);

describe('ai-assistant launcher entry — chat and layout', () => {
  const harness = createLauncherHarness();
  const { renderLauncherEntry, renderLauncher, getTextInBody, revealAll, openEntryPointAndWait, sendMessageAndGetStreamController } = harness;

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
      renderLauncherEntry({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.queryByTestId('asl-split-layout')).toBeNull();
      emitProductsTurn('Show me shoes', 'req-1', false);
      expect(harness.testComponent.queryByTestId('asl-split-layout')).toBeTruthy();
    });

    it('applies chatbot.splitLayout.paneWidth to the chat pane width', () => {
      renderLauncherEntry({ overrides: withChatbot({ layout: 'splitlayout', splitLayout: { paneWidth: 500 } }), width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('Show me shoes', 'req-1', false);
      expect(harness.testComponent.getByTestId('asl-split-chat-pane').style.width).toBe('500px');
    });

    it('applies chatbot.splitLayout.divider to the border between the chat and products panes', () => {
      renderLauncherEntry({
        overrides: withChatbot({ layout: 'splitlayout', splitLayout: { divider: { width: 4, color: '#123456', colorDark: '#654321' } } }),
        width: 1200,
      });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('Show me shoes', 'req-1', false);
      const pane = harness.testComponent.getByTestId('asl-split-chat-pane');
      expect(pane.style.borderRightColor).toBe('#123456');
      expect(pane.style.borderRightWidth).toBe('4px');
    });

    it('clicking an earlier breadcrumb makes it the active crumb without removing later ones', async () => {
      renderLauncherEntry({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('blue jeans', 'req-1');
      await revealAll();
      emitProductsTurn('blue jeans but cropped', 'req-2');
      await revealAll();
      const trail = within(harness.testComponent.getByRole('navigation', { name: texts['a11yBreadcrumbTrail'] }));
      expect(trail.getByText('blue jeans but cropped').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      act(() => {
        fireEvent.click(trail.getByRole('button', { name: /Show results for: blue jeans$/ }));
      });
      expect(trail.getByText('blue jeans').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      expect(trail.getByRole('button', { name: /blue jeans but cropped/ }).getAttribute('aria-current')).toBeNull();
    });

    it('clicking an in-chat hint line activates the matching crumb', async () => {
      renderLauncherEntry({ overrides: splitOn, width: 1200 });
      openEntryPointAndWait('a11yOpenAskAi');
      emitProductsTurn('blue jeans', 'req-1');
      await revealAll();
      emitProductsTurn('blue jeans but cropped', 'req-2');
      await revealAll();
      const hintLines = harness.testComponent.getAllByRole('button', { name: /results shown/ });
      expect(hintLines).toHaveLength(2);
      act(() => {
        fireEvent.click(hintLines[0]);
      });
      const trail = within(harness.testComponent.getByRole('navigation', { name: texts['a11yBreadcrumbTrail'] }));
      expect(trail.getByText('blue jeans').closest('[aria-current]')?.getAttribute('aria-current')).toBe('true');
      expect(trail.getByRole('button', { name: /blue jeans but cropped/ })).not.toBeNull();
    });

    it('shows skeleton placeholders while a query is in flight, and swaps them for real products once results stream in', async () => {
      renderLauncherEntry({ overrides: splitOn, width: 1200 });
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
      expect(harness.testComponent.queryByTestId('asl-product-grid-skeleton')).not.toBeNull();
      expect(harness.testComponent.queryByTestId('wigmix-product-card-anchor')).toBeNull();
      act(() => {
        onmessage({ event: 'chat_id', data: JSON.stringify({ value: 'chat-1' }) });
      });
      act(() => {
        onmessage({ event: 'reqid', data: JSON.stringify({ value: 'req-1' }) });
      });
      expect(harness.testComponent.queryByTestId('asl-product-grid-skeleton')).not.toBeNull();
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
      expect(harness.testComponent.queryByTestId('asl-product-grid-skeleton')).toBeNull();
      await revealAll();
      expect(harness.testComponent.queryAllByTestId('wigmix-product-card-anchor').length).toBeGreaterThan(0);
    });
  });

  describe('non-English locales', () => {
    it.each(['de', 'fr', 'ja', 'de-DE'])('%s: launcher texts the locale lacks fall back to English, never raw ids', (locale) => {
      renderLauncherEntry({ locale });
      const aiButton = harness.testComponent.getByRole('button', { name: texts['a11yOpenAskAi'] });
      expect(aiButton.textContent).toBe(texts['triggerAskAi']);
      expect(harness.testComponent.getByRole('button', { name: texts['a11yOpenImageSearch'] })).toBeTruthy();
      expect(harness.testComponent.getByRole('button', { name: texts['a11yOpenVoiceSearch'] })).toBeTruthy();
      openEntryPointAndWait('a11yOpenImageSearch');
      expect(getTextInBody(texts['dragImageToSearch'])).toBeTruthy();
      expect(getTextInBody('dragImageToSearch')).toBeNull();
      // The locale's own label after the merge (embedded-shopping-assistant's translation of the same English text).
      const closeLabel = getLocaleTexts(locale, DEFAULT_TEXTS)['a11yCloseFullScreen'];
      expect(closeLabel).not.toBe('a11yCloseFullScreen');
      const closeButton = harness.testComponent.getByRole('button', { name: closeLabel });
      act(() => {
        fireEvent.click(closeButton);
      });
      openEntryPointAndWait('a11yOpenAskAi');
      const title = harness.testComponent.getByRole('heading').textContent || '';
      expect(title.trim()).not.toBe('');
      expect(title).not.toBe('widgetTitle');
    });

    it('de: a key the locale defines keeps its German text (no English overwrite)', () => {
      const deTitle = DEFAULT_TEXTS['de']?.['widgetTitle'];
      expect(deTitle).toBeTruthy();
      expect(deTitle).not.toBe(texts['widgetTitle']);
      renderLauncherEntry({ locale: 'de' });
      openEntryPointAndWait('a11yOpenAskAi');
      expect(harness.testComponent.getByRole('heading').textContent).toBe(deTitle);
    });
  });

  it('the widget\'s own default config renders the single-column chat (default chatbot.layout)', () => {
    mockFetchEventSource.mockImplementation(() => new Promise(() => {}));
    expect(DEFAULT_CUSTOMIZATIONS.chatbot?.layout).toBe('chatlayout');
    const { store } = renderLauncherEntry({ width: 1200 });
    openEntryPointAndWait('a11yOpenAskAi');
    act(() => store.setState({ breadcrumbs: [{ requestId: 'r1', label: 'shoes', products: [] }] }));
    expect(harness.testComponent.queryByTestId('asl-split-layout')).toBeNull();
    expect(harness.testComponent.getByLabelText(texts['a11yChatMessages'])).toBeTruthy();
  });
});
