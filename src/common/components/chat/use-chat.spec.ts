import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { createElement } from 'react';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import useChat, { type UseChatOptions, type UseChatResult } from './use-chat';
import { DEFAULT_CUSTOMIZATIONS } from '../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';
import type { WidgetConfig } from '../../wigmix-core';

// Mock @microsoft/fetch-event-source to control SSE streaming in tests, same technique as the
// ai-search-launcher component spec and shopping-assistant.spec.tsx.
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

// Controllable stand-in for the low-level useVoice hook (real speech-recognition/mic APIs aren't
// available in jsdom) so tests can drive `voiceStatus`/`liveTranscript` directly. Also captures
// the `onTranscript` callback use-chat.ts passes in, so a test can simulate "a voice recording
// just finished transcribing" by invoking it directly — the real hook would call this once
// speech-recognition resolves, which isn't available in jsdom either.
const mockVoiceState: {
  status: 'idle' | 'recording' | 'transcribing';
  liveTranscript: string;
  onTranscript: ((text: string) => void) | null;
} = {
  status: 'idle',
  liveTranscript: '',
  onTranscript: null,
};
jest.mock('../../assistant/use-voice', () => ({
  __esModule: true,
  default: (options: { onTranscript: (text: string) => void }): unknown => {
    mockVoiceState.onTranscript = options.onTranscript;
    return {
      voiceEnabled: true,
      speechOutputEnabled: false,
      status: mockVoiceState.status,
      liveTranscript: mockVoiceState.liveTranscript,
      hasError: false,
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      speak: jest.fn(() => false),
      hasPendingSpeech: jest.fn(() => false),
      stopAudio: jest.fn(),
    };
  },
}));

// use-chat.ts only reads `widgetConfig`/`widgetClient` off WidgetDataContext (no
// RootContext/IntlProvider needed — those are consumed by components, not this hook), so the
// wrapper here is much smaller than renderWidget's full provider stack. DEFAULT_CUSTOMIZATIONS is
// borrowed from ai-search-launcher (this hook's first real-world consumer) purely as a
// fully-populated customizations fixture — the hook itself has no ai-search-launcher-specific
// dependency.
const renderChat = (
  visearchOverrides: Partial<ViSearchClient> = {},
  customizationOverrides: Partial<WidgetConfig['customizations']> = {},
  callbacksOverride: Partial<WidgetConfig['callbacks']> = {},
  hookOptions: UseChatOptions = {},
): {
  hook: RenderHookResult<UseChatResult, unknown>;
  widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
  mockVisearchClient: ViSearchClient;
} => {
  const widgetConfig = createWidgetConfig(
    { ...DEFAULT_CUSTOMIZATIONS, ...customizationOverrides },
    {
      searchSettings: {
        attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
      },
      callbacks: callbacksOverride,
    },
  );
  const { widgetClient, mockVisearchClient } = createMockWidgetClient(
    widgetConfig,
    'wigmix_ai_search_launcher',
    {
      getUid: jest.fn((cb: (uid: string) => void) => cb('test-uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('test-sid')),
      generateUuid: jest.fn((cb: (uuid: string) => void) => cb('test-chat-id')),
      ...visearchOverrides,
    },
  );
  const hook = renderHook(() => useChat(hookOptions), {
    // Written with createElement (rather than JSX) so this file can stay a plain `.spec.ts`.
    wrapper: ({ children }) => createElement(
      WidgetDataContext.Provider,
      { value: { widgetConfig, widgetClient, darkMode: false, locale: 'en' } },
      children,
    ),
  });
  return { hook, widgetClient, mockVisearchClient };
};

const revealAll = async (): Promise<void> => {
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
};

const sendMessageAndGetStreamController = (
  hook: RenderHookResult<UseChatResult, unknown>,
  messageText: string,
): {
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
    hook.result.current.sendMessage(messageText);
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

describe('use-chat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
    mockVoiceState.status = 'idle';
    mockVoiceState.liveTranscript = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start closed with an empty chat', () => {
    const { hook } = renderChat();
    expect(hook.result.current.isOpen).toBe(false);
    expect(hook.result.current.chats).toEqual([]);
  });

  it('should mark the chat open and generate a new chat id when opened', () => {
    const { hook, mockVisearchClient } = renderChat();
    act(() => {
      hook.result.current.open();
    });
    expect(hook.result.current.isOpen).toBe(true);
    expect(mockVisearchClient.generateUuid).toHaveBeenCalled();
  });

  it('should mark the chat closed when closed', () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });
    act(() => {
      hook.result.current.close();
    });
    expect(hook.result.current.isOpen).toBe(false);
  });

  it('after close(), a finalized voice transcript is dropped rather than sent — the isOpen guard working as designed', () => {
    // Baseline for the next test: confirms the guard this whole scenario depends on actually
    // exists and behaves as the "reopen" test assumes, not just that reopen() flips a flag.
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });
    act(() => {
      hook.result.current.close();
    });

    act(() => {
      mockVoiceState.onTranscript?.('red shoes');
    });

    expect(hook.result.current.chats).toHaveLength(0);
  });

  it('reopen() marks the chat open again — without resetting existing history — so a voice transcript that finalizes after re-expanding still sends', async () => {
    // Reproduces the bug a reviewer flagged: embedded-shopping-assistant's handleShowProducts
    // (re-expanding after a collapse) had no way to restore isOpen without also calling open(),
    // which resets the whole conversation (resetChatState() + a fresh chatId) — wrong here, since
    // re-expanding is meant to resume the SAME live conversation, not start a new one.
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });
    const stream = sendMessageAndGetStreamController(hook, 'running shoes');
    stream.emitEvent('chat_id', { value: 'chat-123' });
    stream.emitEvent('reqid', { value: 'req-123' });
    stream.emitEvent('chat_token', { value: 'Here you go' });
    stream.closeStream();
    await revealAll();
    const chatCountBeforeReopen = hook.result.current.chats.length;
    expect(chatCountBeforeReopen).toBeGreaterThan(0);

    act(() => {
      hook.result.current.close();
    });
    act(() => {
      hook.result.current.reopen();
    });

    // Existing history survives reopen() — unlike open(), it must not call resetChatState().
    expect(hook.result.current.chats).toHaveLength(chatCountBeforeReopen);
    expect(hook.result.current.isOpen).toBe(true);

    act(() => {
      mockVoiceState.onTranscript?.('show me in red');
    });

    // isOpen is true again, so this voice-triggered send now goes through instead of being
    // dropped (see the baseline test above for what happens when it's still closed).
    const lastChat = hook.result.current.chats[hook.result.current.chats.length - 1];
    expect(lastChat.author).toBe('user');
    expect(lastChat.messages[0]).toBe('show me in red');
  });

  it('playGreeting should push a visible bot chat bubble but not enable voice reveal when voiceGreetingEnabled is false (default)', () => {
    const { hook } = renderChat({}, { chatbot: { voiceGreetingEnabled: false } });
    act(() => {
      hook.result.current.open();
    });
    act(() => {
      hook.result.current.playGreeting('Hello there!');
    });

    expect(hook.result.current.chats).toHaveLength(1);
    expect(hook.result.current.chats[0]).toMatchObject({ author: 'bot', messages: ['Hello there!'] });
  });

  it('playGreeting should no-op when given empty text', () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });
    act(() => {
      hook.result.current.playGreeting('');
    });
    expect(hook.result.current.chats).toHaveLength(0);
  });

  it('sendMessage should push a user chat bubble immediately and clear the message field', () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });
    act(() => {
      hook.result.current.setMessage('Find me a jacket');
    });

    sendMessageAndGetStreamController(hook, 'Find me a jacket');

    const userChat = hook.result.current.chats.find((chat) => chat.author === 'user');
    expect(userChat?.messages).toEqual(['Find me a jacket']);
    expect(hook.result.current.message).toBe('');
    expect(hook.result.current.isWaiting).toBe(true);
  });

  it('sendMessage should forward an { imgUrl } image as an im_url query param, without fetching it', () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });

    mockFetchEventSource.mockImplementation(async () => {});
    act(() => {
      hook.result.current.sendMessage(undefined, { imgUrl: 'https://example.com/shoe.jpg' });
    });

    const [calledUrl] = mockFetchEventSource.mock.calls[0];
    expect(decodeURIComponent(calledUrl as string)).toContain('im_url=https://example.com/shoe.jpg');
    const [, requestOptions] = mockFetchEventSource.mock.calls[0];
    expect((requestOptions as { body: FormData }).body.has('image')).toBe(false);
  });

  it('should reflect the live transcript into the message field while recording or transcribing', () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });

    mockVoiceState.status = 'recording';
    mockVoiceState.liveTranscript = 'red sh';
    act(() => {
      hook.rerender();
    });
    expect(hook.result.current.message).toBe('red sh');

    mockVoiceState.status = 'transcribing';
    mockVoiceState.liveTranscript = 'red shirt';
    act(() => {
      hook.rerender();
    });
    expect(hook.result.current.message).toBe('red shirt');
  });

  it('should stop waiting and unblock input instead of hanging silently when the stream errors mid-response', async () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });

    // A network drop after the first token has already cleared `isWaiting` — without a fix, this
    // used to be swallowed by fetchEventSource's silent-retry-forever default, leaving the chat
    // stuck with no loading indicator and no reply.
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      options.onmessage({ event: 'chat_token', data: JSON.stringify({ value: 'Here' }) });
      options.onerror(new Error('network drop'));
    });

    await act(async () => {
      await hook.result.current.sendMessage('Find me a jacket');
    });

    expect(hook.result.current.isWaiting).toBe(false);
    expect(hook.result.current.allowUserInput).toBe(true);
    expect(hook.result.current.breadcrumbs).toEqual([]);
  });

  it('should commit the bot reply and any products to chats once the SSE stream closes', async () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });

    const stream = sendMessageAndGetStreamController(hook, 'Show me shoes');
    stream.emitEvent('chat_id', { value: 'chat-123' });
    stream.emitEvent('reqid', { value: 'req-123' });
    stream.emitEvent('chat_token', { value: 'Here you go: [[pid-1]]' });
    stream.emitEvent('product', {
      product_id: 'pid-1',
      main_image_url: 'https://example.com/shoe.jpg',
      data: {
        product_url: 'https://example.com/shoe',
        price: { currency: 'USD', value: '99.99' },
        title: 'Cool Shoes',
      },
    });
    stream.closeStream();
    await revealAll();

    const botChat = hook.result.current.chats.find((chat) => chat.author === 'bot');
    const productsChat = hook.result.current.chats.find((chat) => chat.author === 'products');
    expect(botChat?.messages[0]).toContain('Here you go:');
    expect(productsChat?.products).toHaveLength(1);
    expect(productsChat?.products?.[0].product_id).toBe('pid-1');
    expect(hook.result.current.isWaiting).toBe(false);
    expect(hook.result.current.allowUserInput).toBe(true);
  });

  it('fires onAddToCartToggle/onAddToWishlistToggle for AI-embedded action tokens by default', async () => {
    const onAddToCartToggle = jest.fn();
    const onAddToWishlistToggle = jest.fn();
    const { hook } = renderChat({}, {}, { onAddToCartToggle, onAddToWishlistToggle });
    act(() => {
      hook.result.current.open();
    });

    const stream = sendMessageAndGetStreamController(hook, 'Show me shoes');
    stream.emitEvent('chat_token', { value: 'Adding it now <<ADD_TO_CART:pid-1>>' });
    stream.closeStream();
    await revealAll();

    expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'pid-1');
    expect(onAddToWishlistToggle).not.toHaveBeenCalled();
  });

  it('suppresses onAddToCartToggle/onAddToWishlistToggle for action tokens when suppressActionTokenCallbacks is set, without affecting the reply itself', async () => {
    // Isolation option for a caller (e.g. embedded-shopping-assistant, whose useChat() action-
    // token handling shouldn't fire a host's product-card callbacks) that must NOT reach for the
    // blunter approach of overriding widgetConfig.callbacks to {} in a nested context Provider —
    // that would also strip callbacks from every other consumer read off the same context
    // (ProductCard's onProductClick/onAddToWishlistToggle/onAddToCartToggle included), silently
    // breaking real product-card interactions for the whole subtree, not just this hook's own
    // token handling.
    const onAddToCartToggle = jest.fn();
    const { hook } = renderChat({}, {}, { onAddToCartToggle }, { suppressActionTokenCallbacks: true });
    act(() => {
      hook.result.current.open();
    });

    const stream = sendMessageAndGetStreamController(hook, 'Show me shoes');
    stream.emitEvent('chat_token', { value: 'Adding it now <<ADD_TO_CART:pid-1>>' });
    stream.closeStream();
    await revealAll();

    expect(onAddToCartToggle).not.toHaveBeenCalled();
    // The token is still stripped from the displayed text regardless — suppression only affects
    // whether the callback fires, not the token-parsing/display pipeline.
    const botChat = hook.result.current.chats.find((chat) => chat.author === 'bot');
    expect(botChat?.messages[0]).toBe('Adding it now');
  });

  it('should expose only the latest response\'s suggestions, replacing any earlier turn\'s', async () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.open();
    });

    const firstStream = sendMessageAndGetStreamController(hook, 'Show me shoes');
    firstStream.emitEvent('chat_id', { value: 'chat-123' });
    firstStream.emitEvent('reqid', { value: 'req-1' });
    firstStream.emitEvent('chat_token', { value: 'Here you go: [[pid-1]] ((Show more)) ((Try boots))' });
    firstStream.emitEvent('product', {
      product_id: 'pid-1',
      main_image_url: 'https://example.com/shoe.jpg',
      data: {
        product_url: 'https://example.com/shoe',
        price: { currency: 'USD', value: '99.99' },
        title: 'Cool Shoes',
      },
    });
    firstStream.closeStream();
    await revealAll();
    expect(hook.result.current.suggestions).toEqual(['Show more', 'Try boots']);

    const secondStream = sendMessageAndGetStreamController(hook, 'Show me hats');
    secondStream.emitEvent('chat_id', { value: 'chat-123' });
    secondStream.emitEvent('reqid', { value: 'req-2' });
    secondStream.emitEvent('chat_token', { value: 'Here: [[pid-2]] ((See more hats))' });
    secondStream.emitEvent('product', {
      product_id: 'pid-2',
      main_image_url: 'https://example.com/hat.jpg',
      data: {
        product_url: 'https://example.com/hat',
        price: { currency: 'USD', value: '19.99' },
        title: 'Hat',
      },
    });
    secondStream.closeStream();
    await revealAll();

    // The first turn's suggestions are gone from the live `suggestions` state — only the latest
    // turn's are exposed, matching the original (pre-per-turn) single-row behavior.
    expect(hook.result.current.suggestions).toEqual(['See more hats']);
  });

  it('newChat should reset the visible chat state and generate a fresh chat id', async () => {
    const { hook, mockVisearchClient } = renderChat();
    act(() => {
      hook.result.current.open();
    });

    const stream = sendMessageAndGetStreamController(hook, 'Hello');
    stream.emitEvent('chat_id', { value: 'chat-123' });
    stream.emitEvent('reqid', { value: 'req-123' });
    stream.emitEvent('chat_token', { value: 'Hi!' });
    stream.closeStream();
    await revealAll();

    expect(hook.result.current.chats.length).toBeGreaterThan(0);

    (mockVisearchClient.generateUuid as jest.Mock).mockClear();
    act(() => {
      hook.result.current.newChat();
    });

    expect(hook.result.current.chats).toEqual([]);
    expect(mockVisearchClient.generateUuid).toHaveBeenCalled();
  });

  it('setIsInWishlist should add and remove product ids from wishlistPids', () => {
    const { hook } = renderChat();
    act(() => {
      hook.result.current.setIsInWishlist('pid-1', true);
    });
    expect(hook.result.current.wishlistPids).toContain('pid-1');

    act(() => {
      hook.result.current.setIsInWishlist('pid-1', false);
    });
    expect(hook.result.current.wishlistPids).not.toContain('pid-1');
  });

  it('should disable speechOutputEnabled when customizations.chatbot.voiceEnabled is false', () => {
    const { hook } = renderChat({}, { chatbot: { voiceEnabled: false } });
    expect(hook.result.current.speechOutputEnabled).toBe(false);
  });

  it('toggleVoiceReading should flip isVoiceReadingEnabled', () => {
    const { hook } = renderChat();
    expect(hook.result.current.isVoiceReadingEnabled).toBe(true);

    act(() => {
      hook.result.current.toggleVoiceReading();
    });
    expect(hook.result.current.isVoiceReadingEnabled).toBe(false);

    act(() => {
      hook.result.current.toggleVoiceReading();
    });
    expect(hook.result.current.isVoiceReadingEnabled).toBe(true);
  });

  describe('breadcrumbs', () => {
    it('should start with no breadcrumbs and no active breadcrumb', () => {
      const { hook } = renderChat();
      expect(hook.result.current.breadcrumbs).toEqual([]);
      expect(hook.result.current.activeBreadcrumbId).toBeNull();
    });

    const commitProductsTurn = (hook: RenderHookResult<UseChatResult, unknown>, message: string, requestId: string): void => {
      const stream = sendMessageAndGetStreamController(hook, message);
      stream.emitEvent('chat_id', { value: 'chat-123' });
      stream.emitEvent('reqid', { value: requestId });
      stream.emitEvent('chat_token', { value: `Here you go: [[pid-${requestId}]]` });
      stream.emitEvent('product', {
        product_id: `pid-${requestId}`,
        main_image_url: 'https://example.com/shoe.jpg',
        data: {
          product_url: 'https://example.com/shoe',
          price: { currency: 'USD', value: '99.99' },
          title: 'Cool Shoes',
        },
      });
      stream.closeStream();
    };

    it('creates one breadcrumb per turn that has products, and marks it active', async () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      commitProductsTurn(hook, 'Show me blue jeans', 'req-1');
      await revealAll();

      expect(hook.result.current.breadcrumbs).toHaveLength(1);
      expect(hook.result.current.breadcrumbs[0]).toMatchObject({ requestId: 'req-1', label: 'Show me blue jeans' });
      expect(hook.result.current.activeBreadcrumbId).toBe('req-1');
    });

    it('always appends a new breadcrumb, even when the next message is an unrelated search', async () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      commitProductsTurn(hook, 'Show me blue jeans', 'req-1');
      await revealAll();

      commitProductsTurn(hook, 'blue jeans but cropped', 'req-2');
      await revealAll();

      // Genuinely unrelated to either prior turn — this used to reset the whole trail down to one
      // crumb (an earlier keyword-overlap classifier that real usage showed misfired on ordinary
      // category switches, wiping history a user had just navigated back into). The trail is now
      // append-only: it never prunes a breadcrumb a still-visible hint line might point to, and
      // only resets via the explicit "New Chat" action.
      commitProductsTurn(hook, 'red sneakers please', 'req-3');
      await revealAll();

      expect(hook.result.current.breadcrumbs).toHaveLength(3);
      expect(hook.result.current.breadcrumbs.map((b) => b.requestId)).toEqual(['req-1', 'req-2', 'req-3']);
      expect(hook.result.current.activeBreadcrumbId).toBe('req-3');
    });

    it('setActiveBreadcrumb updates the active id as a pure local-state change', async () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      commitProductsTurn(hook, 'Show me blue jeans', 'req-1');
      await revealAll();
      commitProductsTurn(hook, 'blue jeans but cropped', 'req-2');
      await revealAll();

      act(() => {
        hook.result.current.setActiveBreadcrumb('req-1');
      });
      expect(hook.result.current.activeBreadcrumbId).toBe('req-1');
    });

    it('newChat resets breadcrumbs and the active breadcrumb', async () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      commitProductsTurn(hook, 'Show me blue jeans', 'req-1');
      await revealAll();

      act(() => {
        hook.result.current.newChat();
      });
      expect(hook.result.current.breadcrumbs).toEqual([]);
      expect(hook.result.current.activeBreadcrumbId).toBeNull();
    });

    it('adds a placeholder breadcrumb for the query as soon as it is sent, before any response arrives', () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      sendMessageAndGetStreamController(hook, 'Show me blue jeans');

      expect(hook.result.current.breadcrumbs).toHaveLength(1);
      expect(hook.result.current.breadcrumbs[0]).toMatchObject({ label: 'Show me blue jeans' });
      expect(hook.result.current.activeBreadcrumbId).toBe(hook.result.current.breadcrumbs[0].requestId);
    });

    it('reconciles the placeholder breadcrumb with the real request id and products once the response completes', async () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      commitProductsTurn(hook, 'Show me blue jeans', 'req-1');
      await revealAll();

      expect(hook.result.current.breadcrumbs).toHaveLength(1);
      expect(hook.result.current.breadcrumbs[0]).toMatchObject({ requestId: 'req-1', label: 'Show me blue jeans' });
      expect(hook.result.current.breadcrumbs[0].products).toHaveLength(1);
      expect(hook.result.current.activeBreadcrumbId).toBe('req-1');
    });

    it('drops the placeholder breadcrumb and restores the previous selection when the response has no products', async () => {
      const { hook } = renderChat();
      act(() => {
        hook.result.current.open();
      });
      commitProductsTurn(hook, 'Show me blue jeans', 'req-1');
      await revealAll();

      const stream = sendMessageAndGetStreamController(hook, 'thanks!');
      expect(hook.result.current.breadcrumbs).toHaveLength(2);
      stream.emitEvent('chat_id', { value: 'chat-456' });
      stream.emitEvent('reqid', { value: 'req-2' });
      stream.emitEvent('chat_token', { value: 'You are welcome!' });
      stream.closeStream();
      await revealAll();

      expect(hook.result.current.breadcrumbs).toHaveLength(1);
      expect(hook.result.current.breadcrumbs[0].requestId).toBe('req-1');
      expect(hook.result.current.activeBreadcrumbId).toBe('req-1');
    });
  });
});
