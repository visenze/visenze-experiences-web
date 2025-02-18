import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import ProductCard from './ProductCard';
import type { ProcessedProduct } from '../../types/product';
import { WidgetDataContext } from '../../types/contexts';
import type { WidgetConfig } from '../../wigmix-core';

describe('ProductCard', () => {
  let testComponent: RenderResult;
  const testProduct: ProcessedProduct = {
    product_id: 'test_pid',
    im_url: 'test_image_url',
    price_field: {
      value: 100,
      currency: 'USD',
    },
    title_field: 'product_title',
    brand_field: 'product_brand',
  };

  it('should render', () => {
    testComponent = render(
        <WidgetDataContext.Provider value={{
          widgetClient: {
            placementId: 1234,
            sendEvent: jest.fn(),
          } as any,
          widgetConfig: {
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
              },
            },
            searchSettings: {},
            trackingSettings: {},
            languageSettings: {
              locale: '',
              currency: '',
            },
            callbacks: {},
            customizations: {
              productCard: {
                title: {
                  show: true,
                  fieldSource: 'title',
                },
                price: {
                  show: true,
                },
              },
            } as WidgetConfig['customizations'],
            disableAnalytics: true,
          },
          darkMode: false,
        }}>
          <ProductCard result={testProduct}
                       metadata={{
                         queryId: 'test-query-id',
                       }}
                       index={0}
                       isRecommendation={false}
                       hasFindSimilar={false}
                       pwPrefix='ut' />
        </WidgetDataContext.Provider>,
    );
    expect(testComponent.asFragment()).toMatchSnapshot();
  });
});
