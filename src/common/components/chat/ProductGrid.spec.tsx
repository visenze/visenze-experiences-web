import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { IntlProvider } from 'react-intl';
import ProductGrid from './ProductGrid';
import { DEFAULT_CUSTOMIZATIONS } from '../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';

const messages = { nowDescribing: 'Now Describing', a11yScrollProductsPrev: 'Previous products', a11yScrollProductsNext: 'Next products' };

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

  it('marks the card matching focusedProductId with the "Now Describing" badge when focusedRequestId matches this grid', () => {
    renderGrid({ focusedProductId: 'p2', focusedRequestId: 'req-1' });
    expect(screen.getByText('Now Describing')).toBeTruthy();
  });

  it('does not show the badge when focusedRequestId belongs to a different turn (e.g. an earlier, still-mounted grid)', () => {
    renderGrid({ focusedProductId: 'p2', focusedRequestId: 'req-2' });
    expect(screen.queryByText('Now Describing')).toBeNull();
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

  describe('horizontal scroller', () => {
    const scroller = { productsPerView: 2, gap: 8, cardsPerScroll: 2 };
    const setScrollMetrics = (el: HTMLElement, metrics: { scrollLeft: number; clientWidth: number; scrollWidth: number }): void => {
      Object.entries(metrics).forEach(([key, value]) => Object.defineProperty(el, key, { value, configurable: true }));
    };

    it('renders cards in a flex row sized for productsPerView with the configured gap, without a grid', () => {
      renderGrid({ scroller });
      const list = screen.getByRole('list');
      expect(list.style.columnGap).toBe('8px');
      expect((list.firstElementChild as HTMLElement).style.flexBasis).toBe('calc(50% - 4px)');
    });

    it('shows only the next arrow at the start and scrolls by cardsPerScroll cards', () => {
      renderGrid({ scroller });
      const list = screen.getByRole('list');
      const scrollBy = jest.fn();
      list.scrollBy = scrollBy;
      Object.defineProperty(list.firstElementChild, 'offsetWidth', { value: 100, configurable: true });
      setScrollMetrics(list, { scrollLeft: 0, clientWidth: 300, scrollWidth: 600 });
      fireEvent.scroll(list);
      expect(screen.queryByLabelText('Previous products')).toBeNull();
      fireEvent.click(screen.getByLabelText('Next products'));
      expect(scrollBy).toHaveBeenCalledWith({ left: 216, behavior: 'smooth' });
    });

    it('hides the next arrow at the end of the row', () => {
      renderGrid({ scroller });
      const list = screen.getByRole('list');
      setScrollMetrics(list, { scrollLeft: 300, clientWidth: 300, scrollWidth: 600 });
      fireEvent.scroll(list);
      expect(screen.getByLabelText('Previous products')).toBeTruthy();
      expect(screen.queryByLabelText('Next products')).toBeNull();
    });
  });
});
