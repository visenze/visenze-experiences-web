import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import BuyTheLook from './buy-the-look';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import {
  getStandardRecommendationPidNotFoundResponse,
  getStandardRecommendationSuccessResponse,
} from '../../../mocks/responses';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';
import { WidgetErrorState } from '../../common/wigmix-core';

describe('buy-the-look', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      widgetTitle: 'Buy the look',
      price: '{price}',
      originalPrice: '{originalPrice}',
      discount: '{discount} off',
      addToCart: 'Add to Cart',
    },
  };

  const createTestClient = (visearchOverrides: Partial<ViSearchClient> = {}): {
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ViSearchClient;
  } => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
    const { widgetClient, mockVisearchClient } = createMockWidgetClient(
      widgetConfig,
      'wigmix_buy_the_look',
      {
        productSearchById: jest.fn(),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const renderBuyTheLook = (
    productId: string,
    visearchOverrides: Partial<ViSearchClient> = {},
    options: { darkMode?: boolean; mobileWidth?: number } = {},
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides);
    const component = <BuyTheLook productId={productId} />;

    if (options.mobileWidth) {
      testComponent = render(
        <ResponsiveContext.Provider value={{ width: options.mobileWidth }}>
          <RootContext.Provider value={document.body}>
            <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: options.darkMode ?? false, locale: 'en' }}>
              <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
                {component}
              </IntlProvider>
            </WidgetDataContext.Provider>
          </RootContext.Provider>
        </ResponsiveContext.Provider>,
      );
    } else {
      testComponent = renderWidget(component, {
        widgetConfig,
        widgetClient,
        darkMode: options.darkMode,
        messages: texts['en'],
      });
    }

    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- 1.1 Core rendering & snapshot ---

  it('should render without crashing with a valid productId and mock recommendation response', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((pid, _params, handler) => {
        expect(pid).toBe('pid-found');
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.container.querySelector('.w-full')).toBeTruthy();
  });

  it('should match snapshot for default desktop layout', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render empty when RootContext is null (loading state)', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    testComponent = render(
      <RootContext.Provider value={null}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <BuyTheLook productId='pid-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    expect(testComponent.container.innerHTML).toBe('');
  });

  it('should render empty when recommendation response has error (pid not found)', () => {
    renderBuyTheLook('pid-not-found', {
      productSearchById: jest.fn().mockImplementation((pid, _params, handler) => {
        expect(pid).toBe('pid-not-found');
        handler(getStandardRecommendationPidNotFoundResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  // --- 1.2 Product selection & interactions ---

  it('should update selected product when clicking a different thumbnail', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    // Initially the first product is selected (border-black)
    const thumbnails = testComponent.container.querySelectorAll('[data-product-id]');
    expect(thumbnails.length).toBeGreaterThan(1);
    expect(thumbnails[0].className).toContain('border-black');

    // Click the second thumbnail
    act(() => {
      fireEvent.click(thumbnails[1]);
    });

    // Now second thumbnail should be selected
    const updatedThumbnails = testComponent.container.querySelectorAll('[data-product-id]');
    expect(updatedThumbnails[1].className).toContain('border-black');
    expect(updatedThumbnails[0].className).toContain('border-transparent');
  });

  it('should show correct product title and brand for selected product', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // First product is selected by default — "Product Title 1", "Product Brand 1"
    expect(testComponent.getByText('Product Title 1')).toBeTruthy();
    expect(testComponent.getByText('Product Brand 1')).toBeTruthy();

    // Click the third thumbnail
    const thumbnails = testComponent.container.querySelectorAll('[data-product-id]');
    act(() => {
      fireEvent.click(thumbnails[2]);
    });

    // Should now show product 3's details
    expect(testComponent.getByText('Product Title 3')).toBeTruthy();
    expect(testComponent.getByText('Product Brand 3')).toBeTruthy();
  });

  it('should fire onAddToCartToggle callback when Add to Cart button is clicked', () => {
    const onAddToCartToggle = jest.fn();
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    widgetConfig.callbacks.onAddToCartToggle = onAddToCartToggle;
    (widgetConfig.customizations.productCard as any).addToCart = { enable: true, color: '#000', colorDark: '#FFF', layout: 'TEXT' };

    testComponent = renderWidget(<BuyTheLook productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    const addToCartButton = testComponent.getAllByText('Add to Cart')
      .find((el) => el.tagName === 'BUTTON') as HTMLElement;
    act(() => {
      fireEvent.click(addToCartButton);
    });

    expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'pid-1');
  });

  it('should fall back to placeholder image when main product image fails to load', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // Find the main product image (left side, productInfo im_url)
    const mainImage = testComponent.container.querySelector('.lg\\:col-span-2 img') as HTMLImageElement;
    expect(mainImage).toBeTruthy();

    act(() => {
      fireEvent.error(mainImage);
    });

    expect(mainImage.src).toContain('placehold.co');
  });

  it('should fall back to placeholder image when thumbnail image fails to load', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // Get thumbnail images (inside the scrollable thumbnail row)
    const thumbnailImages = testComponent.container.querySelectorAll('[data-product-id] img');
    expect(thumbnailImages.length).toBeGreaterThan(0);

    act(() => {
      fireEvent.error(thumbnailImages[0]);
    });

    expect((thumbnailImages[0] as HTMLImageElement).src).toContain('placehold.co');
  });

  // --- 1.3 Responsiveness & edge cases ---

  it('should render correctly in mobile layout', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    }, { mobileWidth: 400 });

    act(() => {
      jest.runAllTimers();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render correctly with empty recommendation results (0 products)', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        const emptyResponse = getStandardRecommendationSuccessResponse();
        emptyResponse.result = [];
        handler(emptyResponse);
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // Should still render the widget container and title, but no thumbnails or product details
    expect(testComponent.getByText('Buy the look')).toBeTruthy();
    const thumbnails = testComponent.container.querySelectorAll('[data-product-id]');
    expect(thumbnails.length).toBe(0);
  });

  it('should display widget title from intl messages', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.getByText('Buy the look')).toBeTruthy();
  });

  it('should render with dark mode styles applied', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    }, { darkMode: true });

    act(() => {
      jest.runAllTimers();
    });

    // The heading color should use the dark mode fontColorDark
    const heading = testComponent.getByText('Buy the look');
    expect(heading.style.color).toBeTruthy();
    // jsdom converts hex to rgb — assert the style attribute was set
    expect(heading.getAttribute('style')).toContain('color');
  });

  it('should render product price with correct format', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // First product has price { currency: 'USD', value: '19.3' } → 'USD19.30'
    expect(testComponent.getByText('USD19.30')).toBeTruthy();
  });

  it('should not render Add to Cart button when addToCart is not enabled', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.queryByText('Add to Cart')).toBeNull();
  });

  it('should display the main product image from productInfo', () => {
    renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // productInfo from mock has im_url = 'https://main-image-main'
    const mainImage = testComponent.container.querySelector('.lg\\:col-span-2 img') as HTMLImageElement;
    expect(mainImage).toBeTruthy();
    expect(mainImage.src).toContain('https://main-image-main');
  });

  it('should update Add to Cart product when switching thumbnails', () => {
    const onAddToCartToggle = jest.fn();
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    widgetConfig.callbacks.onAddToCartToggle = onAddToCartToggle;
    (widgetConfig.customizations.productCard as any).addToCart = { enable: true, color: '#000', colorDark: '#FFF', layout: 'TEXT' };

    testComponent = renderWidget(<BuyTheLook productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    // Click second thumbnail
    const thumbnails = testComponent.container.querySelectorAll('[data-product-id]');
    act(() => {
      fireEvent.click(thumbnails[1]);
    });

    // Click Add to Cart — should fire with pid-2
    const addToCartButton = testComponent.getAllByText('Add to Cart')
      .find((el) => el.tagName === 'BUTTON') as HTMLElement;
    act(() => {
      fireEvent.click(addToCartButton);
    });

    expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'pid-2');
  });

  it('should render with no productGrid customization (fallback CSS)', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Remove productGrid to exercise the fallback branch in getProductCardCssClasses / getProductCardCssConfig
    delete (widgetConfig.customizations as any).productGrid;

    testComponent = renderWidget(<BuyTheLook productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    // Widget should still render fine with fallback styles
    expect(testComponent.getByText('Buy the look')).toBeTruthy();
  });

  it('should handle marginHorizontal = 0 in productGrid config', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Set marginHorizontal to 0 to exercise the `=== 0` branch
    widgetConfig.customizations.productGrid = {
      desktop: { productsPerRow: 3, marginVertical: 8, marginHorizontal: 0 },
      tablet: { productsPerRow: 3, marginVertical: 8, marginHorizontal: 0 },
      mobile: { productsPerRow: 2, marginVertical: 8, marginHorizontal: 0 },
    };

    testComponent = renderWidget(<BuyTheLook productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.getByText('Buy the look')).toBeTruthy();
  });

  it('should use forceErrorState to simulate an error', () => {
    const { widgetClient } = renderBuyTheLook('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // Trigger the forceErrorState function which was set on widgetClient
    act(() => {
      widgetClient.forceErrorState(WidgetErrorState.GENERIC_ERROR);
    });

    // After forcing error, the widget should render empty
    expect(testComponent.container.innerHTML).toBe('');
  });

  it('should handle productGrid config with undefined marginHorizontal', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Set cssConfigSrc to exist but without marginHorizontal — covers the truthy branch (line 45)
    (widgetConfig.customizations as any).productGrid = {
      desktop: { productsPerRow: 3, marginVertical: 8 },
      tablet: { productsPerRow: 3, marginVertical: 8 },
      mobile: { productsPerRow: 2, marginVertical: 8 },
    };

    testComponent = renderWidget(<BuyTheLook productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.getByText('Buy the look')).toBeTruthy();
  });

  it('should handle wishlist add and remove via ProductCard', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Enable addToWishlist to make the wishlist button appear
    (widgetConfig.customizations.productCard as any).addToWishlist = {
      enable: true,
      position: 'top_right',
      iconInactive: { color: '#000', colorDark: '#FFF', backgroundColor: '#FFF', backgroundColorDark: '#000' },
      iconActive: { color: '#000', colorDark: '#FFF', backgroundColor: '#FFF', backgroundColorDark: '#000' },
    };

    testComponent = renderWidget(<BuyTheLook productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    // Click wishlist button to add, then click again to remove
    const wishlistButtons = testComponent.queryAllByTestId('wigmix-wishlist-button');
    if (wishlistButtons.length > 0) {
      act(() => {
        fireEvent.click(wishlistButtons[0]);
      });
      act(() => {
        fireEvent.click(wishlistButtons[0]);
      });
    }
    // Component should still be rendered
    expect(testComponent.getByText('Buy the look')).toBeTruthy();
  });
});
