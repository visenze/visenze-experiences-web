import type { FC } from 'react';
import { memo, useState, useEffect, useContext } from 'react';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import ResultLogicImpl from '../../../common/client/result-logic';
import type { ProcessedProduct } from '../../../common/types/product';
import { Actions } from '../../../common/types/tracking-constants';
import { getCurrencyFormatter } from '../../../common/locales/locale';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../../../common/default-configs';

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
  const currencyFormatter = getCurrencyFormatter(
      languageSettings?.locale || customizations.languageSettings?.defaultLocale || DEFAULT_LOCALE,
      languageSettings?.currency || customizations.languageSettings?.defaultCurrency || DEFAULT_CURRENCY,
  );

  const getProductName = (): string => {
    if (result[productDetails.title]) {
      return result[productDetails.title];
    }
    return '';
  };

  const getPrice = (): string => {
    if (result[productDetails.price]) {
      const priceNumber = +result[productDetails.price].value;
      return currencyFormatter.format(priceNumber);
    }
    return '';
  };

  const getOriginalPrice = (): string => {
    if (result[productDetails.originalPrice]) {
      const priceNumber = +result[productDetails.originalPrice].value;
      return currencyFormatter.format(priceNumber);
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
    <a className={`${debugMode ? '' : 'cursor-pointer'}`} ref={(r) => r && setTargetRef(r)}
       onClick={debugMode ? undefined : onClick} data-pw={`rm-product-result-card-${index + 1}`}>
      <div className='h-52 w-36 md:h-72 md:w-48 lg:h-96 lg:w-64'>
        <img className='size-full object-cover' src={result.im_url}/>
      </div>
      <div className='flex w-36 flex-col pt-2 md:w-48 lg:w-64'>
        <span className='product-card-title truncate text-primary'>{getProductName()}</span>
        {
          getOriginalPrice() && getOriginalPrice() !== getPrice()
            ? (
              <div className='flex gap-1'>
                <span className='product-card-price text-red-500'>{getPrice()}</span>
                <span className='product-card-price text-gray-400 line-through'>{getOriginalPrice()}</span>
              </div>
            ) : (
              <span className='product-card-price text-primary'>{getPrice()}</span>
            )
        }
      </div>
    </a>
  );
};

export default memo(Result);
