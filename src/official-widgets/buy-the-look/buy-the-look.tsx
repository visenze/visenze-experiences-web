import type { CSSProperties, FC } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';

interface BuyTheLookProps {
  productId: string;
}

const BuyTheLook: FC<BuyTheLookProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  const [selectedLookProductIndex, setSelectedLookProductIndex] = useState(0);

  widgetClient.forceErrorState = (): void => {
    setError('Sample error message here');
  };

  const {
    productResults,
    error: errorFromApi,
    productInfo,
    metadata,
  } = useRecommendationSearch({
    productId,
    shouldDisplayAlternatives: customizations.productCard?.images?.showAlternatives,
  });

  const getProductCardCssClasses = (): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push('p-1 md:p-2');
      }
      return classes.join(' ');
    }
    return 'p-1 md:p-2';
  };

  const getProductCardCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.marginLeft = cssConfigSrc.marginHorizontal / 2;
        cssConfig.marginRight = cssConfigSrc.marginHorizontal / 2;
      }
    }
    return cssConfig;
  };

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (errorFromApi) {
      setError(errorFromApi);
    }
  }, [errorFromApi]);

  if (!root || isLoading) {
    return <></>;
  }

  if (error) {
    return <></>;
  }

  return (
    <div className='w-full relative inset-x-1/2 -mx-[50vw] mb-12'>
      <div className='py-8 px-6'>
        <div className='max-w-6xl mx-auto' style={{ maxWidth: 'calc(100vw - var(--chat-width, 0px) - 3rem)' }}>
          <h2
            className='text-2xl font-bold mb-6'
            style={{ color: darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor }}>
            {intl.formatMessage({ id: 'widgetTitle' })}
          </h2>

          <div className='grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6'>
            {/* Left side: Main product image (smaller on mobile when chat open) */}
            <div className='overflow-hidden shadow-lg lg:col-span-2 flex'>
              <img
                src={productInfo?.im_url}
                alt={productInfo?.['title']}
                className='w-full object-cover'
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = 'https://placehold.co/400x500/gray/white?text=No+Image';
                }}
              />
            </div>

            {/* Right side: White card with content (smaller width) - Redesigned to match screenshot */}
            <div className='lg:col-span-3 p-0 shadow-lg overflow-hidden'
              style={{
                backgroundColor: darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor,
              }}>
              {/* Product thumbnails - back to horizontal layout with larger images */}
              <div className='flex border-b border-gray-200 mb-4 overflow-x-auto p-4'>
                {productResults.map((product, index) => (
                  <div
                    key={product.product_id}
                    className={`flex-shrink-0 cursor-pointer border-b-2 ${selectedLookProductIndex === index ? 'border-black' : 'border-transparent'} px-3 py-2`}
                    onClick={() => setSelectedLookProductIndex(index)}
                    data-product-id={product.product_id}
                    data-product-title={product['title'] || 'Product'}
                    data-product-image={product.im_url}
                    data-product-price={
                      typeof product['price'] === 'object' && product['price'] !== null
                        ? product['price'].value
                        : product['price']
                    }
                    data-product-url={`/product/${product.product_id}`}>
                    <div className='w-32 h-48 bg-gray-100 overflow-hidden rounded relative'>
                      <img
                        src={product.im_url}
                        alt={product['title'] || 'Product'}
                        className='size-full object-cover'
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://placehold.co/128x192/gray/white?text=No+Image';
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected product details - compact layout */}
              {productResults.length > selectedLookProductIndex && (
                <div className='flex flex-col md:flex-row gap-6 px-6 pb-6 pt-4'>
                  <div className='flex-shrink-0 flex justify-center items-start w-full md:w-72'>
                    <div className={getProductCardCssClasses()} style={getProductCardCssConfig()}>
                      <ProductCard
                        index={selectedLookProductIndex}
                        result={productResults[selectedLookProductIndex]}
                        metadata={metadata}
                        hasFindSimilar={false}
                        isRecommendation={true}
                        pwPrefix='mlt' />
                    </div>
                  </div>

                  <div className='flex-1 flex flex-col justify-between min-w-0'>
                    <div>
                      <div className='text-xl font-semibold mb-1'>
                        {productResults[selectedLookProductIndex]['title'] || 'Product'}
                      </div>
                      <div className='text-gray-700 text-base mb-2'>
                        {productResults[selectedLookProductIndex]['brand'] || 'Store'}
                      </div>
                      <div className='flex items-end gap-2 mb-2'>
                        <span className='text-2xl font-bold'>
                          $
                          {((): string => {
                            const product = productResults[selectedLookProductIndex];
                            const priceObj = product['price'];
                            const price = priceObj.value;
                            return Number(price || 0).toFixed(2);
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className='flex flex-col gap-3 mt-4'>
                      {widgetConfig.callbacks.onAddToCartToggle && (
                        <button
                          className='py-3 px-6 rounded-none text-base font-bold tracking-wider w-full'
                          style={{
                            backgroundColor: darkMode ? customizations.buttons?.primary.backgroundColorDark : customizations.buttons?.primary.backgroundColor,
                            color: darkMode ? customizations.buttons?.primary.fontColorDark : customizations.buttons?.primary.fontColor,
                          }}
                          onClick={() => {
                            if (widgetConfig.callbacks.onAddToCartToggle) {
                              widgetConfig.callbacks.onAddToCartToggle(true, productResults[selectedLookProductIndex].product_id);
                            }
                          }}>
                          {intl.formatMessage({ id: 'addToCart' })}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyTheLook;
