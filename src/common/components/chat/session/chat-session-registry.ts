import type { WidgetClient } from '../../../wigmix-core';
import { DEFAULT_SESSION_KEY, peekChatSessionStore, putChatSessionStore } from './chat-session-map';
import { ChatSessionStore } from './chat-session-store';

export { DEFAULT_SESSION_KEY, peekChatSessionStore, resetChatSessionStore } from './chat-session-map';

// WidgetClient does not expose its config, so callers pass the initial wishlist pids; they are only
// used when the store is first created for a (client, key).
export const getChatSessionStore = (
  widgetClient: WidgetClient,
  wishlistPids: string[] = [],
  key: string = DEFAULT_SESSION_KEY,
): ChatSessionStore => {
  let store = peekChatSessionStore(widgetClient, key);
  if (!store) {
    store = new ChatSessionStore(wishlistPids);
    putChatSessionStore(widgetClient, key, store);
  }
  return store;
};
