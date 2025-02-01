import * as _ from 'lodash';
import { WidgetConfig } from '../src/common/wigmix-core';
import ResultLogicImpl from '../src/common/client/result-logic';
import getWidgetClient from '../src/common/client/widget-client';
import DEFAULT_CONFIGS from '../src/default-configs';

const mockWindowOpen = jest.fn();
let config: WidgetConfig;

const result = {
  product_url: 'https://mock-url.visenze.com',
  im_url: 'https://cdn.com/image.jpg',
  product_id: '123',
};

beforeEach(() => {
  localStorage.clear();
  window.open = mockWindowOpen;
  config = _.cloneDeep(DEFAULT_CONFIGS);
});

describe('clicked on result', () => {
  
  beforeEach(() => {
    localStorage.clear();
    window.open = mockWindowOpen;
  });

  test('store last click in localStorage', () => {
    config.displaySettings.productDetails.productUrl = 'product_url';
    config.appSettings.placementId = '111';

    const productSearch = getWidgetClient({
      config: config,
      widgetType: undefined,
      widgetDirectory: '/',
      deployTypeId: undefined,
    });
    productSearch.send = jest.fn();

    const trackingMeta = {
      queryId: 'abc',
    };

    const implementation = ResultLogicImpl({
      displaySettings: config.displaySettings,
      productSearch,
      trackingMeta,
      isRecommendation: true,
      index: 1,
      onProductClick: undefined,
      result,
    });

    implementation.onClick({ stopPropagation: jest.fn(), preventDefault: jest.fn() });

    expect(localStorage.getItem('visenze_last_click_query_id_111')).toBe('abc');
    expect(localStorage.getItem('visenze_widget_last_click')).toBe('{"placement_id":111,"queryId":"abc"}');
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
  });
});
