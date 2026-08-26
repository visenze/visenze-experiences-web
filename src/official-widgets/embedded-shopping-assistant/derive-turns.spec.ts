import { deriveTurns, type LiveChatState } from './derive-turns';
import type { Chat } from '../../common/components/chat/use-chat';
import type { ProcessedProduct } from '../../common/types/product';

const product = (id: string): ProcessedProduct => ({
  product_id: id,
  im_url: `https://example.com/${id}.jpg`,
  product_url: `https://example.com/product/${id}`,
  title: `Product ${id}`,
});

const IDLE_LIVE: LiveChatState = {
  isWaiting: false,
  streamingProducts: [],
  streamingRequestId: '',
  typewriterText: '',
};

const NO_EXPANDED = new Set<string>();

describe('deriveTurns', () => {
  it('returns an empty array for no chats', () => {
    expect(deriveTurns([], IDLE_LIVE, NO_EXPANDED)).toEqual([]);
  });

  it('single committed turn: user + bot text + products', () => {
    const chats: Chat[] = [
      { chatId: 'c1', requestId: '', author: 'user', messages: ['running shoes'] },
      { chatId: 'c1', requestId: 'req-1', author: 'bot', messages: ['Here are some options.'], products: [] },
      { chatId: 'c1', requestId: 'req-1', author: 'products', messages: [], products: [product('p1'), product('p2')] },
    ];

    const turns = deriveTurns(chats, IDLE_LIVE, NO_EXPANDED);

    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      id: '0',
      title: 'running shoes',
      aiText: 'Here are some options.',
      products: [product('p1'), product('p2')],
      reqId: 'req-1',
      isLoading: false,
      isInitial: true,
      // Initial turn defaults to collapsed until explicitly expanded.
      productsExpanded: false,
      productsSettled: true,
    });
  });

  it('multiple sequential turns: only the first is isInitial, follow-ups auto-expand', () => {
    const chats: Chat[] = [
      { chatId: 'c1', requestId: '', author: 'user', messages: ['running shoes'] },
      { chatId: 'c1', requestId: 'req-1', author: 'bot', messages: ['Overview text.'] },
      { chatId: 'c1', requestId: 'req-1', author: 'products', messages: [], products: [product('p1')] },
      { chatId: 'c2', requestId: '', author: 'user', messages: ['show cheaper options'] },
      { chatId: 'c2', requestId: 'req-2', author: 'bot', messages: ['Here are cheaper picks.'] },
      { chatId: 'c2', requestId: 'req-2', author: 'products', messages: [], products: [product('p2'), product('p3')] },
    ];

    const turns = deriveTurns(chats, IDLE_LIVE, NO_EXPANDED);

    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ id: '0', title: 'running shoes', isInitial: true, productsExpanded: false });
    expect(turns[1]).toMatchObject({
      id: '1',
      title: 'show cheaper options',
      aiText: 'Here are cheaper picks.',
      products: [product('p2'), product('p3')],
      reqId: 'req-2',
      isInitial: false,
      // Follow-up turns always auto-expand, regardless of expandedTurnIds.
      productsExpanded: true,
      productsSettled: true,
    });
  });

  it('respects expandedTurnIds for the initial turn once toggled', () => {
    const chats: Chat[] = [
      { chatId: 'c1', requestId: '', author: 'user', messages: ['running shoes'] },
      { chatId: 'c1', requestId: 'req-1', author: 'bot', messages: ['Overview.'] },
      { chatId: 'c1', requestId: 'req-1', author: 'products', messages: [], products: [product('p1')] },
    ];

    const turns = deriveTurns(chats, IDLE_LIVE, new Set(['0']));

    expect(turns[0].productsExpanded).toBe(true);
  });

  it('in-flight turn with no response yet: isLoading true, aiText/products empty, unsettled', () => {
    const chats: Chat[] = [
      { chatId: '', requestId: '', author: 'user', messages: ['running shoes'] },
    ];
    const live: LiveChatState = {
      isWaiting: true,
      streamingProducts: [],
      streamingRequestId: '',
      typewriterText: '',
    };

    const turns = deriveTurns(chats, live, NO_EXPANDED);

    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      id: '0',
      title: 'running shoes',
      aiText: '',
      products: [],
      reqId: undefined,
      isLoading: true,
      isInitial: true,
      productsSettled: false,
    });
  });

  it('a turn with products but no text yet: aiText empty, products populated, still loading/unsettled', () => {
    // Reachable in practice: a `product` SSE event can arrive before any `chat_token` (or the
    // only token so far is a bare [[pid]] reference, which stripTokensForDisplay removes from
    // the displayed text entirely) — useChat's isWaiting only ever clears on the chat_token path,
    // so it's still true here even though products has already resolved.
    const chats: Chat[] = [
      { chatId: '', requestId: '', author: 'user', messages: ['running shoes'] },
    ];
    const live: LiveChatState = {
      isWaiting: true,
      streamingProducts: [product('p1')],
      streamingRequestId: 'req-live',
      typewriterText: '',
    };

    const turns = deriveTurns(chats, live, NO_EXPANDED);

    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      aiText: '',
      products: [product('p1')],
      reqId: 'req-live',
      isLoading: true,
      productsSettled: false,
    });
  });

  it('in-flight turn with text but not yet committed: aiText live, still unsettled until commit', () => {
    const chats: Chat[] = [
      { chatId: '', requestId: '', author: 'user', messages: ['running shoes'] },
    ];
    const live: LiveChatState = {
      isWaiting: false, // cleared as soon as the first token streamed in
      streamingProducts: [product('p1')],
      streamingRequestId: 'req-live',
      typewriterText: 'Here are some options so far',
    };

    const turns = deriveTurns(chats, live, NO_EXPANDED);

    expect(turns[0]).toMatchObject({
      aiText: 'Here are some options so far',
      products: [product('p1')],
      isLoading: false,
      // Not yet committed to `chats` (no bot/products entry pushed for this group), so still
      // counted as live/unsettled even though isWaiting has already cleared.
      productsSettled: false,
    });
  });

  it('a historical turn with zero products stays settled with an empty products array', () => {
    const chats: Chat[] = [
      { chatId: 'c1', requestId: '', author: 'user', messages: ['something obscure'] },
      { chatId: 'c1', requestId: 'req-1', author: 'bot', messages: ['No matches this time.'] },
    ];

    const turns = deriveTurns(chats, IDLE_LIVE, NO_EXPANDED);

    expect(turns[0]).toMatchObject({ products: [], productsSettled: true });
  });

  it('a mid-conversation live turn (2nd+ turn in flight) only affects the last group', () => {
    const chats: Chat[] = [
      { chatId: 'c1', requestId: '', author: 'user', messages: ['running shoes'] },
      { chatId: 'c1', requestId: 'req-1', author: 'bot', messages: ['Overview.'] },
      { chatId: 'c1', requestId: 'req-1', author: 'products', messages: [], products: [product('p1')] },
      { chatId: '', requestId: '', author: 'user', messages: ['show cheaper options'] },
    ];
    const live: LiveChatState = {
      isWaiting: true,
      streamingProducts: [],
      streamingRequestId: '',
      typewriterText: '',
    };

    const turns = deriveTurns(chats, live, NO_EXPANDED);

    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ productsSettled: true, isLoading: false });
    expect(turns[1]).toMatchObject({ title: 'show cheaper options', isLoading: true, productsSettled: false });
  });

  it('resolves queryImageUrl from an image-data-url user entry, matching ChatWindow.getFile', () => {
    const chats: Chat[] = [
      {
        chatId: 'c1', requestId: '', author: 'user', messages: [], image: { files: [], file: 'data:image/png;base64,abc' },
      },
      { chatId: 'c1', requestId: 'req-1', author: 'bot', messages: ['Similar items:'] },
      { chatId: 'c1', requestId: 'req-1', author: 'products', messages: [], products: [product('p1')] },
    ];

    const turns = deriveTurns(chats, IDLE_LIVE, NO_EXPANDED);

    expect(turns[0].queryImageUrl).toBe('data:image/png;base64,abc');
  });

  it('resolves queryImageUrl from a plain-URL user entry (e.g. a gallery/preset image)', () => {
    const chats: Chat[] = [
      { chatId: 'c1', requestId: '', author: 'user', messages: [], image: { imgUrl: 'https://example.com/preset.jpg' } },
    ];

    const turns = deriveTurns(chats, IDLE_LIVE, NO_EXPANDED);

    expect(turns[0].queryImageUrl).toBe('https://example.com/preset.jpg');
  });
});
