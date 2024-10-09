import { useContext, memo, useRef, useEffect, useState } from 'react';
import { Button } from '@nextui-org/button';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';
import ResultLogicImpl from '../../../common/client/result-logic';
import type { SearchImage } from '../../../common/types/image';
import MoreLikeThisIcon from '../../../common/icons/MoreLikeThisIcon';
import { Actions } from '../../../common/types/tracking-constants';
import { getCurrencyFormatter } from '../../../common/locales/locale';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../../../common/default-configs';

interface ResultProps {
  result: ProcessedProduct;
  index: number;
  onMoreLikeThis: (data: SearchImage) => void;
  clearSearch: () => void;
  carouselRef?: React.RefObject<HTMLDivElement>;
}

const Result = memo(({
  result,
  index,
  onMoreLikeThis,
  clearSearch,
  carouselRef,
}: ResultProps) => {
  const { callbacks, displaySettings, productSearch, customizations, debugMode } = useContext(WidgetDataContext);
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
  const { languageSettings } = useContext(WidgetDataContext);
  const { onProductClick } = callbacks;
  const [isLoading, setIsLoading] = useState(true);
  const isOpenInNewTab = customizations.productSlider?.isOpenInNewTab || false;
  const targetRef = useRef<HTMLAnchorElement>(null);
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
    <a className={`${debugMode ? '' : 'cursor-pointer'}`} ref={targetRef} onClick={debugMode ? undefined : onClick} data-pw={`ss-product-result-card-${index + 1}`}>
      <div className='relative'>
        <div className='aspect-[2/3]'>
          <img className='size-full object-cover' src={result.im_url} data-pw={`ss-product-result-card-image-${index + 1}`}/>
        </div>
        <Button
          isIconOnly
          size='sm'
          radius='full'
          className='absolute bottom-3 right-3 z-10 bg-white shadow-md'
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onMoreLikeThis({ imgUrl: result.im_url });
            carouselRef?.current?.scrollTo({
              top: 0,
              left: 0,
              behavior: 'smooth',
            });
            clearSearch();
          }}
          data-pw='ss-more-like-this-button'
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
});

export default Result;
