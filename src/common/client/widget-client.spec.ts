import type { ViSearchClient } from 'visearch-javascript-sdk';
import getWidgetClient from './widget-client';
import type { WidgetConfig } from '../wigmix-core';

describe('widget-client multisearch dispatch', () => {
  const makeClient = (msApiId?: string): {
    multi: jest.Mock;
    complementary: jest.Mock;
    outfit: jest.Mock;
    multisearch: ReturnType<typeof getWidgetClient>['multisearch'];
  } => {
    const multi = jest.fn();
    const complementary = jest.fn();
    const outfit = jest.fn();
    const config = {
      appSettings: { appKey: 'test-app-key', placementId: '1234', msApiId },
      callbacks: {},
      disableAnalytics: true,
    } as unknown as WidgetConfig;
    const client = getWidgetClient(config, 'wigmix_test', 'VERSION', () => ({
      setKeys: jest.fn(),
      productMultisearch: multi,
      productMultisearchComplementary: complementary,
      productMultisearchOutfitRecommendations: outfit,
    } as Partial<ViSearchClient> as ViSearchClient));
    return { multi, complementary, outfit, multisearch: client.multisearch };
  };

  const noop = (): void => {};

  afterEach(() => {
    delete (window as any).visenzeConfigs;
  });

  it('routes to productMultisearch when msApiId is "1"', () => {
    const c = makeClient('1');
    c.multisearch({ im_url: 'x' }, noop, noop);
    expect(c.multi).toHaveBeenCalledTimes(1);
    expect(c.complementary).not.toHaveBeenCalled();
    expect(c.outfit).not.toHaveBeenCalled();
  });

  it('routes to productMultisearchComplementary when msApiId is "2"', () => {
    const c = makeClient('2');
    c.multisearch({ im_url: 'x' }, noop, noop);
    expect(c.complementary).toHaveBeenCalledTimes(1);
    expect(c.multi).not.toHaveBeenCalled();
    expect(c.outfit).not.toHaveBeenCalled();
  });

  it('routes to productMultisearchOutfitRecommendations when msApiId is "3"', () => {
    const c = makeClient('3');
    c.multisearch({ im_url: 'x' }, noop, noop);
    expect(c.outfit).toHaveBeenCalledTimes(1);
    expect(c.multi).not.toHaveBeenCalled();
    expect(c.complementary).not.toHaveBeenCalled();
  });

  it('defaults to productMultisearch when msApiId is blank/absent', () => {
    const c = makeClient('');
    c.multisearch({ im_url: 'x' }, noop, noop);
    expect(c.multi).toHaveBeenCalledTimes(1);
    expect(c.complementary).not.toHaveBeenCalled();
    expect(c.outfit).not.toHaveBeenCalled();
  });

  it('routes using manual msApiId over appSettings.msApiId', () => {
    (window as any).visenzeConfigs = { 1234: { appSettings: { msApiId: '2' } } };
    const c = makeClient('3');
    c.multisearch({ im_url: 'x' }, noop, noop);
    expect(c.complementary).toHaveBeenCalledTimes(1);
    expect(c.outfit).not.toHaveBeenCalled();
    expect(c.multi).not.toHaveBeenCalled();
  });

  it('ignores blank manual msApiId so appSettings.msApiId can route', () => {
    (window as any).visenzeConfigs = { 1234: { appSettings: { msApiId: ' ' } } };
    const c = makeClient('3');
    c.multisearch({ im_url: 'x' }, noop, noop);
    expect(c.outfit).toHaveBeenCalledTimes(1);
    expect(c.complementary).not.toHaveBeenCalled();
    expect(c.multi).not.toHaveBeenCalled();
  });
});
