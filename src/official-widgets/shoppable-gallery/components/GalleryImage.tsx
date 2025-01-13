import type { FC } from 'react';
import { useState, useEffect, useContext } from 'react';
import { WidgetDataContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';

/**
 * An individual gallery image component
 */

interface GalleryImageProps {
  index: number;
  result: ProcessedProduct;
  onClickHandler: (result: ProcessedProduct) => void;
}

const GalleryImage: FC<GalleryImageProps> = ({ result, onClickHandler }) => {
  const { debugMode } = useContext(WidgetDataContext);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <a className={`${debugMode ? '' : 'cursor-pointer'}`} onClick={() => onClickHandler(result)}>
      <div className='group aspect-square overflow-hidden'>
        <img className='size-full object-cover transition duration-200 group-hover:scale-110' src={result.im_url}/>
      </div>
    </a>
  );
};

export default GalleryImage;
