import type { FC } from 'react';
import type { ProcessedProduct } from '../../../common/types/product';

/**
 * An individual gallery image component
 */

interface GalleryImageProps {
  index: number;
  result: ProcessedProduct;
  onClickHandler: (result: ProcessedProduct) => void;
}

const GalleryImage: FC<GalleryImageProps> = ({ result, onClickHandler }) => (
    <a className='cursor-pointer' onClick={() => onClickHandler(result)}>
      <div className='group aspect-square overflow-hidden'>
        <img className='size-full object-contain transition duration-200 group-hover:scale-110' src={result.im_url}/>
      </div>
    </a>
);

export default GalleryImage;
