import { createContext, useContext } from 'react';
import type { ChatSessionStore, EntryPointKey, SurfaceMode } from '../../../common/components/chat/session/chat-session-store';
import type { UseChatResult } from '../../../common/components/chat/use-chat';

// What EntryHost hands its entry component: its own useChat (composer text, actions) and the
// widgetClient's shared session store.
export interface AssistantSession {
  chat: UseChatResult;
  store: ChatSessionStore;
}

export const AssistantSessionContext = createContext<AssistantSession | null>(null);

export const useAssistantSession = (): AssistantSession => {
  const session = useContext(AssistantSessionContext);
  if (!session) {
    throw new Error('useAssistantSession must be used inside EntryHost');
  }
  return session;
};

export interface OpenAssistantOptions {
  mode: SurfaceMode;
  entryPoint: EntryPointKey;
  // Carry an activation (the entry point's greeting / welcome screen). False opens the surface without one
  // (the launcher's camera/mic in drawer mode, which has no entry screens). Default true.
  withActivation?: boolean;
  // Mint a fresh session when there is none to resume. False (the full screen's camera/mic) only shows the
  // surface: the first send mints the session lazily. Default true.
  mintSession?: boolean;
  onClosed?: () => void;
}

// The one way an entry shows the shared surface: picks the container, records the activation (a fresh
// conversation is greeted by AssistantSurface; isResumed skips it for a resumed one) and then resumes the
// existing conversation (reopen) or starts a new one (open) — the same handshake as shopping-assistant.
// openSurface() replaces any earlier entry's onClosed callback.
export const openAssistant = (store: ChatSessionStore, options: OpenAssistantOptions): void => {
  const { mode, entryPoint, withActivation = true, mintSession = true, onClosed } = options;
  const resuming = Boolean(store.getChatId());
  store.openSurface({
    mode,
    activation: withActivation
      ? { entryPoint, isResumed: resuming, userMessageBaseline: store.getSnapshot().chats.filter((c) => c.author === 'user').length }
      : undefined,
    onClosed,
  });
  if (resuming || !mintSession) {
    store.reopen();
    // reopen() only flips isOpen, and a fresh session has input disabled until open() runs: enable it so a
    // send from the surface (which mints the chat id lazily) is possible.
    if (!resuming) {
      store.setState({ allowUserInput: true });
    }
  } else {
    store.open();
  }
};

// Shows the shared drawer: nothing if the chat is already open (an open full-screen chat covers the
// page and is left as it is), else it opens in drawer mode as an 'ai' activation, which greets a new
// conversation. hide() leaves the session running, so the next call resumes it.
export const ensureOpen = (store: ChatSessionStore): void => {
  if (store.getSnapshot().isOpen) {
    return;
  }
  openAssistant(store, { mode: 'drawer', entryPoint: 'ai' });
};
