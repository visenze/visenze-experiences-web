import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import SearchBar from './search-bar';
import {
  getStandardMultiSearchAutocompleteResponse, getStandardMultiSearchInvalidImageResponse,
  getStandardMultiSearchSuccessResponse,
} from '../../../mocks/responses';
import getWidgetClient from '../../common/client/widget-client';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';
import { DEFAULT_CUSTOMIZATIONS } from '../camera-search/default-config';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('search-bar', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      searchBarPlaceholder: 'What are you looking for?',
      uploadScreenTitle: "SHOW US WHAT YOU'RE LOOKING FOR",
      dragImageToSearch: 'drag an image to search or click to browse',
      tapToSearchImage: 'tap here to search an image',
      tapProductGallery: 'or tap our trending product gallery below',
      relatedProducts: 'Related products',
      recentSearches: 'Recent searches',
      suggestions: 'Suggestions',
      viewAllProducts: 'View all products',
      errorMessage: 'WE HAVE A PROBLEM HERE!',
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

  it('should render the search bar', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => mockVisearchClient);
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <SearchBar textQuery='' imUrl='' renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render upload image modal', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation(),
      productMultisearchAutocomplete: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <SearchBar textQuery='test' imUrl='' renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-sb-gallery-button');
      popupTriggerButton.click();
    });

    expect(testComponent.baseElement).toMatchSnapshot();

    // Upon clicking close button, modal should close

    act(() => {
      const closeButton = testComponent.getByTestId('wigmix-sb-close-button');
      closeButton.click();

      // Wait for the modal to close
      jest.advanceTimersByTime(500);
    });

    const modal = testComponent.queryByTestId('wigmix-modal');
    // Check against a class name that is indicative of a closed modal
    expect(modal!.className).toContain('ReactModal__Content--before-close');
  });

  it('should search query successfully', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'https://cdn.visenze.com/images/widget-3.jpg') {
          // Initial image search
          handler(getStandardMultiSearchSuccessResponse());
        } else if (params.q === 'jeans') {
          // Text query
          expect(params).toEqual({
            q: 'jeans',
            im_id: 'im_id1234567890',
            page: 1,
            limit: 20,
            get_all_fl: true,
            return_fields_mapping: true,
            return_query_sys_meta: true,
          });
          const standardResponse = getStandardMultiSearchSuccessResponse();
          // Just scramble the results
          standardResponse.result = scrambledOrder.map((i) => standardResponse.result![i]);
          handler(standardResponse);
        }
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <SearchBar textQuery='test' imUrl='' renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    const searchBar = testComponent.queryByTestId('wigmix-sb-search-bar-input');
    expect(searchBar).toBeDefined();
    act(() => {
      searchBar!.click();
      fireEvent.change(searchBar!, { target: { value: 'jeans' } });
      fireEvent.keyDown(searchBar!, { code: 'Enter' });
    });
    expect(searchBar!.getAttribute('value')).toBe('jeans');
    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${scrambledOrder[idx] + 1}`);
    });
  });

  it('should show error message when API call returns error', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <SearchBar textQuery='' imUrl='test-invalid-url' renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    const searchBar = testComponent.queryByTestId('wigmix-sb-search-bar-input');
    expect(searchBar).toBeDefined();
    act(() => {
      searchBar!.click();
      fireEvent.change(searchBar!, { target: { value: 'jeans' } });
      fireEvent.keyDown(searchBar!, { code: 'Enter' });
    });
    expect(searchBar!.getAttribute('value')).toBe('jeans');
    expect(testComponent.getByText('WE HAVE A PROBLEM HERE!')).not.toBeNull();
  });
});
