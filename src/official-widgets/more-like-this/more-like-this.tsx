import type { CSSProperties, FC } from 'react';
import { useEffect, useState, useContext } from 'react';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import { useIntl } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetResultContext } from '../../common/types/contexts';
import Result from './components/Result';
import Footer from '../../common/components/Footer';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import PrevArrow from './components/PrevArrow';
import NextArrow from './components/NextArrow';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { WidgetBreakpoint } from '../../common/types/constants';

interface MoreLikeThisProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  productId: string;
}

const MoreLikeThis: FC<MoreLikeThisProps> = ({ config, productSearch, productId }) => {
  const root = useContext(RootContext);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intl = useIntl();
  const breakpoint = useBreakpoint();

  const {
    productResults,
    metadata,
    error,
  } = useRecommendationSearch({
    productSearch,
    config,
    productId,
    retryCount,
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

    // Manually center slick track if there are not enough products to show
    const slickTrack: HTMLDivElement | null | undefined = root?.querySelector('.slick-track');
    if (slickTrack) {
      if (productResults.length < slidesToShow) {
        slickTrack.classList.add('center-slick-track');
      } else {
        slickTrack.classList.remove('center-slick-track');
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
          <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='mlt-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
        )}

        {/* Product Result Carousel */}
        <div className='relative pr-1 text-primary lg:px-10' data-pw='mlt-product-result-carousel'>
          <Slider {...settings}>
            {productResults.map((result, index) => (
              <div key={`${result.product_id}-${index}`} data-pw={`mlt-product-result-card-${index + 1}`}>
                <div className={getProductCardCssClasses()} style={getProductCardCssConfig()}>
                  <Result index={index} result={result} />
                </div>
              </div>
            ))}
          </Slider>
        </div>

        {/* ViSenze Footer */}
        {config.customizations.generalLayout?.showViSenzeLogo && (
          <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='mlt-visenze-footer'/>
        )}
      </WidgetResultContext.Provider>
    </>
  );
};

export default MoreLikeThis;
