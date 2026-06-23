import type { ViSearchClient } from 'visearch-javascript-sdk';
import { WidgetType, type WidgetConfig } from '../wigmix-core';
import { initWidgetFactory } from './initialization';
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
});
