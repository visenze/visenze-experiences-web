import type { FC, ReactElement } from 'react';

interface SubmitChatIconProps {
  className?: string;
  color?: string;
}

const SubmitChatIcon: FC<SubmitChatIconProps> = ({ className, color }): ReactElement => (
  <div className={className} style={{ color }}>
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'>
      <path fillRule='evenodd' clipRule='evenodd' d='M2.25 12a.75.75 0 0 1 .75-.75h16.19l-6.22-6.22a.75.75
        0 1 1 1.06-1.06l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1-.75-.75Z'/>
    </svg>
  </div>
);

export default SubmitChatIcon;
