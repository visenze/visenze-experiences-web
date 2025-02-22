import type { FC, ReactElement } from 'react';
import { cn } from '@heroui/theme';

interface FooterProps {
  className?: string;
  dataPw?: string;
}

const Footer: FC<FooterProps> = ({ className, dataPw }): ReactElement => (
  <div className={cn('z-10 flex w-full justify-center items-center', className)} data-pw={dataPw}>
    <p className='text-xs'>POWERED BY </p>
    <img
      src='https://cdn.visenze.com/images/visenze-logo-sm.png'
      className='h-5 object-center py-0.5 pl-1'
    />
  </div>
);

export default Footer;
