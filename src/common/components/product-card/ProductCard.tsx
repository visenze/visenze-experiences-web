import { useContext, useEffect, useState, type CSSProperties, type FC } from 'react';
import { Skeleton } from '@heroui/skeleton';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import ResultLogicImpl from '../../client/result-logic';
import { Actions } from '../../types/tracking-constants';
import CustomizableIcon from '../../icons/CustomizableIcon';
import type { WidgetConfig } from '../../wigmix-core';
import { getCurrencyFormatter } from '../../locales/locale';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../../default-configs';
import MagnifyingGlassIcon from '../../icons/MagnifyingGlassIcon';

interface ProductCardProps {
  result: ProcessedProduct;
  index: number;
  isRecommendation: boolean;
  onFindSimilar?: (data: ProcessedProduct) => void;
  hasFindSimilar: boolean;
  pwPrefix: string;
  imageClasses?: string;
  metadata: Record<string, any>;
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
  if (!customizations.productCard?.price?.show) {
    return '';
  }
  if (result[productDetails['price']]) {
    const priceNumber = +result[productDetails['price']].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations, result[productDetails['price']].currency);
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
  if (!customizations.productCard?.originalPrice?.show || !customizations.productCard?.price?.show) {
    return '';
  }
  if (result[productDetails['original_price']]) {
    const priceNumber = +result[productDetails['original_price']].value;
    if (priceNumber === 0) {
      return '';
    }
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations, result[productDetails['original_price']].currency);
    return currencyFormatter.format(priceNumber);
  }
  return '';
};

const getProductUrlWithTrackingParams = (
    productUrl: string | null | undefined,
    trackingMeta: Record<string, any>,
    isRecommendation: boolean,
): string => {
  if (!productUrl) {
    return '';
  }
  const url = new URL(String(productUrl));
  // For recommendation widgets, we set the query ID, product ID, and position in the URL.
  // This allows other recommendation widgets on the page to use these values as the source for their tracking events.
  if (isRecommendation) {
    url.searchParams.set('vsFromReqId', trackingMeta['queryId']);
    url.searchParams.set('vsFromPid', trackingMeta['pid']);
    url.searchParams.set('vsFromPos', trackingMeta['pos']);
  }
  return url.toString();
};

const ProductCard: FC<ProductCardProps> = ({
  result,
  index,
  isRecommendation,
  onFindSimilar,
  hasFindSimilar,
  pwPrefix,
  imageClasses,
  metadata,
}) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { displaySettings, callbacks, customizations, languageSettings } = widgetConfig;
  const { productDetails } = displaySettings;
  const { onProductClick } = callbacks;
  const [isLoading, setIsLoading] = useState(true);
  const openLinksInNewTab = customizations.productCard?.openLinksInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const { productTrackingMeta, onClick } = ResultLogicImpl({
    displaySettings,
    widgetClient,
    trackingMeta: metadata,
    index,
    onProductClick,
    result,
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
    if (!darkMode && customizations.productCard?.price?.fontColor) {
      cssConfig.color = customizations.productCard.price.fontColor;
    } else if (darkMode && customizations.productCard?.price?.fontColorDark) {
      cssConfig.color = customizations.productCard.price.fontColorDark;
    }
    return cssConfig;
  };

  const getProductOriginalPriceColorStyle = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    if (!darkMode && customizations.productCard?.originalPrice?.fontColor) {
      cssConfig.color = customizations.productCard.originalPrice.fontColor;
    } else if (darkMode && customizations.productCard?.originalPrice?.fontColorDark) {
      cssConfig.color = customizations.productCard.originalPrice.fontColorDark;
    }
    return cssConfig;
  };

  const originalPrice = getOriginalPrice(customizations, languageSettings, productDetails, result);
  const price = getPrice(customizations, languageSettings, productDetails, result);
  const productUrl = getProductUrlWithTrackingParams(result[productDetails['product_url']], productTrackingMeta, isRecommendation);

  return (
    <div className='wigmix-product-card'>
      <a className='cursor-pointer'
         ref={(r) => {
           if (r) {
             setTargetRef(r);
           }
         }}
         href={productUrl}
         target={openLinksInNewTab ? '_blank' : ''}
         rel={openLinksInNewTab ? 'noopener noreferrer' : ''}
         onClick={(event) => onClick(event, productUrl)}
         data-pw={`${pwPrefix}-product-result-card-${index + 1}`}>
        <div className='wigmix-product-card-image-container'>
          <div className='flex justify-center relative'>
            {isLoading && <Skeleton className={`aspect-square size-full ${imageClasses || ''}`} />}
            <img className={`wigmix-product-card-image aspect-square object-contain ${imageClasses || ''}`} src={result.im_url} alt=''
                 onLoad={() => {
                   setIsLoading(false);
                 }}
                 data-pw={`${pwPrefix}-product-result-card-image-${index + 1}`}/>
            {hasFindSimilar && !isLoading && customizations.productCard?.findSimilar?.enable && (
                <div
                    className={`wigmix-find-similar-button absolute ${createFindSimilarPositionClasses()} z-5 bg-white rounded-full p-1 hover:opacity-90`}
                    onClick={(event) => {
                      if (onFindSimilar) {
                        event.preventDefault();
                        event.stopPropagation();
                        onFindSimilar(result);
                      }
                    }}
                    style={{
                      backgroundColor: darkMode
                          ? (customizations.productCard?.findSimilar?.icon?.backgroundColorDark || '')
                          : (customizations.productCard?.findSimilar?.icon?.backgroundColor || ''),
                    }}
                    data-pw={`${pwPrefix}-more-like-this-button`}
                >
                  {customizations.productCard?.findSimilar?.icon?.url ? (
                      <CustomizableIcon
                          height={20}
                          width={20}
                          className='wigmix-find-similar-icon custom'
                          url={customizations.productCard.findSimilar.icon.url}
                          color={darkMode
                              ? (customizations.productCard.findSimilar.icon.colorDark || '')
                              : (customizations.productCard.findSimilar.icon.color || '')}
                      />
                  ) : (
                      <MagnifyingGlassIcon
                          className='wigmix-find-similar-icon default size-5'
                          color={darkMode
                              ? (customizations.productCard?.findSimilar?.icon?.colorDark || '')
                              : (customizations.productCard?.findSimilar?.icon?.color || '')}
                      />
                  )}
                </div>
            )}
          </div>
        </div>
        <div className='wigmix-product-card-details pt-2'>
          <span className='wigmix-product-card-title line-clamp-1'>
            {getProductTitle(customizations, productDetails, result)}
          </span>
          <span className='wigmix-product-card-secondary-title line-clamp-1'>
            {getProductSecondaryTitle(customizations, productDetails, result)}
          </span>
          {
            originalPrice && originalPrice !== price
              ? (
                <div className='wigmix-product-card-price-row flex flex-wrap items-center gap-1'>
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
    </div>
  );
};

export default ProductCard;
