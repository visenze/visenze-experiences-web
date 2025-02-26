import { cn } from '@heroui/theme';
import type { FC, MouseEventHandler } from 'react';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';

interface NextArrowProps {
  className?: string;
  onClick?: MouseEventHandler;
  iconColor: string;
}

const NextArrow: FC<NextArrowProps> = ({ className, onClick, iconColor }) => (
  <div
    className={cn(
      'absolute -right-12 top-1/2 flex w-fit transition-opacity rounded-full p-1 cursor-pointer',
      className?.includes('slick-disabled') ? 'opacity-0' : 'opacity-100 hover:opacity-90',
    )}
    onClick={onClick}
    data-testid='wigmix-next-arrow'
    data-pw='mlt-next-arrow'
  >
    <ChevronLeftIcon className='size-6 rotate-180' color={iconColor} />
  </div>
);

export default NextArrow;
