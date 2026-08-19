import type { FC, ReactElement } from 'react';

const SpeakerWaveIcon: FC<{ className?: string; color?: string }> = ({ className, color }): ReactElement => (
  <div className={className} style={{ color }}>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' stroke='currentColor'>
      <path strokeLinecap='round' strokeLinejoin='round'
            d='M11.25 5.25 6.75 9H3.75a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h3l4.5 3.75a.75.75 0 0 0 1.25-.567V5.817a.75.75 0 0 0-1.25-.567Z' />
      <path strokeLinecap='round' strokeLinejoin='round' d='M16.5 8.25a5.25 5.25 0 0 1 0 7.5M19 5.5a9 9 0 0 1 0 13' />
    </svg>
  </div>
);

export default SpeakerWaveIcon;
