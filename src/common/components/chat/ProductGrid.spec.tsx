import { act, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { IntlProvider } from 'react-intl';
import ProductGrid from './ProductGrid';
import { DEFAULT_CUSTOMIZATIONS } from '../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';

const messages = { nowDescribing: 'Now Describing' };

const buildProduct = (id: string): ProcessedProduct => ({
  product_id: id,
  im_url: `https://example.com/${id}.jpg`,
  product_url: `https://example.com/${id}`,
  price: { currency: 'USD', value: '10.00' },
  title: `Product ${id}`,
} as unknown as ProcessedProduct);

const renderGrid = (props: Partial<ComponentProps<typeof ProductGrid>> = {}): ReturnType<typeof render> => {
  const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS, {
    displaySettings: {
      cssSelector: '.test',
      productDetails: { price: 'price', title: 'title', brand: 'brand', original_price: 'original_price', product_url: 'product_url' },
    },
  });
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher');
  return render(
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
      <IntlProvider messages={messages} locale='en' defaultLocale='en'>
        <ProductGrid
          products={[buildProduct('p1'), buildProduct('p2')]}
          requestId='req-1'
          wishlistPids={[]}
          setIsInWishlist={jest.fn()}
          pwPrefix='asl'
          {...props}
        />
      </IntlProvider>
    </WidgetDataContext.Provider>,
  );
};

describe('ProductGrid', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('renders one card per product when not streaming', () => {
    renderGrid();
    expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(2);
  });

  it('marks the card matching focusedProductId with the "Now Describing" badge', () => {
    renderGrid({ focusedProductId: 'p2' });
    expect(screen.getByText('Now Describing')).toBeTruthy();
  });

  it('reveals streaming products one at a time rather than all at once', () => {
    jest.useFakeTimers();
    renderGrid({ streaming: true });
    expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(1);
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(document.body.querySelectorAll('.wigmix-product-card')).toHaveLength(2);
    jest.useRealTimers();
  });
});
