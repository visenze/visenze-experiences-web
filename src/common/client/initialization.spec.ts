import { act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import { WidgetType, type WidgetClient, type WidgetConfig } from '../wigmix-core';
import { initWidgetFactory, populateProductDetailsAndAttrsToGet, setCssVariables, type WidgetInitOptions } from './initialization';
import ViSearch from 'visearch-javascript-sdk';
import { getChatSessionStore } from '../components/chat/session/chat-session-registry';

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

  describe('chat session lifecycle', () => {
    const buildChatClient = (): ReturnType<ReturnType<typeof initWidgetFactory>> => initWidgetFactory(
      WidgetType.CAMERA_SEARCH,
      '1.0.0',
      jest.fn(),
      false,
      defaultCustomizations(),
    )(widgetConfig, {}, true);

    it('rerender() drops the client\'s chat session, so the remounted widget starts a fresh one', () => {
      const widgetClient = buildChatClient();
      if (!widgetClient) throw new Error('no client');
      const store = getChatSessionStore(widgetClient);
      const dispose = jest.spyOn(store, 'dispose');
      widgetClient.rerender();
      expect(dispose).toHaveBeenCalledTimes(1);
      expect(getChatSessionStore(widgetClient)).not.toBe(store);
    });

    it('renderMissing() and hideWidget() keep the live chat session', () => {
      const widgetClient = buildChatClient();
      if (!widgetClient) throw new Error('no client');
      const store = getChatSessionStore(widgetClient);
      widgetClient.renderMissing();
      widgetClient.hideWidget();
      expect(getChatSessionStore(widgetClient)).toBe(store);
    });

    it('disposeWidget() drops the client\'s chat session', () => {
      const widgetClient = buildChatClient();
      if (!widgetClient) throw new Error('no client');
      const store = getChatSessionStore(widgetClient);
      widgetClient.disposeWidget();
      expect(getChatSessionStore(widgetClient)).not.toBe(store);
    });
  });

  describe('surface root', () => {
    const surfaceHosts = (): NodeListOf<Element> => document.querySelectorAll('[id^=\'vi_surface__\']');
    const addElement = (): HTMLElement => {
      const element = document.createElement('div');
      element.className = 'ps-widget-1234';
      document.body.appendChild(element);
      return element;
    };
    const entryRenderer = (): ReactNode => createElement('div', { 'data-testid': 'entry' });
    const surface = (): ReactNode => createElement('div', { 'data-testid': 'surface' });
    const buildSurfaceClient = (options?: WidgetInitOptions): WidgetClient => {
      widgetConfig.displaySettings.cssSelector = '';
      let client: WidgetClient | undefined;
      act(() => {
        client = initWidgetFactory(
          WidgetType.AI_ASSISTANT,
          '1.0.0',
          entryRenderer,
          true,
          defaultCustomizations(),
          options,
        )(widgetConfig, {}, false);
      });
      if (!client) throw new Error('no client');
      return client;
    };
    let clients: WidgetClient[] = [];
    const track = (client: WidgetClient): WidgetClient => {
      clients.push(client);
      return client;
    };

    afterEach(() => {
      act(() => clients.forEach((client) => client.disposeWidget()));
      clients = [];
      document.body.innerHTML = '';
    });

    it('mounts exactly one surface host on document.body next to the element roots', () => {
      addElement();
      addElement();
      const client = track(buildSurfaceClient({ surface }));
      expect(surfaceHosts()).toHaveLength(1);
      expect(surfaceHosts()[0]?.parentElement).toBe(document.body);
      expect(client.getRenderRoots()).toHaveLength(3);
      expect(client.getRenderStatus()).toBe('RENDERED');
    });

    it('creates no surface host when there are no elements to serve', () => {
      const client = track(buildSurfaceClient({ surface }));
      expect(surfaceHosts()).toHaveLength(0);
      expect(client.getRenderRoots()).toHaveLength(0);
      expect(client.getRenderStatus()).toBe('UNRENDERED');
    });

    it('rerender() replaces the surface host, never leaving two', () => {
      addElement();
      const client = track(buildSurfaceClient({ surface }));
      const before = surfaceHosts()[0];
      act(() => client.rerender());
      expect(surfaceHosts()).toHaveLength(1);
      expect(surfaceHosts()[0]).not.toBe(before);
      expect(client.getRenderRoots()).toHaveLength(2);
    });

    it('disposeWidget() removes the surface host', () => {
      addElement();
      const client = buildSurfaceClient({ surface });
      expect(surfaceHosts()).toHaveLength(1);
      act(() => client.disposeWidget());
      expect(surfaceHosts()).toHaveLength(0);
    });

    it('renderMissing() keeps the existing surface host and renders the new element', () => {
      addElement();
      const client = track(buildSurfaceClient({ surface }));
      const before = surfaceHosts()[0];
      const added = addElement();
      act(() => client.renderMissing());
      expect(surfaceHosts()).toHaveLength(1);
      expect(surfaceHosts()[0]).toBe(before);
      expect(client.getRenderRoots()).toHaveLength(3);
      expect(added.querySelector('[data-testid=\'entry\']')).not.toBeNull();
    });

    it('markAsRendered ignores the surface root once the elements are gone', () => {
      const element = addElement();
      const client = track(buildSurfaceClient({ surface }));
      expect(surfaceHosts()).toHaveLength(1);
      element.remove();
      act(() => client.rerender());
      expect(surfaceHosts()).toHaveLength(0);
      expect(client.getRenderStatus()).toBe('UNRENDERED');
      act(() => client.renderMissing());
      expect(client.getRenderStatus()).toBe('UNRENDERED');
    });

    it('creates no surface host for a widget initialised without options', () => {
      addElement();
      const client = track(buildSurfaceClient());
      expect(surfaceHosts()).toHaveLength(0);
      expect(client.getRenderRoots()).toHaveLength(1);
      expect(client.getRenderStatus()).toBe('RENDERED');
    });
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
