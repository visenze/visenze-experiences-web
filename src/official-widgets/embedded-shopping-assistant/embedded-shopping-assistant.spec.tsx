import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import EmbeddedShoppingAssistant from './embedded-shopping-assistant';
import { createMockWidgetClient, createWidgetConfig } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';

// EmbeddedShoppingAssistantChat itself isn't the point of this test — a probe standing in for
// any real consumer nested inside it (ProductCard included) that reads widgetConfig.callbacks
// off the same context this component provides. Required lazily inside the factory (rather than
// referencing the top-level imports) because jest.mock() factories are hoisted above imports and
// can't close over out-of-scope module bindings.
jest.mock('./embedded-shopping-assistant-chat', () => {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const { useContext: useContextLazy } = require('react');
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const { WidgetDataContext: WidgetDataContextLazy } = require('../../common/types/contexts');
  return {
    __esModule: true,
    default: (): ReactElement => {
      const { widgetConfig } = useContextLazy(WidgetDataContextLazy);
      return (
        <div
          data-testid='context-probe'
          data-has-on-product-click={String(typeof widgetConfig.callbacks.onProductClick === 'function')}
        />
      );
    },
  };
});

describe('EmbeddedShoppingAssistant', () => {
  it("passes widgetConfig.callbacks straight through, without neutering them for children like ProductCard's onProductClick/onAddToWishlistToggle/onAddToCartToggle", () => {
    // Regression coverage: this component used to wrap its children in a WidgetDataContext.Provider
    // with callbacks overridden to {} (to isolate useChat's own action-token handling — see
    // embedded-shopping-assistant-chat.tsx's useChat({ suppressActionTokenCallbacks: true }) for
    // where that isolation lives now). That neutering wasn't scoped to just that one handler: it
    // replaced the context for every consumer in this subtree, including ProductCard, silently
    // dropping any host-configured onProductClick/onAddToWishlistToggle/onAddToCartToggle.
    const onProductClick = jest.fn();
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, { callbacks: { onProductClick } });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_embedded_shopping_assistant');

    const { getByTestId } = render(
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
        <EmbeddedShoppingAssistant query='running shoes' />
      </WidgetDataContext.Provider>,
    );

    expect(getByTestId('context-probe').getAttribute('data-has-on-product-click')).toBe('true');
  });
});
