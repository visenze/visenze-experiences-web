import type { Chat } from '../use-chat';

const CHAT_ID_STORAGE_PREFIX = 'visenze_shopping_assistant_chat_id_';

interface StoredChatId {
  chatId: string;
  timestamp: number;
}

export const buildChatIdStorageKey = (placementId: string | number, scopeKey?: string): string => (
  `${CHAT_ID_STORAGE_PREFIX}${placementId}${scopeKey ? `__${scopeKey}` : ''}`
);

// Only the chat id (plus a sliding TTL) is stored client-side; messages are always re-fetched
// from the backend on restore (see fetchChatHistory) so the UI can't drift from the server.
export const loadStoredChatId = (key: string, ttlMs: number): string | undefined => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return undefined;
    }
    const stored = JSON.parse(raw) as StoredChatId;
    if (stored.chatId && stored.timestamp && Date.now() - stored.timestamp <= ttlMs) {
      return stored.chatId;
    }
  } catch {
    // Ignore a malformed value, or storage that is blocked or throwing (Safari private mode, cookies
    // disabled): fall back to a fresh session.
  }
  return undefined;
};

// Storage can be blocked or full (Safari private mode, cookies disabled, quota): the chat then works
// for the page's lifetime but is not resumable, rather than throwing out of an effect or a send.
export const removeStoredItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Not resumable; nothing to clean up.
  }
};

// Called on open/send/close to slide the TTL forward instead of expiring mid-conversation.
export const persistChatId = (key: string, chatId: string): void => {
  const snapshot: StoredChatId = { chatId, timestamp: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Not resumable (see removeStoredItem).
  }
};

// A bot message the frontend injected itself (greeting/opening message/openWithMessage) — the
// backend never sees these, so they're absent from the history endpoint and must be stored here.
// `afterRequestId` is the marker: the requestId of the last backend message that preceded it
// ('' = none, i.e. it opened the conversation), so restore can splice it back in at the same spot.
export interface InjectedMessage {
  text: string;
  nextSteps?: string[];
  afterRequestId: string;
}

interface StoredInjectedMessages {
  chatId: string;
  messages: InjectedMessage[];
}

export const buildInjectedStorageKey = (chatIdStorageKey: string): string => `${chatIdStorageKey}__injected`;

export const loadInjectedMessages = (key: string, chatId: string): InjectedMessage[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const stored = JSON.parse(raw) as StoredInjectedMessages;
    return stored.chatId === chatId && Array.isArray(stored.messages) ? stored.messages : [];
  } catch {
    // Ignore a malformed value: the conversation just restores without its injected messages.
    return [];
  }
};

export const persistInjectedMessages = (key: string, chatId: string, messages: InjectedMessage[]): void => {
  const snapshot: StoredInjectedMessages = { chatId, messages };
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Not resumable (see removeStoredItem).
  }
};

// Splices injected messages into the history-derived chats right after the backend message their
// marker names (or at the very start for ''). A marker that no longer matches anything (e.g.
// trimmed history) falls back to the end. Returns the chats plus the nextSteps of an injected
// message that ended up last, since only then are its chips the live suggestions.
export const mergeInjectedMessages = (
  historyChats: Chat[],
  injected: InjectedMessage[],
  chatId: string,
): { chats: Chat[]; trailingNextSteps: string[] | null } => {
  const merged = [...historyChats];
  const insertedAfter = new Map<string, number>();
  let lastInjected: InjectedMessage | null = null;
  injected.forEach((entry) => {
    const alreadyInserted = insertedAfter.get(entry.afterRequestId) ?? 0;
    insertedAfter.set(entry.afterRequestId, alreadyInserted + 1);
    let anchor = -1;
    if (entry.afterRequestId) {
      anchor = merged.map((c) => c.requestId).lastIndexOf(entry.afterRequestId);
    }
    const index = entry.afterRequestId && anchor === -1 ? merged.length : anchor + 1 + alreadyInserted;
    merged.splice(index, 0, {
      chatId, requestId: '', author: 'bot', messages: [entry.text], products: [],
    });
    lastInjected = index === merged.length - 1 ? entry : null;
  });
  return { chats: merged, trailingNextSteps: (lastInjected as InjectedMessage | null)?.nextSteps ?? null };
};
