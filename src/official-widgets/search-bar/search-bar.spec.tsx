import { act, fireEvent, render, type RenderResult, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
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
      searchBarPlaceholder: 'search',
      uploadScreenTitle: 'upload',
      dragImageToSearch: 'drag here',
      tapToSearchImage: 'tap here',
      tapProductGallery: 'tap to see images',
      relatedProducts: 'products related',
      recentSearches: 'searches related',
      suggestions: 'suggested',
      viewAllProducts: 'All products',
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

    const modalPortals = document.querySelectorAll('.ReactModalPortal');
    modalPortals.forEach((modalPortal) => modalPortal.parentNode!.removeChild(modalPortal));
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

  it('should render upload image modal in desktop view', () => {
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

  it('should render upload image modal in mobile view', () => {
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
            <ResponsiveContext.Provider value={{ width: 600 }}>
              <SearchBar textQuery='test' imUrl='' renderModalWithoutPortal={true} />
            </ResponsiveContext.Provider>
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
    const autocompleteResults = testComponent.queryAllByTestId('wigmix-sb-autocomplete-value');
    autocompleteResults.forEach((result, idx) => {
      expect(result.innerText).toEqual(`text${idx + 1}`);
    });
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

  it('should render a successful response after uploading image with search bar icon in desktop view', async () => {
    // Due to usage of FileReader, need to simulate with real timer
    jest.useRealTimers();

    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <SearchBar textQuery='' imUrl='' renderModalWithoutPortal={true} />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    act(() => {
      const galleryButton = testComponent.queryByTestId('wigmix-sb-gallery-button');
      galleryButton!.click();
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

    const fileInput = testComponent.getByTestId('wigmix-sb-image-upload-dropzone');
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
  });

  it('should render a successful response after uploading image with dropdown in mobile view', async () => {
    // Due to usage of FileReader, need to simulate with real timer
    jest.useRealTimers();

    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ResponsiveContext.Provider value={{ width: 600 }}>
              <SearchBar textQuery='' imUrl='' renderModalWithoutPortal={true} />
            </ResponsiveContext.Provider>
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    act(() => {
      const searchBar = testComponent.queryByTestId('wigmix-sb-search-bar-input');
      searchBar!.click();
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

    const fileInput = testComponent.getByTestId('wigmix-sb-image-upload-dropdown-dropzone');
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
  });

  it('should render a successful response after uploading image with dropdown in mobile view', async () => {
    // Due to usage of FileReader, need to simulate with real timer
    jest.useRealTimers();

    const widgetClient = getWidgetClient(widgetConfig, 'wigmix_search_bar', 'VERSION', () => ({
      ...mockVisearchClient,
      productMultisearch: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchSuccessResponse());
      }),
      productMultisearchAutocomplete: jest.fn().mockImplementation((params, handler) => {
        expect(params.image instanceof File);
        // No need to check other params as they are the same as the URL counterpart
        handler(getStandardMultiSearchAutocompleteResponse());
      }),
    }));
    testComponent = render(
      <RootContext.Provider value={document.body}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ResponsiveContext.Provider value={{ width: 600 }}>
              <SearchBar textQuery='' imUrl='' renderModalWithoutPortal={true} />
            </ResponsiveContext.Provider>
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    act(() => {
      const searchBar = testComponent.queryByTestId('wigmix-sb-search-bar-input');
      searchBar!.click();
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

    const fileInput = testComponent.getByTestId('wigmix-sb-image-upload-dropdown-dropzone');
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
  });
});
