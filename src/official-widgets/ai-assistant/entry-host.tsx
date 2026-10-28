import { type FC, useContext, useEffect, useMemo } from 'react';
import { AssistantSessionContext, ensureOpen } from './entries/assistant-session';
import { ENTRY_COMPONENTS } from './entries/entry-registry';
import type { AssistantEntry } from '../../common/client/entry';
import { peekChatSessionStore } from '../../common/components/chat/session/chat-session-map';
import { getChatSessionStore } from '../../common/components/chat/session/chat-session-registry';
import useChat from '../../common/components/chat/use-chat';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetClient } from '../../common/wigmix-core';

export interface EntryHostProps {
  entry: Exclude<AssistantEntry, 'embedded'>;
  productId?: string;
}

// The client's current store, looked up at call time: rerender()/disposeWidget() replace it. Peeked,
// never created, so a call with no mounted (and so no configured) store is a no-op.
const currentStore = (widgetClient: WidgetClient): ReturnType<typeof getChatSessionStore> | undefined => peekChatSessionStore(widgetClient);

// Run by every host on mount. hideWidget() — also called by rerender() and disposeWidget() — CLEARS the
// client's opener/closer callbacks and unmounts every root, so they must be registered again by the
// hosts that mount afterwards; registering from each host (rather than once per client) does that
// without depending on unmount/remount ordering. The duplicates this leaves (one per host) are harmless:
// ensureOpen() and hide() are idempotent and always act on the client's current store.
const registerClientTriggers = (widgetClient: WidgetClient): void => {
  widgetClient.sendChatMessage = (message, image): void => currentStore(widgetClient)?.sendChatMessage(message, image);
  widgetClient.openWithMessage = (message, nextSteps, options): void => currentStore(widgetClient)?.openWithMessage(message, nextSteps, options);
  widgetClient.registerWidgetOpener(() => {
    const store = currentStore(widgetClient);
    if (store) {
      ensureOpen(store);
    }
  });
  // An open full screen closes as its own close button does (closeSurface: aborts the reply, runs the
  // opening entry's onClosed, back to drawer mode), so the next programmatic opener shows the drawer.
  // Otherwise hide(), not close(): the conversation (and any in-flight reply) survives, and opening resumes it.
  widgetClient.registerWidgetCloser(() => {
    const store = currentStore(widgetClient);
    if (!store) {
      return;
    }
    const { surfaceMode, isOpen } = store.getSnapshot();
    if (surfaceMode === 'fullscreen' && isOpen) {
      store.closeSurface();
    } else {
      store.hide();
    }
  });
};

// One per host element (React root): renders that element's entry trigger. The shared chat drawer is not
// rendered here but by AssistantSurface, in its own body-hosted root. Every host on a widgetClient shares one conversation.
const EntryHost: FC<EntryHostProps> = ({ entry, productId }) => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  // Only the drawer (AssistantSurface) attaches voice; entries never take the voice bridge from it.
  // Persistence follows customizations.chatbot.persistChatEnabled, the same for every hook on the shared store.
  const chat = useChat({ attachVoice: false });
  const store = useMemo(
    () => getChatSessionStore(widgetClient, widgetConfig.initState?.wishlistProductIds || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgetClient],
  );

  useEffect(() => {
    registerClientTriggers(widgetClient);
  }, [widgetClient]);

  const Entry = ENTRY_COMPONENTS[entry];

  return (
    <AssistantSessionContext.Provider value={{ chat, store }}>
      <Entry productId={productId} />
    </AssistantSessionContext.Provider>
  );
};

export default EntryHost;
