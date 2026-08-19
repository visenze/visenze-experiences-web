import { act, renderHook, type RenderHookResult } from '@testing-library/react';
import { createElement } from 'react';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import useLauncherChat, { type UseLauncherChatResult } from './use-launcher-chat';
import { createMockWidgetClient, createWidgetConfig } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';

// Mock @microsoft/fetch-event-source to control SSE streaming in tests, same technique as the
// component spec (ai-search-launcher.spec.tsx) and shopping-assistant.spec.tsx.
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));

// use-launcher-chat.ts only reads `widgetConfig`/`widgetClient` off WidgetDataContext (no
// RootContext/IntlProvider needed — those are consumed by the component, not this hook), so the
// wrapper here is much smaller than renderWidget's full provider stack.
const renderLauncherChat = (
  visearchOverrides: Partial<ViSearchClient> = {},
  customizationOverrides: Partial<WidgetConfig['customizations']> = {},
): {
  hook: RenderHookResult<UseLauncherChatResult, unknown>;
  widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
  mockVisearchClient: ViSearchClient;
} => {
  const widgetConfig = createWidgetConfig(
    { ...DEFAULT_CUSTOMIZATIONS, ...customizationOverrides },
    {
      searchSettings: {
        attrs_to_get: ['product_url', 'title', 'brand', 'price', 'original_price'],
      },
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
  const hook = renderHook(() => useLauncherChat(), {
    // Written with createElement (rather than JSX) so this file can stay a plain `.spec.ts`,
    // matching the brief's filename — use-launcher-chat.ts itself has no JSX either.
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
  hook: RenderHookResult<UseLauncherChatResult, unknown>,
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

describe('use-launcher-chat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchEventSource.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start with no active entry point and an empty chat', () => {
    const { hook } = renderLauncherChat();
    expect(hook.result.current.activeEntryPoint).toBeNull();
    expect(hook.result.current.chats).toEqual([]);
  });

  it('should set activeEntryPoint and generate a new chat id when an entry point is opened', () => {
    const { hook, mockVisearchClient } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('ai');
    });
    expect(hook.result.current.activeEntryPoint).toBe('ai');
    expect(mockVisearchClient.generateUuid).toHaveBeenCalled();
  });

  it('should clear activeEntryPoint when closed', () => {
    const { hook } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('mic');
    });
    act(() => {
      hook.result.current.closeEntryPoint();
    });
    expect(hook.result.current.activeEntryPoint).toBeNull();
  });

  it('playGreeting should push a visible bot chat bubble but not enable voice reveal when voiceGreetingEnabled is false (default)', () => {
    const { hook } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('ai');
    });
    act(() => {
      hook.result.current.playGreeting('Hello there!');
    });

    expect(hook.result.current.chats).toHaveLength(1);
    expect(hook.result.current.chats[0]).toMatchObject({ author: 'bot', messages: ['Hello there!'] });
  });

  it('playGreeting should no-op when given empty text', () => {
    const { hook } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('ai');
    });
    act(() => {
      hook.result.current.playGreeting('');
    });
    expect(hook.result.current.chats).toHaveLength(0);
  });

  it('sendMessage should push a user chat bubble immediately and clear the message field', () => {
    const { hook } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('ai');
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

  it('should commit the bot reply and any products to chats once the SSE stream closes', async () => {
    const { hook } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('ai');
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

  it('newChat should reset the visible chat state and generate a fresh chat id', async () => {
    const { hook, mockVisearchClient } = renderLauncherChat();
    act(() => {
      hook.result.current.openEntryPoint('ai');
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
    const { hook } = renderLauncherChat();
    act(() => {
      hook.result.current.setIsInWishlist('pid-1', true);
    });
    expect(hook.result.current.wishlistPids).toContain('pid-1');

    act(() => {
      hook.result.current.setIsInWishlist('pid-1', false);
    });
    expect(hook.result.current.wishlistPids).not.toContain('pid-1');
  });

  it('should disable speechOutputEnabled when customizations.launcher.voiceEnabled is false', () => {
    const { hook } = renderLauncherChat({}, { launcher: { voiceEnabled: false } });
    expect(hook.result.current.speechOutputEnabled).toBe(false);
  });

  it('toggleVoiceReading should flip isVoiceReadingEnabled', () => {
    const { hook } = renderLauncherChat();
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
});
