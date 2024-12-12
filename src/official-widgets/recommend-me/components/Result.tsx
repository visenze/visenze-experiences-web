import type { FC } from 'react';
import { memo, useState, useEffect, useContext } from 'react';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import ResultLogicImpl from '../../../common/client/result-logic';
import type { ProcessedProduct } from '../../../common/types/product';
import { Actions } from '../../../common/types/tracking-constants';
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
}

const Result: FC<ResultProps> = ({ index, result }) => {
  const { productSearch, displaySettings, callbacks, customizations, debugMode } = useContext(WidgetDataContext);
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
  const { languageSettings } = useContext(WidgetDataContext);
  const { onProductClick } = callbacks;
  const openLinksInNewTab = customizations.productCard?.openLinksInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    productSearch,
    trackingMeta: metadata,
    isRecommendation: false,
    index,
    onProductClick,
    result,
    openLinksInNewTab,
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

  const originalPrice = getOriginalPrice(customizations, languageSettings, productDetails, result);
  const price = getPrice(customizations, languageSettings, productDetails, result);

  return (
    <a className={`${debugMode ? '' : 'cursor-pointer'}`} ref={(r) => r && setTargetRef(r)}
       onClick={debugMode ? undefined : onClick} data-pw={`rm-product-result-card-${index + 1}`}>
      <div className='w-36 md:w-48 lg:w-64'>
        <img className='widget-product-card-image object-cover' src={result.im_url}/>
      </div>
      <div className='flex w-36 flex-col pt-2 md:w-48 lg:w-64'>
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

export default memo(Result);
