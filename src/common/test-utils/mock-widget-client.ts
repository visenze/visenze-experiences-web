import type { ViSearchClient } from 'visearch-javascript-sdk';
import getWidgetClient from '../client/widget-client';
import type { WidgetClient, WidgetConfig } from '../wigmix-core';

/**
 * Creates a base mock ViSearchClient with all methods stubbed as jest.fn().
 * Override individual methods as needed in your tests.
 */
export const createMockVisearchClient = (overrides: Partial<ViSearchClient> = {}): ViSearchClient =>
    ({
        setKeys: jest.fn(),
        productSearchById: jest.fn(),
        productMultisearch: jest.fn(),
        productMultisearchAutocomplete: jest.fn(),
        productRecommendations: jest.fn(),
        ...overrides,
    }) as Partial<ViSearchClient> as ViSearchClient;

/**
 * Builds a WidgetConfig with sensible test defaults. Pass partial overrides
 * for any section (appSettings, customizations, callbacks, etc.).
 */
export const createWidgetConfig = (
    customizationsDefaults: WidgetConfig['customizations'],
    overrides: Partial<WidgetConfig> = {},
): WidgetConfig => ({
    appSettings: {
        appKey: 'test-app-key',
        placementId: '1234',
        ...overrides.appSettings,
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
        ...overrides.displaySettings,
    },
    searchSettings: {
        ...overrides.searchSettings,
    },
    trackingSettings: {
        ...overrides.trackingSettings,
    },
    languageSettings: {
        locale: '',
        currency: '',
        ...overrides.languageSettings,
    },
    callbacks: {
        ...overrides.callbacks,
    },
    customizations: overrides.customizations
        ? JSON.parse(JSON.stringify(overrides.customizations))
        : JSON.parse(JSON.stringify(customizationsDefaults)),
    disableAnalytics: overrides.disableAnalytics ?? true,
});

/**
 * Creates a fully wired WidgetClient backed by a mock ViSearchClient.
 *
 * @param widgetConfig - Widget configuration (use `createWidgetConfig` to build one)
 * @param widgetType   - The wigmix widget type string, e.g. 'wigmix_buy_the_look'
 * @param visearchOverrides - Partial ViSearchClient to merge onto the base mock
 * @returns `{ widgetClient, mockVisearchClient }` so tests can spy on SDK calls
 */
export const createMockWidgetClient = (
    widgetConfig: WidgetConfig,
    widgetType: string,
    visearchOverrides: Partial<ViSearchClient> = {},
): { widgetClient: WidgetClient; mockVisearchClient: ViSearchClient } => {
    const mockVisearchClient = createMockVisearchClient(visearchOverrides);
    const widgetClient = getWidgetClient(widgetConfig, widgetType, 'VERSION', () => mockVisearchClient);
    return { widgetClient, mockVisearchClient };
};
