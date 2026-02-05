/**
 * Utils - Common Utility Functions Tests
 *
 * This test suite documents the behavior of the common utility module, which provides
 * essential helper functions used throughout the widget codebase.
 *
 * The module provides:
 * - Product data transformation and flattening utilities
 * - Box coordinate parsing and manipulation
 * - Product type extraction from search responses
 * - Text formatting utilities (title case conversion)
 * - Facet extraction and filter query building
 * - CSS grid configuration utilities for responsive layouts
 *
 * @see src/common/utils.ts
 */

import type { Product, ProductSearchResponseSuccess, ProductType } from 'visearch-javascript-sdk';
import type { CroppedBox } from './types/box';
import { WidgetBreakpoint } from './types/constants';
import type { FacetType } from './types/constants';
import type { WidgetConfig } from './wigmix-core';
import {
  getFlattenProduct,
  getFlattenProducts,
  flattenBox,
  parseBox,
  parseToProductTypes,
  getTitleCase,
  getFacets,
  getFacetNameByKey,
  getFilterQueries,
  getProductGridCssClasses,
  getProductGridCssConfig,
} from './utils';

describe('Utils - Common Utility Functions', () => {
  /**
   * Product Flattening Utilities
   *
   * These functions transform raw product data from the SDK into a flattened
   * structure that's easier to work with in the UI components.
   */
  describe('Product Flattening Utilities', () => {
    /**
     * Helper to create a mock Product for testing.
     * Provides sensible defaults that can be overridden for specific test cases.
     */
    const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
      product_id: 'test-product-123',
      main_image_url: 'https://example.com/image.jpg',
      data: {
        title: 'Test Product',
        price: 99.99,
        brand: 'TestBrand',
      },
      ...overrides,
    });

    describe('getFlattenProduct', () => {
      describe('when processing a standard product', () => {
        it('maps main_image_url to im_url property', () => {
          const product = createMockProduct();
          const result = getFlattenProduct(product);
          expect(result.im_url).toBe('https://example.com/image.jpg');
        });

        it('preserves the product_id unchanged', () => {
          const product = createMockProduct({ product_id: 'unique-id-456' });
          const result = getFlattenProduct(product);
          expect(result.product_id).toBe('unique-id-456');
        });

        it('spreads nested data properties to root level', () => {
          const product = createMockProduct({
            data: { title: 'Flat Title', price: 50, category: 'Shoes' },
          });
          const result = getFlattenProduct(product);
          expect(result['title']).toBe('Flat Title');
        });
      });

      describe('when product has best_images', () => {
        it('includes best_images array when populated', () => {
          const bestImages = [{ type: 'front', url: 'https://example.com/front.jpg' }];
          const product = createMockProduct({ best_images: bestImages as any });
          const result = getFlattenProduct(product);
          expect(result.best_images).toEqual(bestImages);
        });

        it('converts empty best_images array to undefined for consistency', () => {
          const product = createMockProduct({ best_images: [] });
          expect(getFlattenProduct(product).best_images).toBeUndefined();
        });
      });
    });

    describe('getFlattenProducts', () => {
      describe('when shouldDisplayAlternatives is false', () => {
        it('flattens each product in the array', () => {
          const products = [createMockProduct({ product_id: 'p1' }), createMockProduct({ product_id: 'p2' })];
          const result = getFlattenProducts(products, false);
          expect(result).toHaveLength(2);
        });

        it('returns empty array for undefined input', () => {
          expect(getFlattenProducts(undefined, false)).toEqual([]);
        });
      });

      describe('when shouldDisplayAlternatives is true', () => {
        it('interleaves alternatives: first alternative of each product, then second, etc.', () => {
          const products = [
            createMockProduct({
              product_id: 'p1',
              alternatives: [
                createMockProduct({ product_id: 'p1-alt1' }),
                createMockProduct({ product_id: 'p1-alt2' }),
              ],
            }),
            createMockProduct({
              product_id: 'p2',
              alternatives: [
                createMockProduct({ product_id: 'p2-alt1' }),
                createMockProduct({ product_id: 'p2-alt2' }),
              ],
            }),
          ];
          const result = getFlattenProducts(products, true);

          // Verify interleaved order: p1-alt1, p2-alt1, p1-alt2, p2-alt2
          expect(result.map((p) => p.product_id)).toEqual(['p1-alt1', 'p2-alt1', 'p1-alt2', 'p2-alt2']);
        });

        it('continues iterating when products have uneven alternatives', () => {
          const products = [
            createMockProduct({
              product_id: 'p1',
              alternatives: [
                createMockProduct({ product_id: 'p1-alt1' }),
                createMockProduct({ product_id: 'p1-alt2' }),
                createMockProduct({ product_id: 'p1-alt3' }),
              ],
            }),
            createMockProduct({
              product_id: 'p2',
              alternatives: [createMockProduct({ product_id: 'p2-alt1' })],
            }),
          ];
          const result = getFlattenProducts(products, true);

          // Verify interleaved order with uneven alternatives
          expect(result.map((p) => p.product_id)).toEqual(['p1-alt1', 'p2-alt1', 'p1-alt2', 'p1-alt3']);
        });

        it('skips products without alternatives in interleaved output', () => {
          const products = [
            createMockProduct({
              product_id: 'p1',
              alternatives: [createMockProduct({ product_id: 'p1-alt1' })],
            }),
            createMockProduct({ product_id: 'p2' }),
          ];
          const result = getFlattenProducts(products, true);
          expect(result).toHaveLength(1);
        });
      });
    });
  });

  /**
   * Box Coordinate Utilities
   *
   * These functions handle the transformation and parsing of bounding box
   * coordinates used for image cropping and object detection.
   */
  describe('Box Coordinate Utilities', () => {
    describe('flattenBox', () => {
      it('converts CroppedBox object to array [x1, y1, x2, y2]', () => {
        const box: CroppedBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
        expect(flattenBox(box)).toEqual([10, 20, 100, 200]);
      });
    });

    describe('parseBox', () => {
      describe('when box is falsy', () => {
        it('returns empty string for null input', () => {
          expect(parseBox(null)).toBe('');
        });

        it('returns empty string for undefined input', () => {
          expect(parseBox(undefined)).toBe('');
        });
      });

      describe('when box is an array', () => {
        it('joins values with commas', () => {
          expect(parseBox([10, 20, 100, 200])).toBe('10,20,100,200');
        });

        it('preserves decimal values unchanged', () => {
          expect(parseBox([10.5, 20.7, 100.3, 200.9])).toBe('10.5,20.7,100.3,200.9');
        });
      });

      describe('when box is a CroppedBox object', () => {
        it('converts to comma-separated string', () => {
          const box: CroppedBox = { x1: 10, y1: 20, x2: 100, y2: 200 };
          expect(parseBox(box)).toBe('10,20,100,200');
        });

        it('truncates decimal places', () => {
          const box: CroppedBox = { x1: 10.9, y1: 20.5, x2: 100.1, y2: 200.7 };
          expect(parseBox(box)).toBe('10,20,100,200');
        });
      });
    });
  });

  /**
   * Product Type Parsing
   *
   * Extracts product type information from search responses, handling both
   * the standard product_types array and the legacy objects format.
   */
  describe('Product Type Parsing', () => {
    describe('parseToProductTypes', () => {
      describe('when response has product_types array', () => {
        it('returns the product_types array directly', () => {
          const productTypes: ProductType[] = [
            { type: 'shirt', box: [10, 20, 100, 200], score: 0.95, attributes: {}, box_type: '' },
          ];
          const response = { product_types: productTypes } as ProductSearchResponseSuccess;
          expect(parseToProductTypes(response)).toEqual(productTypes);
        });

        it('prioritizes product_types over legacy objects when both exist', () => {
          const productTypes: ProductType[] = [
            { type: 'shirt', box: [10, 20, 100, 200], score: 0.95, attributes: {}, box_type: '' },
          ];
          const response = {
            product_types: productTypes,
            objects: [{ box: [0, 0, 50, 50], type: 'pants', score: 0.8, attributes: {} }],
          } as unknown as ProductSearchResponseSuccess;
          expect(parseToProductTypes(response)).toEqual(productTypes);
        });
      });

      describe('when response has legacy objects format', () => {
        it('transforms each object to ProductType with box_type defaulting to empty string', () => {
          const response = {
            objects: [{ box: [10, 20, 100, 200], type: 'shirt', score: 0.95, attributes: { color: 'blue' } }],
          } as unknown as ProductSearchResponseSuccess;

          const result = parseToProductTypes(response);
          expect(result[0]).toEqual({
            box: [10, 20, 100, 200],
            type: 'shirt',
            score: 0.95,
            attributes: { color: 'blue' },
            box_type: '',
          });
        });
      });

      describe('when response has neither format', () => {
        it('returns empty array', () => {
          const response = {} as ProductSearchResponseSuccess;
          expect(parseToProductTypes(response)).toEqual([]);
        });
      });
    });
  });

  /**
   * Text Formatting Utilities
   *
   * Functions for formatting and transforming text strings.
   */
  describe('Text Formatting Utilities', () => {
    describe('getTitleCase', () => {
      describe('when input is valid text', () => {
        it('capitalizes first letter of lowercase word', () => {
          expect(getTitleCase('hello')).toBe('Hello');
        });

        it('lowercases all letters except the first', () => {
          expect(getTitleCase('HELLO WORLD')).toBe('Hello world');
        });

        it('handles single character input', () => {
          expect(getTitleCase('a')).toBe('A');
        });
      });

      describe('when input is empty or falsy', () => {
        it('returns empty string for empty string input', () => {
          expect(getTitleCase('')).toBe('');
        });

        it('returns empty string for null input', () => {
          expect(getTitleCase(null as unknown as string)).toBe('');
        });

        it('returns empty string for undefined input', () => {
          expect(getTitleCase(undefined as unknown as string)).toBe('');
        });
      });
    });
  });

  /**
   * Facet Extraction Utilities
   *
   * Functions for extracting and working with facet configurations
   * from widget display settings.
   */
  describe('Facet Extraction Utilities', () => {
    /**
     * Helper to create mock product details configuration.
     * All facets are configured with data paths by default.
     */
    const createMockProductDetails = (
      overrides: Partial<WidgetConfig['displaySettings']['productDetails']> = {},
    ): WidgetConfig['displaySettings']['productDetails'] => ({
      price: 'data.price',
      category: 'data.category',
      brand: 'data.brand',
      gender: 'data.gender',
      sizes: 'data.sizes',
      colors: 'data.colors',
      ...overrides,
    });

    describe('getFacets', () => {
      it('returns array of all configured facet data paths', () => {
        const productDetails = createMockProductDetails();
        const result = getFacets(productDetails);
        expect(result).toEqual([
          'data.price',
          'data.category',
          'data.brand',
          'data.gender',
          'data.sizes',
          'data.colors',
        ]);
      });

      it('excludes facets with empty string values', () => {
        const productDetails = createMockProductDetails({ brand: '', gender: '' });
        const result = getFacets(productDetails);
        expect(result).toEqual(['data.price', 'data.category', 'data.sizes', 'data.colors']);
      });

      it('returns empty array when all facets are empty strings', () => {
        const productDetails = {
          price: '',
          category: '',
          brand: '',
          gender: '',
          sizes: '',
          colors: '',
        } as WidgetConfig['displaySettings']['productDetails'];
        expect(getFacets(productDetails)).toEqual([]);
      });
    });

    describe('getFacetNameByKey', () => {
      it('returns facet name when data path matches', () => {
        const productDetails = createMockProductDetails();
        expect(getFacetNameByKey(productDetails, 'data.price')).toBe('price');
      });

      it('returns empty string when data path not found', () => {
        const productDetails = createMockProductDetails();
        expect(getFacetNameByKey(productDetails, 'non.existent.key')).toBe('');
      });
    });
  });

  /**
   * Filter Query Building
   *
   * Builds filter query strings from facet configurations and filter selections.
   * These queries are used for API requests to filter product results.
   */
  describe('Filter Query Building', () => {
    /**
     * Helper to create mock product details with all facet paths configured.
     */
    const createMockProductDetails = (): WidgetConfig['displaySettings']['productDetails'] => ({
      price: 'data.price',
      category: 'data.category',
      brand: 'data.brand',
      gender: 'data.gender',
      sizes: 'data.sizes',
      colors: 'data.colors',
    });

    /**
     * Helper to create empty filter state.
     * Price is an array for range, others are Sets for multiple selection.
     */
    const createEmptyFilters = (): Record<FacetType, any> => ({
      price: [],
      category: new Set<string>(),
      brand: new Set<string>(),
      gender: new Set<string>(),
      sizes: new Set<string>(),
      colors: new Set<string>(),
    });

    describe('getFilterQueries', () => {
      it('returns empty array when no filters are active', () => {
        const result = getFilterQueries(createMockProductDetails(), createEmptyFilters());
        expect(result).toEqual([]);
      });

      describe('when price range filter is set', () => {
        it('formats as "field:min,max"', () => {
          const filters = createEmptyFilters();
          filters.price = [10, 100];
          const result = getFilterQueries(createMockProductDetails(), filters);
          expect(result).toContain('data.price:10,100');
        });
      });

      describe('when single-value Set filter is set', () => {
        it('wraps filter value in quotes', () => {
          const filters = createEmptyFilters();
          filters.category.add('Shirts');
          const result = getFilterQueries(createMockProductDetails(), filters);
          expect(result).toContain('data.category:"Shirts"');
        });
      });

      describe('when multi-value Set filter is set', () => {
        it('joins multiple values with OR operator', () => {
          const filters = createEmptyFilters();
          filters.category.add('Shirts');
          filters.category.add('Pants');
          const result = getFilterQueries(createMockProductDetails(), filters);
          const categoryQuery = result.find((q) => q.includes('data.category:'));
          expect(categoryQuery).toContain(' OR ');
        });
      });

      describe('when multiple filter types are active', () => {
        it('returns one query string per active filter type', () => {
          const filters = createEmptyFilters();
          filters.price = [10, 100];
          filters.brand.add('Nike');
          filters.colors.add('Blue');
          const result = getFilterQueries(createMockProductDetails(), filters);
          expect(result).toHaveLength(3);
        });
      });
    });
  });

  /**
   * CSS Grid Configuration Utilities
   *
   * Functions for generating responsive CSS grid classes and inline styles
   * based on widget customization settings per breakpoint.
   */
  describe('CSS Grid Configuration Utilities', () => {
    /**
     * Helper type for partial product grid configuration.
     */
    type PartialProductGrid = Partial<{
      [key: string]: Partial<{
        productsPerRow: number;
        marginVertical: number | undefined;
        marginHorizontal: number | undefined;
      }>;
    }>;

    /**
     * Helper to create mock customizations object with optional productGrid config.
     */
    const createMockCustomizations = (productGrid?: PartialProductGrid): WidgetConfig['customizations'] =>
      ({
        productGrid,
      }) as WidgetConfig['customizations'];

    describe('getProductGridCssClasses', () => {
      describe('when no customizations exist', () => {
        it('returns all default CSS classes', () => {
          const customizations = createMockCustomizations();
          const result = getProductGridCssClasses(
            customizations,
            WidgetBreakpoint.DESKTOP,
            'grid-cols-4',
            'gap-x-4',
            'gap-y-4',
          );
          expect(result).toBe('grid-cols-4 gap-x-4 gap-y-4');
        });
      });

      describe('when productsPerRow is customized', () => {
        it('excludes default cols class', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 3, marginVertical: undefined, marginHorizontal: undefined },
          });
          const result = getProductGridCssClasses(
            customizations,
            WidgetBreakpoint.DESKTOP,
            'grid-cols-4',
            'gap-x-4',
            'gap-y-4',
          );
          expect(result).not.toContain('grid-cols-4');
        });
      });

      describe('when marginHorizontal is customized', () => {
        it('excludes default gap-x class when value is set', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: undefined, marginHorizontal: 8 },
          });
          const result = getProductGridCssClasses(
            customizations,
            WidgetBreakpoint.DESKTOP,
            'grid-cols-4',
            'gap-x-4',
            'gap-y-4',
          );
          expect(result).not.toContain('gap-x-4');
        });

        it('excludes default gap-x class when marginHorizontal is explicitly 0', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: undefined, marginHorizontal: 0 },
          });
          const result = getProductGridCssClasses(
            customizations,
            WidgetBreakpoint.DESKTOP,
            'grid-cols-4',
            'gap-x-4',
            'gap-y-4',
          );
          expect(result).not.toContain('gap-x-4');
        });
      });

      describe('when marginVertical is customized', () => {
        it('excludes default gap-y class when value is set', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: 8, marginHorizontal: undefined },
          });
          const result = getProductGridCssClasses(
            customizations,
            WidgetBreakpoint.DESKTOP,
            'grid-cols-4',
            'gap-x-4',
            'gap-y-4',
          );
          expect(result).not.toContain('gap-y-4');
        });

        it('excludes default gap-y class when marginVertical is explicitly 0', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: 0, marginHorizontal: undefined },
          });
          const result = getProductGridCssClasses(
            customizations,
            WidgetBreakpoint.DESKTOP,
            'grid-cols-4',
            'gap-x-4',
            'gap-y-4',
          );
          expect(result).not.toContain('gap-y-4');
        });
      });
    });

    describe('getProductGridCssConfig', () => {
      describe('when no customizations exist', () => {
        it('returns empty CSS properties object', () => {
          const customizations = createMockCustomizations();
          expect(getProductGridCssConfig(customizations, WidgetBreakpoint.DESKTOP)).toEqual({});
        });
      });

      describe('when productsPerRow is configured', () => {
        it('sets gridTemplateColumns with repeat()', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 5, marginVertical: undefined, marginHorizontal: undefined },
          });
          const result = getProductGridCssConfig(customizations, WidgetBreakpoint.DESKTOP);
          expect(result.gridTemplateColumns).toBe('repeat(5, minmax(0, 1fr))');
        });
      });

      describe('when marginVertical is configured', () => {
        it('sets rowGap in pixels', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: 16, marginHorizontal: undefined },
          });
          const result = getProductGridCssConfig(customizations, WidgetBreakpoint.DESKTOP);
          expect(result.rowGap).toBe('16px');
        });

        it('sets rowGap to 0px when marginVertical is explicitly 0', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: 0, marginHorizontal: undefined },
          });
          const result = getProductGridCssConfig(customizations, WidgetBreakpoint.DESKTOP);
          expect(result.rowGap).toBe('0px');
        });
      });

      describe('when marginHorizontal is configured', () => {
        it('sets columnGap in pixels', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: undefined, marginHorizontal: 12 },
          });
          const result = getProductGridCssConfig(customizations, WidgetBreakpoint.DESKTOP);
          expect(result.columnGap).toBe('12px');
        });

        it('sets columnGap to 0px when marginHorizontal is explicitly 0', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 0, marginVertical: undefined, marginHorizontal: 0 },
          });
          const result = getProductGridCssConfig(customizations, WidgetBreakpoint.DESKTOP);
          expect(result.columnGap).toBe('0px');
        });
      });

      describe('when breakpoint config is missing', () => {
        it('returns empty object for unconfigured mobile breakpoint', () => {
          const customizations = createMockCustomizations({
            desktop: { productsPerRow: 4, marginVertical: undefined, marginHorizontal: undefined },
          });
          expect(getProductGridCssConfig(customizations, WidgetBreakpoint.MOBILE)).toEqual({});
        });
      });
    });
  });
});
