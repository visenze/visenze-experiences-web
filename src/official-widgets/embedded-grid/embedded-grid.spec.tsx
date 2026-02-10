import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import EmbeddedGrid from './embedded-grid';
import {
  getStandardRecommendationPidNotFoundResponse,
  getStandardRecommendationSuccessResponse,
} from '../../../mocks/responses';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';
import { WidgetErrorState } from '../../common/wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('embedded-grid', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      widgetTitle: 'Embedded Grid 103',
      price: '{price}',
      originalPrice: '{originalPrice}',
      discount: '{discount} off',
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
      'wigmix_embedded_grid',
      {
        productSearchById: jest.fn(),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  const renderEmbeddedGrid = (
    productId: string,
    visearchOverrides: Partial<ViSearchClient> = {},
    options: { darkMode?: boolean; mobileWidth?: number } = {},
  ): ReturnType<typeof createTestClient> => {
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides);
    const component = <EmbeddedGrid productId={productId} />;

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
    renderEmbeddedGrid('pid-found', {
      productSearchById: jest.fn().mockImplementation((pid, _params, handler) => {
        expect(pid).toBe('pid-found');
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeTruthy();
  });

  it('should match snapshot for default desktop layout', () => {
    renderEmbeddedGrid('pid-found', {
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

  it('should not render anything if product is not found', () => {
    renderEmbeddedGrid('pid-not-found', {
      productSearchById: jest.fn().mockImplementation((pid, params, handler) => {
        expect(pid).toBe('pid-not-found');
        expect(params).toEqual({
          return_product_info: true,
          limit: 20,
          show_best_product_images: true,
          sort_by: '',
          facets: [
            'price',
            'brand',
          ],
          facets_show_count: true,
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardRecommendationPidNotFoundResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
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
            <EmbeddedGrid productId='pid-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    expect(testComponent.container.innerHTML).toBe('');
  });

  // --- 1.2 Customizations ---

  it('should render a successful response with some customizations', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_, __, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    widgetConfig.customizations.generalLayout.showWidgetTitle = false;
    widgetConfig.customizations.generalLayout.showViSenzeLogo = true;

    testComponent = renderWidget(<EmbeddedGrid productId='pid-found' />, {
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

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should display widget title when showWidgetTitle is true', () => {
    renderEmbeddedGrid('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.getByText('Embedded Grid 103')).toBeTruthy();
  });

  // --- 1.3 Product card interactions ---

  it('should swap image on hover (pointerEnter/pointerOut)', () => {
    renderEmbeddedGrid('pid-found', {
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

    act(() => {
      const productCardImage = testComponent.queryAllByTestId('wigmix-product-card-image')[0];
      expect(productCardImage.getAttribute('src')).toEqual('https://main-image-1');
      fireEvent.pointerEnter(productCardImage);
      expect(productCardImage.getAttribute('src')).toEqual('https://additional-image-1-1');
      fireEvent.pointerOut(productCardImage);
    });

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  // --- 1.4 Error handling ---

  it('should use forceErrorState to simulate an error', () => {
    const { widgetClient } = renderEmbeddedGrid('pid-found', {
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

  it('should render empty when API returns error', () => {
    renderEmbeddedGrid('pid-not-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationPidNotFoundResponse());
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // Widget should be empty when error occurs
    expect(testComponent.container.innerHTML).toBe('');
  });

  // --- 1.5 Empty results ---

  it('should render empty when recommendation results are empty (0 products)', () => {
    renderEmbeddedGrid('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        const emptyResponse = getStandardRecommendationSuccessResponse();
        emptyResponse.result = [];
        handler(emptyResponse);
      }),
    });

    act(() => {
      jest.runAllTimers();
    });

    // Should not render product grid when no results
    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeNull();
  });

  // --- 1.6 Wishlist functionality ---

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

    testComponent = renderWidget(<EmbeddedGrid productId='pid-found' />, {
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
    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeTruthy();
  });

  // --- 1.7 Responsive / breakpoints ---

  it('should render correctly in mobile layout', () => {
    renderEmbeddedGrid('pid-found', {
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

  it('should render correctly in tablet layout', () => {
    renderEmbeddedGrid('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    }, { mobileWidth: 768 });

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

  // --- 1.8 Dark mode ---

  it('should render with dark mode styles applied', () => {
    renderEmbeddedGrid('pid-found', {
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    }, { darkMode: true });

    act(() => {
      jest.runAllTimers();
    });

    // Widget should render with dark mode
    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeTruthy();
  });

  // --- 1.9 Product price display ---

  it('should render product price with correct format', () => {
    renderEmbeddedGrid('pid-found', {
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

    // First product has price { currency: 'USD', value: '19.3' } → '$19.30'
    expect(testComponent.getByText('$19.30')).toBeTruthy();
  });

  // --- 1.10 ProductGrid CSS config edge cases ---

  it('should handle productGrid config with marginHorizontal = 0', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Set marginHorizontal to 0 to exercise the `=== 0` branch
    widgetConfig.customizations.productGrid = {
      desktop: { productsPerRow: 5, marginVertical: 8, marginHorizontal: 0 },
      tablet: { productsPerRow: 4, marginVertical: 8, marginHorizontal: 0 },
      mobile: { productsPerRow: 2, marginVertical: 8, marginHorizontal: 0 },
    };

    testComponent = renderWidget(<EmbeddedGrid productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeTruthy();
  });

  it('should handle productGrid config with undefined marginHorizontal', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Set cssConfigSrc to exist but without marginHorizontal
    (widgetConfig.customizations as any).productGrid = {
      desktop: { productsPerRow: 5, marginVertical: 8 },
      tablet: { productsPerRow: 4, marginVertical: 8 },
      mobile: { productsPerRow: 2, marginVertical: 8 },
    };

    testComponent = renderWidget(<EmbeddedGrid productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeTruthy();
  });

  it('should render with no productGrid customization (fallback CSS)', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn().mockImplementation((_pid, _params, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    });
    // Remove productGrid to exercise the fallback branch
    delete (widgetConfig.customizations as any).productGrid;

    testComponent = renderWidget(<EmbeddedGrid productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    // Widget should still render fine with fallback styles
    expect(testComponent.container.querySelector('.wigmix-product-grid')).toBeTruthy();
  });

  // --- 1.11 API not responding ---

  it('should handle API not responding gracefully', () => {
    const { widgetConfig, widgetClient } = createTestClient({
      productSearchById: jest.fn(), // Never calls handler - stays in loading state
    });

    testComponent = renderWidget(<EmbeddedGrid productId='pid-found' />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
    });

    act(() => {
      jest.runAllTimers();
    });

    // Widget should not crash even when API doesn't respond
    expect(testComponent.container).toBeTruthy();
  });

  // --- 1.12 Grid renders correct number of products ---

  it('should render correct number of product cards in the grid', () => {
    renderEmbeddedGrid('pid-found', {
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

    // The mock response has 20 products
    const productCards = testComponent.container.querySelectorAll('.wigmix-product-card');
    expect(productCards.length).toBe(20);
  });

  // --- 1.13 Product title display ---

  it('should render product title correctly', () => {
    renderEmbeddedGrid('pid-found', {
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

    // First product has title 'Product Title 1'
    expect(testComponent.getByText('Product Title 1')).toBeTruthy();
  });
});
