import { Skeleton } from '@heroui/skeleton';
import type { CSSProperties, FC, ReactElement } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import NextArrow from './components/NextArrow';
import PrevArrow from './components/PrevArrow';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';

interface ShopTheLookProps {
  productId: string;
}

interface ObjectDot {
  index: number;
  top: number;
  left: number;
}

const ShopTheLook: FC<ShopTheLookProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const root = useContext(RootContext);
  const imageRef = useRef<HTMLImageElement>(null);
  const [objectDots, setObjectDots] = useState<ObjectDot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  widgetClient.forceErrorState = (): void => {
    setError('Sample error message here');
  };

  const {
    productResults,
    metadata,
    referenceImageUrl,
    error: errorFromApi,
    objectIndex,
    setObjectIndex,
    objects,
  } = useRecommendationSearch({
    productId,
    shouldDisplayAlternatives: customizations.productCard?.images?.showAlternatives,
  });

  const useSlideSettings = (): Settings => {
    const isDesktop = breakpoint === WidgetBreakpoint.DESKTOP;
    const isTablet = breakpoint === WidgetBreakpoint.TABLET;
    let slidesToShow = customizations.productGrid?.mobile?.productsPerRow || 2.5;
    if (isDesktop) {
      slidesToShow = customizations.productGrid?.desktop?.productsPerRow || 4;
    } else if (isTablet) {
      slidesToShow = customizations.productGrid?.tablet?.productsPerRow || 3.5;
    }
    const slidesToScroll = Math.floor(slidesToShow);

    return {
      className: 'slider',
      infinite: false,
      initialSlide: 0,
      slidesToScroll,
      slidesToShow,
      prevArrow: isDesktop ? <PrevArrow iconColor={darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor} /> : <></>,
      nextArrow: isDesktop ? <NextArrow iconColor={darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor} /> : <></>,
      variableWidth: false,
    };
  };

  const settings = useSlideSettings();

  const resizeObjectDots = (image: HTMLImageElement): void => {
    const heightScale = (image.clientHeight / image.naturalHeight) || 1;
    const widthScale = (image.clientWidth / image.naturalWidth) || 1;
    if (objects.length > 0) {
      const normalizedObjs = objects.map((object, index) => {
        const { box } = object;
        return {
          index,
          top: (box[1] + (box[3] - box[1]) / 2) * heightScale,
          left: (box[0] + (box[2] - box[0]) / 2) * widthScale,
        };
      });
      setObjectDots(normalizedObjs);
    }
  };

  const onImageLoad = (e: any): void => {
    const image = e.target;
    resizeObjectDots(image);
    window.addEventListener('resize', () => {
      if (imageRef.current) {
        resizeObjectDots(imageRef.current);
      }
    });
  };

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

  const getProductCarouselView = (): ReactElement => (
    <div className='relative pe-1 pt-4 md:w-13/20 lg:w-7/10 lg:px-10' data-pw='stl-product-result-carousel'>
      <Slider {...settings}>
        {productResults.map((result, index) => (
            <div key={`${result.product_id}-${index}`}>
              <div className={getProductCardCssClasses()} style={getProductCardCssConfig()}>
                <ProductCard index={index}
                             result={result}
                             metadata={metadata}
                             isInWishlist={wishlistPids.includes(result.product_id)}
                             setIsInWishlist={(pid, isInWishlist) => {
                               setWishlistPids((prev) => {
                                 const newPids = [...prev];
                                 if (isInWishlist && !newPids.includes(pid)) {
                                   newPids.push(pid);
                                 }
                                 if (!isInWishlist && newPids.includes(pid)) {
                                   newPids.splice(newPids.indexOf(pid), 1);
                                 }
                                 return newPids;
                               });
                             }}
                             hasFindSimilar={false}
                             isRecommendation={true}
                             pwPrefix='stl' />
              </div>
            </div>
        ))}
      </Slider>
    </div>
  );

  if (!root || isLoading) {
    return <></>;
  }

  if (error) {
    return <></>;
  }

  return (
    <>
        {productResults.length > 0 && (
            <>
              {/* Widget Title */}
              {customizations.generalLayout?.showWidgetTitle && (
                  <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='stl-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
              )}

              <div className='items-center justify-center text-primary md:flex md:flex-row md:gap-4 lg:gap-0'>
                {/* Reference Image */}
                <div className='px-1 md:w-3/10 xl:w-1/4'>
                  <div className='relative'>
                    {objectDots.map((obj, index) => (
                        <button
                            data-testid='wigmix-hotspot-dot'
                            data-pw='stl-hotspot-dot'
                            className={
                              `group absolute z-10 flex items-center justify-center rounded-full bg-[#515151] transition-all 
                    duration-300 hover:size-6 hover:-translate-x-3 hover:-translate-y-3 hover:ring-1 hover:ring-white
                    ${objectIndex === index ? 'size-6 -translate-x-3 -translate-y-3 ring-1 ring-white' : 'size-4 -translate-x-2 -translate-y-2'}`
                            }
                            style={{ top: obj.top, left: obj.left }}
                            key={obj.index}
                            onClick={(): void => setObjectIndex(index)}>
                          <div className={`rounded-full bg-white transition-all duration-300 group-hover:size-4 ${objectIndex === index ? 'size-4' : 'size-2'}`}></div>
                        </button>
                    ))}
                    {!referenceImageUrl && <Skeleton className='aspect-square' />}
                    {referenceImageUrl && (
                        <img
                            ref={imageRef}
                            className='wigmix-reference-image size-full aspect-auto'
                            src={referenceImageUrl}
                            onLoad={onImageLoad}
                            data-testid='wigmix-reference-image'
                            data-pw='stl-reference-image'
                        />
                    )}
                    {/* Product Result Carousel */}
                    {breakpoint === 'mobile' && (
                        <div className='absolute bottom-4 w-full bg-white bg-opacity-85'>
                          {getProductCarouselView()}
                        </div>
                    )}
                  </div>
                </div>

                {/* Product Result Carousel */}
                {(breakpoint === 'tablet' || breakpoint === 'desktop') && getProductCarouselView()}
              </div>

              {/* ViSenze Footer */}
              {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer darkMode={darkMode} className='bg-transparent py-4 text-primary md:py-8' dataPw='stl-visenze-footer'/>
              )}
            </>
        )}
    </>
  );
};

export default ShopTheLook;
