import type { ChatSessionStore } from '../../../common/components/chat/session/chat-session-store';

// Content-based reads of a session for the specs, so an assertion says WHAT the conversation holds instead of how
// many entries it happens to have (an opening greeting, for one, is an entry the shopper never typed).

// Every message in the conversation, in order, by its first text ('' for an image-only message).
export const chatTexts = (store: ChatSessionStore): string[] => store.getSnapshot().chats.map((c) => c.messages[0] ?? '');

// Only what the shopper sent.
export const userTexts = (store: ChatSessionStore): string[] => store.getSnapshot().chats.filter((c) => c.author === 'user').map((c) => c.messages[0] ?? '');
