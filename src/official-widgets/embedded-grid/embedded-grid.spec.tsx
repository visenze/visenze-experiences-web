import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import EmbeddedGrid from './embedded-grid';
import {
  getStandardRecommendationPidNotFoundResponse,
  getStandardRecommendationSuccessResponse,
} from '../../../mocks/responses';
import getWidgetClient from '../../common/client/widget-client';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('embedded-grid', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      widgetTitle: 'Embedded Grid 103',
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
  });

  it('should not render anything if product is not found', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_grid', 'VERSION', () => ({
      ...mockVisearchClient,
      productSearchById: jest.fn().mockImplementation((pid, params, handler) => {
        expect(pid).toBe('pid-not-found');
        expect(params).toEqual({
          return_product_info: true,
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
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedGrid productId='pid-not-found' />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render a successful response with default config', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_grid', 'VERSION', () => ({
      ...mockVisearchClient,
      productSearchById: jest.fn().mockImplementation((pid, params, handler) => {
        expect(pid).toBe('pid-found');
        expect(params).toEqual({
          return_product_info: true,
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
        handler(getStandardRecommendationSuccessResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedGrid productId='pid-found' />
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

  it('should render a successful response with some customizations', () => {
    widgetConfig.customizations.generalLayout.showWidgetTitle = false;
    widgetConfig.customizations.generalLayout.showViSenzeLogo = true;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_embedded_grid', 'VERSION', () => ({
      ...mockVisearchClient,
      productSearchById: jest.fn().mockImplementation((_, __, handler) => {
        handler(getStandardRecommendationSuccessResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <EmbeddedGrid productId='pid-found' />
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
});
