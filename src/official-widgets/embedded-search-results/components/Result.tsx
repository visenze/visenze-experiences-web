import type { FC } from 'react';
import { useState, useEffect, useRef, useContext } from 'react';
import { Button } from '@nextui-org/button';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import ResultLogicImpl from '../../../common/client/result-logic';
import type { ProcessedProduct } from '../../../common/types/product';
import { Actions } from '../../../common/types/tracking-constants';
import MoreLikeThisIcon from '../../../common/icons/MoreLikeThisIcon';
import { getCurrencyFormatter } from '../../../common/locales/locale';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../../../common/default-configs';

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
  const targetRef = useRef<HTMLAnchorElement>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    productSearch,
    trackingMeta: metadata,
    isRecommendation: true,
    index,
    onProductClick,
    result,
  });
  const currencyFormatter = getCurrencyFormatter(
      languageSettings?.locale || DEFAULT_LOCALE,
      languageSettings?.currency || DEFAULT_CURRENCY,
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
    const target = targetRef.current;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && productTrackingMeta) {
          observer.disconnect();
          productSearch.send(Actions.PRODUCT_VIEW, productTrackingMeta);
        }
      });
    }, {
      root: null,
      threshold: 0.8,
    });

    if (target) {
      observer.observe(target);
    }

    // Clean up observer when the component unmounts
    return (): void => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <></>;
  }

  return (
    <a className={`${debugMode ? '' : 'cursor-pointer'}`} ref={targetRef} onClick={debugMode ? undefined : onClick}>
      <div className='relative'>
        <div className='aspect-[2/3]'>
          <img className='size-full object-cover' src={result.im_url}/>
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
        <span className='product-card-title line-clamp-1 text-primary'>{getProductName()}</span>
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

export default Result;
