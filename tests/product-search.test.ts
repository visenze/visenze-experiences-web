import * as _ from 'lodash';
import { WidgetClient } from '../src/common/wigmix-core';
import getWidgetClient from '../src/common/client/product-search';
import DEFAULT_CONFIGS from '../src/default-configs';

let mockCallback: jest.Mock;
let mockReject: jest.Mock;
let productsearch: WidgetClient;
let productsearch2: WidgetClient;
const mockUUID = 'mock-uuid';
const mockQueryId = 'mock-query-id';

const config1 = _.cloneDeep(DEFAULT_CONFIGS);
config1.appSettings.placementId = '111';

const config2 = _.cloneDeep(DEFAULT_CONFIGS);
config2.appSettings.placementId = '112';

const mockGetQueryId = jest.fn((callback: any) => {
  callback(mockQueryId);
});
const mockGetUuid = jest.fn((callback: any) => {
  callback(mockUUID);
});

beforeEach(() => {
  mockCallback = jest.fn();
  mockReject = jest.fn();
  productsearch = getWidgetClient({
    config: config1,
    widgetType: undefined,
    widgetDirectory: '/',
    deployTypeId: undefined,
  });
  productsearch2 = getWidgetClient({
    config: config2,
    widgetType: undefined,
    widgetDirectory: '/',
    deployTypeId: undefined,
    debugMode: false,
    disableAnalytics: true,
  });
  localStorage.clear();
  localStorage.setItem('visenze_last_click_query_id_111', mockQueryId);

  jest.spyOn(productsearch.visearch, 'getLastQueryId').mockImplementation(mockGetQueryId);
  jest.spyOn(productsearch.visearch, 'generateUuid').mockImplementation(mockGetUuid);
  jest.spyOn(productsearch.visearch, 'sendEvent').mockImplementation(jest.fn());

  jest.spyOn(productsearch2.visearch, 'getLastQueryId').mockImplementation(mockGetQueryId);
  jest.spyOn(productsearch2.visearch, 'generateUuid').mockImplementation(mockGetUuid);
  jest.spyOn(productsearch2.visearch, 'sendEvent').mockImplementation(jest.fn());
});

describe('get query id methods', () => {
  test('getLastQueryId', async () => {
    const result = await productsearch.getLastQueryId();
    expect(result).toBe(mockQueryId);
  });

  test('getLastClickQueryId', () => {
    const result = productsearch.getLastClickQueryId();
    expect(result).toBe(mockQueryId);
  });

  test('getLastClickQueryId none', () => {
    localStorage.clear();
    const result = productsearch.getLastClickQueryId();
    expect(result).toBe('none');
  });
});

describe('sendEvent', () => {
  test('disabled analytics', () => {
    productsearch2.send('product_click', {}, mockCallback, mockReject);
    expect(productsearch2.visearch.getLastQueryId).toHaveBeenCalledTimes(0);
    expect(productsearch2.visearch.sendEvent).toHaveBeenCalledTimes(0);
  });

  test('auto append last clicked query id', async () => {
    const params: Record<string, any> = {};
    await productsearch.send('product_click', params, mockCallback, mockReject);
    expect(params.queryId).toBe(mockQueryId);
    expect(productsearch.visearch.getLastQueryId).toHaveBeenCalledTimes(0);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(1);
  });

  test('auto append none when no last click', async () => {
    localStorage.clear();
    const params: Record<string, any> = {};
    await productsearch.send('product_click', params, mockCallback, mockReject);

    expect(params.queryId).toBe('none');
    expect(productsearch.visearch.getLastQueryId).toHaveBeenCalledTimes(0);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(1);
  });
});

describe('sendEvents', () => {
  beforeEach(() => {
    jest.spyOn(productsearch.visearch, 'sendEvent').mockImplementation(jest.fn());
  });

  test('disabled analytics', () => {
    productsearch2.sendEvents('transaction', [{}], mockCallback, mockReject);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(0);
  });

  test('other events, should not auto append transId', () => {
    const event1: Record<string, any> = {};
    const events = [event1];
    productsearch.sendEvents('product_click', events, mockCallback, mockReject);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(1);
    expect(event1.transId).toBeUndefined();
    productsearch.sendEvents('product_view', events, mockCallback, mockReject);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(2);
    expect(event1.transId).toBeUndefined();
    productsearch.sendEvents('add_to_cart', events, mockCallback, mockReject);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(3);
    expect(event1.transId).toBeUndefined();
    productsearch.sendEvents('custom-event', events, mockCallback, mockReject);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(4);
    expect(event1.transId).toBeUndefined();
  });

  test('transaction event, auto append transId', () => {
    const event1: Record<string, any> = {};
    const event2: Record<string, any> = { transId: 't1' };
    const event3: Record<string, any> = {};
    const events = [event1, event2, event3];
    productsearch.sendEvents('transaction', events, mockCallback, mockReject);
    expect(productsearch.visearch.sendEvent).toHaveBeenCalledTimes(3);
    expect(event1.transId).toBe(mockUUID);
    expect(event2.transId).toBe('t1');
    expect(event3.transId).toBe(mockUUID);
  });
});
