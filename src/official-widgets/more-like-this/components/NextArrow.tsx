import type { FC, MouseEventHandler } from 'react';
import { Button } from '@heroui/button';
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
      'absolute -right-12 top-1/2 z-20 flex w-12 transition-opacity',
      className?.includes('slick-disabled') ? 'opacity-0' : 'opacity-100',
    )}
    data-pw='mlt-next-arrow'
  >
    <Button
      isIconOnly
      disableRipple
      className='bg-transparent'
      size='md'
      onClick={onClick}
    >
      <CustomizableIcon
          height={24}
          width={24}
          url={'https://cdn.visenze.com/images/chevron-right-icon.svg'}
          color={iconColor}
      />
    </Button>
  </div>
);

export default NextArrow;
