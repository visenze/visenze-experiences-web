import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import InPageCarouselV3 from './in-page-carousel-v3';
import {
  getStandardMultiSearchPidNotFoundResponse,
  getStandardMultiSearchSuccessResponse,
} from '../../../mocks/responses';
import getWidgetClient from '../../common/client/widget-client';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('in-page-carousel-v3', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      widgetTitle: 'In Page Carousel',
      showMore: 'Show More',
      showLess: 'Show Less',
      price: '{price}',
      originalPrice: '{originalPrice}',
      discount: '{discount} off',
    },
  };
  const mockVisearchClient: ViSearchClient = {
    setKeys: jest.fn(),
    productSearchById: jest.fn(),
  } as Partial<ViSearchClient> as ViSearchClient;
  let widgetConfig: WidgetConfig;

  beforeEach(() => {
    widgetConfig = {
      appSettings: {
        appKey: 'test-app-key',
        placementId: '1234',
      },
      displaySettings: {
        cssSelector: '.test-selector',
        productDetails: {
          price: 'price',
          title: 'title',
          brand: 'brand',
          original_price: 'original_price',
          product_url: 'product_url',
        },
      },
      searchSettings: {},
      trackingSettings: {},
      languageSettings: {
        locale: '',
        currency: '',
      },
      callbacks: {},
      customizations: JSON.parse(JSON.stringify(DEFAULT_CUSTOMIZATIONS)),
      disableAnalytics: true,
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not render anything if product is not found', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_in_page_carousel_v3', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          pid: 'pid-not-found',
          limit: 20,
          sort_by: '',
          facets: ['price', 'brand'],
          facets_show_count: true,
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchPidNotFoundResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <InPageCarouselV3 productId='pid-not-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render a successful response with default config (carousel view)', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_in_page_carousel_v3', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          pid: 'pid-found',
          limit: 20,
          sort_by: '',
          facets: ['price', 'brand'],
          facets_show_count: true,
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <InPageCarouselV3 productId='pid-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

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

  it('should toggle between carousel and grid view when Show More/Less is clicked', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_in_page_carousel_v3', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchSuccessResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <InPageCarouselV3 productId='pid-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    // Start in carousel view
    expect(testComponent.getByTestId('ipcv3-product-result-carousel')).not.toBeNull();
    // Click Show More
    act(() => {
      fireEvent.click(testComponent.getByRole('button', { name: /show more/i }));
    });
    // Should now show grid
    expect(testComponent.getByTestId('ipcv3-product-result-grid')).not.toBeNull();
    // Run snapshot test here as the grid view can only be achieved from here
    expect(testComponent.asFragment()).toMatchSnapshot();
    // Click Show Less
    act(() => {
      fireEvent.click(testComponent.getByRole('button', { name: /show less/i }));
    });
    // Should return to carousel
    expect(testComponent.getByTestId('ipcv3-product-result-carousel')).not.toBeNull();
  });

  it('should render a successful response with some customizations (footer, no title)', () => {
    widgetConfig.customizations.generalLayout.showWidgetTitle = false;
    widgetConfig.customizations.generalLayout.showViSenzeLogo = true;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_in_page_carousel_v3', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchSuccessResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <InPageCarouselV3 productId='pid-found' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    // Check horizontal scroll rendered
    expect(testComponent.getByTestId('ipcv3-product-result-carousel')).not.toBeNull();
    // Widget title should not be rendered
    expect(testComponent.queryAllByTestId('ipcv3-widget-title').length).toEqual(0);
    // Show More button should be present
    expect(testComponent.getByRole('button', { name: /show more/i })).not.toBeNull();
  });
});
