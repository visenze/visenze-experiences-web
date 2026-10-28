import { type FC, useContext, useEffect, useId } from 'react';
import EmbeddedEntry from './entries/EmbeddedEntry';
import { resetChatSessionStore } from '../../common/components/chat/session/chat-session-map';
import { WidgetDataContext } from '../../common/types/contexts';

export interface EmbeddedHostProps {
  query: string;
  productId?: string;
  // Test-only escape hatch (Portal + Shadow DOM is hard to query in RTL/jsdom); never set in production.
  renderWithoutPortal?: boolean;
}

// A small stable hash (djb2) so the stored session's key survives a reload without embedding the query text in it.
const hashScope = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33 + value.charCodeAt(i)) % 4294967296;
  }
  return hash.toString(36);
};

// One per `embedded` host element. Unlike EntryHost, it does not join the widgetClient's shared
// conversation: the element gets its own chat session (keyed per element), started from its query and
// shown in its own full screen (and, with persistence on, saved and restored under its own key). The shared
// drawer (AssistantSurface) and the client triggers never see it.
const EmbeddedHost: FC<EmbeddedHostProps> = ({ query, productId, renderWithoutPortal }) => {
  const { widgetClient } = useContext(WidgetDataContext);
  const key = `embedded-${useId()}`;
  // Own session: stored and restored under its own scoped key, never shared with the conversation. Disposed (in-flight reply aborted) when this element
  // unmounts; only this element's store, never the shared one. (React StrictMode's dev double-invoke would
  // dispose and recreate the store here; the widget does not use StrictMode.)
  useEffect(() => (): void => resetChatSessionStore(widgetClient, key), [widgetClient, key]);
  // The stored session is scoped to this element's query and product, in a key of its own: it never touches the
  // shared conversation's, and a different query or product starts a different (fresh) conversation.
  const scopeKey = `embedded-${hashScope(`${query}\n${productId ?? ''}`)}`;
  return <EmbeddedEntry query={query} productId={productId} sessionKey={key} scopeKey={scopeKey} renderWithoutPortal={renderWithoutPortal} />;
};

export default EmbeddedHost;
