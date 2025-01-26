import { useContext, useEffect, useState, type CSSProperties, type FC } from 'react';
import { Button } from '@nextui-org/button';
import { Skeleton } from '@nextui-org/skeleton';
import { WidgetDataContext, WidgetResultContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import ResultLogicImpl from '../../client/result-logic';
import { Actions } from '../../types/tracking-constants';
import CustomizableIcon from '../../icons/CustomizableIcon';
import type { WidgetConfig } from '../../visenze-core';
import { getCurrencyFormatter } from '../../locales/locale';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../../default-configs';

interface ProductCardProps {
  result: ProcessedProduct;
  index: number;
  isRecommendation: boolean;
  onFindSimilar?: (data: ProcessedProduct) => void;
  hasFindSimilar: boolean;
  pwPrefix: string;
  imageClasses?: string;
}

const currencyFormatterFactory = (
    languageSettings: WidgetConfig['languageSettings'],
    customizations: WidgetConfig['customizations'],
    currencyFromProduct?: string,
): Intl.NumberFormat => getCurrencyFormatter(
    languageSettings?.locale || customizations.localization?.defaultLocale || DEFAULT_LOCALE,
    currencyFromProduct || languageSettings?.currency || customizations.localization?.defaultCurrency || DEFAULT_CURRENCY,
);

const getProductTitle = (
    customizations: WidgetConfig['customizations'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCard?.title || !customizations.productCard.title.show) {
    return '';
  }
  const titleField = productDetails[customizations.productCard.title.fieldSource || 'title'];
  return result[titleField] || '';
};

const getProductSecondaryTitle = (
    customizations: WidgetConfig['customizations'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCard?.secondaryTitle || !customizations.productCard.secondaryTitle.show) {
    return '';
  }
  const secondaryTitleField = productDetails[customizations.productCard.secondaryTitle.fieldSource || 'brand'];
  return result[secondaryTitleField] || '';
};

const getPrice = (
    customizations: WidgetConfig['customizations'],
    languageSettings: WidgetConfig['languageSettings'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations?.productCard?.price?.show) {
    return '';
  }
  if (result[productDetails.price]) {
    const priceNumber = +result[productDetails.price].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations, result[productDetails.price].currency);
    return currencyFormatter.format(priceNumber);
  }
  return '';
};

const getOriginalPrice = (
    customizations: WidgetConfig['customizations'],
    languageSettings: WidgetConfig['languageSettings'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCard?.originalPrice?.show || !customizations?.productCard?.price?.show) {
    return '';
  }
  if (result[productDetails.original_price]) {
    const priceNumber = +result[productDetails.original_price].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations, result[productDetails.original_price].currency);
    return currencyFormatter.format(priceNumber);
  }
  return '';
};

const ProductCard: FC<ProductCardProps> = ({
  result,
  index,
  isRecommendation,
  onFindSimilar,
  hasFindSimilar,
  pwPrefix,
  imageClasses,
}) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { displaySettings, callbacks, customizations, languageSettings } = widgetConfig;
  const { productDetails } = displaySettings;
  const { metadata } = useContext(WidgetResultContext);
  const { onProductClick } = callbacks;
  const [isLoading, setIsLoading] = useState(true);
  const openLinksInNewTab = customizations.productCard?.openLinksInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    widgetClient,
    trackingMeta: metadata,
    isRecommendation,
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
          widgetClient.sendEvent(Actions.PRODUCT_VIEW, productTrackingMeta);
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
    <a className='wigmix-product-card cursor-pointer' ref={(r) => r && setTargetRef(r)}
       onClick={onClick} data-pw={`${pwPrefix}-product-result-card-${index + 1}`}>
      <div className='relative'>
        <div className='flex justify-center'>
          {isLoading && <Skeleton className={`aspect-square size-full ${imageClasses || ''}`} />}
          <img className={`wigmix-product-card-image aspect-square object-cover ${imageClasses || ''}`} src={result.im_url} alt=''
               onLoad={() => {
                 setIsLoading(false);
               }}
               data-pw={`${pwPrefix}-product-result-card-image-${index + 1}`}/>
        </div>
        {hasFindSimilar && !isLoading && customizations.productCard?.findSimilar?.enable && (
          <Button
              isIconOnly
              size='sm'
              radius='full'
              className={`wigmix-find-similar-button absolute ${createFindSimilarPositionClasses()} z-10 bg-white shadow-md`}
              onClick={(event) => {
                if (onFindSimilar) {
                  event.preventDefault();
                  event.stopPropagation();
                  onFindSimilar(result);
                }
              }}
              data-pw={`${pwPrefix}-more-like-this-button`}
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
                <span className='wigmix-product-card-price' style={getProductPriceColorStyle()}>
                  {price}
                </span>
                <span className='wigmix-product-card-original-price line-through' style={getProductOriginalPriceColorStyle()}>
                  {originalPrice}
                </span>
              </div>
            ) : (
              <span className='wigmix-product-card-price'>{price}</span>
            )
        }
      </div>
    </a>
  );
};

export default ProductCard;
