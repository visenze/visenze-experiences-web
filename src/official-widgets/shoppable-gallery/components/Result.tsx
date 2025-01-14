import { useState, useEffect, useContext, type CSSProperties, type FC } from 'react';
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
  const { productSearch, displaySettings, callbacks, customizations, languageSettings } = useContext(WidgetDataContext);
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
  const { onProductClick } = callbacks;
  const [isLoading, setIsLoading] = useState(true);
  const openLinksInNewTab = customizations.productCard?.openLinksInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    productSearch,
    trackingMeta: metadata,
    isRecommendation: true,
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

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <></>;
  }

  const getProductPriceColorStyle = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    if (customizations.productCard?.price?.fontColor) {
      cssConfig.color = customizations.productCard?.price?.fontColor;
    }
    return cssConfig;
  };

  const getProductOriginalPriceColorStyle = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    if (customizations.productCard?.originalPrice?.fontColor) {
      cssConfig.color = customizations.productCard?.originalPrice?.fontColor;
    }
    return cssConfig;
  };

  const originalPrice = getOriginalPrice(customizations, languageSettings, productDetails, result);
  const price = getPrice(customizations, languageSettings, productDetails, result);

  return (
    <a className='cursor-pointer' ref={(r) => r && setTargetRef(r)}
       onClick={onClick}>
      <div>
        <img className='wigmix-product-card-image object-cover' src={result.im_url}/>
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
              <div className='flex flex-wrap items-center gap-1'>
                <span className='wigmix-product-card-price text-red-500' style={getProductPriceColorStyle()}>{price}</span>
                <span className='wigmix-product-card-original-price text-gray-400 line-through' style={getProductOriginalPriceColorStyle()}>{originalPrice}</span>
              </div>
            ) : (
              <span className='wigmix-product-card-price'>{price}</span>
            )
        }
      </div>
    </a>
  );
};

export default Result;
