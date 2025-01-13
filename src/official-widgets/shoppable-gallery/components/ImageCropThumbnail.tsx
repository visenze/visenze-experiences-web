import { memo, useEffect, useRef, useCallback, useContext } from 'react';
import type { ReactNode, FC } from 'react';
import { cn } from '@nextui-org/theme';
import { CroppingContext } from '../../../common/types/contexts';

/**
 * This component is responsible for rendering a cropped thumbnail of an image based on the provided box coordinates.
 * It uses a canvas element to display the cropped portion of the image.
 */

interface ImageCropThumbnailProps {
  imageUrl: string;
  box: number[];
  index: number;
  className?: string;
}

const ImageCropThumbnail: FC<ImageCropThumbnailProps> = ({ imageUrl, box, index }): ReactNode => {
  const { selectedHotspot, setSelectedHotspot } = useContext(CroppingContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getCroppedImage = useCallback(async () => {
    const image = new Image();
    image.src = imageUrl;
    try {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      // Destructure the `box` array into coordinates of the rectangle to be cropped
      const [x1, y1, x2, y2] = box;
      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;
      // Determine the longer side of the rectangle to use as the size of the new square's sides
      const max = Math.max(boxWidth, boxHeight);
      // Calculate half the difference between the width and height of the rectangle
      const diff = Math.abs(boxWidth - boxHeight) / 2;
      // Adjust the x-coordinate for the top-left corner of the new cropping area
      const x1New = boxWidth < boxHeight ? x1 - diff : x1;
      // Adjust the y-coordinate for the top-left corner of the new cropping area
      const y1New = boxHeight < boxWidth ? y1 - diff : y1;
      // Create a new `ImageBitmap` object representing the cropped area of the original image
      const croppedImage = await createImageBitmap(image, x1New, y1New, max, max);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.height = 64;
        canvas.width = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate the ratio to scale the cropped image to fit into the canvas
        const ratio = Math.min(canvas.width / croppedImage.width, canvas.height / croppedImage.height);
        // Calculate the center position for the cropped image on the canvas
        const centerShiftX = (canvas.width - croppedImage.width * ratio) / 2;
        const centerShiftY = (canvas.height - croppedImage.height * ratio) / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw the cropped image on the canvas, centered and scaled
        ctx.drawImage(croppedImage, 0, 0, croppedImage.width, croppedImage.height, centerShiftX, centerShiftY, croppedImage.width * ratio, croppedImage.height * ratio);
      }
    } catch (error) {
      console.error('Error loading or cropping image:', error);
    }
  }, [imageUrl, box]);

  useEffect(() => {
    getCroppedImage();
  }, [getCroppedImage]);

  return <canvas ref={canvasRef} className={cn('size-16 cursor-pointer rounded-xl', selectedHotspot !== index && 'opacity-50')} onClick={() => setSelectedHotspot(index)} />;
};

export default memo(ImageCropThumbnail);
