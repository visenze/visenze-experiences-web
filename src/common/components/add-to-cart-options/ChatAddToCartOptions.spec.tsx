import { act, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ChatAddToCartOptions from './ChatAddToCartOptions';
import { COMMON_TEXTS } from '../../locales/locale';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import type { WidgetClient, WidgetConfig } from '../../wigmix-core';

describe('ChatAddToCartOptions', () => {
  let onAddToCartToggle: jest.Mock;
  let widgetConfig: WidgetConfig;

  const makeProducts = (): ProcessedProduct[] => [
    { product_id: 'pid-1', im_url: 'img', title: 'Shoe One', sizes: ['8', '9'] },
    { product_id: 'pid-2', im_url: 'img', title: 'Shoe Two', sizes: ['10', '11'] },
  ];

  const renderOptions = (products: ProcessedProduct[]): ReturnType<typeof render> => render(
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient: { sendEvent: jest.fn() } as unknown as WidgetClient, darkMode: false, locale: 'en' }}>
      <IntlProvider messages={{ ...COMMON_TEXTS['en'], addToCart: 'Add to cart' }} locale='en' defaultLocale='en'>
        <ChatAddToCartOptions products={products} requestId='req-1' />
      </IntlProvider>
    </WidgetDataContext.Provider>,
  );

  beforeEach(() => {
    onAddToCartToggle = jest.fn(() => Promise.resolve(true));
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
    renderOptions(makeProducts());

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/available options for Shoe One/)).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: '9' }));
    await act(async () => {
      fireEvent.click(screen.getByTestId('wigmix-add-to-cart-options-confirm'));
    });
    expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'pid-1', expect.objectContaining({ product_id: 'pid-1' }), { size: '9' });

    // Next product's pop-up.
    expect(screen.getByText(/available options for Shoe Two/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onAddToCartToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show a handled pop-up again when the chat row re-mounts', () => {
    const products = makeProducts();
    const { unmount } = renderOptions(products);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    unmount();

    renderOptions(products);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
