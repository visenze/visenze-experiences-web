import type { ViSearchClient } from 'visearch-javascript-sdk';
import { WidgetType, type WidgetConfig } from '../wigmix-core';
import { initWidgetFactory, populateProductDetailsAndAttrsToGet, setCssVariables } from './initialization';
import ViSearch from 'visearch-javascript-sdk';

const mockViSearchClient = {
  setKeys: jest.fn(),
  set: jest.fn(),
  sendEvent: jest.fn(),
  getLastQueryId: jest.fn((cb) => cb('mock-query-id')),
} as Partial<ViSearchClient> as ViSearchClient;

jest.mock('visearch-javascript-sdk', () => {
  const originalModule = jest.requireActual('visearch-javascript-sdk');

  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn(() => mockViSearchClient),
  };
});

describe('initialization', () => {
  let widgetConfig: WidgetConfig;

  const defaultCustomizations = (): WidgetConfig['customizations'] =>
    ({
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
      generalLayout: {
        darkModeDefault: false,
      },
    }) as WidgetConfig['customizations'];

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
      disableAnalytics: false,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildClient = (): void => {
    const widgetFactoryCallback = initWidgetFactory(
      WidgetType.CAMERA_SEARCH,
      '1.0.0',
      jest.fn(),
      false,
      defaultCustomizations(),
    );
    widgetFactoryCallback(widgetConfig, {}, false);
  };

  describe('cloud endpoint wiring (setKeys)', () => {
    afterEach(() => {
      delete (window as any).visenzeConfigs;
    });

    it('forwards cloud and omits endpoint when cloud is set and no manual endpoint', () => {
      widgetConfig.appSettings.cloud = 'aws';
      buildClient();
      const keys = (mockViSearchClient.setKeys as jest.Mock).mock.calls[0][0];
      expect(keys.cloud).toBe('aws');
      expect(keys.endpoint).toBeUndefined();
    });

    it('ignores the API endpoint when cloud is set', () => {
      widgetConfig.appSettings.cloud = 'azure';
      widgetConfig.appSettings.endpoint = 'https://api.example.com';
      buildClient();
      const keys = (mockViSearchClient.setKeys as jest.Mock).mock.calls[0][0];
      expect(keys.cloud).toBe('azure');
      expect(keys.endpoint).toBeUndefined();
    });

    it('forwards the manual endpoint over cloud (manual wins) and still forwards cloud', () => {
      (window as any).visenzeConfigs = { 1234: { appSettings: { endpoint: 'https://manual.example.com' } } };
      widgetConfig.appSettings.cloud = 'aws';
      buildClient();
      const keys = (mockViSearchClient.setKeys as jest.Mock).mock.calls[0][0];
      expect(keys.endpoint).toBe('https://manual.example.com');
      expect(keys.cloud).toBe('aws');
    });

    it('forwards the API endpoint when no cloud is set', () => {
      widgetConfig.appSettings.endpoint = 'https://api.example.com';
      buildClient();
      const keys = (mockViSearchClient.setKeys as jest.Mock).mock.calls[0][0];
      expect(keys.endpoint).toBe('https://api.example.com');
      expect(keys.cloud).toBeUndefined();
    });

    it('falls back to LEGACY_ENDPOINT with no cloud and no endpoint (today behavior)', () => {
      buildClient();
      const keys = (mockViSearchClient.setKeys as jest.Mock).mock.calls[0][0];
      expect(keys.endpoint).toBe('https://multimodal.search.rezolve.com');
      expect(keys.cloud).toBeUndefined();
    });
  });

  describe('populateProductDetailsAndAttrsToGet — add-to-cart options', () => {
    const withOptions = (): WidgetConfig => {
      widgetConfig.customizations.productCard = {
        ...widgetConfig.customizations.productCard,
        addToCart: {
          enable: true,
          layout: 'TEXT',
          color: '',
          colorDark: '',
          options: {
            enable: true,
            fields: [
              { field: 'sizes', layout: 'CAROUSEL' },
              { field: 'width_field', layout: 'RADIO' },
              { field: 'colors', layout: 'NONE' },
            ],
          },
        },
      } as WidgetConfig['customizations']['productCard'];
      return widgetConfig;
    };

    it('appends active option fields to auto-derived attrs_to_get', () => {
      const config = populateProductDetailsAndAttrsToGet(withOptions(), { sizes: 'size_field', colors: 'color_field' });
      expect(config.searchSettings['attrs_to_get']).toEqual(expect.arrayContaining(['size_field', 'width_field']));
      expect(config.searchSettings['attrs_to_get'].filter((attr: string) => attr === 'size_field')).toHaveLength(1);
    });

    it('appends active option fields to host-provided attrs_to_get', () => {
      const config = withOptions();
      config.searchSettings['attrs_to_get'] = ['title_field'];
      populateProductDetailsAndAttrsToGet(config, { sizes: 'size_field' });
      expect(config.searchSettings['attrs_to_get']).toEqual(['title_field', 'size_field', 'width_field']);
    });

    it('leaves host-provided attrs_to_get untouched when options are disabled', () => {
      widgetConfig.searchSettings['attrs_to_get'] = ['title_field'];
      populateProductDetailsAndAttrsToGet(widgetConfig, { sizes: 'size_field' });
      expect(widgetConfig.searchSettings['attrs_to_get']).toEqual(['title_field']);
    });
  });

  it('initWidgetFactory should send session_init event on callback', () => {
    const widgetFactoryCallback = initWidgetFactory(
      WidgetType.CAMERA_SEARCH,
      '1.0.0',
      jest.fn(),
      false,
      defaultCustomizations(),
    );

    const widgetClient = widgetFactoryCallback(widgetConfig, {}, false);
    expect(widgetClient).toBeDefined();
    expect(ViSearch).toHaveBeenCalledTimes(1);

    expect(mockViSearchClient.sendEvent).toHaveBeenCalledTimes(1);
    expect(mockViSearchClient.sendEvent).toHaveBeenCalledWith(
      'session_init',
      { queryId: 'none', widgetVersion: 'camera_search.1.0.0.js' },
      undefined,
      undefined,
    );
  });

  describe('setCssVariables — breadcrumbTrail.inactive', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('style');
    });

    it('sets the breadcrumbInactive text/background CSS variables from the light-mode colors', () => {
      const config = {
        customizations: {
          breadcrumbTrail: {
            inactive: {
              fontColor: '#111111',
              fontColorDark: '#222222',
              backgroundColor: '#333333',
              backgroundColorDark: '#444444',
            },
          },
        },
      } as unknown as WidgetConfig;

      setCssVariables(config, false);

      expect(document.documentElement.style.getPropertyValue('--wigmix-text-breadcrumbInactive')).toBe('#111111');
      expect(document.documentElement.style.getPropertyValue('--wigmix-background-breadcrumbInactive')).toBe('#333333');
    });

    it('sets the breadcrumbInactive text/background CSS variables from the dark-mode colors', () => {
      const config = {
        customizations: {
          breadcrumbTrail: {
            inactive: {
              fontColor: '#111111',
              fontColorDark: '#222222',
              backgroundColor: '#333333',
              backgroundColorDark: '#444444',
            },
          },
        },
      } as unknown as WidgetConfig;

      setCssVariables(config, true);

      expect(document.documentElement.style.getPropertyValue('--wigmix-text-breadcrumbInactive')).toBe('#222222');
      expect(document.documentElement.style.getPropertyValue('--wigmix-background-breadcrumbInactive')).toBe('#444444');
    });
  });
});
