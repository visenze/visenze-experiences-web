import { createContext, useContext } from 'react';
import type { ChatSessionStore } from '../../../common/components/chat/session/chat-session-store';
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

// Shows the shared drawer: nothing if the chat is already open (an open full-screen chat covers the
// page and is left as it is), else the surface is put in drawer mode and the existing conversation is
// re-shown (reopen) or, with no session yet, a fresh one starts (open) — the same handshake as
// shopping-assistant. hide() leaves the session running, so reopen() resumes it.
export const ensureOpen = (store: ChatSessionStore): void => {
  if (store.getSnapshot().isOpen) {
    return;
  }
  store.setSurfaceMode('drawer');
  if (store.getChatId()) {
    store.reopen();
  } else {
    store.open();
  }
};
