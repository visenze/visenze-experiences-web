import type { FC } from 'react';
import { useState, useEffect, useContext } from 'react';
import { Button } from '@nextui-org/button';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import ResultLogicImpl from '../../../common/client/result-logic';
import type { ProcessedProduct } from '../../../common/types/product';
import { Actions } from '../../../common/types/tracking-constants';
import MoreLikeThisIcon from '../../../common/icons/MoreLikeThisIcon';
import {
  getOriginalPrice,
  getPrice,
  getProductSecondaryTitle,
  getProductTitle,
} from '../../../common/components/product-card-parts';

/**
 * An individual product result card
 */

interface ResultProps {
  index: number;
  result: ProcessedProduct;
  findSimilarClickHandler: (imgUrl: string) => void;
}

const Result: FC<ResultProps> = ({ index, result, findSimilarClickHandler }) => {
  const { productSearch, displaySettings, callbacks, debugMode, customizations, searchBarResultsSettings } = useContext(WidgetDataContext);
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
  const { languageSettings } = useContext(WidgetDataContext);
  const { onProductClick } = callbacks;
  const [isLoading, setIsLoading] = useState(true);
  const isOpenInNewTab = customizations.productCards?.isOpenInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    productSearch,
    trackingMeta: metadata,
    isRecommendation: true,
    index,
    onProductClick,
    result,
    isOpenInNewTab,
  });

  // Send Product View tracking event when the product is in view
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && productTrackingMeta) {
          observer.disconnect();
          productSearch.sendEvent(Actions.PRODUCT_VIEW, productTrackingMeta);
        }
      });
    }, {
      root: null,
      threshold: 0.8,
    });

    if (targetRef) {
      observer.observe(targetRef);
    }

    // Clean up observer when the component unmounts
    return (): void => {
      observer.disconnect();
    };
  }, [targetRef]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <></>;
  }

  const originalPrice = getOriginalPrice(customizations, languageSettings, productDetails, result);
  const price = getPrice(customizations, languageSettings, productDetails, result);

  return (
    <a className={`${debugMode ? '' : 'cursor-pointer'}`} ref={(r) => r && setTargetRef(r)} onClick={debugMode ? undefined : onClick}>
      <div className='relative'>
        <div>
          <img className='widget-product-card-image object-cover' src={result.im_url}/>
        </div>
        {
          searchBarResultsSettings.enableFindSimilar
          && <Button
            isIconOnly
            size='sm'
            radius='full'
            className='absolute bottom-3 right-3 z-10 bg-white shadow-md'
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              findSimilarClickHandler(result.im_url);
            }}
            data-pw='esr-more-like-this-button'
          >
            {
              customizations?.icons.moreLikeThis
                ? <img src={customizations.icons.moreLikeThis} className='size-5'></img>
                : <MoreLikeThisIcon className='size-5'/>
            }
          </Button>
        }
      </div>
      <div className='pt-2'>
        <span className='wigmix-product-card-title line-clamp-1'>
          {getProductTitle(customizations, productDetails, result)}
        </span>
        <span className='wigmix-product-card-secondary-title line-clamp-1'>
          {getProductSecondaryTitle(customizations, productDetails, result)}
        </span>
        {
          originalPrice && originalPrice !== price
            ? (
              <div className='flex flex-wrap gap-1'>
                <span className='wigmix-product-card-price text-red-500'>{price}</span>
                <span className='wigmix-product-card-original-price text-gray-400 line-through'>{originalPrice}</span>
              </div>
            ) : (
              <span className='wigmix-product-card-price text-primary'>{price}</span>
            )
        }
      </div>
    </a>
  );
};

export default Result;
