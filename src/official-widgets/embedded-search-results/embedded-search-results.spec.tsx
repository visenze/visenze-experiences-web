import { render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import EmbeddedSearchResults from './embedded-search-results';
import {
  getStandardMultiSearchInvalidImageResponse, getStandardMultiSearchSuccessNoResultResponse,
  getStandardMultiSearchSuccessResponse, getStandardMultiSearchSystemErrorResponse,
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
    },
  };
  const mockVisearchClient: ViSearchClient = {
    setKeys: jest.fn(),
    productSearchById: jest.fn(),
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

  it('should render successfully with query and imurl', () => {
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
        handler(getStandardMultiSearchSuccessResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='test-im-url' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
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
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='testQuery' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
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
        handler(getStandardMultiSearchSuccessResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='' imUrl='test-im-url' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should fail render with invalid im-url', () => {
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
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
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
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          facets: ['price', 'brand'],
          facets_show_count: true,
          limit: 24,
          page: 1,
          q: ' ',
          return_fields_mapping: true,
          return_query_sys_meta: true,
          return_query_temp_url: true,
        });
        handler(getStandardMultiSearchSystemErrorResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery=' ' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should fail render with system error', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_search_results', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          facets: ['price', 'brand'],
          facets_show_count: true,
          limit: 24,
          page: 1,
          q: 'no_result',
          return_fields_mapping: true,
          return_query_sys_meta: true,
          return_query_temp_url: true,
        });
        handler(getStandardMultiSearchSuccessNoResultResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <EmbeddedSearchResults textQuery='no_result' imUrl='' />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });
});
