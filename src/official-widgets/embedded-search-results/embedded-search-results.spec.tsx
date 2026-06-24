import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import EmbeddedSearchResults from './embedded-search-results';
import {
  getStandardMultiSearchInvalidImageResponse,
  getStandardMultiSearchSuccessNoResultResponse,
  getStandardMultiSearchSuccessResponse,
  getStandardMultiSearchSuccessWithBoxResponse,
  getStandardMultiSearchSystemErrorResponse,
} from '../../../mocks/responses';
import getWidgetClient from '../../common/client/widget-client';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('embedded-search-result', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      filter: 'Filter',
      noResults: 'Cannot find results.',
      noResultsDescription: 'No products matching your search.',
      searchBarPlaceholder: 'What are you looking for?',
      noSearchInput: 'No search input available.',
      noSearchInputDescription: 'Enter a search term or select an image to find results matching your search.',
      imageOrQueryNotFound: 'You have provided an invalid image or query, please remove them and try again.',
      systemError: 'Sorry, our system is experiencing difficulties, please try again later.',
      price: '{price}',
      originalPrice: '{originalPrice}',
      discount: '{discount} off',
    },
  };
  const mockVisearchClient: ViSearchClient = {
    setKeys: jest.fn(),
  } as Partial<ViSearchClient> as ViSearchClient;
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
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

  it('should render successfully with query and im-url', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'test-im-url',
          facets: ['price', 'brand'],
          facets_show_count: true,
          limit: 24,
          page: 1,
          q: 'testQuery',
          return_fields_mapping: true,
          return_query_sys_meta: true,
          return_query_temp_url: true,
        });
        handler(getStandardMultiSearchSuccessWithBoxResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render successfully with query', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          facets: ['price', 'brand'],
          facets_show_count: true,
          limit: 24,
          page: 1,
          q: 'testQuery',
          return_fields_mapping: true,
          return_query_sys_meta: true,
          return_query_temp_url: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    // no need to test snapshot; it will be the same as query and im-url counterpart
  });

  it('should render successfully with im-url', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          facets: ['price', 'brand'],
          facets_show_count: true,
          limit: 24,
          page: 1,
          im_url: 'test-im-url',
          return_fields_mapping: true,
          return_query_sys_meta: true,
          return_query_temp_url: true,
        });
        handler(getStandardMultiSearchSuccessWithBoxResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='' imUrl='test-im-url' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    // no need to test snapshot; it will be the same as query and im-url counterpart

    const croppedSearchHistoryImage = testComponent.queryAllByTestId('wigmix-active-product-history-crop-image');
    expect(croppedSearchHistoryImage.length).toEqual(1);
  });

  it('should fail render with invalid im-url', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='' imUrl='test-im-url' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should fail render with system error', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchSystemErrorResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery=' ' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render with no results', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchSuccessNoResultResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='no_result' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should show find similar results successfully', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else if (params.pid === 'pid-5') {
          const standardResponse = getStandardMultiSearchSuccessResponse();
          // Just scramble the results
          standardResponse.result = scrambledOrder.map((i) => standardResponse.result![i]);
          handler(standardResponse);
        } else {
          // Fail; other parameter combinations are not expected here
          expect(true).toBeFalsy();
        }
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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
      const findSimilarButtons = testComponent.queryAllByTestId('wigmix-find-similar-button');
      findSimilarButtons[4].click();
    });

    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${scrambledOrder[idx] + 1}`);
    });
  });

  it('should show error message if find similar encounters error', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else if (params.pid === 'pid-5') {
          handler(getStandardMultiSearchSystemErrorResponse());
        } else {
          // Fail; other parameter combinations are not expected here
          expect(true).toBeFalsy();
        }
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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
      const findSimilarButtons = testComponent.queryAllByTestId('wigmix-find-similar-button');
      findSimilarButtons[4].click();
    });

    expect(testComponent.getByText('Sorry, our system is experiencing difficulties, please try again later.')).not.toBeNull();
  });

  it('should not re-trigger search when clearing an inactive search history', () => {
    let counter = 0;
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          counter += 1;
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else if (params.pid === 'pid-5') {
          counter += 1;
          const standardResponse = getStandardMultiSearchSuccessResponse();
          // Just scramble the results
          standardResponse.result = scrambledOrder.map((i) => standardResponse.result![i]);
          handler(standardResponse);
        } else {
          // Fail; other parameter combinations are not expected here
          expect(true).toBeFalsy();
        }
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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
      const findSimilarButtons = testComponent.queryAllByTestId('wigmix-find-similar-button');
      findSimilarButtons[4].click();
    });
    act(() => {
      const inactiveHistoryCloseButton = testComponent.queryAllByTestId('wigmix-inactive-product-close');
      inactiveHistoryCloseButton[0].click();
    });
    expect(counter).toEqual(2);
    const inactiveHistoryCloseButton = testComponent.queryAllByTestId('wigmix-inactive-product-close');
    expect(inactiveHistoryCloseButton.length).toEqual(1);
  });

  it('should re-trigger search text query when clearing an active search history and there is text query', () => {
    let counter = 0;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else if (params.q === 'testQuery') {
          counter += 1;
          handler(getStandardMultiSearchSuccessResponse());
        }
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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
      const activeHistoryCloseButton = testComponent.getByTestId('wigmix-active-product-close');
      activeHistoryCloseButton.click();
    });
    expect(counter).toEqual(2);
  });

  it('should return no search input when clearing an active search history and there is no text query', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else {
          handler(getStandardMultiSearchSuccessNoResultResponse());
        }
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='' imUrl='test-im-url' />
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
      const activeHistoryCloseButton = testComponent.getByTestId('wigmix-active-product-close');
      activeHistoryCloseButton.click();
    });
    expect(testComponent.getByText('No search input available.')).not.toBeNull();
  });

  it('should not do anything when clicking on active search history', () => {
    let counter = 0;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          counter += 1;
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else {
          // Fail; other parameter combinations are not expected here
          expect(true).toBeFalsy();
        }
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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
      const activeHistory = testComponent.getByTestId('wigmix-active-product');
      activeHistory.click();
    });
    expect(counter).toEqual(1);
  });

  it('should trigger a new search when clicking on inactive search history', () => {
    let counter = 0;
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url') {
          counter += 1;
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else if (params.pid === 'pid-5') {
          counter += 1;
          const standardResponse = getStandardMultiSearchSuccessResponse();
          // Just scramble the results
          standardResponse.result = scrambledOrder.map((i) => standardResponse.result![i]);
          handler(standardResponse);
        } else {
          // Fail; other parameter combinations are not expected here
          expect(true).toBeFalsy();
        }
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
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
      const findSimilarButtons = testComponent.queryAllByTestId('wigmix-find-similar-button');
      findSimilarButtons[4].click();
    });
    act(() => {
      const inactiveHistory = testComponent.queryAllByTestId('wigmix-inactive-product');
      inactiveHistory[0].click();
    });
    expect(counter).toEqual(3);

    // Active history should be replaced
    const activeHistoryImage = testComponent.getByTestId('wigmix-active-product-history-crop-image');
    expect(activeHistoryImage.querySelector('canvas')!.getAttribute('data-src')).toEqual('test-im-url');

    // The previously used image should be moved to inactive history
    const inactiveHistoryImages = testComponent.queryAllByTestId('wigmix-inactive-product-history-image');
    expect(inactiveHistoryImages.length).toEqual(1);
    expect(inactiveHistoryImages[0].getAttribute('src')).toEqual('https://main-image-5');

    // Verify that the results go back to the unscrambled order
    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${idx + 1}`);
    });
  });

  it('should apply filter successfully in desktop view', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        const resp = getStandardMultiSearchSuccessWithBoxResponse();
        if (params.filters) {
          expect(params.filters).toEqual(['brand:"brand_1"']);
          // Scramble the results
          resp.result = scrambledOrder.map((i) => resp.result![i]);
        }
        resp.facets = [
          {
            key: 'brand',
            items: [
              {
                value: 'brand_1',
                count: 30,
              },
              {
                value: 'brand_2',
                count: 10,
              },
              {
                value: 'brand_3',
                count: 5,
              },
            ],
          },
        ];
        handler(resp);
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedSearchResults textQuery='' imUrl='test-im-url' />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const brandFilter = testComponent.getByTestId('wigmix-filter-brand');
      brandFilter.click();
    });

    act(() => {
      const brandFilterValues = testComponent.queryAllByTestId('wigmix-filter-checkbox');
      brandFilterValues[0].click();
    });

    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${scrambledOrder[idx] + 1}`);
    });
  });

  // TODO mobile view filter is not yet tested as accordion doesn't play well with jest testing
  // (https://github.com/heroui-inc/heroui/issues/4893)
  // Consider moving out of heroui accordion.

  it('should show text query results successfully', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-im-url' && !params.q) {
          // Initial image search
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else if (params.q === 'jeans') {
          // Text query
          expect(params).toEqual({
            facets: ['price', 'brand'],
            facets_show_count: true,
            q: 'jeans',
            im_url: 'test-im-url',
            box: '131,223,600,852',
            page: 1,
            limit: 24,
            return_fields_mapping: true,
            return_query_sys_meta: true,
            return_query_temp_url: true,
          });
          const standardResponse = getStandardMultiSearchSuccessResponse();
          // Just scramble the results
          standardResponse.result = scrambledOrder.map((i) => standardResponse.result![i]);
          handler(standardResponse);
        }
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedSearchResults textQuery='' imUrl='test-im-url' />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const textBar = testComponent.getByTestId('wigmix-text-bar');
      fireEvent.change(textBar, { target: { value: 'jeans' } });
      fireEvent.keyDown(textBar, { key: 'Enter' });
    });

    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${scrambledOrder[idx] + 1}`);
    });
  });

  it('calls productMultisearchOutfitRecommendations when msApiId is "3"', () => {
    widgetConfig.appSettings.msApiId = '3';
    const productMultisearch = jest.fn();
    const productMultisearchOutfitRecommendations = jest.fn().mockImplementation((_, handler) => {
      handler(getStandardMultiSearchSuccessResponse());
    });
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch,
      productMultisearchOutfitRecommendations,
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    expect(productMultisearchOutfitRecommendations).toHaveBeenCalledTimes(1);
    expect(productMultisearch).not.toHaveBeenCalled();
  });
});
