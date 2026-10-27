import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ChatAddToCartOptions from './ChatAddToCartOptions';
import { COMMON_TEXTS } from '../../locales/locale';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import type { WidgetClient, WidgetConfig } from '../../wigmix-core';
import type { Chat } from '../chat/use-chat';

describe('ChatAddToCartOptions', () => {
  let onAddToCartToggle: jest.Mock;
  let sendEvent: jest.Mock;
  let widgetConfig: WidgetConfig;

  const makeProducts = (): ProcessedProduct[] => [
    { product_id: 'pid-1', im_url: 'img', title: 'Shoe One', sizes: ['8', '9'] },
    { product_id: 'pid-2', im_url: 'img', title: 'Shoe Two', sizes: ['10', '11'] },
  ];

  const makeEntry = (products: ProcessedProduct[]): Chat => ({ chatId: 'chat-1', requestId: 'req-1', author: 'options', messages: [], products });

  const renderOptions = (entry: Chat): ReturnType<typeof render> => render(
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient: { sendEvent } as unknown as WidgetClient, darkMode: false, locale: 'en' }}>
      <IntlProvider messages={{ ...COMMON_TEXTS['en'], addToCart: 'Add to cart' }} locale='en' defaultLocale='en'>
        <ChatAddToCartOptions entry={entry} />
      </IntlProvider>
    </WidgetDataContext.Provider>,
  );

  beforeEach(() => {
    onAddToCartToggle = jest.fn(() => Promise.resolve(true));
    sendEvent = jest.fn();
    widgetConfig = {
      displaySettings: { productDetails: { title: 'title' } },
      callbacks: { onAddToCartToggle },
      customizations: {
        productCard: {
          addToCart: {
            enable: true,
            layout: 'TEXT',
            options: { enable: true, fields: [{ field: 'sizes', label: 'Size', layout: 'CAROUSEL', callbackKey: 'size' }] },
          },
        },
      },
    } as unknown as WidgetConfig;
  });

  it('opens the pop-up for one product at a time and adds to cart on confirm', async () => {
    renderOptions(makeEntry(makeProducts()));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/available options for Shoe One/)).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: '9' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-add-to-cart-options-confirm'));
    });
    expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'pid-1', expect.objectContaining({ product_id: 'pid-1' }), { size: '9' });
    // The host sends add_to_cart itself, so the widget must not.
    expect(sendEvent).not.toHaveBeenCalledWith('add_to_cart', expect.anything());

    // Next product's pop-up.
    expect(screen.getByText(/available options for Shoe Two/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onAddToCartToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show a handled pop-up again when the chat row re-mounts', () => {
    const entry = makeEntry(makeProducts());
    const { unmount } = renderOptions(entry);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    unmount();

    renderOptions(entry);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the pop-up again when a later turn asks to add the same product object', async () => {
    // findProductForAddToCart reuses the product object of an earlier turn, so a new options
    // entry can hold the very same object that was already handled.
    const [shoe] = makeProducts();
    const { unmount } = renderOptions(makeEntry([shoe]));
    fireEvent.click(screen.getByRole('radio', { name: '9' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-add-to-cart-options-confirm'));
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    renderOptions(makeEntry([shoe]));
    expect(screen.getByText(/available options for Shoe One/)).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '8' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-add-to-cart-options-confirm'));
    });
    expect(onAddToCartToggle).toHaveBeenCalledTimes(2);
    expect(onAddToCartToggle).toHaveBeenLastCalledWith(true, 'pid-1', shoe, { size: '8' });
  });
});
