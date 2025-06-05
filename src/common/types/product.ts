import type { CroppedBox } from './box';
import type { BestImage } from 'visearch-javascript-sdk/types/shared';

export interface ProcessedProduct extends Record<string, any> {
  im_url: string;
  product_id: string;
  best_images?: BestImage[];
}

export interface BoxData {
  box: CroppedBox;
  index: number;
}
