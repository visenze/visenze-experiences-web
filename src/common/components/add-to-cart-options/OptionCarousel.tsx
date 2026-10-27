import { cn } from '@heroui/theme';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { handleRadioKeyDown, type OptionControlProps } from './option-control-props';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import ChevronLeftIcon from '../../icons/ChevronLeftIcon';

// Horizontally scrollable row of values with prev/next chevrons, hidden at either end.
const OptionCarousel: FC<OptionControlProps> = ({ label, values, value, onChange, selectedStyle }) => {
  const intl = useIntl();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback((): void => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    updateScrollState();
    if (!el || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return (): void => observer.disconnect();
  }, [values, updateScrollState]);

  const scrollByPage = (direction: 1 | -1): void => {
    const el = scrollerRef.current;
    if (!el) {
      return;
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const focusValue = (index: number): void => {
    const option = optionRefs.current[index];
    option?.focus();
    option?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };

  const tabbableIndex = value !== undefined && values.includes(value) ? values.indexOf(value) : 0;
  const chevronClasses = cn(
    'wigmix-add-to-cart-option-carousel-arrow flex size-6 flex-shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 cursor-pointer',
    FOCUS_VISIBLE_CLASSES,
  );

  return (
    <div className='wigmix-add-to-cart-option-carousel flex items-center gap-1 rounded-full bg-black/5 px-2 py-1 dark:bg-white/10'>
      <button
        type='button'
        aria-label={intl.formatMessage({ id: 'a11yAddToCartOptionsPrev' })}
        className={cn(chevronClasses, !canScrollPrev && 'invisible')}
        tabIndex={canScrollPrev ? 0 : -1}
        onClick={() => scrollByPage(-1)}
      >
        <ChevronLeftIcon className='size-4' />
      </button>
      <div
        ref={scrollerRef}
        role='radiogroup'
        aria-label={label}
        className='flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        onScroll={updateScrollState}
      >
        {values.map((optionValue, index) => {
          const isSelected = optionValue === value;
          return (
            <button
              key={optionValue}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type='button'
              role='radio'
              aria-checked={isSelected}
              tabIndex={index === tabbableIndex ? 0 : -1}
              className={cn(
                'wigmix-add-to-cart-option-carousel-value min-w-8 flex-shrink-0 whitespace-nowrap rounded-full border-0 px-2 py-1 text-sm cursor-pointer',
                !isSelected && 'bg-transparent',
                FOCUS_VISIBLE_CLASSES,
              )}
              style={isSelected ? selectedStyle : undefined}
              onClick={() => onChange(optionValue)}
              onKeyDown={(event) => handleRadioKeyDown(event, values, value, onChange, focusValue)}
            >
              {optionValue}
            </button>
          );
        })}
      </div>
      <button
        type='button'
        aria-label={intl.formatMessage({ id: 'a11yAddToCartOptionsNext' })}
        className={cn(chevronClasses, !canScrollNext && 'invisible')}
        tabIndex={canScrollNext ? 0 : -1}
        onClick={() => scrollByPage(1)}
      >
        <ChevronLeftIcon className='size-4 rotate-180' />
      </button>
    </div>
  );
};

export default OptionCarousel;
