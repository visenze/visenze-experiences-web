import type { CSSProperties, FC } from 'react';
import { useContext, useEffect, useState } from 'react';
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

interface MoreLikeThisProps {
  productId: string;
}

const MoreLikeThis: FC<MoreLikeThisProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const root = useContext(RootContext);
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
    error: errorFromApi,
  } = useRecommendationSearch({
    productId,
    shouldDisplayAlternatives: customizations.results?.useAlternatives,
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
    <>
        {productResults.length > 0 && (
            <>
              {/* Widget Title */}
              {customizations.generalLayout?.showWidgetTitle && (
                  <div className='wigmix-widget-title py-2 text-primary md:py-4' data-pw='mlt-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
              )}

              {/* Product Result Carousel */}
              <div className='relative pr-1 text-primary lg:px-10' data-pw='mlt-product-result-carousel'>
                <Slider {...settings}>
                  {productResults.map((result, index) => (
                      <div key={`${result.product_id}-${index}`}>
                        <div className={getProductCardCssClasses()} style={getProductCardCssConfig()}>
                          <ProductCard index={index}
                                       result={result}
                                       metadata={metadata}
                                       hasFindSimilar={false}
                                       isRecommendation={true}
                                       pwPrefix='mlt' />
                        </div>
                      </div>
                  ))}
                </Slider>
              </div>

              {/* ViSenze Footer */}
              {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer className='bg-transparent py-4 text-primary md:py-8' dataPw='mlt-visenze-footer'/>
              )}
            </>
        )}
    </>
  );
};

export default MoreLikeThis;
