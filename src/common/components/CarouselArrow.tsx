import { cn } from '@heroui/theme';
import type { FC, MouseEventHandler } from 'react';
import { useIntl } from 'react-intl';
import ChevronLeftIcon from '../icons/ChevronLeftIcon';

interface CarouselArrowProps {
  direction: 'prev' | 'next';
  /** Passed by react-slick; carries `slick-disabled` at either end of a non-infinite carousel. */
  className?: string;
  onClick?: MouseEventHandler;
  /** Draw the arrow over the carousel edge instead of in the margin beside it. */
  inside?: boolean;
  /** Prefix of the `data-pw` test id, e.g. `stl2` gives `stl2-next-arrow`. */
  pwPrefix?: string;
}

/**
 * Round arrow button for a react-slick carousel. The light-gray background and black chevron are fixed
 * (not tied to the dark mode font color), so the arrow stays visible on light and dark pages alike.
 */
const CarouselArrow: FC<CarouselArrowProps> = ({ direction, className, onClick, inside, pwPrefix = 'carousel' }) => {
  const intl = useIntl();
  const isNext = direction === 'next';
  const isDisabled = !!className?.includes('slick-disabled');
  const insideClass = isNext ? 'right-1' : 'left-1';
  const outsideClass = isNext ? '-right-9' : '-left-9';
  return (
    <button
      type='button'
      className={cn(
        'absolute top-1/2 z-10 flex bg-[#E8E8EA] w-fit -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-1 transition-opacity',
        inside ? insideClass : outsideClass,
        isDisabled ? 'opacity-0' : 'opacity-100 hover:opacity-90',
      )}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={isNext
        ? intl.formatMessage({ id: 'a11yNextProducts', defaultMessage: 'Next products' })
        : intl.formatMessage({ id: 'a11yPreviousProducts', defaultMessage: 'Previous products' })}
      data-testid={`wigmix-${direction}-arrow`}
      data-pw={`${pwPrefix}-${direction}-arrow`}
    >
      <ChevronLeftIcon className={cn('size-6', isNext && 'rotate-180')} color='#000000' />
    </button>
  );
};

export default CarouselArrow;
