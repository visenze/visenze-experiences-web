import { act, fireEvent, render, type RenderResult } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import SlideOutDrawer from './slide-out-drawer';
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

describe('slide-out-drawer', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      widgetTitle: 'Similar Search 532',
      searchBarButton: 'Show Me',
      searchBarPlaceholder: 'This is a search bar',
      errorDescription: 'Houston, we\'ve had a problem!',
      back: 'Exit',
      triggerCTA: 'CTA',
      similarProductButton: 'Similar Products',
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
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should not render the icon if configured as such', () => {
    widgetConfig.customizations.popup!.triggerIcon!.hide = true;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render a custom icon if configured as such', () => {
    widgetConfig.customizations.popup!.triggerIcon.url = 'https://trigger-icon';
    widgetConfig.customizations.popup!.triggerIcon.color = 'DEFAULT_ICON_COLOR';
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should open the popup when icon is clicked and display error message if API error occurred', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          pid: 'pid-1',
          qinfo: true,
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
              <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
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
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          pid: 'pid-1',
          qinfo: true,
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
              <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    let modal = testComponent.queryByTestId('wigmix-modal');
    expect(modal).toBeNull();

    act(() => {
      widgetClient.openWidget('pid-1');
    });

    modal = testComponent.queryByTestId('wigmix-modal');
    expect(modal).not.toBeNull();
  });

  it('should render a successful response with default config in desktop view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          pid: 'pid-1',
          qinfo: true,
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          pid: 'pid-1',
          qinfo: true,
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
              <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
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
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_slide_out_drawer', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          pid: 'pid-1',
          qinfo: true,
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          pid: 'pid-1',
          qinfo: true,
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
                <SlideOutDrawer pid='pid-1' renderModalWithoutPortal={true} />
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

    expect(testComponent.baseElement).toMatchSnapshot();
  });
});
