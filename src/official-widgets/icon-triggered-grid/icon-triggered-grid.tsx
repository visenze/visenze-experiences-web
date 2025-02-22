import type { FC } from 'react';
import { useEffect, useCallback, useContext, useState } from 'react';
import { cn } from '@heroui/theme';
import { useIntl } from 'react-intl';
import { useSwipeable } from 'react-swipeable';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetDataContext } from '../../common/types/contexts';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import Footer from '../../common/components/Footer';
import ProductCard from '../../common/components/product-card/ProductCard';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../common/utils';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import CloseIcon from '../../common/icons/CloseIcon';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import ChevronDownIcon from '../../common/icons/ChevronDownIcon';
import ChevronUpIcon from '../../common/icons/ChevronUpIcon';

export enum ScreenType {
  RESULT = 'result',
  ERROR = 'error',
}

interface IconTriggeredGridProps {
  productId: string;
}

const swipeConfig = {
  delta: 10, // min distance(px) before a swipe starts. *See Notes*
  trackTouch: true, // track touch input
  trackMouse: false, // track mouse input
  rotationAngle: 0, // set a rotation angle
  swipeDuration: Infinity, // allowable duration of a swipe (ms). *See Notes*
  touchEventOptions: { passive: true }, // options for touch listeners (*See Details*)
};

const IconTriggeredGrid: FC<IconTriggeredGridProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState(ScreenType.RESULT);
  const [showFullResults, setShowFullResults] = useState(false);
  const root = useContext(RootContext);
  const intl = useIntl();

  const { productInfo, productResults, metadata, error: errorFromApi } = useRecommendationSearch({
    productId,
  });

  const onModalClose = useCallback((): void => {
    setDialogVisible(false);
    if (productResults.length > 0) {
      widgetClient.sendEvent(Actions.CLOSE, {
        label: Labels.PAGE,
        ...metadata,
      });
    }
  }, [productResults]);

  const openWidgetPopup = (): void => {
    setDialogVisible(true);
    widgetClient.forceErrorState = (): void => {
      setError('Sample error message here');
    };
  };

  const onPopupIconClick = (): void => {
    widgetClient.sendEvent(Actions.CLICK, {
      cat: Category.ENTRANCE,
      label: Labels.ICON,
    });
    openWidgetPopup();
  };

  const minimizedDrawerHandler = useSwipeable({
    onSwipedUp: () => setShowFullResults(true),
    ...swipeConfig,
  });

  const maximizedDrawerHandler = useSwipeable({
    onSwipedDown: () => setShowFullResults(false),
    ...swipeConfig,
    preventScrollOnSwipe: false,
  });

  const toggleFullResults = (): void => {
    setShowFullResults((v) => !v);
  };

  useEffect(() => {
    widgetClient.registerWidgetOpener((id, bypassIdCheck) => {
      if (id === productId || bypassIdCheck) {
        openWidgetPopup();
      }
    });
  }, []);

  useEffect(() => {
    if (error) {
      setScreen(ScreenType.ERROR);
    }
  }, [error]);

  useEffect(() => {
    if (errorFromApi) {
      setError(errorFromApi);
    }
  }, [errorFromApi]);

  if (!root) {
    return <></>;
  }

  return (
    <>
      {!customizations.popup?.triggerIcon?.hide && (
          <div className='wigmix-popup-trigger-button w-fit cursor-pointer'
               data-testid='wigmix-popup-trigger-button'
               onClick={onPopupIconClick}>
            {customizations.popup?.triggerIcon?.url ? (
                <CustomizableIcon
                    height={24}
                    width={24}
                    url={customizations.popup.triggerIcon.url}
                    color={darkMode
                      ? (customizations.popup?.triggerIcon?.colorDark || '')
                      : (customizations.popup?.triggerIcon?.color || '')}
                    className='wigmix-popup-trigger-icon custom'
                />
            ) : (
                <MagnifyingGlassIcon color={darkMode
                                       ? (customizations.popup?.triggerIcon?.colorDark || '')
                                       : (customizations.popup?.triggerIcon?.color || '')}
                                     className='wigmix-popup-trigger-icon default size-6' />
            )}
          </div>
      )}

      <ViSenzeModal
        open={dialogVisible}
        layout={breakpoint}
        onClose={onModalClose}
        position={customizations.popup?.position || 'center'}>
        <div className='relative flex size-full flex-col md:flex-row md:justify-between md:divide-x-1'>
          {/* Close Button */}
          <div
            className='absolute right-3 top-3 z-10 border-none bg-transparent cursor-pointer rounded-full p-1 hover:opacity-90'
            onClick={onModalClose}
            data-testid='wigmix-close-button'
            data-pw='itg-close-button'>
            <CloseIcon className='size-6'
                       color={darkMode
                         ? customizations.generalLayout?.fontColorDark
                         : customizations.generalLayout?.fontColor} />
          </div>

          {screen !== ScreenType.ERROR && (
            <>
              <div className='flex flex-col border-none p-4 md:w-1/3 md:px-10 md:py-6'>
                {/* Widget Title */}
                {customizations.generalLayout?.showWidgetTitle && (
                    <div className='wigmix-widget-title text-primary' data-pw='itg-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
                )}

                {/* Reference Product */}
                {productInfo && (
                  <div className='wigmix-reference-image-container flex pt-4 md:pt-8 w-full justify-center' data-pw='itg-reference-product'>
                    <img
                        className={cn(
                            'wigmix-reference-image object-contain object-center aspect-square md:max-w-full',
                            showFullResults ? 'max-w-32' : 'max-w-96',
                        )}
                        src={productInfo.im_url}
                        data-pw='itg-reference-image'
                    />
                  </div>
                )}

                {breakpoint === 'mobile' && (
                    <div
                        className={cn(
                            showFullResults ? 'top-1/4 bottom-14 left-0 right-0' : 'top-1/2 bottom-14 left-3 right-3',
                            'transition-all duration-1000 z-10 absolute rounded-xl bg-primary shadow-inner pt-8',
                        )}
                        {...minimizedDrawerHandler}>
                      <div className='absolute top-0 h-8 w-full' {...maximizedDrawerHandler}>
                        <div className='absolute inset-x-0 -top-3 m-auto bg-buttonPrimary rounded-full p-1 hover:opacity-90 w-fit'
                             onClick={(): void => toggleFullResults()}
                             data-pw='itg-arrow-button'
                        >
                          {showFullResults ? (
                              <ChevronDownIcon color={darkMode
                                  ? (customizations.buttons?.primary?.fontColorDark || '')
                                  : (customizations.buttons?.primary?.fontColor || '')}
                                               className='cursor-pointer size-6' />
                          ) : (
                              <ChevronUpIcon color={darkMode
                                  ? (customizations.buttons?.primary?.fontColorDark || '')
                                  : (customizations.buttons?.primary?.fontColor || '')}
                                             className='cursor-pointer size-6' />
                          )}
                        </div>
                      </div>

                      <div className='no-scrollbar flex size-full justify-center overflow-y-auto'>
                        <div className={cn(
                            'wigmix-product-grid mx-2 grid h-full pb-20 pt-2',
                            getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2', 'gap-x-4', 'gap-y-2'),
                        )}
                             style={getProductGridCssConfig(customizations, breakpoint)}
                             data-pw='itg-product-result-grid'>
                          {productResults.map((result, index) => (
                              <ProductCard key={`${result.product_id}-${index}`}
                                           index={index}
                                           result={result}
                                           metadata={metadata}
                                           hasFindSimilar={false}
                                           isRecommendation={true}
                                           pwPrefix='itg' />
                          ))}
                        </div>
                      </div>
                      {/* ViSenze Footer mobile */}
                      <Footer className='mt-auto bg-transparent pt-4 md:hidden' dataPw='itg-visenze-footer-mobile' />
                    </div>
                )}

                {/* ViSenze Footer desktop */}
                {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer className='mt-auto hidden bg-transparent md:flex' dataPw='itg-visenze-footer-desktop' />
                )}
              </div>

              <div className='relative flex w-full flex-col bg-primary px-6 pb-4 md:w-2/3 md:pt-[6.5%]'>
                {/* Product Result Grid */}
                {breakpoint !== 'mobile' && (
                    <div className={cn(
                        'wigmix-product-grid grid overflow-y-auto',
                        getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2 lg:grid-cols-3', 'gap-x-2', 'gap-y-4'),
                    )}
                         style={getProductGridCssConfig(customizations, breakpoint)}
                         data-pw='itg-product-result-grid'>
                      {productResults.map((result, index) => (
                          <ProductCard key={`${result.product_id}-${index}`}
                                       index={index}
                                       result={result}
                                       metadata={metadata}
                                       hasFindSimilar={false}
                                       isRecommendation={true}
                                       pwPrefix='itg' />
                      ))}
                    </div>
                )}
              </div>
            </>
          )}
          {screen === ScreenType.ERROR && (
            <div className='size-full flex flex-col text-center justify-center items-center gap-1'>
              <div className='font-bold'>
                {intl.formatMessage({ id: 'errorDescription' })}
              </div>
              <div>{error}</div>
            </div>
          )}
        </div>
      </ViSenzeModal>
    </>
  );
};

export default IconTriggeredGrid;
