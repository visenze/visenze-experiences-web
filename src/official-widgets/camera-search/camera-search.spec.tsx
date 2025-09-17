import { act, fireEvent, render, type RenderResult, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import CameraSearch from './camera-search';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import {
  getStandardMultiSearchAutocompleteResponse,
  getStandardMultiSearchInvalidImageResponse,
  getStandardMultiSearchSuccessResponse,
  getStandardMultiSearchSuccessWithBoxResponse,
} from '../../../mocks/responses';
import getWidgetClient from '../../common/client/widget-client';
import { RootContext } from '../../common/components/shadow-wrapper';
import type { LanguagePack } from '../../common/locales/locale';
import { WidgetDataContext } from '../../common/types/contexts';
import type { WidgetConfig } from '../../common/wigmix-core';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('camera-search', () => {
  let testComponent: RenderResult;
  const texts: LanguagePack = {
    en: {
      uploadScreenTitle: 'Camera Search 771',
      resultScreenTitle: 'Camera Search 117',
      dragImageToSearch: 'drag this',
      tapToSearchImage: 'tap this',
      tapProductGallery: 'product gallery',
      searchBarPlaceholder: 'This is a search bar',
      previousViews: 'History',
      errorDescription: 'Houston, we\'ve had a problem!',
      back: 'Exit',
      triggerCTA: 'CTA',
      useCamera: 'Take a photo',
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
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should not render the icon if configured as such', () => {
    widgetConfig.customizations.popup!.triggerIcon!.hide = true;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render a custom icon if configured as such', () => {
    widgetConfig.customizations.popup!.triggerIcon.url = 'https://trigger-icon';
    widgetConfig.customizations.popup!.triggerIcon.color = 'DEFAULT_ICON_COLOR';
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => mockVisearchClient);
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should open the popup when programmatically called', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
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
              <CameraSearch renderModalWithoutPortal={true} />
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

  it('should render the gallery in desktop view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
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

  it('should render the gallery in mobile view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <ResponsiveContext.Provider value={{ width: 600 }}>
                <CameraSearch renderModalWithoutPortal={true} />
              </ResponsiveContext.Provider>
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
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

  it('should render a successful response with default config in desktop view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'https://cdn.visenze.com/sample/sunset.jpg',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          im_url: 'https://cdn.visenze.com/sample/sunset.jpg',
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
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    expect(testComponent.baseElement).toMatchSnapshot();
  });

  it('should render a successful response with default config in mobile view', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'https://cdn.visenze.com/sample/sunset.jpg',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          im_url: 'https://cdn.visenze.com/sample/sunset.jpg',
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
                <CameraSearch renderModalWithoutPortal={true} />
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
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
    });

    act(() => {
      const fullResultsToggleButton = testComponent.getByTestId('wigmix-full-results-toggle');
      fullResultsToggleButton.click();
    });

    expect(testComponent.baseElement).toMatchSnapshot();
  });

  it('should display error message if API error occurred when clicking gallery image', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          im_url: 'https://cdn.visenze.com/sample/sunset.jpg',
          return_fields_mapping: true,
          return_query_sys_meta: true,
        });
        handler(getStandardMultiSearchInvalidImageResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params).toEqual({
          q: '',
          im_url: 'https://cdn.visenze.com/sample/sunset.jpg',
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
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
    });

    // Upon clicking back button, should go back to gallery page

    act(() => {
      const backButton = testComponent.getByTestId('wigmix-back');
      backButton.click();

      // Wait for the modal to close
      jest.advanceTimersByTime(500);
    });

    // Second snapshot to verify the remnants of the ReactModal classes after being closed
    const galleryImage = testComponent.queryByTestId('wigmix-gallery-image-3');
    expect(galleryImage).not.toBeNull();
  });

  // TODO test configurations

  it('should render a successful response after uploading image in desktop view', async () => {
    // Due to usage of FileReader, need to simulate with real timer
    jest.useRealTimers();

    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchSuccessWithBoxResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
        <RootContext.Provider value={document.body}>
          <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
            <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    const makeMockData = (files: File[]): any => ({
        dataTransfer: {
          files,
          items: files.map((file) => ({
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          })),
          types: ['Files'],
        },
      });

    const fileInput = testComponent.getByTestId('wigmix-cs-upload-icon-dropzone');
    const testFile = new File(['image-content'], 'test-file.png', { type: 'image/png' });

    act(() => {
      fireEvent.drop(fileInput, makeMockData([testFile]));
    });

    await waitFor(async () => {
      // Advance time for the FileReader onload function to fire
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    }).catch(() => {
      // Expected to encounter timeout error here; swallow the exception as the test can proceed harmlessly after this
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
    productCardImages.forEach((productCardImage, idx) => {
      expect(productCardImage.getAttribute('src')).toEqual(`https://main-image-${idx + 1}`);
    });

    // There should be one active and one inactive cropped image each
    const activeSearchCropImage = testComponent.queryAllByTestId('wigmix-active-product-crop');
    expect(activeSearchCropImage.length).toEqual(1);
    const inactiveSearchCropImage = testComponent.queryAllByTestId('wigmix-inactive-product-crop');
    expect(inactiveSearchCropImage.length).toEqual(1);
  });

  it('should show find similar results successfully', () => {
    const scrambledOrder = [9, 4, 1, 12, 13, 0, 19, 17, 16, 5, 8, 2, 10, 3, 11, 14, 15, 7, 18, 6];
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
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
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
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

    // Active history should be replaced
    const activeHistory = testComponent.queryAllByTestId('wigmix-active-product');
    expect(activeHistory.length).toEqual(1);
    expect(activeHistory[0].getAttribute('src')).toEqual('https://main-image-5');

    // The previously used gallery image should be moved to inactive history
    const inactiveHistory = testComponent.queryAllByTestId('wigmix-inactive-product');
    expect(inactiveHistory.length).toEqual(1);
    expect(inactiveHistory[0].getAttribute('src')).toEqual('https://cdn.visenze.com/sample/sunset.jpg');
  });

  it('should show error message if find similar encounters error', () => {
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
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
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
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
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
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
              <CameraSearch renderModalWithoutPortal={true} />
            </IntlProvider>
          </WidgetDataContext.Provider>
        </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
    });

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

  it('should re-trigger search when clicking on inactive history desktop and tablet view', () => {
    let counter = 0;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        counter += 1;
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else {
          handler(getStandardMultiSearchSuccessResponse());
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
            <CameraSearch renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
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

    act(() => {
      const inactiveHistory = testComponent.queryAllByTestId('wigmix-inactive-product-crop');
      inactiveHistory[0].click();
    });

    expect(counter).toEqual(4);
  });

  it('should not re-trigger search when clicking on active history desktop and tablet view', () => {
    let counter = 0;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        counter += 1;
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else {
          handler(getStandardMultiSearchSuccessResponse());
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
            <CameraSearch renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    act(() => {
      const popupTriggerButton = testComponent.getByTestId('wigmix-popup-trigger-button');
      popupTriggerButton.click();
    });

    act(() => {
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
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

    act(() => {
      const activeHistory = testComponent.getByTestId('wigmix-active-product');
      activeHistory.click();
    });

    expect(counter).toEqual(2);
  });

  it('should not re-trigger search when clicking on active history mobile view', () => {
    let counter = 0;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        counter += 1;
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else {
          handler(getStandardMultiSearchSuccessResponse());
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
            <ResponsiveContext.Provider value={{ width: 600 }}>
              <CameraSearch renderModalWithoutPortal={true} />
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
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
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

    act(() => {
      const fullToggleButton = testComponent.getByTestId('wigmix-full-results-toggle');
      fullToggleButton.click();
    });

    act(() => {
      const activeHistory = testComponent.getByTestId('wigmix-active-product');
      activeHistory.click();
    });

    expect(counter).toEqual(2);
  });

  it('should re-trigger search when clicking on inactive history mobile view', () => {
    let counter = 0;
    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_camera_search', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        counter += 1;
        if (params.im_url === 'https://cdn.visenze.com/sample/sunset.jpg') {
          handler(getStandardMultiSearchSuccessWithBoxResponse());
        } else {
          handler(getStandardMultiSearchSuccessResponse());
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
            <ResponsiveContext.Provider value={{ width: 600 }}>
              <CameraSearch renderModalWithoutPortal={true} />
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
      const galleryImage = testComponent.getByTestId('wigmix-gallery-image-3');
      galleryImage.click();
    });

    act(() => {
      const productCardImages = testComponent.queryAllByTestId('wigmix-product-card-image');
      productCardImages.forEach((productCardImage) => {
        fireEvent.load(productCardImage);
      });
    });

    act(() => {
      const findSimilarButtons = testComponent.queryAllByTestId('wigmix-find-similar-button');
      findSimilarButtons[1].click();
    });

    act(() => {
      const fullToggleButton = testComponent.getByTestId('wigmix-full-results-toggle');
      fullToggleButton.click();
    });

    act(() => {
      const inactiveHistory = testComponent.queryAllByTestId('wigmix-inactive-product-crop');
      inactiveHistory[0].click();
    });
    expect(counter).toEqual(4);
  });
});
