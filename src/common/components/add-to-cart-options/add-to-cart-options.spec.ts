import {
  getActiveOptionFields,
  getInitialSelection,
  isSelectionComplete,
  resolveOptionFields,
  stripTrailingProductCode,
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

  describe('stripTrailingProductCode', () => {
    const shirt: ProcessedProduct = { product_id: 'CA091919BW', im_url: 'img', sku: 'AB-1234' };

    it('drops a trailing word that is the product id or one of its field values', () => {
      expect(stripTrailingProductCode('Premium Light Mature Casual Solid Color Shirt CA091919BW', shirt))
        .toBe('Premium Light Mature Casual Solid Color Shirt');
      expect(stripTrailingProductCode('Casual Sneakers ab-1234', shirt)).toBe('Casual Sneakers');
    });

    it('drops a trailing word that looks like a code, even when it is not in the product data', () => {
      expect(stripTrailingProductCode('Premium Light Mature Casual Solid Color Shirt CA091919BW'))
        .toBe('Premium Light Mature Casual Solid Color Shirt');
      expect(stripTrailingProductCode('Slim Fit Chinos XY-2024-77')).toBe('Slim Fit Chinos');
      expect(stripTrailingProductCode('Sony Headphones WH1000XM5')).toBe('Sony Headphones');
    });

    it('keeps short or lowercase model names', () => {
      expect(stripTrailingProductCode('Nike Air Max 90')).toBe('Nike Air Max 90');
      expect(stripTrailingProductCode('Samsung Galaxy S24')).toBe('Samsung Galaxy S24');
      expect(stripTrailingProductCode('Oversized Tee XL')).toBe('Oversized Tee XL');
      expect(stripTrailingProductCode('Casual Shirt ca091919bw')).toBe('Casual Shirt ca091919bw');
      expect(stripTrailingProductCode('Blue Flower Pattern Casual Shirts S/S.')).toBe('Blue Flower Pattern Casual Shirts S/S.');
    });

    it('never cuts the title down to fewer than two words', () => {
      expect(stripTrailingProductCode('Shirt CA091919BW', shirt)).toBe('Shirt CA091919BW');
      expect(stripTrailingProductCode('CA091919BW', shirt)).toBe('CA091919BW');
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
