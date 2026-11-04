import { Skeleton } from '@heroui/skeleton';
import type { CSSProperties, FC } from 'react';
import { useContext, useState } from 'react';
import { useIntl } from 'react-intl';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import NextArrow from './components/NextArrow';
import PrevArrow from './components/PrevArrow';
import Footer from '../../common/components/Footer';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useRecommendationMultiSearch from '../../common/components/hooks/use-recommendation-multisearch';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';

interface ShopTheLookV2Props {
  productId: string;
  imageUrl?: string;
}

const ShopTheLookV2: FC<ShopTheLookV2Props> = ({ productId, imageUrl }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, displaySettings } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  const { initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const [forcedError, setForcedError] = useState('');

  widgetClient.forceErrorState = (): void => {
    setForcedError('Sample error message here');
  };

  const { productResults, productInfo, metadata, referenceImageUrl, isLoading, error: errorFromApi } = useRecommendationMultiSearch({
    productId,
    imageUrl,
    useOutfitReference: true,
  });

  const error = errorFromApi || forcedError;

  if (!root || error || (!isLoading && productResults.length === 0)) {
    return <></>;
  }

  // Every card has the same width regardless of how many products came back: `productsPerRow` slides, the rest scroll.
  const slidesToShow = customizations.productGrid?.[breakpoint]?.productsPerRow || 2;
  const isDesktop = breakpoint === WidgetBreakpoint.DESKTOP;
  const arrowColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) ?? '#000000';
  // Space between cards: productGrid.<breakpoint>.marginHorizontal (px), split over both sides of each card.
  const cardGap = customizations.productGrid?.[breakpoint]?.marginHorizontal ?? 2;
  const cardSpacing: CSSProperties = { paddingLeft: cardGap / 2, paddingRight: cardGap / 2 };
  const sliderSettings: Settings = {
    className: 'slider',
    infinite: false,
    initialSlide: 0,
    slidesToShow,
    slidesToScroll: Math.max(1, Math.floor(slidesToShow)),
    // Arrows: beside the carousel on desktop, over its edges on tablet and phones (swiping works too).
    arrows: true,
    prevArrow: <PrevArrow iconColor={arrowColor} inside={!isDesktop} />,
    nextArrow: <NextArrow iconColor={arrowColor} inside={!isDesktop} />,
    swipeToSlide: true,
    variableWidth: false,
  };

  const upperCase = customizations.productCard?.layout?.uppercase ? 'uppercase' : '';
  const caption: string = productInfo?.[displaySettings.productDetails['title']] ?? '';

  return (
    <>
      <div className='max-w-full items-start overflow-hidden px-4 text-primary md:flex md:flex-row md:gap-6 md:px-0 lg:gap-10' data-pw='stl2-container'>
        {/* Reference image + caption */}
        {(isLoading || referenceImageUrl) && (
          <div className='mb-4 md:mb-0 md:w-[38%] lg:w-1/3 xl:w-1/4' data-pw='stl2-reference'>
            {isLoading && <Skeleton className='aspect-[2/3]' />}
            {!isLoading && referenceImageUrl && (
              <img
                className='wigmix-reference-image size-full aspect-auto'
                src={referenceImageUrl}
                alt={caption}
                data-testid='wigmix-reference-image'
                data-pw='stl2-reference-image'
              />
            )}
            {caption && (
              <p className={`wigmix-product-card-title mt-4 text-center ${upperCase}`} data-pw='stl2-reference-caption'>{caption}</p>
            )}
          </div>
        )}

        {/* Title + outfit items */}
        <div className='min-w-0 flex-1'>
          {customizations.generalLayout?.showWidgetTitle && (
            <div className={`wigmix-widget-title pb-4 text-primary md:pb-6 ${upperCase}`} data-pw='stl2-widget-title'>
              {intl.formatMessage({ id: 'widgetTitle' })}
            </div>
          )}
          {isLoading && (
            <div className='flex' style={{ gap: cardGap }} data-pw='stl2-product-skeletons'>
              {Array.from({ length: Math.floor(slidesToShow) }, (_, key) => <Skeleton key={key} className='aspect-square flex-1' />)}
            </div>
          )}
          {!isLoading && (
            <div className='relative lg:px-10' data-pw='stl2-product-results'>
              <Slider {...sliderSettings}>
                {productResults.map((result, index) => (
                  <div key={`${result.product_id}-${index}`} className='h-full'>
                    <div className='h-full' style={cardSpacing}>
                      <ProductCard
                        index={index}
                        result={result}
                        metadata={metadata}
                        isInWishlist={wishlistPids.includes(result.product_id)}
                        setIsInWishlist={(pid, isInWishlist) => {
                          setWishlistPids((prev) => (isInWishlist ? [...new Set([...prev, pid])] : prev.filter((id) => id !== pid)));
                        }}
                        hasFindSimilar={false}
                        isRecommendation={true}
                        pwPrefix='stl2'
                        imageLoading='lazy'
                        imageClasses='w-full'
                      />
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </div>
      </div>

      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer darkMode={darkMode} className='bg-transparent py-4 text-primary md:py-8' dataPw='stl2-visenze-footer' />
      )}
    </>
  );
};

export default ShopTheLookV2;
