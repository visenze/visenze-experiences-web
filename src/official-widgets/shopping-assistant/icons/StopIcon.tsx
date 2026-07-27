import type { FC, ReactElement } from 'react';

interface StopIconProps {
  className?: string;
  color?: string;
}

const StopIcon: FC<StopIconProps> = ({ className, color }): ReactElement => (
  <div className={className} style={{ color }}>
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'
         className='size-6' width='24' height='24'>
      <rect x='7' y='7' width='10' height='10' rx='1.5' fill='currentColor' />
    </svg>
  </div>
);

export default StopIcon;
