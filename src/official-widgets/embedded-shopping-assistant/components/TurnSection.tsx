import { cn } from '@heroui/theme';
import type { FC, ReactNode } from 'react';
import { useIntl } from 'react-intl';
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
  loadingDotColor?: string;
  iconColor?: string;
}

const TurnSection: FC<TurnSectionProps> = ({
  turn, showDivider, onShowProducts, loadingDotColor, iconColor,
}) => {
  const intl = useIntl();

  return (
  <div>
    {showDivider && <hr className='border-gray-200 dark:border-neutral-700 my-6' />}

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

    {/* Loading — role='status'/aria-live announce this row to screen readers the moment it
        appears, same live-region pattern ChatWindow's own loading indicator already uses. */}
    {turn.isLoading && (
      <div className='flex items-center gap-2 mb-4' role='status' aria-live='polite' aria-atomic='true'>
        {[0, 1, 2].map((i) => (
          <div
            key={`dot-${turn.id}-${i}`}
            className='loading-dot rounded-full'
            style={{ animationDelay: `${i * 0.2}s`, backgroundColor: loadingDotColor }}
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
  </div>
  );
};

export default TurnSection;
