import type { WidgetClient } from '../../../wigmix-core';
import type { ChatSessionStore } from './chat-session-store';

// Per-WidgetClient stores, kept apart from chat-session-registry.ts (which constructs stores, and so
// pulls in the whole chat implementation) so src/common/client can reset a client's sessions without
// bundling the chat code into widgets that never use it.
export const DEFAULT_SESSION_KEY = 'shared';

const chatSessionStores = new WeakMap<WidgetClient, Map<string, ChatSessionStore>>();

export const peekChatSessionStore = (widgetClient: WidgetClient, key: string = DEFAULT_SESSION_KEY): ChatSessionStore | undefined => (
  chatSessionStores.get(widgetClient)?.get(key)
);

export const putChatSessionStore = (widgetClient: WidgetClient, key: string, store: ChatSessionStore): void => {
  let stores = chatSessionStores.get(widgetClient);
  if (!stores) {
    stores = new Map();
    chatSessionStores.set(widgetClient, stores);
  }
  stores.set(key, store);
};

// With a key: drops that one session. Without: drops ALL of the client's sessions (the shared one and
// every per-element one), aborting any in-flight reply. Called by rerender()/disposeWidget(); hooks
// mounted at the same time on one store still share it.
export const resetChatSessionStore = (widgetClient: WidgetClient, key?: string): void => {
  const stores = chatSessionStores.get(widgetClient);
  if (!stores) {
    return;
  }
  if (key !== undefined) {
    stores.get(key)?.dispose();
    stores.delete(key);
    return;
  }
  stores.forEach((store) => store.dispose());
  chatSessionStores.delete(widgetClient);
};
