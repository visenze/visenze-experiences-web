import type { FC } from 'react';
import { useEffect, useContext, useState, useRef } from 'react';
import { cn } from '@heroui/theme';
import type { ProductType } from 'visearch-javascript-sdk';
import { CroppingContext } from '../../types/contexts';
import type { CroppedBox } from '../../types/box';
import Hotspot from './hotspot';

interface HotspotContainerProps {
  referenceImage: string;
  referenceImageClassName?: string;
  className?: string;
  noSelectedHotspot?: boolean;
  handleBoxClick?: () => void;
  productTypes?: ProductType[];
}

const isSameBox = (box1: CroppedBox, box2: CroppedBox | undefined): boolean => {
  if (!box2) {
    return false;
  }
  return box1.x1 === box2.x1 && box1.y1 === box2.y1 && box1.x2 === box2.x2 && box1.y2 === box2.y2;
};

const HotspotContainer: FC<HotspotContainerProps> = ({
  referenceImage,
  referenceImageClassName,
  className,
  noSelectedHotspot,
  handleBoxClick,
  productTypes = [],
}) => {
  const { selectedHotspot, setSelectedHotspot, boxData, setBoxData } = useContext(CroppingContext);
  const [imageHeight, setImageHeight] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const [heightScale, setHeightScale] = useState(1);
  const [widthScale, setWidthScale] = useState(1);
  const [croppedBoxes, setCroppedBoxes] = useState<CroppedBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const onCropBoxInit = (): void => {
    const boxes: CroppedBox[] = productTypes.map((productType) => {
      const dataBox = productType.box;
      return {
        x1: dataBox[0],
        y1: dataBox[1],
        x2: dataBox[2],
        y2: dataBox[3],
      };
    });
    setCroppedBoxes(boxes);
    if (noSelectedHotspot) {
      return;
    }

    const croppedBox = boxData?.box;
    if (croppedBox) {
      const index = boxes.findIndex((box) => isSameBox(box, croppedBox));
      if (index !== -1) {
        setSelectedHotspot(index);
      }
    } else {
      setSelectedHotspot(0);
    }
  };

  const handleHotspotClick = (index: number): void => {
    setSelectedHotspot(index);
    setBoxData?.({
      box: croppedBoxes[index],
      index,
    });
    handleBoxClick?.();
  };

  const rescaleImage = (): void => {
    const img = imageRef.current;
    if (!img) {
      return;
    }
    setImageWidth(img.clientWidth);
    setImageHeight(img.clientHeight);
    setWidthScale(img.clientWidth / img.naturalWidth);
    setHeightScale(img.clientHeight / img.naturalHeight);
  };

  useEffect(() => {
    if (productTypes.length > 0) {
      onCropBoxInit();
    }
  }, [productTypes]);

  useEffect(() => {
    setIsLoading(false);
    window.addEventListener('resize', rescaleImage);
    return (): void => {
      window.removeEventListener('resize', rescaleImage);
    };
  }, []);

  if (isLoading) {
    return <></>;
  }

  return (
    <div className={cn('flex w-full justify-center', className)}>
      <div className='size-full overflow-hidden'>
        <div className='relative size-full text-center' ref={boxRef}>
          <>
            <img
              className={cn('object-cover size-full', referenceImageClassName)}
              ref={imageRef}
              src={referenceImage}
              onLoad={() => setTimeout(() => rescaleImage(), 250)} // Delay needed to get correct image width and height for calculation in onLoad
              data-pw='hotspot-reference-image'
            />
            <div
              className='absolute top-1/2 inline-block max-h-full max-w-full -translate-x-1/2 -translate-y-1/2'
              style={{
                width: imageWidth,
                height: imageHeight,
              }}>
              {croppedBoxes.map((box, index) => (
                <Hotspot
                  key={index}
                  index={index}
                  box={box}
                  heightScale={heightScale}
                  widthScale={widthScale}
                  isSelected={selectedHotspot === index}
                  handleHotspotClick={handleHotspotClick}
                />
              ))}
            </div>
          </>
        </div>
      </div>
    </div>
  );
};

export default HotspotContainer;
