import type { FC } from 'react';
import { useState, useEffect, useContext } from 'react';
import { Button } from '@nextui-org/button';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import ResultLogicImpl from '../../../common/client/result-logic';
import type { ProcessedProduct } from '../../../common/types/product';
import MoreLikeThisIcon from '../../../common/icons/MoreLikeThisIcon';
import { Actions } from '../../../common/types/tracking-constants';

/**
 * An individual product result card
 */

interface ResultProps {
  index: number;
  result: ProcessedProduct;
  onClickMoreLikeThisHandler: (product: ProcessedProduct) => void;
}

const Result: FC<ResultProps> = ({ index, result, onClickMoreLikeThisHandler }) => {
  const { productSearch, displaySettings, customizations, callbacks, debugMode } = useContext(WidgetDataContext);
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
  const { onProductClick } = callbacks;
  const isOpenInNewTab = customizations.productSlider?.isOpenInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    productSearch,
    trackingMeta: metadata,
    isRecommendation: false,
    index,
    onProductClick,
    result,
    isOpenInNewTab,
  });

  const getProductName = (): string => {
    if (result[productDetails.title]) {
      return result[productDetails.title];
    }
    return '';
  };

  const getPrice = (): string => {
    if (result[productDetails.price]) {
      return Number(result[productDetails.price].value).toFixed(2);
    }
    return '';
  };

  const getOriginalPrice = (): string => {
    if (result[productDetails.originalPrice]) {
      return Number(result[productDetails.originalPrice].value).toFixed(2);
    }
    return '';
  };

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

  return (
    <a className={`size-full ${debugMode ? '' : 'cursor-pointer'}`} ref={(r) => r && setTargetRef(r)}
       onClick={debugMode ? undefined : onClick} data-pw={`srp-product-result-card-${index + 1}`}>
      <div className='relative'>
        <div className='aspect-[2/3]'>
          <img className='object-fit size-full' src={result.im_url} data-pw={`srp-product-result-card-image-${index + 1}`}/>
        </div>
        <Button
          isIconOnly
          size='sm'
          radius='full'
          className='absolute bottom-3 right-3 z-10 bg-white shadow-md'
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClickMoreLikeThisHandler(result);
          }}
          data-pw='srp-more-like-this-button'
        >
          {
            customizations?.icons.moreLikeThis
              ? <img src={customizations.icons.moreLikeThis} className='size-5'></img>
              : <MoreLikeThisIcon className='size-5'/>
          }
        </Button>
      </div>
      <div className='pt-2'>
        <span className='product-card-title line-clamp-1 font-semibold text-primary'>{getProductName()}</span>
        {
          getOriginalPrice() && getOriginalPrice() !== getPrice()
            ? (
              <div className='flex gap-1'>
                <span className='product-card-price text-red-500'>${getPrice()}</span>
                <span className='product-card-price text-gray-400 line-through'>${getOriginalPrice()}</span>
              </div>
            ) : (
              <span className='product-card-price text-primary'>${getPrice()}</span>
            )
        }
      </div>
    </a>
  );
};

export default Result;
