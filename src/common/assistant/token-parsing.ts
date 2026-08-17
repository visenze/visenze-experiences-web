import type { ProcessedProduct } from '../types/product';

// A product reference is a token that can appear anywhere in the assistant's text:
//   [[<product_id>]]
// Old format put the token at the START of the line (e.g. "- [[pid]] **title** ...");
// the new format puts it at the END (e.g. "- <description> ... [[pid]]").
// LEADING_PRODUCT_REGEX detects the old, line-leading form so its whole line can be dropped.
const LEADING_PRODUCT_REGEX = /^(?:\d+\.? |- )?\[\[[^\]]+]]/;
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;
const RESERVED_ACTION_TOKEN_REGEX = /<<\s*(ADD_TO_CART|ADD_TO_LIKE|ADD_TO_WISHLIST)\s*:\s*([^>\s]+)\s*>>/g;
const INCOMPLETE_RESERVED_ACTION_TOKEN_REGEX = /<<(?:ADD_TO(?:_[A-Z]*)?(?::[^>]*)?)$/;
const INCOMPLETE_PRODUCT_TOKEN_REGEX = /\[\[[^\]]*$/;

// Clean the accumulated text for display:
// - Old format (token leads the line): drop the whole line; the product card replaces it.
// - New format (token inline/trailing): strip only the token, keep the surrounding description.
// Also removes ((suggestion)) tokens and any trailing, not-yet-closed "[[..." fragment
// that is still mid-stream, so partial tokens never flash in the bubble.
export const stripTokensForDisplay = (text: string): string => text
  .split('\n')
  .map((line): string | null => {
    if (LEADING_PRODUCT_REGEX.test(line)) {
      return null;
    }
    return line.replace(/\[\[[^\]]+]]/g, '');
  })
  .filter((line): line is string => line !== null)
  .join('\n')
  .replace(SUGGESTION_LINE_REGEX, '')
  .replace(RESERVED_ACTION_TOKEN_REGEX, '')
  .replace(INCOMPLETE_RESERVED_ACTION_TOKEN_REGEX, '')
  .replace(INCOMPLETE_PRODUCT_TOKEN_REGEX, '');

// Resolve referenced products in first-appearance order. A product is included only when
// its token is present in the text AND its payload has arrived via a `product` event.
export const resolveProducts = (text: string, products: ProcessedProduct[]): ProcessedProduct[] => {
  const tokenRegex = /\[\[([^\]]+)]]/g;
  const seen = new Set<string>();
  const ordered: ProcessedProduct[] = [];
  let match = tokenRegex.exec(text);
  while (match) {
    const pid = match[1];
    if (!seen.has(pid)) {
      const product = products.find((p) => p.product_id === pid);
      if (product) {
        seen.add(pid);
        ordered.push(product);
      }
    }
    match = tokenRegex.exec(text);
  }
  return ordered;
};

// Extracts the ((suggestion)) tokens accumulated so far, cleaned of their delimiters.
export const extractSuggestions = (text: string): string[] => (text.match(SUGGESTION_LINE_REGEX) || [])
  .map((s) => s.replace('((', '').replace('))', '').trim());

export type ReservedAction = 'ADD_TO_CART' | 'ADD_TO_LIKE' | 'ADD_TO_WISHLIST';

export interface ActionToken {
  action: ReservedAction;
  productId: string;
  key: string;
}

// Extracts every <<ADD_TO_CART:pid>>-style token found in the accumulated text. Each match gets
// a stable `key` (action + product id + position) so callers can dedupe tokens they've already
// handled across repeated calls as more text streams in. A fresh RegExp is constructed per call
// so callers never have to reason about shared exec()/lastIndex state across invocations.
export const extractActionTokens = (text: string): ActionToken[] => {
  const regex = new RegExp(RESERVED_ACTION_TOKEN_REGEX);
  const tokens: ActionToken[] = [];
  let match = regex.exec(text);
  while (match) {
    tokens.push({
      action: match[1] as ReservedAction,
      productId: match[2],
      key: `${match[1]}:${match[2]}:${match.index}`,
    });
    match = regex.exec(text);
  }
  return tokens;
};

// Sentence-ending punctuation followed by whitespace/end-of-string, but not a bare digit
// (so numbered list markers like "1." don't get mistaken for a sentence boundary).
const SENTENCE_BOUNDARY_REGEX = /(?<![0-9])[.!?](?=\s|$)/g;

export interface SpeakableSentence {
  chunk: string;
  revealTarget: number;
  productId: string | null;
}

export interface ExtractSpeakableSentencesResult {
  sentences: SpeakableSentence[];
  spokenLength: number;
}

const PRODUCT_TOKEN_REGEX = /\[\[([^\]]+)]]/g;
// Matches one or more `[[pid]]` tokens (each optionally preceded by whitespace) sitting right
// after a sentence's closing punctuation, e.g. "...outfit. [[pid2]] Next, ...". Without this, a
// token placed after the period rather than before it would fall just past the sentence boundary
// and get attributed to the following sentence instead — tagging the wrong product as focused.
const TRAILING_PRODUCT_TOKEN_REGEX = /^(?:\s*\[\[[^\]]+]])+/;

// Per the [[product_id]] token convention (see the comment at the top of this file), a sentence
// describing a product ends with that product's token. If more than one appears in a sentence,
// the last one wins.
const lastProductIdIn = (rawSentence: string): string | null => {
  let pid: string | null = null;
  let match = PRODUCT_TOKEN_REGEX.exec(rawSentence);
  while (match) {
    [, pid] = match;
    match = PRODUCT_TOKEN_REGEX.exec(rawSentence);
  }
  return pid;
};

// Given the raw, monotonically-growing token text streamed so far (tokens.join('') — NOT the
// stripped display text, whose length can shrink/shift as product tokens resolve or an
// incomplete trailing "[[" gets trimmed) and how much of it has already been sent to speech,
// returns every complete sentence found in the unspoken tail (not just the last one, so two+
// sentences completing between two chat_token events — or the whole leftover tail at stream
// close — are each spoken as their own clip instead of being bundled into one), each cleaned of
// [[pid]]/((suggestion)) markers and tagged with the product it's describing (or null). Also
// returns the new spokenLength to remember. `includeTrailing` (used only at stream close) also
// emits any non-empty text left over after the final sentence boundary (or the whole tail, if no
// boundary was ever found) as one last synthetic sentence.
export const extractSpeakableSentences = (
  rawText: string,
  spokenLength: number,
  { includeTrailing = false }: { includeTrailing?: boolean } = {},
): ExtractSpeakableSentencesResult => {
  const unspoken = rawText.slice(spokenLength);
  const boundaryRegex = new RegExp(SENTENCE_BOUNDARY_REGEX);
  const sentences: SpeakableSentence[] = [];
  let segmentStart = 0;
  let match = boundaryRegex.exec(unspoken);
  while (match) {
    let segmentEnd = match.index + 1;
    const trailingTokens = TRAILING_PRODUCT_TOKEN_REGEX.exec(unspoken.slice(segmentEnd));
    if (trailingTokens) {
      segmentEnd += trailingTokens[0].length;
    }
    // A `[[pid]]` trailing a sentence's punctuation often streams in as a separate, later
    // chat_token event (sometimes after an intervening `product` event) rather than in the same
    // chunk as the period. If nothing but whitespace — or an unterminated "[[" — follows what
    // we've matched so far, the token may still be in flight: wait for more text rather than
    // flushing now, or the token would land on the *next* sentence instead of this one. Not
    // applicable once the stream has closed (`includeTrailing`), since no more text is coming.
    const remainder = unspoken.slice(segmentEnd);
    if (!includeTrailing && (/^\s*$/.test(remainder) || INCOMPLETE_PRODUCT_TOKEN_REGEX.test(remainder))) {
      break;
    }
    const rawSentence = unspoken.slice(segmentStart, segmentEnd);
    const chunk = stripTokensForDisplay(rawSentence).trim();
    if (chunk) {
      sentences.push({
        chunk,
        revealTarget: stripTokensForDisplay(rawText.slice(0, spokenLength + segmentEnd)).trim().length,
        productId: lastProductIdIn(rawSentence),
      });
    }
    segmentStart = segmentEnd;
    match = boundaryRegex.exec(unspoken);
  }
  if (includeTrailing && segmentStart < unspoken.length) {
    const rawSentence = unspoken.slice(segmentStart);
    const chunk = stripTokensForDisplay(rawSentence).trim();
    if (chunk) {
      sentences.push({
        chunk,
        revealTarget: stripTokensForDisplay(rawText).trim().length,
        productId: lastProductIdIn(rawSentence),
      });
    }
    segmentStart = unspoken.length;
  }
  return { sentences, spokenLength: spokenLength + segmentStart };
};
