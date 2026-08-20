import { cn } from '@heroui/theme';
import type { Dispatch, FC, ReactNode, SetStateAction } from 'react';
import { useRef } from 'react';
import { useIntl } from 'react-intl';
import SharedProductCard from '../../../common/components/product-card/ProductCard';
import SparklesIcon from '../../../common/icons/SparklesIcon';
import type { ConversationTurn } from '../embedded-shopping-assistant';

const parseBold = (text: string): ReactNode => {
  const parts = text.split(/\*\*([^*]+)\*\*/);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
};

type AiBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'category'; header: string; items: string[] };

// AI responses interleave free text with "**Category** - item - item" runs;
// a bold phrase counts as a category header only when a dash-list follows it immediately,
// so inline emphasis (e.g. "**designed for** comfort") stays part of the flowing paragraph.
const parseAiBlocks = (text: string): AiBlock[] => {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const blocks: AiBlock[] = [];
  let paragraphBuffer = '';
  let lastIndex = 0;

  const flushParagraph = (): void => {
    const trimmed = paragraphBuffer.trim();
    if (trimmed) blocks.push({ type: 'paragraph', text: trimmed });
    paragraphBuffer = '';
  };

  let match = boldRegex.exec(text);
  while (match) {
    const before = text.slice(lastIndex, match.index);
    const afterStart = match.index + match[0].length;
    const restOfText = text.slice(afterStart);
    const isCategory = /^\s*-\s+/.test(restOfText);

    if (isCategory) {
      paragraphBuffer += before;
      flushParagraph();
      const nextBoldOffset = restOfText.search(/\*\*/);
      const listText = nextBoldOffset === -1 ? restOfText : restOfText.slice(0, nextBoldOffset);
      const items = listText
        .replace(/^\s*-\s*/, '')
        .split(/\s+-\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
      blocks.push({ type: 'category', header: match[1], items });
      lastIndex = nextBoldOffset === -1 ? text.length : afterStart + nextBoldOffset;
      boldRegex.lastIndex = lastIndex;
    } else {
      paragraphBuffer += `${before}**${match[1]}**`;
      lastIndex = afterStart;
    }

    match = boldRegex.exec(text);
  }

  paragraphBuffer += text.slice(lastIndex);
  flushParagraph();

  return blocks;
};

interface TurnSectionProps {
  turn: ConversationTurn;
  showDivider: boolean;
  onShowProducts: () => void;
  primaryButtonBg?: string;
  iconColor?: string;
  wishlistPids: string[];
  setWishlistPids: Dispatch<SetStateAction<string[]>>;
}

const TurnSection: FC<TurnSectionProps> = ({
  turn, showDivider, onShowProducts, primaryButtonBg, iconColor, wishlistPids, setWishlistPids,
}) => {
  // Dedupes PRODUCT_VIEW tracking (fired internally by the shared ProductCard) per request, so a
  // product re-rendered within the same turn's response doesn't get counted twice.
  const viewedProductIdsRef = useRef<Set<string>>(new Set());
  const intl = useIntl();

  return (
  <div>
    {showDivider && <hr className='border-gray-200 dark:border-neutral-700 my-6' />}

    {/* User's query, shown as a right-aligned chat bubble — skipped for the initial turn, since the
        persistent TopBar's "AI Overview" label already frames it; showing the query again here would
        just be a redundant step before the content loads. Follow-up turns (chips, typed questions,
        image search) still show theirs, same as a normal chat log. */}
    {!turn.isInitial && (
      <div className='flex justify-end mb-4'>
        {turn.queryImageUrl ? (
          <img
            src={turn.queryImageUrl}
            alt='Uploaded search'
            className='size-20 rounded-xl object-cover border border-gray-200 dark:border-neutral-700'
          />
        ) : (
          <span className='inline-block max-w-[80%] truncate rounded-full bg-gray-100 dark:bg-neutral-800 px-4 py-2 text-sm text-gray-800 dark:text-neutral-100'>
            {turn.title}
          </span>
        )}
      </div>
    )}

    {/* "AI Overview" header — the persistent TopBar carries this same label once results are
        expanded, but until then (loading + clamped text preview) there's no TopBar on screen at
        all, so this inline header fills that gap for the initial turn. */}
    {turn.isInitial && !turn.productsExpanded && (
      <div className='flex items-center gap-2 mb-3'>
        <SparklesIcon className='size-4' color={iconColor} />
        <span className='text-sm font-semibold text-gray-800 dark:text-neutral-100'>
          {intl.formatMessage({ id: 'aiOverviewLabel' })}
        </span>
      </div>
    )}

    {/* Loading */}
    {turn.isLoading && (
      <div className='flex items-center gap-2 mb-4'>
        {[0, 1, 2].map((i) => (
          <div
            key={`dot-${turn.id}-${i}`}
            className='loading-dot rounded-full'
            style={{ animationDelay: `${i * 0.2}s`, backgroundColor: primaryButtonBg }}
          />
        ))}
        <span className='text-sm text-gray-500 dark:text-neutral-400 ml-1'>
          {intl.formatMessage({ id: turn.isInitial ? 'gettingOverview' : 'findingProducts' })}
        </span>
      </div>
    )}

    {/* AI text — clamped to a steady preview height until expanded, so the reveal control never shifts while streaming */}
    {turn.isInitial && !turn.isLoading && turn.aiText && (
      <div className={cn('relative mb-4', !turn.productsExpanded && 'max-h-72 overflow-hidden')}>
        <div className='text-sm text-gray-700 dark:text-neutral-300'>
          {parseAiBlocks(turn.aiText).map((block, i) => (
            block.type === 'paragraph' ? (
              // eslint-disable-next-line react/no-array-index-key
              <p key={i} className='leading-relaxed mb-3 last:mb-0'>
                {parseBold(block.text)}
              </p>
            ) : (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className='mb-3 last:mb-0'>
                <p className='font-semibold text-gray-900 dark:text-neutral-100 mb-1.5'>{block.header}</p>
                <ul className='space-y-1.5'>
                  {block.items.map((item, j) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={j} className='flex gap-2 leading-relaxed'>
                      <span className='text-gray-400 dark:text-neutral-500'>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </div>
        {!turn.productsExpanded && (
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white
            dark:from-neutral-900 to-transparent' />
        )}
      </div>
    )}

    {/* See Results button — only the initial turn gates behind this; follow-up turns auto-expand */}
    {!turn.isLoading && turn.products.length > 0 && !turn.productsExpanded && (
      <div className='flex justify-center mb-4'>
        <button
          type='button'
          onClick={onShowProducts}
          className='flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 dark:border-neutral-700
            text-gray-700 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-neutral-800 text-sm font-medium transition-colors'
        >
          {intl.formatMessage({ id: 'seeResults' })}
          <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='2' stroke='currentColor' className='size-4'>
            <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' />
          </svg>
        </button>
      </div>
    )}

    {/* Product grid — fixed-width cards (202px, matching the shopping-assistant widget's card size)
        that wrap to a new row, so every query renders at the same size regardless of container width.
        Only shown after user clicks "See Results" (initial turn) or immediately (follow-up turns).
        Uses the shared ProductCard (same one shopping-assistant uses) so price/secondaryTitle/
        fieldSource/openLinksInNewTab/wishlist/addToCart/findSimilar all respect config the same way —
        the border/rounding/shadow wrapper below is this widget's own visual treatment, layered on top. */}
    {!turn.isLoading && turn.productsExpanded && turn.products.length > 0 && (
      <div className='flex flex-wrap gap-4 mb-4'>
        {turn.products.map((product, pidx) => {
          const viewedKey = `${turn.reqId || turn.id}:${product.product_id}`;
          return (
            <div
              key={product.product_id}
              className='w-[202px] flex-none overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-700
                bg-white dark:bg-neutral-800 shadow-sm transition-shadow hover:shadow-md'
            >
              <SharedProductCard
                result={product}
                index={pidx}
                metadata={{ queryId: turn.reqId || turn.id }}
                isInWishlist={wishlistPids.includes(product.product_id)}
                setIsInWishlist={(pid, isInWishlist) => {
                  setWishlistPids((prev) => {
                    if (isInWishlist) return prev.includes(pid) ? prev : [...prev, pid];
                    return prev.filter((p) => p !== pid);
                  });
                }}
                pwPrefix='esa'
                isRecommendation={false}
                hasFindSimilar={false}
                skipViewTracking={viewedProductIdsRef.current.has(viewedKey)}
                onProductViewed={() => viewedProductIdsRef.current.add(viewedKey)}
              />
            </div>
          );
        })}
      </div>
    )}

    {/* No matches — e.g. an image search that didn't return any visually similar products.
        Gated on productsSettled (not just !isLoading) — isLoading flips false on the first chat_token
        so the AI text can stream in, often before any `product` SSE events have arrived, so `products`
        can be transiently empty. Without this gate, that transient state would flash this message
        before the real products stream in a moment later. */}
    {!turn.isLoading && turn.productsExpanded && turn.products.length === 0 && turn.productsSettled && (
      <p className='text-sm text-gray-500 dark:text-neutral-400 mb-4'>{intl.formatMessage({ id: 'noProductsFound' })}</p>
    )}
  </div>
  );
};

export default TurnSection;
