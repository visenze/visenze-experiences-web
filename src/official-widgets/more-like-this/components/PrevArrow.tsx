import { cn } from '@heroui/theme';
import type { FC, MouseEventHandler } from 'react';
import ChevronLeftIcon from '../../../common/icons/ChevronLeftIcon';

interface PrevArrowProps {
  className?: string;
  onClick?: MouseEventHandler;
  iconColor: string;
}

const PrevArrow: FC<PrevArrowProps> = ({ className, onClick, iconColor }) => (
  <div
    className={cn(
      'absolute -left-10 top-1/2 flex w-fit transition-opacity rounded-full p-1 cursor-pointer',
      className?.includes('slick-disabled') ? 'opacity-0' : 'opacity-100 hover:opacity-90',
    )}
    onClick={onClick}
    data-testid='wigmix-prev-arrow'
    data-pw='mlt-prev-arrow'
  >
    <ChevronLeftIcon className='size-6' color={iconColor} />
  </div>
);

export default PrevArrow;
