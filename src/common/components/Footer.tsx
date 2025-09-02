import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';

interface FooterProps {
  className?: string;
  dataPw?: string;
  darkMode?: boolean;
}

const Footer: FC<FooterProps> = ({ className, dataPw, darkMode }): ReactElement => (
  <div className={cn('z-10 flex w-full justify-center items-center', className)} data-pw={dataPw}>
    <p className='text-xs'>POWERED BY </p>
    <img src={darkMode
        ? 'https://cdn.visenze.com/images/visenze-rezolve-logo-white-md.png'
        : 'https://cdn.visenze.com/images/visenze-rezolve-logo-md.png'}
      className='h-5 object-center py-0.5 pl-1'
    />
  </div>
);

export default Footer;
