import type { FC } from 'react';
import EmbeddedShoppingAssistantChat from './embedded-shopping-assistant-chat';
import type { ProcessedProduct } from '../../common/types/product';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ConversationTurn {
  id: string;
  title: string;
  queryImageUrl?: string;
  aiText: string;
  products: ProcessedProduct[];
  reqId?: string;
  isLoading: boolean;
  isInitial: boolean;
  productsExpanded: boolean;
}

export interface EmbeddedShoppingAssistantProps {
  query: string;
  // Test-only escape hatch, same reason FullScreenChatContainer/ai-search-launcher have one:
  // Portal + Shadow DOM is hard to query directly in RTL/jsdom. Threaded straight through to
  // FullScreenChatContainer's own prop of the same name; never set in production.
  renderWithoutPortal?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
// Thin passthrough — previously also neutered widgetConfig.callbacks to `{}` in a nested
// Provider here, to stop useChat's action-token handling from firing a host's
// onAddToCartToggle/onAddToWishlistToggle unconditionally for ESA. That neutering wasn't scoped
// to just that handler though: it replaced the context for this component's entire subtree,
// so ProductCard (rendered inside EmbeddedShoppingAssistantChat's post-expansion ChatWindow),
// which reads onProductClick/onAddToWishlistToggle/onAddToCartToggle off this same context for
// its own click/wishlist/cart-button interactions, silently lost those too — real product-card
// callbacks a host configured were always dropped, and enabled wishlist/cart buttons were
// no-ops. The isolation now lives in EmbeddedShoppingAssistantChat's own
// useChat({ suppressActionTokenCallbacks: true }) call instead, scoped to exactly the one
// handler that needed it — so this component no longer needs to touch the context at all.
const EmbeddedShoppingAssistant: FC<EmbeddedShoppingAssistantProps> = ({ query, renderWithoutPortal }) => (
  <EmbeddedShoppingAssistantChat query={query} renderWithoutPortal={renderWithoutPortal} />
);

export default EmbeddedShoppingAssistant;
