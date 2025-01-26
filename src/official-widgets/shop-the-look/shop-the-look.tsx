import type { CSSProperties, FC, ReactElement } from 'react';
import { useEffect, useRef, useState, useContext } from 'react';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import { Skeleton } from '@nextui-org/skeleton';
import { useIntl } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetResultContext } from '../../common/types/contexts';
import ProductCard from '../../common/components/product-card/ProductCard';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import PrevArrow from './components/PrevArrow';
import NextArrow from './components/NextArrow';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { WidgetBreakpoint } from '../../common/types/constants';

interface ShopTheLookProps {
  config: WidgetConfig;
  widgetClient: WidgetClient;
  productId: string;
}

interface ObjectDot {
  index: number;
  top: number;
  left: number;
}

const ShopTheLook: FC<ShopTheLookProps> = ({ config, widgetClient, productId }) => {
  const root = useContext(RootContext);
  const imageRef = useRef<HTMLImageElement>(null);
  const [objectDots, setObjectDots] = useState<ObjectDot[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const {
    productResults,
    metadata,
    referenceImageUrl,
    error,
    objectIndex,
    setObjectIndex,
    objects,
  } = useRecommendationSearch({
    widgetClient,
    config,
    productId,
    retryCount,
    additionalParams: {
      show_best_product_images: true,
    },
  });

  const useSlideSettings = (): Settings => {
    const isDesktop = breakpoint === WidgetBreakpoint.DESKTOP;
    const isTablet = breakpoint === WidgetBreakpoint.TABLET;
    let slidesToShow = config.customizations.productGrid?.mobile?.productsPerRow || 2.5;
    if (isDesktop) {
      slidesToShow = config.customizations.productGrid?.desktop?.productsPerRow || 4;
    } else if (isTablet) {
      slidesToShow = config.customizations.productGrid?.tablet?.productsPerRow || 3.5;
    }
    const slidesToScroll = Math.floor(slidesToShow);

    // Manually left align slick track if there are not enough products to show
    const slickTrack: HTMLDivElement | null | undefined = root?.querySelector('.slick-track');
    if (slickTrack) {
      if (productResults.length < slidesToShow) {
        slickTrack.classList.add('left-align-slick-track');
      } else {
        slickTrack.classList.remove('left-align-slick-track');
      }
    }

    return {
      className: 'slider',
      infinite: false,
      initialSlide: 0,
      slidesToScroll,
      slidesToShow,
      prevArrow: isDesktop ? <PrevArrow iconColor={config.customizations?.generalLayout?.fontColor} /> : <></>,
      nextArrow: isDesktop ? <NextArrow iconColor={config.customizations?.generalLayout?.fontColor} /> : <></>,
      variableWidth: false,
    };
  };

  const settings = useSlideSettings();

  const resizeObjectDots = (image: HTMLImageElement): void => {
    const r = image.offsetHeight / image.naturalHeight;
    if (objects.length > 0) {
      const normalizedObjs = objects.map((object, index) => {
        const { box } = object;
        return {
          index,
          top: (box[1] + (box[3] - box[1]) / 2) * r,
          left: (box[0] + (box[2] - box[0]) / 2) * r,
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
    const cssConfigSrc = config.customizations?.productGrid?.[breakpoint];
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
    const cssConfigSrc = config.customizations?.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.marginLeft = cssConfigSrc.marginHorizontal / 2;
        cssConfig.marginRight = cssConfigSrc.marginHorizontal / 2;
      }
    }
    return cssConfig;
  };

  useEffect(() => {
    if (error) {
      setRetryCount(retryCount + 1);
    } else {
      setRetryCount(0);
    }
  }, [error]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const getProductCarouselView = (): ReactElement => (
    <div className='relative pr-1 pt-4 md:w-13/20 lg:w-7/10 lg:px-10' data-pw='stl-product-result-carousel'>
      <Slider {...settings}>
        {productResults.map((result, index) => (
            <div key={`${result.product_id}-${index}`} data-pw={`stl-product-result-card-${index + 1}`}>
              <div className={getProductCardCssClasses()} style={getProductCardCssConfig()}>
                <ProductCard index={index}
                             result={result}
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
    return (
      <div className='flex h-60 flex-col items-center justify-center gap-4'>
        <span className='text-md font-bold'>{intl.formatMessage({ id: 'errorDescription' })}</span>
        <span className='text-sm'>{intl.formatMessage({ id: 'errorResolution' })}</span>
      </div>
    );
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        {/* Widget Title */}
        {config.customizations.generalLayout?.showWidgetTitle && (
          <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='stl-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
        )}

        <div className='items-center justify-center text-primary md:flex md:flex-row md:gap-4 lg:gap-0'>
          {/* Reference Image */}
          <div className='px-1 md:w-7/20 lg:w-3/10'>
            <div className='relative'>
              {objectDots.map((obj, index) => (
                <button
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
              <Skeleton isLoaded={!!referenceImageUrl}>
                <img
                  ref={imageRef}
                  className='wigmix-reference-image size-full object-cover'
                  src={referenceImageUrl}
                  onLoad={onImageLoad}
                  data-pw='stl-reference-image'
                />
              </Skeleton>
              {/* Product Result Carousel */}
              {breakpoint === 'mobile' && (
                <div className='absolute bottom-4 w-full bg-primary'>
                  {getProductCarouselView()}
                </div>
              )}
            </div>
          </div>

          {/* Product Result Carousel */}
          {(breakpoint === 'tablet' || breakpoint === 'desktop') && getProductCarouselView()}
        </div>

        {/* ViSenze Footer */}
        {config.customizations.generalLayout?.showViSenzeLogo && (
          <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='stl-visenze-footer'/>
        )}
      </WidgetResultContext.Provider>
    </>
  );
};

export default ShopTheLook;
