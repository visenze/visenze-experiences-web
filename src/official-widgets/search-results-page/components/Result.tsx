import type { CSSProperties, FC } from 'react';
import { useState, useEffect, useContext } from 'react';
import { Button } from '@nextui-org/button';
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
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

/**
 * An individual product result card
 */

interface ResultProps {
  index: number;
  result: ProcessedProduct;
  onClickMoreLikeThisHandler: (product: ProcessedProduct) => void;
}

const Result: FC<ResultProps> = ({ index, result, onClickMoreLikeThisHandler }) => {
  const { productSearch, displaySettings, customizations, callbacks, languageSettings } = useContext(WidgetDataContext);
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
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

  const createFindSimilarPositionClasses = (): string => {
    const position = customizations.productCard?.findSimilar?.position || 'bottom_right';
    switch (position) {
      case 'bottom_left':
        return 'bottom-3 left-3';
      case 'bottom_right':
        return 'bottom-3 right-3';
      case 'top_left':
        return 'top-3 left-3';
      case 'top_right':
        return 'top-3 right-3';
      default:
        return '';
    }
  };

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
    <a className='size-full cursor-pointer' ref={(r) => r && setTargetRef(r)}
       onClick={onClick} data-pw={`srp-product-result-card-${index + 1}`}>
      <div className='relative'>
        <div>
          <img className='wigmix-product-card-image object-cover' src={result.im_url}
               data-pw={`srp-product-result-card-image-${index + 1}`}/>
        </div>
        {customizations.productCard?.findSimilar?.enable && (
          <Button
              isIconOnly
              size='sm'
              radius='full'
              className={`wigmix-find-similar-button absolute ${createFindSimilarPositionClasses()} z-10 bg-white shadow-md`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClickMoreLikeThisHandler(result);
              }}
              data-pw='srp-more-like-this-button'
          >
            <CustomizableIcon
                height={20}
                width={20}
                url={customizations?.productCard?.findSimilar?.icon?.url || 'https://cdn.visenze.com/images/magnifying-glass-icon.svg'}
                color={customizations?.productCard?.findSimilar?.icon?.color || ''}
            />
          </Button>
        )}
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
