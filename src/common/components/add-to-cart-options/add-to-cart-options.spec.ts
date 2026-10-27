import {
  getActiveOptionFields,
  getInitialSelection,
  isSelectionComplete,
  resolveOptionFields,
} from './add-to-cart-options';
import type { ProcessedProduct } from '../../types/product';
import { getOptionValues } from '../../utils';
import type { AddToCartOptions } from '../../wigmix-core';

describe('add-to-cart-options', () => {
  const productDetails = { title: 'title_field', sizes: 'size_field', colors: 'color_field' };
  const product: ProcessedProduct = {
    product_id: 'pid-1',
    im_url: 'img',
    title_field: 'Sneakers',
    size_field: ['8.5', '5', '6.5', '10'],
    color_field: ['Black', 'White'],
    width_field: ['Regular', 'Wide', 'Extra wide', 'Narrow'],
    fit_field: ['Slim'],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getOptionValues', () => {
    it('returns trimmed, de-duplicated string values for an array', () => {
      expect(getOptionValues([' 8 ', 8, '9', '', null, '9'])).toEqual(['8', '9']);
    });

    it('takes a single string or number as one value, exactly as given', () => {
      expect(getOptionValues(' Black/Pelé Yellow ')).toEqual(['Black/Pelé Yellow']);
      expect(getOptionValues('Black, White')).toEqual(['Black, White']);
      expect(getOptionValues(8)).toEqual(['8']);
    });

    it('returns no values for missing, empty or other values', () => {
      expect(getOptionValues(undefined)).toEqual([]);
      expect(getOptionValues(null)).toEqual([]);
      expect(getOptionValues('  ')).toEqual([]);
      expect(getOptionValues([])).toEqual([]);
      expect(getOptionValues({ value: 'Black' })).toEqual([]);
    });
  });

  describe('getActiveOptionFields', () => {
    it('returns no fields when options are missing or disabled', () => {
      expect(getActiveOptionFields(undefined)).toEqual([]);
      expect(getActiveOptionFields({ enable: false, fields: [{ field: 'sizes', layout: 'CAROUSEL' }] })).toEqual([]);
    });

    it('ignores NONE fields', () => {
      const options: AddToCartOptions = {
        enable: true,
        fields: [{ field: 'sizes', layout: 'NONE' }, { field: 'colors', layout: 'DROPDOWN' }],
      };
      expect(getActiveOptionFields(options)).toEqual([{ field: 'colors', layout: 'DROPDOWN' }]);
    });
  });

  describe('resolveOptionFields', () => {
    it('resolves fields through productDetails, in config order, keyed by callbackKey or field', () => {
      const options: AddToCartOptions = {
        enable: true,
        fields: [
          { field: 'sizes', label: 'Size', layout: 'CAROUSEL', callbackKey: 'size' },
          { field: 'colors', layout: 'RADIO' },
        ],
      };
      expect(resolveOptionFields(product, productDetails, options)).toEqual([
        { key: 'size', label: 'Size', layout: 'CAROUSEL', values: ['5', '6.5', '8.5', '10'] },
        { key: 'colors', label: 'colors', layout: 'RADIO', values: ['Black', 'White'] },
      ]);
    });

    it('falls back to the raw catalog field name when it is not in productDetails', () => {
      const options: AddToCartOptions = { enable: true, fields: [{ field: 'fit_field', layout: 'DROPDOWN' }] };
      expect(resolveOptionFields(product, productDetails, options)[0].values).toEqual(['Slim']);
    });

    it('keeps the catalog order for non-numeric carousel values', () => {
      const options: AddToCartOptions = { enable: true, fields: [{ field: 'colors', layout: 'CAROUSEL' }] };
      expect(resolveOptionFields({ ...product, color_field: ['White', 'Black'] }, productDetails, options)[0].values)
        .toEqual(['White', 'Black']);
    });

    it('renders a radio field with more than 3 values as a drop-down and warns', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const options: AddToCartOptions = { enable: true, fields: [{ field: 'width_field', layout: 'RADIO' }] };
      expect(resolveOptionFields(product, productDetails, options)[0].layout).toBe('DROPDOWN');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('skips fields with no values for the product', () => {
      const options: AddToCartOptions = {
        enable: true,
        fields: [{ field: 'missing_field', layout: 'DROPDOWN' }, { field: 'colors', layout: 'DROPDOWN' }],
      };
      expect(resolveOptionFields(product, productDetails, options).map((field) => field.key)).toEqual(['colors']);
    });
  });

  describe('selection', () => {
    const fields = resolveOptionFields(product, productDetails, {
      enable: true,
      fields: [{ field: 'colors', layout: 'DROPDOWN' }, { field: 'fit_field', layout: 'DROPDOWN', callbackKey: 'fit' }],
    });

    it('pre-selects fields that have a single value', () => {
      expect(getInitialSelection(fields)).toEqual({ fit: 'Slim' });
    });

    it('is complete only when every field has a value', () => {
      expect(isSelectionComplete(fields, { fit: 'Slim' })).toBe(false);
      expect(isSelectionComplete(fields, { fit: 'Slim', colors: 'Black' })).toBe(true);
    });
  });
});
