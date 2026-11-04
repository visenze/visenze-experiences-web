import { act, renderHook } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import type { ProductSearchResponseSuccess } from 'visearch-javascript-sdk';
import useRecommendationMultiSearch from './use-recommendation-multisearch';
import { getStandardRecommendationSuccessResponse } from '../../../../mocks/responses';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';
import type { WidgetConfig } from '../../wigmix-core';

const getOutfitResponse = (overrides: Record<string, any> = {}): ProductSearchResponseSuccess => ({
  ...getStandardRecommendationSuccessResponse(),
  product_info: undefined,
  query_tmp_url: 'https://query-tmp-url',
  qinfo: {
    product_id: 'query-pid',
    main_image_url: 'https://query-main-image',
    data: { title: 'Query Title' },
    best_images: [{ type: 'outfit', url: 'https://best-outfit-image', index: '0' }],
  },
  ...overrides,
} as ProductSearchResponseSuccess);

const renderOutfitHook = (
  response: ProductSearchResponseSuccess | undefined,
  searchSettings: Record<string, any> = {},
  productId = 'query-pid',
  imageUrl?: string,
): { result: ReturnType<typeof renderHook<ReturnType<typeof useRecommendationMultiSearch>, unknown>>['result']; outfit: jest.Mock; routed: jest.Mock } => {
  const widgetConfig = createWidgetConfig({} as WidgetConfig['customizations']);
  widgetConfig.searchSettings = searchSettings;
  const outfit = jest.fn().mockImplementation((_params, handler) => response && handler(response));
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_test', { productMultisearchOutfitRecommendations: outfit });
  const routed = jest.fn();
  widgetClient.multisearchRouter = routed;
  const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>{children}</WidgetDataContext.Provider>
  );
  const { result } = renderHook(() => useRecommendationMultiSearch({ productId, imageUrl, useOutfitReference: true }), { wrapper });
  return { result, outfit, routed };
};

describe('useRecommendationMultiSearch with useOutfitReference', () => {
  it('always calls the outfit API and not the router', () => {
    const { outfit, routed } = renderOutfitHook(getOutfitResponse());
    expect(outfit).toHaveBeenCalledTimes(1);
    expect(routed).not.toHaveBeenCalled();
  });

  it('requests qinfo, a temporary query url and the best outfit image attribute', () => {
    const { outfit } = renderOutfitHook(getOutfitResponse());
    expect(outfit.mock.calls[0][0]).toMatchObject({
      pid: 'query-pid', qinfo: true, return_query_temp_url: true, sys_attrs_to_get: 'best_outfit_img_url',
    });
  });

  it('keeps the required params when searchSettings tries to override them', () => {
    const { outfit } = renderOutfitHook(getOutfitResponse(), { qinfo: false, return_query_temp_url: false, sys_attrs_to_get: 'best_prod_img_url' });
    const params = outfit.mock.calls[0][0];
    expect(params).toMatchObject({ qinfo: true, return_query_temp_url: true });
    expect(params.sys_attrs_to_get.split(',').sort()).toEqual(['best_outfit_img_url', 'best_prod_img_url']);
  });

  it('forwards boi_only only when configured', () => {
    expect(renderOutfitHook(getOutfitResponse()).outfit.mock.calls[0][0]).not.toHaveProperty('boi_only');
    expect(renderOutfitHook(getOutfitResponse(), { boi_only: true }).outfit.mock.calls[0][0]).toMatchObject({ boi_only: true });
  });

  it('uses the best outfit image, then the permanent main image as reference for a product query', () => {
    expect(renderOutfitHook(getOutfitResponse()).result.current.referenceImageUrl).toBe('https://best-outfit-image');
    const noBest = getOutfitResponse({ qinfo: { product_id: 'q', main_image_url: 'https://query-main-image', best_images: [] } });
    // the signed query_tmp_url expires, so a product query prefers the permanent main image
    expect(renderOutfitHook(noBest).result.current.referenceImageUrl).toBe('https://query-main-image');
    const noMain = getOutfitResponse({ qinfo: { product_id: 'q', best_images: [] } });
    expect(renderOutfitHook(noMain).result.current.referenceImageUrl).toBe('https://query-tmp-url');
  });

  it('falls through empty strings to the next reference image candidate', () => {
    const empty = getOutfitResponse({
      query_tmp_url: '',
      qinfo: { product_id: 'q', main_image_url: 'https://query-main-image', best_images: [], sys: { best_outfit_img_url: '' } },
    });
    expect(renderOutfitHook(empty).result.current.referenceImageUrl).toBe('https://query-main-image');
    expect(renderOutfitHook(empty, {}, '', 'https://img/query.jpg').result.current.referenceImageUrl).toBe('https://query-main-image');
  });

  it('shows every object of an outfit response and does not crash without results', () => {
    const [first, second, third] = getStandardRecommendationSuccessResponse().result ?? [];
    const grouped = getOutfitResponse({ result: undefined, objects: [{ result: [first, second] }, { result: [third] }] });
    expect(renderOutfitHook(grouped).result.current.productResults).toHaveLength(3);
    expect(renderOutfitHook(getOutfitResponse({ result: undefined, objects: [] })).result.current.productResults).toEqual([]);
    expect(renderOutfitHook(getOutfitResponse({ result: undefined, objects: undefined })).result.current.productResults).toEqual([]);
  });

  it('exposes the query product (qinfo) as productInfo', () => {
    expect(renderOutfitHook(getOutfitResponse()).result.current.productInfo?.product_id).toBe('query-pid');
  });

  it('is loading until a response arrives, and idle without a product id', () => {
    expect(renderOutfitHook(undefined).result.current.isLoading).toBe(true);
    expect(renderOutfitHook(getOutfitResponse()).result.current.isLoading).toBe(false);
    expect(renderOutfitHook(undefined, {}, '').result.current.isLoading).toBe(false);
  });

  it('clears the previous caption when a response has no query product', () => {
    const response = getOutfitResponse({ qinfo: undefined });
    expect(renderOutfitHook(response).result.current.productInfo).toBeUndefined();
  });

  it('is not loading for a response with no results', () => {
    expect(renderOutfitHook(getOutfitResponse({ result: [] })).result.current.isLoading).toBe(false);
  });

  it('is not loading for a non-OK response status', () => {
    expect(renderOutfitHook(getOutfitResponse({ status: 'warn' })).result.current.isLoading).toBe(false);
  });

  it('clears the previous outfit while a new query is in flight', () => {
    const widgetConfig = createWidgetConfig({} as WidgetConfig['customizations']);
    let respond: (res: ProductSearchResponseSuccess) => void = () => undefined;
    const outfit = jest.fn().mockImplementation((_params, handler) => { respond = handler; });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_test', { productMultisearchOutfitRecommendations: outfit });
    const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>{children}</WidgetDataContext.Provider>
    );
    const { result, rerender } = renderHook(({ pid }) => useRecommendationMultiSearch({ productId: pid, useOutfitReference: true }), {
      wrapper, initialProps: { pid: 'a' },
    });
    act(() => respond(getOutfitResponse()));
    expect(result.current.productResults.length).toBeGreaterThan(0);
    rerender({ pid: 'b' });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.productResults).toEqual([]);
    expect(result.current.referenceImageUrl).toBe('');
    expect(result.current.productInfo).toBeUndefined();
  });

  it('queries by image when there is no product id, and shows the temporary query image', () => {
    const response = getOutfitResponse({ qinfo: { product_id: '', data: {}, best_images: [] } });
    const { result, outfit } = renderOutfitHook(response, {}, '', 'https://img/query.jpg');
    const params = outfit.mock.calls[0][0];
    expect(params).toMatchObject({ im_url: 'https://img/query.jpg', qinfo: true, return_query_temp_url: true });
    expect(params).not.toHaveProperty('pid');
    expect(result.current.referenceImageUrl).toBe('https://query-tmp-url');
  });

  it('does not search again when only the image url changes while a product id is set', () => {
    const widgetConfig = createWidgetConfig({} as WidgetConfig['customizations']);
    const outfit = jest.fn();
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_test', { productMultisearchOutfitRecommendations: outfit });
    const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>{children}</WidgetDataContext.Provider>
    );
    const { rerender } = renderHook(({ im }) => useRecommendationMultiSearch({ productId: 'a', imageUrl: im, useOutfitReference: true }), {
      wrapper, initialProps: { im: 'https://img/1.jpg' },
    });
    rerender({ im: 'https://img/2.jpg' });
    expect(outfit).toHaveBeenCalledTimes(1);
  });

  it('prefers the product id over the image url', () => {
    const { outfit } = renderOutfitHook(getOutfitResponse(), {}, 'query-pid', 'https://img/query.jpg');
    expect(outfit.mock.calls[0][0]).toMatchObject({ pid: 'query-pid' });
    expect(outfit.mock.calls[0][0]).not.toHaveProperty('im_url');
  });

  it('ignores the answer of a superseded request', () => {
    const widgetConfig = createWidgetConfig({} as WidgetConfig['customizations']);
    const handlers: Array<(res: ProductSearchResponseSuccess) => void> = [];
    const outfit = jest.fn().mockImplementation((_params, handler) => { handlers.push(handler); });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_test', { productMultisearchOutfitRecommendations: outfit });
    const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>{children}</WidgetDataContext.Provider>
    );
    const { result, rerender } = renderHook(({ pid }) => useRecommendationMultiSearch({ productId: pid, useOutfitReference: true }), {
      wrapper, initialProps: { pid: 'a' },
    });
    rerender({ pid: 'b' });
    act(() => handlers[0](getOutfitResponse()));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.productResults).toEqual([]);
    act(() => handlers[1](getOutfitResponse()));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.productResults.length).toBeGreaterThan(0);
  });
});
