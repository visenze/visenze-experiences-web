import type { FC, ReactElement } from 'react';
import { cn } from '@heroui/theme';

interface FooterProps {
  className?: string
  dataPw?: string,
}

const Footer: FC<FooterProps> = ({ className, dataPw }): ReactElement => (
  <div className={cn('z-10 flex w-full justify-center items-center', className)} data-pw={dataPw}>
    <p className='text-xs'>POWERED BY </p>
    <img
      src='https://visenze-static.s3.amazonaws.com/demos/ms-adidas/ViSenze-FullColor-Horizontal.png'
      className='h-5 object-center pb-1 pl-1'
    />
  </div>
);

export default Footer;
