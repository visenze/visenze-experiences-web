import {
  extractActionTokens,
  extractSpeakableSentences,
  extractSuggestions,
  resolveProducts,
  stripTokensForDisplay,
} from './token-parsing';
import type { ProcessedProduct } from '../types/product';

const makeProduct = (product_id: string): ProcessedProduct => ({
  product_id,
  im_url: `https://example.com/${product_id}.jpg`,
});

describe('token-parsing', () => {
  describe('stripTokensForDisplay', () => {
    it('drops the whole line when a product token leads it (old format)', () => {
      expect(stripTokensForDisplay('- [[pid1]] **Title** description\nnext line')).toBe('next line');
    });

    it('strips a trailing product token but keeps the surrounding description (new format)', () => {
      expect(stripTokensForDisplay('Here is a great option [[pid1]] for you')).toBe('Here is a great option  for you');
    });

    it('removes ((suggestion)) tokens', () => {
      expect(stripTokensForDisplay('Try this ((search for shoes)) instead')).toBe('Try this  instead');
    });

    it('removes reserved action tokens', () => {
      expect(stripTokensForDisplay('Adding it now <<ADD_TO_CART:pid1>> done')).toBe('Adding it now  done');
    });

    it('removes an incomplete, not-yet-closed action token still mid-stream', () => {
      expect(stripTokensForDisplay('Adding it now <<ADD_TO')).toBe('Adding it now ');
    });

    it('removes an incomplete, not-yet-closed product token still mid-stream', () => {
      expect(stripTokensForDisplay('Here is one [[pid')).toBe('Here is one ');
    });
  });

  describe('resolveProducts', () => {
    it('resolves referenced products in first-appearance order', () => {
      const products = [makeProduct('pid1'), makeProduct('pid2'), makeProduct('pid3')];
      const result = resolveProducts('first [[pid2]] then [[pid1]]', products);
      expect(result.map((p) => p.product_id)).toEqual(['pid2', 'pid1']);
    });

    it('dedupes repeated tokens for the same product', () => {
      const products = [makeProduct('pid1')];
      const result = resolveProducts('[[pid1]] again [[pid1]]', products);
      expect(result.map((p) => p.product_id)).toEqual(['pid1']);
    });

    it('ignores tokens whose product payload has not arrived yet', () => {
      const products = [makeProduct('pid1')];
      const result = resolveProducts('[[pid1]] and [[pid2]]', products);
      expect(result.map((p) => p.product_id)).toEqual(['pid1']);
    });

    it('returns an empty array when no tokens are present', () => {
      expect(resolveProducts('no products here', [makeProduct('pid1')])).toEqual([]);
    });
  });

  describe('extractSuggestions', () => {
    it('extracts and trims suggestion tokens', () => {
      expect(extractSuggestions('Maybe try ((red shoes)) or ((blue shoes))')).toEqual(['red shoes', 'blue shoes']);
    });

    it('returns an empty array when no suggestion tokens are present', () => {
      expect(extractSuggestions('no suggestions here')).toEqual([]);
    });
  });

  describe('extractActionTokens', () => {
    it('extracts action tokens with a stable key per action/product/position', () => {
      const text = '<<ADD_TO_CART:pid1>> and <<ADD_TO_WISHLIST:pid2>>';
      const result = extractActionTokens(text);
      expect(result).toEqual([
        { action: 'ADD_TO_CART', productId: 'pid1', key: 'ADD_TO_CART:pid1:0' },
        { action: 'ADD_TO_WISHLIST', productId: 'pid2', key: `ADD_TO_WISHLIST:pid2:${text.indexOf('<<ADD_TO_WISHLIST')}` },
      ]);
    });

    it('returns an empty array when no action tokens are present', () => {
      expect(extractActionTokens('nothing actionable here')).toEqual([]);
    });

    it('does not match an incomplete action token', () => {
      expect(extractActionTokens('<<ADD_TO_CART:pid1')).toEqual([]);
    });
  });

  describe('extractSpeakableSentences', () => {
    it('extracts a complete sentence once its boundary is reached', () => {
      const { sentences, spokenLength } = extractSpeakableSentences('This is one sentence. And more streaming in', 0);
      expect(sentences).toHaveLength(1);
      expect(sentences[0].chunk).toBe('This is one sentence.');
      expect(sentences[0].productId).toBeNull();
      expect(spokenLength).toBe('This is one sentence.'.length);
    });

    it('withholds the remaining tail unless includeTrailing is set', () => {
      const { sentences } = extractSpeakableSentences('This is one sentence. Trailing text with no boundary', 0);
      expect(sentences).toHaveLength(1);
    });

    it('emits the leftover tail as a final sentence when includeTrailing is set', () => {
      const { sentences, spokenLength } = extractSpeakableSentences(
        'This is one sentence. Trailing text with no boundary',
        0,
        { includeTrailing: true },
      );
      expect(sentences).toHaveLength(2);
      expect(sentences[1].chunk).toBe('Trailing text with no boundary');
      expect(spokenLength).toBe('This is one sentence. Trailing text with no boundary'.length);
    });

    it('tags a sentence with the last product token found before its boundary', () => {
      const { sentences } = extractSpeakableSentences('Check out this item. [[pid1]] Next up.', 0);
      expect(sentences[0].productId).toBe('pid1');
    });

    it('does not treat a numbered list marker as a sentence boundary', () => {
      const { sentences } = extractSpeakableSentences('1. Not a boundary here even though a period follows', 0);
      expect(sentences).toHaveLength(0);
    });

    it('only returns sentences after the given spokenLength offset', () => {
      const rawText = 'First sentence. Second sentence.';
      const firstPass = extractSpeakableSentences(rawText, 0);
      expect(firstPass.sentences.map((s) => s.chunk)).toEqual(['First sentence.']);
      const { sentences } = extractSpeakableSentences(rawText, firstPass.spokenLength, { includeTrailing: true });
      expect(sentences).toHaveLength(1);
      expect(sentences[0].chunk).toBe('Second sentence.');
    });
  });
});
