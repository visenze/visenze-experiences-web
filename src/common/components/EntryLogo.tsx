import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';

interface EntryLogoProps {
  url: string;
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}

// A configured brand logo for an entry-bar button. Unlike CustomizableIcon (a fixed-size box), it
// keeps the image's natural aspect ratio, since entry logos are often wide wordmarks. A tint is
// applied as a mask over an invisible copy of the image that still provides the sizing.
const EntryLogo: FC<EntryLogoProps> = ({ url, color, height, width, className }): ReactElement => {
  if (!color || color === 'DEFAULT_ICON_COLOR') {
    return <img src={url} alt='' aria-hidden='true' className={cn('wigmix-entry-logo', className)} style={{ height, width }} />;
  }
  return (
    <span className='wigmix-entry-logo relative inline-flex' aria-hidden='true'>
      <img src={url} alt='' className={cn('invisible', className)} style={{ height, width }} />
      <span
        className='absolute inset-0'
        style={{
          backgroundColor: color,
          mask: `url(${url}) no-repeat center / contain`,
        }}
      />
    </span>
  );
};

export default EntryLogo;
