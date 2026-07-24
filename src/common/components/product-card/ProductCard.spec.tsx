import type { RenderResult } from '@testing-library/react';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ProductCard from './ProductCard';
import type { LanguagePack } from '../../locales/locale';
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
});
