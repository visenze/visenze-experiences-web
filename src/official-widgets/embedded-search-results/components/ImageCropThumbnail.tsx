import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@heroui/theme';

export default function ImageCropThumbnail({
  imageSrc,
  originalBox,
  className,
}: {
  imageSrc: string;
  originalBox: number[];
  className?: string;
}): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const getCroppedImage = (): void => {
      const image = new Image();
      image.src = imageSrc;

      image.onload = async (): Promise<void> => {
        const x1 = originalBox[0];
        const y1 = originalBox[1];
        const x2 = originalBox[2];
        const y2 = originalBox[3];
        const w = x2 - x1;
        const h = y2 - y1;

        const max = Math.max(w, h);

        let croppedImage: ImageBitmap;

        if (h > w) {
          const diff = (h - w) / 2;
          const x1New = x1 - diff;
          croppedImage = await createImageBitmap(image, x1New, y1, max, max);
        } else {
          const diff = (w - h) / 2;
          const y1New = y1 - diff;
          croppedImage = await createImageBitmap(image, x1, y1New, max, max);
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const parentRect = canvas.parentElement?.getBoundingClientRect();
          if (parentRect) {
            canvas.width = parentRect.width;
            canvas.height = parentRect.height;
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(croppedImage, 0, 0, canvas.width, canvas.height);
        }
      };
    };

    if (imageSrc && originalBox) {
      getCroppedImage();
    }
  }, [imageSrc, originalBox]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full object-cover', className)}
    />
  );
}
