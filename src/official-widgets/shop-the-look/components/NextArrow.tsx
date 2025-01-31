import type { FC, MouseEventHandler } from 'react';
import { cn } from '@heroui/theme';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

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
    data-pw='stl-next-arrow'
  >
    <CustomizableIcon
        height={24}
        width={24}
        url={'https://cdn.visenze.com/images/chevron-right-icon.svg'}
        color={iconColor}
    />
  </div>
);

export default NextArrow;
