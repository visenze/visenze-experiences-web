import type { FC, MouseEventHandler } from 'react';
import { cn } from '@heroui/theme';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

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
    data-pw='stl-prev-arrow'
  >
    <CustomizableIcon
        height={24}
        width={24}
        url={'https://cdn.visenze.com/images/chevron-left-icon.svg'}
        color={iconColor}
    />
  </div>
);

export default PrevArrow;
