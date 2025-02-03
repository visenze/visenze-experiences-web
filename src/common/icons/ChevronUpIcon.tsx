import type { FC, ReactElement } from 'react';

const ChevronUpIcon: FC<{ className?: string; color?: string }> = ({ className, color }): ReactElement => (
  <div className={className} style={{ color }}>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='4' stroke='currentColor'>
      <path strokeLinecap='round' strokeLinejoin='round' d='m4.5 15.75 7.5-7.5 7.5 7.5'/>
    </svg>
  </div>
);

export default ChevronUpIcon;
