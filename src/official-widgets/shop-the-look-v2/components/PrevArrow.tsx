import { cn } from '@heroui/theme';
import type { FC, MouseEventHandler } from 'react';
import { useIntl } from 'react-intl';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';

interface PrevArrowProps {
  className?: string;
  onClick?: MouseEventHandler;
  iconColor: string;
  /** Draw the arrow over the carousel edge (tablet) instead of in the margin beside it (desktop). */
  inside?: boolean;
}

const PrevArrow: FC<PrevArrowProps> = ({ className, onClick, iconColor, inside }) => {
  const intl = useIntl();
  const isDisabled = !!className?.includes('slick-disabled');
  return (
    <button
      type='button'
      className={cn(
        'absolute top-1/2 z-10 flex bg-[#E8E8EA] w-fit -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-1 transition-opacity',
        inside ? 'left-1' : '-left-9',
        isDisabled ? 'opacity-0' : 'opacity-100 hover:opacity-90',
      )}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={intl.formatMessage({ id: 'a11yPreviousProducts', defaultMessage: 'Previous products' })}
      data-testid='wigmix-prev-arrow'
      data-pw='stl2-prev-arrow'
    >
      <ChevronLeftIcon className='size-6' color={iconColor} />
    </button>
  );
};

export default PrevArrow;
