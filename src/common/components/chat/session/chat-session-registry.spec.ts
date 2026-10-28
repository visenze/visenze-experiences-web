import { DEFAULT_SESSION_KEY, peekChatSessionStore, resetChatSessionStore } from './chat-session-map';
import { getChatSessionStore } from './chat-session-registry';

const fakeClient = (): any => ({});

describe('keyed chat session registry', () => {
  it('returns the same store for the same client and key, distinct stores per key and per client', () => {
    const a = fakeClient();
    const b = fakeClient();
    expect(getChatSessionStore(a)).toBe(getChatSessionStore(a));
    expect(getChatSessionStore(a)).toBe(getChatSessionStore(a, [], DEFAULT_SESSION_KEY));
    expect(getChatSessionStore(a, [], 'el-1')).not.toBe(getChatSessionStore(a));
    expect(getChatSessionStore(a, [], 'el-1')).toBe(getChatSessionStore(a, [], 'el-1'));
    expect(getChatSessionStore(a)).not.toBe(getChatSessionStore(b));
  });

  it('peek never creates', () => {
    const c = fakeClient();
    expect(peekChatSessionStore(c)).toBeUndefined();
    const created = getChatSessionStore(c);
    expect(peekChatSessionStore(c)).toBe(created);
    expect(peekChatSessionStore(c, 'nope')).toBeUndefined();
  });

  it('reset with a key disposes only that store', () => {
    const c = fakeClient();
    const shared = getChatSessionStore(c);
    const el = getChatSessionStore(c, [], 'el-1');
    const dispose = jest.spyOn(el, 'dispose');
    const disposeShared = jest.spyOn(shared, 'dispose');
    resetChatSessionStore(c, 'el-1');
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(disposeShared).not.toHaveBeenCalled();
    expect(peekChatSessionStore(c, 'el-1')).toBeUndefined();
    expect(peekChatSessionStore(c)).toBe(shared);
  });

  it('reset without a key disposes and removes ALL of the client\'s stores', () => {
    const c = fakeClient();
    const shared = getChatSessionStore(c);
    const el = getChatSessionStore(c, [], 'el-1');
    const d1 = jest.spyOn(shared, 'dispose');
    const d2 = jest.spyOn(el, 'dispose');
    resetChatSessionStore(c);
    expect(d1).toHaveBeenCalledTimes(1);
    expect(d2).toHaveBeenCalledTimes(1);
    expect(peekChatSessionStore(c)).toBeUndefined();
    expect(peekChatSessionStore(c, 'el-1')).toBeUndefined();
    expect(getChatSessionStore(c)).not.toBe(shared);
  });

  it('reset on a client with no stores is a no-op', () => {
    expect(() => resetChatSessionStore(fakeClient())).not.toThrow();
    expect(() => resetChatSessionStore(fakeClient(), 'x')).not.toThrow();
  });
});
