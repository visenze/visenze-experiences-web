import { act, fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Context as ResponsiveContext } from 'react-responsive';
import type { ProductSearchResponseSuccess } from 'visearch-javascript-sdk';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import ShopTheLookV2 from './shop-the-look-v2';
import { getStandardRecommendationSuccessResponse } from '../../../mocks/responses';
import { RootContext } from '../../common/components/shadow-wrapper';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { WidgetDataContext } from '../../common/types/contexts';

const messages = {
  widgetTitle: 'Shop the look',
  price: '{price}',
  originalPrice: '{originalPrice}',
  discount: '{discount} off',
  addToCart: 'Add to Cart',
};

const getOutfitResponse = (): ProductSearchResponseSuccess => ({
  ...getStandardRecommendationSuccessResponse(),
  method: 'multisearch/outfit-recommendations',
  result: getStandardRecommendationSuccessResponse().result?.slice(0, 2),
  product_info: undefined,
  query_tmp_url: 'https://query-tmp-url',
  qinfo: {
    product_id: 'query-pid',
    main_image_url: 'https://query-main-image',
    data: { title: 'Query Outfit Title' },
    best_images: [{ type: 'outfit', url: 'https://best-outfit-image', index: '0' }],
  },
} as ProductSearchResponseSuccess);

const renderStl = (
  outfitResponse: ProductSearchResponseSuccess,
  searchSettings: Record<string, any> = {},
): { outfit: jest.Mock; container: HTMLElement } => {
  const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
  widgetConfig.searchSettings = searchSettings;
  const outfit = jest.fn().mockImplementation((_params, handler) => handler(outfitResponse));
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
    productMultisearchOutfitRecommendations: outfit,
  });
  const { container } = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages });
  act(() => undefined);
  return { outfit, container };
};

type ProductCardConfig = NonNullable<typeof DEFAULT_CUSTOMIZATIONS.productCard>;
const baseCard = DEFAULT_CUSTOMIZATIONS.productCard as ProductCardConfig;
const withOverrides = (config: unknown, overrides: Record<string, any>): any => ({ ...(config as object), ...overrides });

const renderWithProductCard = (
  productCard: Partial<ProductCardConfig>,
  callbacks: Record<string, any> = {},
  generalLayout: Record<string, any> = {},
): HTMLElement => {
  const customizations = {
    ...DEFAULT_CUSTOMIZATIONS,
    productCard: { ...DEFAULT_CUSTOMIZATIONS.productCard, ...productCard } as ProductCardConfig,
    generalLayout: { ...DEFAULT_CUSTOMIZATIONS.generalLayout, ...generalLayout },
  };
  const widgetConfig = createWidgetConfig(customizations, { callbacks });
  const response = getOutfitResponse();
  response.result = response.result?.map((product) => ({
    ...product,
    data: { ...product.data, original_price: { currency: 'USD', value: '40' }, brand: 'Brand X' },
  }));
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
    productMultisearchOutfitRecommendations: jest.fn().mockImplementation((_p, handler) => handler(response)),
  });
  const { container } = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages });
  // The card shows its overlay buttons once its image has loaded.
  act(() => { container.querySelectorAll('a img').forEach((image) => fireEvent.load(image)); });
  return container;
};

describe('shop-the-look-v2', () => {
  it('calls the outfit recommendations API with qinfo and return_query_temp_url', () => {
    const { outfit } = renderStl(getOutfitResponse());
    expect(outfit).toHaveBeenCalledTimes(1);
    expect(outfit.mock.calls[0][0]).toMatchObject({ pid: 'query-pid', qinfo: true, return_query_temp_url: true });
  });

  it('does not send boi_only unless configured, and forwards it when set', () => {
    expect(renderStl(getOutfitResponse()).outfit.mock.calls[0][0]).not.toHaveProperty('boi_only');
    expect(renderStl(getOutfitResponse(), { boi_only: true }).outfit.mock.calls[0][0]).toMatchObject({ boi_only: true });
  });

  it('shows the best outfit image as reference with caption, title and one card per result', () => {
    const { container } = renderStl(getOutfitResponse());
    expect(container.querySelector('img.wigmix-reference-image')?.getAttribute('src')).toBe('https://best-outfit-image');
    expect(container.textContent).toContain('Query Outfit Title');
    expect(container.querySelector('.wigmix-widget-title')?.textContent).toBe('Shop the look');
    expect(container.querySelectorAll('a img')).toHaveLength(2);
  });

  it('shows skeletons while loading and nothing for an empty result', () => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
    const pending = jest.fn();
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', { productMultisearchOutfitRecommendations: pending });
    const { container } = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.wigmix-widget-title')).toBeTruthy();
    expect(renderStl({ ...getOutfitResponse(), result: [] }).container.innerHTML).toBe('');
  });

  it('hides the reference column when the query has no image at all', () => {
    const response = getOutfitResponse();
    response.query_tmp_url = undefined;
    response.qinfo = { product_id: 'q', data: {}, best_images: [] } as any;
    const { container } = renderStl(response);
    expect(container.querySelector('img.wigmix-reference-image')).toBeNull();
    expect(container.querySelector('.animate-pulse, [class*="skeleton"]')).toBeNull();
    expect(container.querySelectorAll('a img')).toHaveLength(2);
  });

  it('uses the best product image on cards when configured', () => {
    const customizations = { ...DEFAULT_CUSTOMIZATIONS };
    customizations.productCard = {
      ...customizations.productCard,
      images: { mainImage: 'best_product', hoverImage: 'none', showAlternatives: false },
    } as typeof customizations.productCard;
    const widgetConfig = createWidgetConfig(customizations);
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
      productMultisearchOutfitRecommendations: jest.fn().mockImplementation((_p, handler) => handler(getOutfitResponse())),
    });
    const { container } = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages });
    expect(container.querySelector('a img')?.getAttribute('src')).toBe('https://best-images-1-1');
  });

  it('renders for an image query and shows the temporary query image as reference', () => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
    const outfit = jest.fn().mockImplementation((_p, handler) => handler({ ...getOutfitResponse(), qinfo: { product_id: '', data: {}, best_images: [] } }));
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', { productMultisearchOutfitRecommendations: outfit });
    const { container } = renderWidget(<ShopTheLookV2 productId='' imageUrl='https://img/query.jpg' />, { widgetConfig, widgetClient, messages });
    expect(outfit.mock.calls[0][0]).toMatchObject({ im_url: 'https://img/query.jpg' });
    expect(container.querySelector('img.wigmix-reference-image')?.getAttribute('src')).toBe('https://query-tmp-url');
    expect(container.querySelectorAll('a img')).toHaveLength(2);
  });

  it('shows productsPerRow cards at a time and scrolls the rest, as a carousel', () => {
    const response = getOutfitResponse();
    response.result = getStandardRecommendationSuccessResponse().result?.slice(0, 3);
    const { container } = renderStl(response);
    const slides = Array.from(container.querySelectorAll('.slick-slide'));
    expect(slides).toHaveLength(3);
    expect(slides.filter((slide) => slide.className.includes('slick-active'))).toHaveLength(2);
  });

  it('honours a configured productsPerRow', () => {
    const customizations = { ...DEFAULT_CUSTOMIZATIONS, productGrid: { ...DEFAULT_CUSTOMIZATIONS.productGrid } } as typeof DEFAULT_CUSTOMIZATIONS;
    customizations.productGrid = Object.fromEntries(['mobile', 'tablet', 'desktop'].map((bp) => [bp, { productsPerRow: 3, marginHorizontal: 0, marginVertical: 0 }])) as any;
    const widgetConfig = createWidgetConfig(customizations);
    const response = getOutfitResponse();
    response.result = getStandardRecommendationSuccessResponse().result?.slice(0, 4);
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
      productMultisearchOutfitRecommendations: jest.fn().mockImplementation((_p, handler) => handler(response)),
    });
    const { container } = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages });
    const active = Array.from(container.querySelectorAll('.slick-slide')).filter((slide) => slide.className.includes('slick-active'));
    expect(active).toHaveLength(3);
  });

  it('uses productGrid marginHorizontal as the gap between cards', () => {
    const customizations = { ...DEFAULT_CUSTOMIZATIONS };
    customizations.productGrid = Object.fromEntries(['mobile', 'tablet', 'desktop'].map((bp) => [bp, { productsPerRow: 2, marginHorizontal: 20, marginVertical: 0 }])) as any;
    const widgetConfig = createWidgetConfig(customizations);
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
      productMultisearchOutfitRecommendations: jest.fn().mockImplementation((_p, handler) => handler(getOutfitResponse())),
    });
    const { container } = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages });
    const spacer = container.querySelector('.slick-slide div[style*="padding-left"]') as HTMLElement;
    expect(spacer.style.paddingLeft).toBe('10px');
    expect(spacer.style.paddingRight).toBe('10px');
  });

  it('renders a single product as one slide', () => {
    const response = getOutfitResponse();
    response.result = getStandardRecommendationSuccessResponse().result?.slice(0, 1);
    const { container } = renderStl(response);
    expect(container.querySelectorAll('.slick-slide')).toHaveLength(1);
  });

  it('shows only the name, price and discount by default, with no secondary title or wishlist or cart', () => {
    const container = renderWithProductCard({});
    expect(container.querySelector('.wigmix-wishlist-button')).toBeNull();
    expect(container.querySelector('.wigmix-add-to-cart-button, [class*="add-to-cart"]')).toBeNull();
    expect(container.querySelector('.wigmix-product-card-secondary-title')).toBeNull();
    expect(container.querySelector('.wigmix-product-card-original-price')).toBeNull();
    expect(container.querySelector('.wigmix-product-card-discount')?.textContent).toContain('off');
  });

  it('shows the wishlist button when enabled and reports the toggle to the host callback', async () => {
    const onAddToWishlistToggle = jest.fn().mockResolvedValue(true);
    const container = renderWithProductCard(
      { addToWishlist: withOverrides(baseCard.addToWishlist, { enable: true }) },
      { onAddToWishlistToggle },
    );
    const button = container.querySelector('.wigmix-wishlist-button') as HTMLElement;
    expect(button).toBeTruthy();
    await act(async () => { fireEvent.click(button); });
    expect(onAddToWishlistToggle).toHaveBeenCalledWith(true, expect.any(String), expect.anything());
  });

  it('shows the add to cart button when enabled', () => {
    const container = renderWithProductCard({
      addToCart: withOverrides(baseCard.addToCart, { enable: true }),
    }, { onAddToCartToggle: jest.fn() });
    expect(container.textContent).toContain('Add to Cart');
  });

  it('swaps to the hover image on pointer enter when configured', () => {
    const container = renderWithProductCard({ images: { mainImage: 'main', hoverImage: 'additional', showAlternatives: false } });
    const image = container.querySelector('a img') as HTMLImageElement;
    const main = image.getAttribute('src');
    fireEvent.pointerEnter(image);
    expect(image.getAttribute('src')).not.toBe(main);
  });

  it('stacks the price under the name by default and puts them side by side when configured inline', () => {
    const stacked = renderWithProductCard({}).querySelector('.wigmix-product-card-details');
    expect(stacked?.className).not.toContain('justify-between');
    const inline = renderWithProductCard({ layout: { details: 'inline' } }).querySelector('.wigmix-product-card-details');
    expect(inline?.className).toContain('justify-between');
  });
  it('uppercases the texts by default and not when turned off', () => {
    expect(renderWithProductCard({}).querySelector('.wigmix-widget-title')?.className).toContain('uppercase');
    const off = renderWithProductCard({ layout: { details: 'inline', uppercase: false } });
    expect(off.querySelector('.wigmix-widget-title')?.className).not.toContain('uppercase');
    expect(off.querySelector('.wigmix-product-card-details')?.className).not.toContain('uppercase');
  });

  it('shows a configured heading text and hides the heading when turned off', () => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
      productMultisearchOutfitRecommendations: jest.fn().mockImplementation((_p, handler) => handler(getOutfitResponse())),
    });
    const custom = renderWidget(<ShopTheLookV2 productId='query-pid' />, { widgetConfig, widgetClient, messages: { ...messages, widgetTitle: 'Get the look' } });
    expect(custom.container.querySelector('.wigmix-widget-title')?.textContent).toBe('Get the look');
    expect(renderWithProductCard({}, {}, { showWidgetTitle: false }).querySelector('.wigmix-widget-title')).toBeNull();
  });

  it('falls back to the permanent main image, not the expiring temporary url, when there is no best outfit image', () => {
    const response = getOutfitResponse();
    response.qinfo = { ...response.qinfo, best_images: [] } as any;
    const { container } = renderStl(response);
    expect(container.querySelector('img.wigmix-reference-image')?.getAttribute('src')).toBe('https://query-main-image');
  });

  describe('responsive layout', () => {
    const renderAtWidth = (width: number, productCard: Record<string, any> = {}): HTMLElement => {
      // More products than fit in a row, so the carousel shows its arrows.
      const response = getOutfitResponse();
      response.result = getStandardRecommendationSuccessResponse().result?.slice(0, 4);
      const widgetConfig = createWidgetConfig({ ...DEFAULT_CUSTOMIZATIONS, productCard: { ...baseCard, ...productCard } as ProductCardConfig });
      const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_shop_the_look_v2', {
        productMultisearchOutfitRecommendations: jest.fn().mockImplementation((_p, handler) => handler(response)),
      });
      const { container } = render(
        <ResponsiveContext.Provider value={{ width }}>
          <RootContext.Provider value={document.body}>
            <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
              <IntlProvider messages={messages} locale='en' defaultLocale='en'>
                <ShopTheLookV2 productId='query-pid' />
              </IntlProvider>
            </WidgetDataContext.Provider>
          </RootContext.Provider>
        </ResponsiveContext.Provider>,
      );
      act(() => { container.querySelectorAll('a img').forEach((image) => fireEvent.load(image)); });
      return container;
    };

    it('shows arrows beside the carousel on desktop', () => {
      const container = renderAtWidth(1280);
      expect(container.querySelector('button[aria-label="Next products"]')?.className).toContain('-right-9');
    });

    it('shows arrows over the carousel edges on tablet, with the look image at 38%', () => {
      const container = renderAtWidth(900);
      expect(container.querySelector('button[aria-label="Next products"]')?.className).toContain('right-1');
      expect(container.querySelector('button[aria-label="Next products"]')?.className).not.toContain('-right-9');
      expect(container.querySelector('.md\\:w-\\[38\\%\\]')).toBeTruthy();
    });

    it('shows arrows over the carousel edges on phones too, so it is clear the row scrolls', () => {
      const container = renderAtWidth(375);
      expect(container.querySelector('button[aria-label="Next products"]')?.className).toContain('right-1');
      expect(container.querySelector('button[aria-label="Previous products"]')).toBeTruthy();
    });

    it('lazy-loads the product images but not the look image', () => {
      const container = renderAtWidth(375);
      expect(container.querySelector('a img')?.getAttribute('loading')).toBe('lazy');
      expect(container.querySelector('img.wigmix-reference-image')?.getAttribute('loading')).toBeNull();
    });

    it('keeps the inline layout stacked on phones and side by side from tablet up when configured', () => {
      const details = renderAtWidth(375, { layout: { details: 'inline' } }).querySelector('.wigmix-product-card-details');
      expect(details?.className).toContain('flex-col');
      expect(details?.className).toContain('md:flex-row');
    });
  });
});
