import type { Chat } from '../../common/components/chat/use-chat';
import { isImageDataUrl, isImageUrl } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';
import type { ConversationTurn } from './embedded-shopping-assistant';

// The subset of UseChatResult this derivation actually reads — kept narrow and explicit (rather
// than taking `chat: UseChatResult` directly) so tests can construct exactly what's needed
// instead of a full hook-shaped object.
export interface LiveChatState {
  isWaiting: boolean;
  streamingProducts: ProcessedProduct[];
  streamingRequestId: string;
  typewriterText: string;
}

// Mirrors ChatWindow.tsx's own getFile() exactly — only a data-URL or plain URL image has a
// displayable src; a raw ImageFile (bytes only, no URL) or Pid reference doesn't. In practice
// every real capture/upload path in this codebase (WebcamCapture, FileDropzone) produces an
// object with `.file` populated, so this always resolves for real images.
const deriveQueryImageUrl = (image: Chat['image']): string | undefined => {
  if (!image) {
    return undefined;
  }
  if (isImageDataUrl(image)) {
    return image.file;
  }
  if (isImageUrl(image)) {
    return image.imgUrl;
  }
  return undefined;
};

// Transforms useChat's flat, append-only `chats` log into the per-turn aggregate shape
// TurnSection.tsx expects (title+aiText+products+flags all on one object). `chats` entries
// can't be grouped by requestId — use-chat.ts's sendMessage hardcodes `requestId: ''` on the
// 'user' entry it pushes and never patches it in later, so every user message in a conversation
// shares the same empty-string requestId. The only reliable grouping is positional: each 'user'
// entry starts a new turn; everything after it up to the next 'user' entry belongs to that turn.
// Safe because `chats` is strictly append-only (use-chat.ts never reorders or removes entries).
const groupChatsByTurn = (chats: Chat[]): Chat[][] => {
  const groups: Chat[][] = [];
  chats.forEach((entry) => {
    if (entry.author === 'user' || groups.length === 0) {
      groups.push([entry]);
    } else {
      groups[groups.length - 1].push(entry);
    }
  });
  return groups;
};

export const deriveTurns = (
  chats: Chat[],
  live: LiveChatState,
  // ESA's own local UI state for the "See Results" gate — no UseChatResult equivalent. Only the
  // initial turn is ever gated; every derived id is stable across renders (see groupChatsByTurn),
  // so this can be keyed directly by the derived `id`.
  expandedTurnIds: ReadonlySet<string>,
): ConversationTurn[] => {
  const groups = groupChatsByTurn(chats);

  return groups.map((group, index): ConversationTurn => {
    const id = String(index);
    const isInitial = index === 0;
    const userEntry = group.find((entry) => entry.author === 'user');
    const botEntry = group.find((entry) => entry.author === 'bot');
    const productsEntry = group.find((entry) => entry.author === 'products');

    // The in-flight turn is the last group whose response hasn't committed yet (no 'bot'/
    // 'products' entry pushed for it) — commitResponse() only ever pushes those once the SSE
    // stream actually closes. Also requires isWaiting/streamingProducts, so a fully-idle empty
    // trailing user-only group (shouldn't normally happen, but defensively) isn't misread as live.
    const isLastGroup = index === groups.length - 1;
    const isLive = isLastGroup && !botEntry && !productsEntry
      && (live.isWaiting || live.streamingProducts.length > 0);

    return {
      id,
      // Image-only sends (chat.sendMessage(undefined, image)) push a 'user' entry with an empty
      // `messages` array — ESA's own handleImageSelect fills this gap with a localized
      // "Image search" label (intl isn't available in this pure function). Deliberately left as
      // '' here; revisit once Step 4 decides whether image search actually routes through
      // chat.sendMessage at all.
      title: userEntry?.messages[0] ?? '',
      queryImageUrl: deriveQueryImageUrl(userEntry?.image),
      aiText: isLive ? live.typewriterText : (botEntry?.messages[0] ?? ''),
      products: isLive ? live.streamingProducts : (productsEntry?.products ?? []),
      reqId: botEntry?.requestId || productsEntry?.requestId || (isLive ? live.streamingRequestId : '') || undefined,
      // Matches ESA's original semantics exactly, contingent on Step 1's toggleVoiceReading()
      // call: with narration permanently disabled, useChat's sendMessage sets isWaiting false
      // unconditionally on the first chat_token (the `!willSpeakReply || !isVoiceReadingEnabledNow()`
      // gate always passes) — the same "flips false on first token" timing ESA's own isLoading had.
      isLoading: isLive && live.isWaiting,
      isInitial,
      productsExpanded: isInitial ? expandedTurnIds.has(id) : true,
      // Once a turn is no longer the live in-flight one, its response has necessarily committed
      // (that's what ends its `isLive` status) — so, exactly like ESA's original productsSettled,
      // it's only ever unsettled while still live, regardless of whether text/products have
      // started arriving.
      productsSettled: !isLive,
    };
  });
};
