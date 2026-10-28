import { buildChatIdStorageKey, loadStoredChatId, persistChatId } from './chat-session-storage';

describe('chat session storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.useRealTimers());

  it('round-trips a chat id within the TTL', () => {
    persistChatId('k', 'abc');
    expect(loadStoredChatId('k', 60_000)).toBe('abc');
  });

  it('returns undefined beyond the TTL', () => {
    jest.useFakeTimers().setSystemTime(1_000_000);
    persistChatId('k', 'abc');
    jest.setSystemTime(1_000_000 + 60_001);
    expect(loadStoredChatId('k', 60_000)).toBeUndefined();
  });

  it('returns undefined for missing or malformed values', () => {
    expect(loadStoredChatId('missing', 1000)).toBeUndefined();
    localStorage.setItem('k', '{not json');
    expect(loadStoredChatId('k', 1000)).toBeUndefined();
  });

  it('builds the storage key with an optional scope', () => {
    expect(buildChatIdStorageKey(5)).toBe('visenze_shopping_assistant_chat_id_5');
    expect(buildChatIdStorageKey(5, 'p1')).toBe('visenze_shopping_assistant_chat_id_5__p1');
  });
});
