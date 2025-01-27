import type { FC } from 'react';
import { memo, useEffect, useState } from 'react';
import { cn } from '@heroui/theme';
import type { CroppedBox } from '../../types/box';

interface HotspotProps {
  index: number;
  heightScale: number;
  widthScale: number;
  box: CroppedBox;
  isSelected: boolean;
  handleHotspotClick: (i: number) => void;
}

const Hotspot: FC<HotspotProps> = ({
  index,
  widthScale,
  heightScale,
  box,
  isSelected,
  handleHotspotClick,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const boxStyle = {
    top: `${box.y1 * heightScale}px`,
    left: `${box.x1 * widthScale}px`,
    width: `${(box.x2 - box.x1) * widthScale}px`,
    height: `${(box.y2 - box.y1) * heightScale}px`,
  };
  const dotStyle = {
    top: `${(box.y1 + box.y2) * 0.5 * heightScale - 6}px`,
    left: `${(box.x1 + box.x2) * 0.5 * widthScale - 6}px`,
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <></>;
  }

  return (
    <div
      tabIndex={0}
      aria-label={isSelected ? 'Hotspot selected' : 'Hotspot'}
      className={cn('duration-200', isSelected
        ? 'rounded-sm border-2 border-white bg-transparent absolute z-0 shadow-around box-border transition-[border-radius] ease-in-out'
        : 'md:w-3 md:h-3 w-4 h-4 bg-white hover:bg-opacity-100 bg-opacity-50 border-2 border-white rounded-3xl '
        + 'transition-none flex justify-center items-center absolute z-10 cursor-pointer')}
      style={isSelected ? boxStyle : dotStyle}
      onClick={() => handleHotspotClick(index)}
      onKeyDown={(event): void => {
        if (!isSelected && event.key === 'Enter') {
          handleHotspotClick(index);
        }
      }}
      data-pw={`hotspot-${index + 1}`}
    ></div>
  );
};
export default memo(Hotspot);
