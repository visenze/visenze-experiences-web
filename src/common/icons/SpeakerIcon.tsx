import type { FC, ReactElement } from 'react';

interface SpeakerIconProps {
  className?: string;
  color?: string;
  muted?: boolean;
}

const SpeakerIcon: FC<SpeakerIconProps> = ({ className, color, muted = false }): ReactElement => (
  <div className={className} style={{ color }}>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='1.5'
         stroke='currentColor' className='size-6' width='24' height='24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d={[
          'M19.114 5.636a9 9 0 0 1 0 12.728',
          'M16.463 8.288a5.25 5.25 0 0 1 0 7.424',
          'M6.75 8.25l4.72-3.777A.75.75 0 0 1 12.75 5.06v13.88a.75.75 0 0 1-1.28.587',
          'L6.75 15.75H4.5a1.5 1.5 0 0 1-1.5-1.5v-4.5a1.5 1.5 0 0 1 1.5-1.5h2.25Z',
        ].join(' ')}
      />
      {muted && (
        <path strokeLinecap='round' strokeLinejoin='round' d='m16.5 9.75 4.5 4.5m0-4.5-4.5 4.5' />
      )}
    </svg>
  </div>
);

export default SpeakerIcon;
