import { resolveProducts, stripTokensForDisplay } from './use-recommend-me';
import type { ProcessedProduct } from '../../types/product';

const mockProduct = (productId: string): ProcessedProduct => ({
  product_id: productId,
  im_url: `https://example.com/${productId}.jpg`,
});

describe('stripTokensForDisplay', () => {
  it('drops the entire line when a [[product_id]] token leads the line (old format)', () => {
    const text = '- [[pid-1]] **Red Shoes** are a great match\nMore text after';
    expect(stripTokensForDisplay(text)).toBe('More text after');
  });

  it('drops the entire line when a leading token is preceded by a numbered-list marker', () => {
    const text = '1. [[pid-1]] Red Shoes\nKeep this line';
    expect(stripTokensForDisplay(text)).toBe('Keep this line');
  });

  it('strips an inline/trailing token but keeps the surrounding description (new format)', () => {
    const text = 'Here is a great pair of shoes [[pid-1]] that would go well with your outfit.';
    expect(stripTokensForDisplay(text)).toBe('Here is a great pair of shoes  that would go well with your outfit.');
  });

  it('removes ((suggestion)) tokens entirely', () => {
    const text = 'You could also try ((a red dress)) for a bold look.';
    expect(stripTokensForDisplay(text)).toBe('You could also try  for a bold look.');
  });

  it('removes an incomplete, not-yet-closed [[ fragment so it never flashes mid-stream', () => {
    const text = 'Here is a match: [[sse-';
    expect(stripTokensForDisplay(text)).toBe('Here is a match: ');
  });

  it('keeps a completed token pair intact until it is explicitly stripped', () => {
    const text = 'Try [[pid-1]] and [[pid-2]] together.';
    expect(stripTokensForDisplay(text)).toBe('Try  and  together.');
  });
});

describe('resolveProducts', () => {
  it('returns an empty list when no tokens are present', () => {
    expect(resolveProducts('no products mentioned here', [mockProduct('pid-1')])).toEqual([]);
  });

  it('returns an empty list when the token is present but its product payload has not arrived', () => {
    expect(resolveProducts('Check out [[pid-1]]', [])).toEqual([]);
  });

  it('orders resolved products by first token appearance, not by payload arrival order', () => {
    const products = [mockProduct('pid-3'), mockProduct('pid-1'), mockProduct('pid-2')];
    const text = 'Recommended: [[pid-2]] then [[pid-3]] then [[pid-1]].';
    expect(resolveProducts(text, products).map((p) => p.product_id)).toEqual(['pid-2', 'pid-3', 'pid-1']);
  });

  it('deduplicates a product whose token appears more than once in the text', () => {
    const products = [mockProduct('pid-1')];
    const text = 'Check this out: [[pid-1]]. Again, [[pid-1]] is great.';
    expect(resolveProducts(text, products).map((p) => p.product_id)).toEqual(['pid-1']);
  });
});
