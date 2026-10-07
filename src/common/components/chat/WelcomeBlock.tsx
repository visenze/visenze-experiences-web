import { cn } from '@heroui/theme';
import type { FC } from 'react';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import type { WidgetConfig } from '../../wigmix-core';

type Welcome = NonNullable<NonNullable<WidgetConfig['customizations']['chatbot']>['welcomeScreen']>;

// Single source of truth for "is the structured welcome in use", so a widget skipping its own
// opening greeting and ChatWindow rendering the block can never disagree.
export const isWelcomeEnabled = (welcome?: Welcome): boolean => Boolean(
  welcome?.enabled && (welcome.title || welcome.intro || welcome.suggestions?.length),
);

// The optional narration-only greeting ('' when unset, empty, or spokenGreetingEnabled is false).
export const getWelcomeSpokenGreeting = (welcome?: Welcome): string => (
  isWelcomeEnabled(welcome) && welcome?.spokenGreetingEnabled !== false ? (welcome?.spokenGreeting || '') : ''
);

interface WelcomeBlockProps {
  welcome: Welcome;
  fontColor?: string;
  onSelect: (suggestion: string) => void;
}

const WelcomeBlock: FC<WelcomeBlockProps> = ({ welcome, fontColor, onSelect }) => {
  const { title, intro, suggestionsLabel } = welcome;
  const suggestions = (welcome.suggestions || []).filter(Boolean);
  return (
    <section
      className='wigmix-welcome mx-auto flex w-full max-w-md flex-col gap-3 py-2 text-neutral-900 dark:text-neutral-100'
      style={fontColor ? { color: fontColor } : undefined}
    >
      {title && <h2 className='wigmix-welcome-title m-0 text-3xl font-bold leading-tight'>{title}</h2>}
      {intro && <p className='wigmix-welcome-intro m-0 text-base opacity-80'>{intro}</p>}
      {suggestions.length > 0 && (
        <div className='mt-4 flex flex-col gap-3'>
          {suggestionsLabel && (
            <p className='wigmix-welcome-suggestions-label m-0 text-sm font-semibold uppercase tracking-wide opacity-60'>{suggestionsLabel}</p>
          )}
          <div className='grid grid-cols-2 gap-1.5'>
            {suggestions.map((suggestion, idx) => (
              <button
                key={`welcome-suggestion-${idx}`}
                type='button'
                className={cn(
                  'cursor-pointer rounded border border-neutral-300 dark:border-neutral-600 bg-transparent px-2.5 py-1.5 text-start text-xs text-inherit',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  // An odd final chip spans the full row, as in the reference design.
                  idx === suggestions.length - 1 && suggestions.length % 2 === 1 && 'col-span-2',
                  FOCUS_VISIBLE_CLASSES,
                )}
                onClick={() => onSelect(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default WelcomeBlock;
