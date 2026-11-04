import { cn } from '@heroui/theme';
import type { FC, MouseEventHandler } from 'react';
import { useIntl } from 'react-intl';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';

interface NextArrowProps {
  className?: string;
  onClick?: MouseEventHandler;
  iconColor: string;
  /** Draw the arrow over the carousel edge (tablet) instead of in the margin beside it (desktop). */
  inside?: boolean;
}

const NextArrow: FC<NextArrowProps> = ({ className, onClick, iconColor, inside }) => {
  const intl = useIntl();
  const isDisabled = !!className?.includes('slick-disabled');
  return (
    <button
      type='button'
      className={cn(
        'absolute top-1/2 z-10 flex bg-[#E8E8EA] w-fit -translate-y-1/2 cursor-pointer items-center justify-center rounded-full p-1 transition-opacity',
        inside ? 'right-1' : '-right-9',
        isDisabled ? 'opacity-0' : 'opacity-100 hover:opacity-90',
      )}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={intl.formatMessage({ id: 'a11yNextProducts', defaultMessage: 'Next products' })}
      data-testid='wigmix-next-arrow'
      data-pw='stl2-next-arrow'
    >
      <ChevronLeftIcon className='size-6 rotate-180' color={iconColor} />
    </button>
  );
};

export default NextArrow;
