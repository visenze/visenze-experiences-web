import type { RenderResult } from '@testing-library/react';
import { act, fireEvent, render, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ProductCard from './ProductCard';
import { COMMON_TEXTS, type LanguagePack } from '../../locales/locale';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import type { WidgetClient, WidgetConfig } from '../../wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('ProductCard', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      price: '{price}',
      originalPrice: '{originalPrice}',
      discount: '{discount} off',
    },
  };
  const testProduct: ProcessedProduct = {
    product_id: 'test_pid',
    im_url: 'test_image_url',
    price_field: {
      value: 100,
      currency: 'USD',
    },
    title_field: 'product_title',
    brand_field: 'product_brand',
    product_url_field: 'https://test_product_url',
  };
  const widgetClient = {
    placementId: 1234,
    sendEvent: jest.fn(),
  } as Partial<WidgetClient> as WidgetClient;
  const defaultCustomizations = (): WidgetConfig['customizations'] => ({
    productCard: {
      title: {
        show: true,
        fieldSource: 'title',
      },
      price: {
        show: true,
      },
      secondaryTitle: {
        show: false,
        fieldSource: 'brand',
      },
    },
  } as WidgetConfig['customizations']);
  let widgetConfig: WidgetConfig;
  let localStorageSetItemSpy: jest.SpyInstance;
  let sendEventSpy: jest.SpyInstance;

  beforeAll(() => {
    localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    sendEventSpy = jest.spyOn(widgetClient, 'sendEvent');
  });

  beforeEach(() => {
    widgetConfig = {
      appSettings: {
        appKey: 'test-app-key',
        placementId: '1234',
      },
      displaySettings: {
        cssSelector: '.test-selector',
        productDetails: {
          price: 'price_field',
          title: 'title_field',
          brand: 'brand_field',
          original_price: 'original_price_field',
          product_url: 'product_url_field',
        },
      },
      searchSettings: {},
      trackingSettings: {},
      languageSettings: {
        locale: '',
        currency: '',
      },
      callbacks: {},
      customizations: defaultCustomizations(),
      disableAnalytics: true,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render with standard fields', () => {
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={testProduct}
                         metadata={{}}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={false}
                         hasFindSimilar={false}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render with standard fields, find similar enabled, with zero original price', () => {
    widgetConfig.customizations.productCard!.findSimilar = {
      enable: true,
      position: 'top_right',
    } as any;
    widgetConfig.customizations.productCard!.originalPrice = {
      show: true,
      position: 'AFTER',
      strikethrough: true,
    } as any;
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={{
                           ...testProduct,
                           original_price_field: {
                             currency: 'USD',
                             value: 0,
                           },
                         }}
                         metadata={{}}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={false}
                         hasFindSimilar={true}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    // load the image
    const productCardImage = testComponent.getByTestId('wigmix-product-card-image');
    fireEvent.load(productCardImage);

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render with standard fields, find similar enabled with custom icon, with original price field', () => {
    widgetConfig.customizations.productCard!.findSimilar = {
      enable: true,
      position: 'bottom_right',
      icon: {
        url: 'https://test_find_similar_icon_url',
        color: '#000000',
      },
    } as any;
    widgetConfig.customizations.productCard!.originalPrice = {
      show: true,
      position: 'AFTER',
      strikethrough: true,
    } as any;
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={{
                           ...testProduct,
                           original_price_field: {
                             currency: 'USD',
                             value: 125,
                           },
                         }}
                         metadata={{}}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={false}
                         hasFindSimilar={true}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    // load the image
    const productCardImage = testComponent.getByTestId('wigmix-product-card-image');
    fireEvent.load(productCardImage);

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render with secondary title field, price fields with custom color', () => {
    widgetConfig.customizations.productCard!.secondaryTitle.show = true;
    widgetConfig.customizations.productCard!.originalPrice = {
      show: true,
      fontColor: '#FF0000',
      position: 'AFTER',
      strikethrough: true,
    } as any;
    widgetConfig.customizations.productCard!.price.fontColor = '#0000FF';
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={{
                           ...testProduct,
                           original_price_field: {
                             currency: 'USD',
                             value: 125,
                           },
                         }}
                         metadata={{}}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={false}
                         hasFindSimilar={false}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    // load the image
    const productCardImage = testComponent.getByTestId('wigmix-product-card-image');
    fireEvent.load(productCardImage);

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render with all fields hidden, open in new tabs', () => {
    widgetConfig.customizations.productCard!.price.show = false;
    widgetConfig.customizations.productCard!.title.show = false;
    widgetConfig.customizations.productCard!.openLinksInNewTab = true;
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={testProduct}
                         metadata={{}}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={false}
                         hasFindSimilar={false}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    // load the image
    const productCardImage = testComponent.getByTestId('wigmix-product-card-image');
    fireEvent.load(productCardImage);

    // With title and price hidden the link renders no visible text, so it must still expose
    // an accessible name via the fallback aria-label.
    const productCardAnchor = testComponent.getByTestId('wigmix-product-card-anchor');
    expect(productCardAnchor.getAttribute('aria-label')).toBe('View product');

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should not add fallback aria-label when only original price is visible', () => {
    widgetConfig.customizations.productCard!.title.show = false;
    widgetConfig.customizations.productCard!.originalPrice = {
      show: true,
      position: 'AFTER',
      strikethrough: true,
    } as any;
    const productWithoutPrice = {
      ...testProduct,
      price_field: undefined,
      original_price_field: {
        currency: 'USD',
        value: 125,
      },
    } as ProcessedProduct;

    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={productWithoutPrice}
                         metadata={{}}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={false}
                         hasFindSimilar={false}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    const productCardAnchor = testComponent.getByTestId('wigmix-product-card-anchor');
    expect(productCardAnchor.getAttribute('aria-label')).toBeNull();
  });

  it('should send tracking events when clicking on product card', () => {
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={testProduct}
                         metadata={{
                           queryId: 'test-query-id',
                         }}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={true}
                         hasFindSimilar={false}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    // load the image
    const productCardImage = testComponent.getByTestId('wigmix-product-card-image');
    fireEvent.load(productCardImage);

    const productCardAnchor = testComponent.getByTestId('wigmix-product-card-anchor');
    productCardAnchor.click();

    expect(localStorageSetItemSpy).toHaveBeenNthCalledWith(1, 'visenze_widget_last_click', '{"placement_id":1234,"queryId":"test-query-id"}');
    expect(localStorageSetItemSpy).toHaveBeenNthCalledWith(2, 'visenze_last_click_query_id_1234', 'test-query-id');
    expect(sendEventSpy).toHaveBeenNthCalledWith(1, 'product_click', {
      pid: 'test_pid',
      pos: 1,
      productUrl: 'https://test_product_url',
      queryId: 'test-query-id',
    });
  });

  it('should trigger find similar event when clicking on find similar button, tracking events should not be sent', () => {
    widgetConfig.customizations.productCard!.findSimilar = {
      enable: true,
      position: 'top_left',
    } as any;
    const onFindSimilar = jest.fn();
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient,
          widgetConfig,
          darkMode: false,
          locale: 'en',
        }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ProductCard result={testProduct}
                         metadata={{
                           queryId: 'test-query-id',
                         }}
                         isInWishlist={false}
                         setIsInWishlist={() => {}}
                         index={0}
                         isRecommendation={true}
                         hasFindSimilar={true}
                         onFindSimilar={onFindSimilar}
                         pwPrefix='ut' />
          </IntlProvider>
        </WidgetDataContext.Provider>,
    );

    // load the image
    const productCardImage = testComponent.getByTestId('wigmix-product-card-image');
    fireEvent.load(productCardImage);

    const findSimilarButton = testComponent.getByTestId('wigmix-find-similar-button');
    findSimilarButton.click();

    expect(onFindSimilar).toHaveBeenNthCalledWith(1, {
      imgUrl: testProduct.im_url,
      pid: testProduct.product_id,
    });
    // Tracking events should not be sent
    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
    expect(sendEventSpy).not.toHaveBeenCalled();
  });

  describe('add to cart', () => {
    // Opens the option drop-down with the given label and picks a value, as a shopper would.
    const chooseOption = (container: HTMLElement, label: string, value: string): void => {
      fireEvent.click(within(container).getByRole('combobox', { name: label }));
      fireEvent.click(within(container).getByRole('option', { name: value }));
    };

    const renderCard = (product: ProcessedProduct = testProduct): void => {
      testComponent = render(
          <WidgetDataContext.Provider value={{
            widgetClient,
            widgetConfig,
            darkMode: false,
            locale: 'en',
          }}>
            <IntlProvider messages={{ ...texts['en'], ...COMMON_TEXTS['en'], addToCart: 'Add to cart' }} locale='en' defaultLocale='en'>
              <ProductCard result={product}
                           metadata={{ queryId: 'test-query-id' }}
                           isInWishlist={false}
                           setIsInWishlist={() => {}}
                           index={0}
                           isRecommendation={false}
                           hasFindSimilar={false}
                           pwPrefix='ut' />
            </IntlProvider>
          </WidgetDataContext.Provider>,
      );
    };

    beforeEach(() => {
      widgetConfig.customizations.productCard!.addToCart = { enable: true, layout: 'TEXT', color: '', colorDark: '' };
      widgetConfig.displaySettings.productDetails['sizes'] = 'size_field';
    });

    it('calls onAddToCartToggle directly and does not send add_to_cart when options are disabled', async () => {
      const onAddToCartToggle = jest.fn(() => Promise.resolve(true));
      widgetConfig.callbacks.onAddToCartToggle = onAddToCartToggle;
      renderCard({ ...testProduct, size_field: ['8', '9'] });

      await act(async () => {
        fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      });

      expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'test_pid', expect.objectContaining({ product_id: 'test_pid' }));
      expect(testComponent.queryByTestId('wigmix-add-to-cart-options')).toBeNull();
      expect(sendEventSpy).not.toHaveBeenCalledWith('add_to_cart', expect.anything());
    });

    it('resets the loading state when onAddToCartToggle throws', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      widgetConfig.callbacks.onAddToCartToggle = jest.fn(() => Promise.reject(new Error('cart down')));
      renderCard();

      await act(async () => {
        fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      });

      expect(testComponent.getByTestId('wigmix-add-to-cart-button').textContent).toBe('Add to cart');
    });

    it('opens the options panel and passes the selected options when options are enabled', async () => {
      const onAddToCartToggle = jest.fn(() => Promise.resolve(true));
      widgetConfig.callbacks.onAddToCartToggle = onAddToCartToggle;
      widgetConfig.customizations.productCard!.addToCart!.options = {
        enable: true,
        fields: [{ field: 'sizes', label: 'Size', layout: 'CAROUSEL', callbackKey: 'size' }],
      };
      renderCard({ ...testProduct, size_field: ['9', '8'] });

      fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      expect(onAddToCartToggle).not.toHaveBeenCalled();
      expect(testComponent.getByTestId('wigmix-add-to-cart-options')).toBeTruthy();

      fireEvent.click(testComponent.getByRole('radio', { name: '8' }));
      await act(async () => {
        fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-options-confirm'));
      });

      expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'test_pid', expect.objectContaining({ product_id: 'test_pid' }), { size: '8' });
      expect(sendEventSpy).not.toHaveBeenCalledWith('add_to_cart', expect.anything());
      expect(testComponent.queryByTestId('wigmix-add-to-cart-options')).toBeNull();
    });

    it('shows the options in a modal that closes on a backdrop click', () => {
      widgetConfig.callbacks.onAddToCartToggle = jest.fn(() => Promise.resolve(true));
      widgetConfig.customizations.productCard!.addToCart!.options = {
        enable: true,
        fields: [{ field: 'sizes', layout: 'CAROUSEL' }],
      };
      renderCard({ ...testProduct, size_field: ['8', '9'] });

      fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      expect(testComponent.getByRole('dialog')).toBeTruthy();

      fireEvent.mouseDown(testComponent.getByTestId('wigmix-add-to-cart-options-modal'));
      expect(testComponent.queryByTestId('wigmix-add-to-cart-options-modal')).toBeNull();
      expect(widgetConfig.callbacks.onAddToCartToggle).not.toHaveBeenCalled();
    });

    it('passes an option callbackKey of pid through to the callback as-is', async () => {
      widgetConfig.callbacks.onAddToCartToggle = jest.fn(() => Promise.resolve(true));
      widgetConfig.customizations.productCard!.addToCart!.options = {
        enable: true,
        fields: [{ field: 'sizes', layout: 'CAROUSEL', callbackKey: 'pid' }],
      };
      renderCard({ ...testProduct, size_field: ['8', '9'] });

      fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      fireEvent.click(testComponent.getByRole('radio', { name: '8' }));
      await act(async () => {
        fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-options-confirm'));
      });

      expect(widgetConfig.callbacks.onAddToCartToggle).toHaveBeenCalledWith(true, 'test_pid', expect.anything(), { pid: '8' });
    });

    it('does not open the options modal when there is no onAddToCartToggle callback', () => {
      widgetConfig.customizations.productCard!.addToCart!.options = {
        enable: true,
        fields: [{ field: 'sizes', layout: 'CAROUSEL' }],
      };
      renderCard({ ...testProduct, size_field: ['8', '9'] });

      fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      expect(testComponent.queryByTestId('wigmix-add-to-cart-options-modal')).toBeNull();
      expect(sendEventSpy).not.toHaveBeenCalledWith('add_to_cart', expect.anything());
    });

    it('shows no option fields on the card; Add to Cart opens the pop-up with only the fields the product has', async () => {
      const onAddToCartToggle = jest.fn(() => Promise.resolve(true));
      widgetConfig.callbacks.onAddToCartToggle = onAddToCartToggle;
      widgetConfig.displaySettings.productDetails['colors'] = 'color_field';
      widgetConfig.customizations.productCard!.addToCart!.options = {
        enable: true,
        fields: [
          { field: 'sizes', label: 'Size', layout: 'CAROUSEL', callbackKey: 'size' },
          { field: 'width_field', label: 'Width', layout: 'RADIO' },
          { field: 'colors', label: 'Colour', layout: 'DROPDOWN', callbackKey: 'color' },
        ],
      };
      renderCard({ ...testProduct, size_field: ['8', '9'], color_field: ['Black', 'White'] });

      // Nothing on the card itself.
      expect(testComponent.queryByRole('combobox')).toBeNull();
      expect(testComponent.queryByRole('radiogroup')).toBeNull();

      fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      const dialog = testComponent.getByRole('dialog');
      expect(within(dialog).getByRole('radiogroup', { name: 'Size' })).toBeTruthy();
      expect(within(dialog).queryByText('Width')).toBeNull();
      chooseOption(dialog, 'Colour', 'White');
      fireEvent.click(within(dialog).getByRole('radio', { name: '9' }));
      await act(async () => {
        fireEvent.click(within(dialog).getByTestId('wigmix-add-to-cart-options-confirm'));
      });

      expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'test_pid', expect.anything(), { size: '9', color: 'White' });
      expect(testComponent.queryByRole('dialog')).toBeNull();
    });

    it('adds to cart directly when the product has no values for any option field', async () => {
      const onAddToCartToggle = jest.fn(() => Promise.resolve(true));
      widgetConfig.callbacks.onAddToCartToggle = onAddToCartToggle;
      widgetConfig.customizations.productCard!.addToCart!.options = {
        enable: true,
        fields: [{ field: 'sizes', layout: 'CAROUSEL' }],
      };
      renderCard();

      await act(async () => {
        fireEvent.click(testComponent.getByTestId('wigmix-add-to-cart-button'));
      });

      expect(onAddToCartToggle).toHaveBeenCalledWith(true, 'test_pid', expect.objectContaining({ product_id: 'test_pid' }));
      expect(testComponent.queryByTestId('wigmix-add-to-cart-options')).toBeNull();
    });
  });
});
