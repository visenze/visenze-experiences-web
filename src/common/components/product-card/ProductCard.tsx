import { Skeleton } from '@heroui/skeleton';
import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import ResultLogicImpl from '../../client/result-logic';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../../default-configs';
import CustomizableIcon from '../../icons/CustomizableIcon';
import HeartFilledIcon from '../../icons/HeartFilledIcon';
import HeartIcon from '../../icons/HeartIcon';
import MagnifyingGlassIcon from '../../icons/MagnifyingGlassIcon';
import { getCurrencyFormatter } from '../../locales/locale';
import { WidgetDataContext } from '../../types/contexts';
import type { SearchImageOrPid } from '../../types/image';
import type { ProcessedProduct } from '../../types/product';
import { Actions } from '../../types/tracking-constants';
import type { WidgetConfig } from '../../wigmix-core';

interface ProductCardProps {
  result: ProcessedProduct;
  index: number;
  isRecommendation: boolean;
  onFindSimilar?: (data: SearchImageOrPid) => void;
  hasFindSimilar: boolean;
  pwPrefix: string;
  imageClasses?: string;
  metadata: Record<string, any>;
}

const currencyFormatterFactory = (
    languageSettings: WidgetConfig['languageSettings'],
    customizations: WidgetConfig['customizations'],
    hideDecimal: boolean,
    currencyFromProduct?: string,
): Intl.NumberFormat => getCurrencyFormatter(
    languageSettings?.locale || customizations.localization?.defaultLocale || DEFAULT_LOCALE,
    currencyFromProduct || languageSettings?.currency || customizations.localization?.defaultCurrency || DEFAULT_CURRENCY,
    hideDecimal,
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
    const currencyFormatter = currencyFormatterFactory(
        languageSettings,
        customizations,
        !!customizations.productCard.price.hideDecimal,
        result[productDetails['price']].currency,
    );
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
    const currencyFormatter = currencyFormatterFactory(
        languageSettings,
        customizations,
        !!customizations.productCard.originalPrice.hideDecimal,
        result[productDetails['original_price']].currency,
    );
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
  const { onProductClick, onAddToWishlistToggle } = callbacks;
  const [isLoading, setIsLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const openLinksInNewTab = customizations.productCard?.openLinksInNewTab || false;
  const [targetRef, setTargetRef] = useState<HTMLAnchorElement | null>(null);
  const intl = useIntl();
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

  const createWishListPositionClasses = (): string => {
    const position = customizations.productCard?.addToWishlist?.position || 'bottom_right';
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

  const getMainImageToDisplay = (): string => {
    const imageSrc = customizations.productCard?.images?.mainImage || 'main';
    const mainImageUrl = result.im_url;
    switch (imageSrc) {
      case 'main':
        return mainImageUrl;
      case 'best_product': {
        const bestProductImage = result.best_images?.find((bestImage) => bestImage.type === 'product')?.url;
        return bestProductImage || mainImageUrl;
      }
      case 'best_outfit': {
        const bestOutfitImage = result.best_images?.find((bestImage) => bestImage.type === 'outfit')?.url;
        return bestOutfitImage || mainImageUrl;
      }
      default: // should not be reachable
        return mainImageUrl;
    }
  };

  const getHoverImageToDisplay = (mainImageUrl: string): string => {
    const imageSrc = customizations.productCard?.images?.hoverImage || 'none';
    if (imageSrc === 'none') {
      return mainImageUrl;
    }
    const addImageUrl = result['additional_image_url']?.length
        ? result['additional_image_url'][0]
        : mainImageUrl;
    switch (imageSrc) {
      case 'best_product': {
        const bestProductImage = result.best_images?.find((bestImage) => bestImage.type === 'product')?.url;
        if (bestProductImage && bestProductImage !== mainImageUrl) {
          return bestProductImage;
        }
        return addImageUrl;
      }
      case 'best_outfit': {
        const bestOutfitImage = result.best_images?.find((bestImage) => bestImage.type === 'outfit')?.url;
        if (bestOutfitImage && bestOutfitImage !== mainImageUrl) {
          return bestOutfitImage;
        }
        return addImageUrl;
      }
      case 'additional':
        return addImageUrl;
      default: // should not be reachable
        return addImageUrl;
    }
  };

  const originalPrice = getOriginalPrice(customizations, languageSettings, productDetails, result);
  const price = getPrice(customizations, languageSettings, productDetails, result);
  const productUrl = getProductUrlWithTrackingParams(result[productDetails['product_url']], productTrackingMeta, isRecommendation);
  const mainImageUrl = getMainImageToDisplay();
  const hoverImageUrl = getHoverImageToDisplay(mainImageUrl);
  const wishlistIconConfig = isInWishlist
      ? customizations.productCard?.addToWishlist?.iconActive
      : customizations.productCard?.addToWishlist?.iconInactive;

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
         data-pw={`${pwPrefix}-product-result-card-${index + 1}`}
         data-testid='wigmix-product-card-anchor'>
        <div className='wigmix-product-card-image-container'>
          <div className='relative flex justify-center'>
            {isLoading && (
                <Skeleton className={cn(
                            `wigmix-product-card-image size-full ${imageClasses || ''}`,
                            customizations.productCard?.imageAspectRatio ? '' : 'aspect-square',
                          )}
                          style={{ aspectRatio: customizations.productCard?.imageAspectRatio || '' }}/>
            )}
            <img className={cn(
                   `wigmix-product-card-image object-cover ${imageClasses || ''}`,
                   customizations.productCard?.imageAspectRatio ? '' : 'aspect-square',
                 )}
                 src={mainImageUrl} alt=''
                 style={{ aspectRatio: customizations.productCard?.imageAspectRatio || '' }}
                 onLoad={() => {
                   setIsLoading(false);
                 }}
                 data-pw={`${pwPrefix}-product-result-card-image-${index + 1}`}
                 data-testid='wigmix-product-card-image'
                 onPointerEnter={(event) => {
                   event.currentTarget.src = hoverImageUrl;
                 }}
                 onPointerOut={(event) => {
                   event.currentTarget.src = mainImageUrl;
                 }}
            />
            {!isLoading && customizations.productCard?.addToWishlist?.enable && (
              <button
                className={`wigmix-wishlist-button absolute ${createWishListPositionClasses()} z-5 rounded-full bg-white p-1 hover:opacity-90`}
                onClick={async (event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (onAddToWishlistToggle) {
                    const isToggleSuccess = await onAddToWishlistToggle(!isInWishlist, result.product_id);
                    if (isToggleSuccess) {
                      setIsInWishlist((prev) => !prev);
                    }
                  }
                }}
                style={{
                  backgroundColor: darkMode
                    ? (wishlistIconConfig?.backgroundColorDark || '')
                    : (wishlistIconConfig?.backgroundColor || ''),
                }}
                data-pw={`${pwPrefix}-wishlist-button`}
                data-testid='wigmix-wishlist-button'
              >
                {wishlistIconConfig?.url ? (
                  <CustomizableIcon
                    height={20}
                    width={20}
                    className='wigmix-wishlist-icon custom'
                    url={wishlistIconConfig?.url}
                    color={darkMode
                      ? (wishlistIconConfig?.colorDark || '')
                      : (wishlistIconConfig?.color || '')}
                  />
                ) : (
                  <>
                    {isInWishlist ? (
                      <HeartFilledIcon
                          className='wigmix-wishlist-icon default size-5'
                          color={darkMode
                              ? (customizations.productCard?.addToWishlist?.iconActive?.colorDark || '')
                              : (customizations.productCard?.addToWishlist?.iconActive?.color || '')}
                      />
                    ) : (
                      <HeartIcon
                          className='wigmix-wishlist-icon default size-5'
                          color={darkMode
                              ? (customizations.productCard?.addToWishlist?.iconInactive?.colorDark || '')
                              : (customizations.productCard?.addToWishlist?.iconInactive?.color || '')}
                      />
                    )}
                  </>
                )}
              </button>
            )}
            {hasFindSimilar && !isLoading && customizations.productCard?.findSimilar?.enable && (
                <button
                    className={`wigmix-find-similar-button absolute ${createFindSimilarPositionClasses()} z-5 rounded-full bg-white p-1 hover:opacity-90`}
                    onClick={(event) => {
                      if (onFindSimilar) {
                        event.preventDefault();
                        event.stopPropagation();
                        onFindSimilar({ imgUrl: result.im_url, pid: result.product_id });
                      }
                    }}
                    style={{
                      backgroundColor: darkMode
                          ? (customizations.productCard?.findSimilar?.icon?.backgroundColorDark || '')
                          : (customizations.productCard?.findSimilar?.icon?.backgroundColor || ''),
                    }}
                    data-pw={`${pwPrefix}-find-similar-button`}
                    data-testid='wigmix-find-similar-button'
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
                </button>
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
          <div className='wigmix-product-card-price-row flex flex-wrap items-center gap-1'>
            {
              originalPrice && originalPrice !== price
                ? (
                  <>
                    {customizations.productCard?.originalPrice?.position === 'AFTER' && (
                      <span className='wigmix-product-card-price' style={getProductPriceColorStyle()}>
                        {intl.formatMessage({ id: 'price' }).replace('{price}', price)}
                      </span>
                    )}
                    <span className={cn(
                        'wigmix-product-card-original-price',
                        customizations.productCard?.originalPrice?.strikethrough ? 'line-through' : '',
                    )}
                          style={getProductOriginalPriceColorStyle()}>
                      {intl.formatMessage({ id: 'originalPrice' }).replace('{originalPrice}', originalPrice)}
                    </span>
                    {customizations.productCard?.originalPrice?.position === 'BEFORE' && (
                      <span className='wigmix-product-card-price' style={getProductPriceColorStyle()}>
                        {intl.formatMessage({ id: 'price' }).replace('{price}', price)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className='wigmix-product-card-price'>
                    {intl.formatMessage({ id: 'price' }).replace('{price}', price)}
                  </span>
                )
            }
          </div>
        </div>
      </a>
    </div>
  );
};

export default ProductCard;
