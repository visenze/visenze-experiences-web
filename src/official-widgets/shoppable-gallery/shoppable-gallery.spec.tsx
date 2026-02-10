import { act, fireEvent, render, type RenderResult, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import type { ViSearchClient } from 'visearch-javascript-sdk';
import HotspotRecommendations from './components/HotspotRecommendations';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import ShoppableGallery from './shoppable-gallery';
import { RootContext } from '../../common/components/shadow-wrapper';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import { CroppingContext, WidgetDataContext } from '../../common/types/contexts';

// --- Mock global.fetch for gallery browse API ---
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createGalleryBrowseResponse = (products: Array<{ product_id: string; main_image_url: string; data?: Record<string, any> }> = []): object => ({
  result: products.map((p) => ({
    product_id: p.product_id,
    main_image_url: p.main_image_url,
    data: p.data ?? {},
  })),
});

const defaultGalleryProducts = Array.from({ length: 25 }, (_, i) => ({
  product_id: `gallery-pid-${i + 1}`,
  main_image_url: `https://gallery-image-${i + 1}.jpg`,
  data: {
    product_url: `https://product-url-${i + 1}`,
    title: `Gallery Product ${i + 1}`,
    brand: `Brand ${i + 1}`,
  },
}));

describe('shoppable-gallery', () => {
  let testComponent: RenderResult;
  const texts = DEFAULT_TEXTS;

  // Dedicated container for ReactModal portal — lives inside the render tree
  // to prevent "The node to be removed is not a child of this node" cleanup errors
  let modalRoot: HTMLDivElement;

  const createTestClient = (visearchOverrides: Partial<ViSearchClient> = {}): {
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ViSearchClient;
  } => {
    const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
    const { widgetClient, mockVisearchClient } = createMockWidgetClient(
      widgetConfig,
      'wigmix_shoppable_gallery',
      {
        productSearchById: jest.fn(),
        ...visearchOverrides,
      },
    );
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  /**
   * Renders the ShoppableGallery widget with a mocked fetch response.
   * Uses waitFor to ensure the async fetch in useEffect completes and
   * the gallery grid is rendered before returning control to the test.
   */
  const renderGallery = async (
    galleryResponse: object = createGalleryBrowseResponse(defaultGalleryProducts),
    visearchOverrides: Partial<ViSearchClient> = {},
  ): Promise<{
    widgetConfig: ReturnType<typeof createWidgetConfig>;
    widgetClient: ReturnType<typeof createMockWidgetClient>['widgetClient'];
    mockVisearchClient: ViSearchClient;
  }> => {
    mockFetch.mockResolvedValueOnce({
      json: async () => galleryResponse,
    });
    const { widgetConfig, widgetClient, mockVisearchClient } = createTestClient(visearchOverrides);
    testComponent = renderWidget(<ShoppableGallery renderModalWithoutPortal />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
      rootElement: modalRoot,
    });
    // Wait for the component to leave the loading state after the fetch resolves
    await waitFor(() => {
      expect(testComponent.container.querySelector('[data-pw="sg-gallery-products-grid"]')).toBeTruthy();
    });
    return { widgetConfig, widgetClient, mockVisearchClient };
  };

  beforeEach(() => {
    mockFetch.mockReset();
    modalRoot = document.createElement('div');
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    // Clean up any ReactModal portals
    if (testComponent) {
      testComponent.unmount();
    }
    if (modalRoot && modalRoot.parentNode) {
      modalRoot.parentNode.removeChild(modalRoot);
    }
  });

  // --- 3.1 Core rendering & snapshot ---

  it('should render loading spinner before gallery data is fetched', () => {
    // Do not resolve the fetch promise — keep the component in loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    const { widgetConfig, widgetClient } = createTestClient();
    testComponent = renderWidget(<ShoppableGallery renderModalWithoutPortal />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
      rootElement: modalRoot,
    });

    // The spinner wrapper should be present while loading
    expect(testComponent.container.querySelector('.justify-center')).toBeTruthy();
  });

  it('should render without crashing with a valid gallery API response', async () => {
    await renderGallery();

    const grid = testComponent.container.querySelector('[data-pw="sg-gallery-products-grid"]');
    expect(grid).toBeTruthy();
  });

  it('should match snapshot for default layout', async () => {
    await renderGallery();

    expect(testComponent.asFragment()).toMatchSnapshot();
  });

  it('should render gallery images grid from API response', async () => {
    await renderGallery();

    // Default page=1 shows first 20 products (page * 20)
    const galleryImages = testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]');
    expect(galleryImages.length).toBe(20);
  });

  it('should call the correct gallery browse API endpoint', async () => {
    await renderGallery();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain('/v1/product/linked/gallery/browse');
    expect(fetchUrl).toContain('placement_id=1234');
    expect(fetchUrl).toContain('app_key=test-app-key');
    expect(fetchUrl).toContain('limit=100');
  });

  // --- 3.2 Gallery image interactions ---

  it('should open the hotspot modal when clicking a gallery image', async () => {
    await renderGallery(
      createGalleryBrowseResponse(defaultGalleryProducts),
      {
        productSearchById: jest.fn().mockImplementation((_pid: string, _params: any, handler: any) => {
          handler({
            reqid: 'rec-123',
            status: 'OK',
            method: 'product/recommendations',
            page: 1,
            limit: 20,
            total: 0,
            product_types: [],
            result: [],
            objects: [],
          });
        }),
      },
    );

    // Click the first gallery image
    const firstImage = testComponent.container.querySelector<HTMLElement>('[data-pw="sg-gallery-product-1"] a');
    expect(firstImage).toBeTruthy();
    fireEvent.click(firstImage as HTMLElement);

    // The modal renders via ReactModal portal on document.body
    await waitFor(() => {
      const modal = document.body.querySelector('[data-pw="sg-image-hotspot-modal"]');
      expect(modal).toBeTruthy();
    });
  });

  it('should render GalleryImage with correct img src', async () => {
    await renderGallery();

    const firstImg = testComponent.container.querySelector('[data-pw="sg-gallery-product-1"] img') as HTMLImageElement;
    expect(firstImg).toBeTruthy();
    expect(firstImg.src).toContain('https://gallery-image-1.jpg');
  });

  it('should render GalleryImage with hover zoom CSS classes', async () => {
    await renderGallery();

    const groupDiv = testComponent.container.querySelector('[data-pw="sg-gallery-product-1"] .group');
    expect(groupDiv).toBeTruthy();
    const img = groupDiv?.querySelector('img');
    expect(img?.className).toContain('group-hover:scale-110');
  });

  // --- 3.3 Hotspot modal & close button ---

  it('should close the modal when close button is clicked', async () => {
    await renderGallery(
      createGalleryBrowseResponse(defaultGalleryProducts),
      {
        productSearchById: jest.fn().mockImplementation((_pid: string, _params: any, handler: any) => {
          handler({
            reqid: 'rec-123',
            status: 'OK',
            method: 'product/recommendations',
            page: 1,
            limit: 20,
            total: 0,
            product_types: [],
            result: [],
            objects: [],
          });
        }),
      },
    );

    // Open the modal by clicking an image
    const firstImage = testComponent.container.querySelector<HTMLElement>('[data-pw="sg-gallery-product-1"] a');
    fireEvent.click(firstImage as HTMLElement);

    // Verify modal is open (renders in ReactModal portal)
    await waitFor(() => {
      expect(document.body.querySelector('[data-pw="sg-image-hotspot-modal"]')).toBeTruthy();
    });

    // Click the close button
    const closeBtn = document.body.querySelector<HTMLElement>('[data-pw="sg-modal-close-button"]');
    expect(closeBtn).toBeTruthy();

    // Use fake timers to advance ReactModal close animation
    jest.useFakeTimers();
    act(() => {
      fireEvent.click(closeBtn as HTMLElement);
    });
    act(() => {
      jest.runAllTimers();
    });

    // Modal content should be dismissed
    expect(document.body.querySelector('[data-pw="sg-image-hotspot-modal"]')).toBeNull();
    jest.useRealTimers();
  });

  it('should render HotspotContainer when recommendation returns product types', async () => {
    await renderGallery(
      createGalleryBrowseResponse(defaultGalleryProducts),
      {
        productSearchById: jest.fn().mockImplementation((_pid: string, _params: any, handler: any) => {
          handler({
            reqid: 'rec-123',
            status: 'OK',
            method: 'product/recommendations',
            page: 1,
            limit: 20,
            total: 2,
            product_types: [
              { type: 'top', score: 0.9, box: [10, 10, 50, 50], attributes: {}, box_type: '' },
              { type: 'bottom', score: 0.8, box: [60, 60, 90, 90], attributes: {}, box_type: '' },
            ],
            result: [
              {
                product_id: 'rec-pid-1',
                main_image_url: 'https://rec-image-1.jpg',
                data: { title: 'Rec Product 1', price: { currency: 'USD', value: '10.0' } },
              },
            ],
            objects: [
              {
                score: 0.9,
                id: '',
                result: [
                  {
                    product_id: 'rec-pid-1',
                    main_image_url: 'https://rec-image-1.jpg',
                    data: { title: 'Rec Product 1', price: { currency: 'USD', value: '10.0' } },
                  },
                ],
                type: 'top',
                box: [10, 10, 50, 50],
                attributes: {},
                box_type: '',
              },
              {
                score: 0.8,
                id: '',
                result: [
                  {
                    product_id: 'rec-pid-2',
                    main_image_url: 'https://rec-image-2.jpg',
                    data: { title: 'Rec Product 2', price: { currency: 'USD', value: '20.0' } },
                  },
                ],
                type: 'bottom',
                box: [60, 60, 90, 90],
                attributes: {},
                box_type: '',
              },
            ],
          });
        }),
      },
    );

    // Open the modal
    const firstImage = testComponent.container.querySelector<HTMLElement>('[data-pw="sg-gallery-product-1"] a');
    fireEvent.click(firstImage as HTMLElement);

    // The modal renders via ReactModal portal on document.body
    await waitFor(() => {
      const hotspotModal = document.body.querySelector('[data-pw="sg-image-hotspot-modal"]');
      expect(hotspotModal).toBeTruthy();
    });
  });

  // --- 3.4 Infinite scroll pagination ---

  it('should load first page of gallery products on initial render', async () => {
    await renderGallery();

    // page=1, showing 20 products
    const items = testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]');
    expect(items.length).toBe(20);
  });

  it('should load more products when scrolling to the bottom', async () => {
    await renderGallery();

    // Initially 20 items
    expect(testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]').length).toBe(20);

    // Simulate scroll to bottom
    act(() => {
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });

    // After scroll, page increments to 2 → 40 items, but we only have 25
    await waitFor(() => {
      const items = testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]');
      expect(items.length).toBe(25);
    });
  });

  it('should stop pagination when no more products are available', async () => {
    // Only 5 products — first page shows all of them
    const fewProducts = defaultGalleryProducts.slice(0, 5);
    await renderGallery(createGalleryBrowseResponse(fewProducts));

    const items = testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]');
    expect(items.length).toBe(5);

    // Scroll to bottom — should still only show 5
    act(() => {
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 500, configurable: true });
      Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });

    expect(testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]').length).toBe(5);
  });

  // --- 3.5 Edge cases & error handling ---

  it('should render empty gallery when API returns 0 products', async () => {
    await renderGallery(createGalleryBrowseResponse([]));

    const grid = testComponent.container.querySelector('[data-pw="sg-gallery-products-grid"]');
    expect(grid).toBeTruthy();
    const items = testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]');
    expect(items.length).toBe(0);
  });

  it('should handle malformed API response gracefully', async () => {
    // Return a response with missing `result` field
    mockFetch.mockResolvedValueOnce({
      json: async () => ({}),
    });
    const { widgetConfig, widgetClient } = createTestClient();

    testComponent = renderWidget(<ShoppableGallery renderModalWithoutPortal />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
      rootElement: modalRoot,
    });

    // Component renders an empty gallery grid (no products)
    await waitFor(() => {
      expect(testComponent.container.querySelector('[data-pw="sg-gallery-products-grid"]')).toBeTruthy();
    });
    const items = testComponent.container.querySelectorAll('[data-pw^="sg-gallery-product-"]');
    expect(items.length).toBe(0);
  });

  it('should render error state when recommendation response has error', async () => {
    await renderGallery(
      createGalleryBrowseResponse(defaultGalleryProducts),
      {
        productSearchById: jest.fn().mockImplementation((_pid: string, _params: any, _handler: any, errorHandler: any) => {
          errorHandler('Something went wrong');
        }),
      },
    );

    // Open the modal to trigger recommendation search
    const firstImage = testComponent.container.querySelector<HTMLElement>('[data-pw="sg-gallery-product-1"] a');
    fireEvent.click(firstImage as HTMLElement);

    // The error state should show (rendered in the main component, not in a portal)
    await waitFor(() => {
      expect(testComponent.container.textContent).toContain('Sorry, something went wrong');
    });
  });

  // --- 3.6 ViSenze footer & general layout ---

  it('should show ViSenze footer when showViSenzeLogo is true', async () => {
    const { widgetConfig, widgetClient } = createTestClient();
    widgetConfig.customizations.generalLayout.showViSenzeLogo = true;
    mockFetch.mockResolvedValueOnce({
      json: async () => createGalleryBrowseResponse(defaultGalleryProducts),
    });

    testComponent = renderWidget(<ShoppableGallery renderModalWithoutPortal />, {
      widgetConfig,
      widgetClient,
      messages: texts['en'],
      rootElement: modalRoot,
    });

    await waitFor(() => {
      const footer = testComponent.container.querySelector('[data-pw="sg-visenze-footer"]');
      expect(footer).toBeTruthy();
    });
  });

  it('should not show ViSenze footer when showViSenzeLogo is false', async () => {
    await renderGallery();

    // DEFAULT_CUSTOMIZATIONS has showViSenzeLogo = false
    const footer = testComponent.container.querySelector('[data-pw="sg-visenze-footer"]');
    expect(footer).toBeNull();
  });

  it('should render spinner when RootContext is null', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    const { widgetConfig, widgetClient } = createTestClient();

    // Render directly with null RootContext (cannot use renderWidget since it defaults to document.body)
    testComponent = render(
      <RootContext.Provider value={null}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <ShoppableGallery renderModalWithoutPortal />
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    // When root is null, the component shows the loading spinner
    expect(testComponent.container.querySelector('.justify-center')).toBeTruthy();
    // The gallery grid should NOT be rendered
    expect(testComponent.container.querySelector('[data-pw="sg-gallery-products-grid"]')).toBeNull();
  });

  // --- 3.3 continued: Drawer tests (HotspotRecommendations rendered directly) ---

  it('should display "In this photo" title in the recommendations drawer', () => {
    const { widgetConfig, widgetClient } = createTestClient();

    testComponent = render(
      <RootContext.Provider value={modalRoot}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <CroppingContext.Provider value={{ selectedHotspot: 0, setSelectedHotspot: jest.fn() }}>
              <HotspotRecommendations
                openDrawer={true}
                setOpenDrawer={jest.fn()}
                objects={[
                  {
                    score: 0.9,
                    id: '',
                    result: [
                      {
                        product_id: 'rec-pid-1',
                        main_image_url: 'https://rec-image-1.jpg',
                        data: { title: 'Rec Product 1', price: { currency: 'USD', value: '10.0' } },
                      },
                    ],
                    type: 'top',
                    box: [10, 10, 50, 50],
                    attributes: {},
                    box_type: '',
                  },
                ]}
                productTypes={[
                  { type: 'top', score: 0.9, box: [10, 10, 50, 50], attributes: {}, box_type: '' },
                ]}
                metadata={{}}
                activeImageUrl='https://gallery-image-1.jpg'
                placementId='test-placement'
                renderModalWithoutPortal={true}
              />
            </CroppingContext.Provider>
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    expect(modalRoot.querySelector('[data-pw="sg-hotspot-recommendations"]')).toBeTruthy();
    expect(modalRoot.textContent).toContain('In this photo');
  });

  it('should display "no results" message when hotspot has no product results', () => {
    const { widgetConfig, widgetClient } = createTestClient();

    testComponent = render(
      <RootContext.Provider value={modalRoot}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <CroppingContext.Provider value={{ selectedHotspot: 0, setSelectedHotspot: jest.fn() }}>
              <HotspotRecommendations
                openDrawer={true}
                setOpenDrawer={jest.fn()}
                objects={[
                  {
                    score: 0.9,
                    id: '',
                    result: [],
                    type: 'top',
                    box: [10, 10, 50, 50],
                    attributes: {},
                    box_type: '',
                  },
                ]}
                productTypes={[
                  { type: 'top', score: 0.9, box: [10, 10, 50, 50], attributes: {}, box_type: '' },
                ]}
                metadata={{}}
                activeImageUrl='https://gallery-image-1.jpg'
                placementId='test-placement'
                renderModalWithoutPortal={true}
              />
            </CroppingContext.Provider>
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    expect(modalRoot.querySelector('[data-pw="sg-hotspot-recommendations"]')).toBeTruthy();
    expect(modalRoot.textContent).toContain('There are no results for this hotspot');
  });

  it('should close the drawer and reset selected hotspot after animation', () => {
    jest.useFakeTimers();
    const mockSetOpenDrawer = jest.fn();
    const mockSetSelectedHotspot = jest.fn();
    const { widgetConfig, widgetClient } = createTestClient();

    testComponent = render(
      <RootContext.Provider value={modalRoot}>
        <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
          <IntlProvider messages={texts['en']} locale='en' defaultLocale='en'>
            <CroppingContext.Provider value={{ selectedHotspot: 0, setSelectedHotspot: mockSetSelectedHotspot }}>
              <HotspotRecommendations
                openDrawer={true}
                setOpenDrawer={mockSetOpenDrawer}
                objects={[
                  { score: 0.9, id: '', result: [], type: 'top', box: [10, 10, 50, 50], attributes: {}, box_type: '' },
                ]}
                productTypes={[
                  { type: 'top', score: 0.9, box: [10, 10, 50, 50], attributes: {}, box_type: '' },
                ]}
                metadata={{}}
                activeImageUrl='https://gallery-image-1.jpg'
                placementId='test-placement'
                renderModalWithoutPortal={true}
              />
            </CroppingContext.Provider>
          </IntlProvider>
        </WidgetDataContext.Provider>
      </RootContext.Provider>,
    );

    // Click the mobile close button
    const closeBtn = modalRoot.querySelector<HTMLElement>('[data-pw="sg-drawer-close-button-mobile"]');
    expect(closeBtn).toBeTruthy();
    act(() => {
      fireEvent.click(closeBtn as HTMLElement);
    });

    // setOpenDrawer(false) should be called immediately
    expect(mockSetOpenDrawer).toHaveBeenCalledWith(false);

    // setSelectedHotspot(-1) is called after 300ms timeout
    expect(mockSetSelectedHotspot).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockSetSelectedHotspot).toHaveBeenCalledWith(-1);
    jest.useRealTimers();
  });
});
