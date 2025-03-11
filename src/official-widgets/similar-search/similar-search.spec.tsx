import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import SimilarSearch from './similar-search';
import {
  getStandardMultiSearchAutocompleteResponse,
  getStandardMultiSearchInvalidImageResponse,
  getStandardMultiSearchSuccessResponse,
} from '../../../mocks/responses';
import getWidgetClient from '../../common/client/widget-client';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('similar-search', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      widgetTitle: 'Similar Search 532',
      searchBarPlaceholder: 'This is a search bar',
      previousViews: 'History',
      errorDescription: 'Houston, we\'ve had a problem!',
      back: 'Exit',
    },
  };
  const mockVisearchClient: ViSearchClient = {
    setKeys: jest.fn(),
    productSearchById: jest.fn(),
  } as Partial<ViSearchClient> as ViSearchClient;
  let widgetConfig: WidgetConfig;

  const originalWarn = console.warn.bind(console.warn);

  beforeAll(() => {
    console.warn = (msg): void => {
      // Silence warning messages from React-Modal
      if (!msg.toString().includes('React-Modal: "parentSelector" prop')) {
        originalWarn(msg);
      }
    };
  });

  afterAll(() => {
    console.warn = originalWarn;
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

    const modalPortals = document.querySelectorAll('.ReactModalPortal');
    modalPortals.forEach((modalPortal) => modalPortal.parentNode!.removeChild(modalPortal));
  });

  it('should render the standard icon', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should not render the icon if configured as such', () => {
    widgetConfig.customizations.popup!.triggerIcon!.hide = true;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render a custom icon if configured as such', () => {
    widgetConfig.customizations.popup!.triggerIcon.url = 'https://trigger-icon';
    widgetConfig.customizations.popup!.triggerIcon.color = 'DEFAULT_ICON_COLOR';
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should open the popup when icon is clicked and display error message if API error occurred', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'test-imurl',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    expect(testComponent.baseElement).toMatchSnapshot();

    // Upon clicking back button, modal should close

    act(() => {
      const backButton = testComponent.getByTestId('wigmix-back');
      backButton.click();

      // Wait for the modal to close
      jest.advanceTimersByTime(500);
    });

    // Second snapshot to verify the remnants of the ReactModal classes after being closed
    expect(testComponent.baseElement).toMatchSnapshot();
  });

  it('should open the popup when programmatically called', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'test-imurl',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    let modal = testComponent.queryByTestId('wigmix-modal');
    expect(modal).toBeNull();

    act(() => {
      widgetClient.openWidget('test-imurl');
    });

    modal = testComponent.queryByTestId('wigmix-modal');
    expect(modal).not.toBeNull();
  });

  it('should render a successful response with default config in desktop view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'test-imurl',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          im_url: 'test-imurl',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    expect(testComponent.baseElement).toMatchSnapshot();

    // Upon clicking close button, modal should close

    act(() => {
      const closeButton = testComponent.getByTestId('wigmix-close-button');
      closeButton.click();

      // Wait for the modal to close
      jest.advanceTimersByTime(500);
    });

    const modal = testComponent.queryByTestId('wigmix-modal');
    // Check against a class name that is indicative of a closed modal
    expect(modal!.className).toContain('ReactModal__Content--before-close');
  });

  it('should render a successful response with default config in mobile view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'test-imurl',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          im_url: 'test-imurl',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <ResponsiveContext.Provider value={{ width: 600 }}>
                <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
              </ResponsiveContext.Provider>
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    act(() => {
      const fullResultsToggleButton = testComponent.getByTestId('wigmix-full-results-toggle');
      fullResultsToggleButton.click();
    });

    expect(testComponent.baseElement).toMatchSnapshot();
  });

  it('should show find similar results successfully', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-imurl') {
          handler(getStandardMultiSearchSuccessResponse());
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
      productMultisearchAutocomplete: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

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
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-imurl') {
          handler(getStandardMultiSearchSuccessResponse());
        } else if (params.pid === 'pid-5') {
          handler(getStandardMultiSearchInvalidImageResponse());
        } else {
          // Fail; other parameter combinations are not expected here
          expect(true).toBeFalsy();
        }
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((_, handler) => {
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

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

    expect(testComponent.getByText('Houston, we\'ve had a problem!')).not.toBeNull();

    act(() => {
      const backButton = testComponent.getByTestId('wigmix-back');
      backButton.click();

      // Wait for the modal to close
      jest.advanceTimersByTime(500);
    });

    // Check that the previous result view is restored
    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${idx + 1}`);
    });
  });

  it('should show text query results successfully', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_similar_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'test-imurl') {
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
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SimilarSearch imUrl='test-imurl' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const textBar = testComponent.getByTestId('wigmix-text-bar');
      fireEvent.change(textBar, { target: { value: 'jeans' } });
      fireEvent.keyDown(textBar, { code: 'Enter' });
    });

    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${scrambledOrder[idx] + 1}`);
    });
  });

  // TODO add test for clicking on search history
});
