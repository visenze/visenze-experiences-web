import normalizeProductId from './product-id';

describe('normalizeProductId', () => {
  it.each([
    ['10905340', '10905340'],
    ['  10905340  ', '10905340'],
    ['SKU-123_a/b', 'SKU-123_a/b'],
    ['product<1>', 'product<1>'],
  ])('keeps a real product id: %j -> %j', (raw, expected) => {
    expect(normalizeProductId(raw)).toBe(expected);
  });

  it.each([undefined, '', '   ', '\n\t'])('treats missing or blank value %j as no product id', (raw) => {
    expect(normalizeProductId(raw)).toBe('');
  });

  it.each(['undefined', 'null', 'NaN', 'NULL', ' Undefined '])('treats the stringified empty value %j as no product id', (raw) => {
    expect(normalizeProductId(raw)).toBe('');
  });

  it.each([
    '{{ product.id }}',
    '{{pid}}',
    '${productId}',
    '<product-id>',
    '{% product.id %}',
    '[[pid]]',
    '%PRODUCT_ID%',
    '  {{ pid }}  ',
  ])('treats the unfilled template placeholder %j as no product id', (raw) => {
    expect(normalizeProductId(raw)).toBe('');
  });
});
