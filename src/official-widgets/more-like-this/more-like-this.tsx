import type { FC } from 'react';
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
    const breakpoint = useBreakpoint();
    const isDesktop = breakpoint === WidgetBreakpoint.DESKTOP;
    const isTablet = breakpoint === WidgetBreakpoint.TABLET;
    let slidesToShow = config.customizations.productSlider?.display.mobile.slideToShow || 2.5;
    let slidesToScroll = config.customizations.productSlider?.display.mobile.slideToShow || 2;

    if (isDesktop) {
      slidesToShow = config.customizations.productSlider?.display.desktop.slideToShow || 4;
      slidesToScroll = config.customizations.productSlider?.display.desktop.slideToScroll || 4;
    } else if (isTablet) {
      slidesToShow = config.customizations.productSlider?.display.tablet.slideToShow || 3.5;
      slidesToScroll = config.customizations.productSlider?.display.tablet.slideToScroll || 3;
    }

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
      prevArrow: isDesktop ? <PrevArrow /> : <></>,
      nextArrow: isDesktop ? <NextArrow /> : <></>,
      variableWidth: false,
    };
  };

  const settings = useSlideSettings();

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
        <span className='text-md font-bold'>{intl.formatMessage({ id: 'moreLikeThis.errorMessage.part1' })}</span>
        <span className='text-sm'>{intl.formatMessage({ id: 'moreLikeThis.errorMessage.part2' })}</span>
      </div>
    );
  }

  return (
    <>
      <WidgetResultContext.Provider value={{ metadata, productResults }}>
        {/* Widget Title */}
        <div className='widget-title py-2 text-center text-primary md:py-4' data-pw='mlt-widget-title'>{intl.formatMessage({ id: 'moreLikeThis.title' })}</div>

        {/* Product Result Carousel */}
        <div className='relative pr-1 lg:px-10' data-pw='mlt-product-result-carousel'>
          <Slider {...settings}>
            {productResults.map((result, index) => (
              <div className='p-1 md:p-2' key={`${result.product_id}-${index}`} data-pw={`mlt-product-result-card-${index + 1}`}>
                <Result
                  index={index}
                  result={result}
                />
              </div>
            ))}
          </Slider>
        </div>

        {/* ViSenze Footer */}
        <Footer className='bg-transparent py-4 md:py-8' dataPw='mlt-visenze-footer'/>
      </WidgetResultContext.Provider>
    </>
  );
};

export default MoreLikeThis;
