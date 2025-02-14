import type { FC } from 'react';
import { useEffect, useCallback, useContext, useState } from 'react';
import { cn } from '@heroui/theme';
import { useIntl } from 'react-intl';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetDataContext, WidgetResultContext } from '../../common/types/contexts';
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

export enum ScreenType {
  RESULT = 'result',
  ERROR = 'error',
}

interface IconTriggeredGridProps {
  productId: string;
}

const IconTriggeredGrid: FC<IconTriggeredGridProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState(ScreenType.RESULT);
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
    <WidgetResultContext.Provider
      value={{
        productResults,
        metadata,
      }}>
      {!customizations.popup?.triggerIcon?.hide && (
          <div className='wigmix-popup-trigger-button w-fit cursor-pointer'
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
        position={customizations.popup?.position || 'center'}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        placementId={`${appSettings.placementId}`}>
        <div className='relative flex size-full flex-col md:flex-row md:justify-between md:divide-x-1'>
          {/* Close Button */}
          <div
            className='absolute right-3 top-3 z-10 border-none bg-transparent cursor-pointer rounded-full p-1 hover:opacity-90'
            onClick={onModalClose}
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
                  <div className='wigmix-reference-image-container pt-4 md:pt-8' data-pw='itg-reference-product'>
                    <img
                        className='wigmix-reference-image size-full object-contain object-center aspect-square'
                        src={productInfo.im_url}
                        data-pw='itg-reference-image'
                    />
                  </div>
                )}

                {/* ViSenze Footer desktop */}
                {customizations.generalLayout?.showViSenzeLogo && (
                  <Footer className='mt-auto hidden bg-transparent md:flex' dataPw='itg-visenze-footer-desktop' />
                )}
              </div>

              <div className='relative flex w-full flex-col bg-primary px-6 pb-4 md:w-2/3 md:pt-[6.5%]'>
                {/* Product Result Grid */}
                <div
                    className={cn(
                        'wigmix-product-grid grid overflow-y-auto',
                        getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2 lg:grid-cols-3', 'gap-x-2', 'gap-y-4'),
                    )}
                    style={getProductGridCssConfig(customizations, breakpoint)}
                    data-pw='itg-product-result-grid'>
                  {productResults.map((result, index) => (
                    <ProductCard key={`${result.product_id}-${index}`}
                                 index={index}
                                 result={result}
                                 hasFindSimilar={false}
                                 isRecommendation={true}
                                 pwPrefix='itg' />
                  ))}
                </div>

                {/* ViSenze Footer mobile */}
                <Footer className='mt-auto bg-transparent pt-4 md:hidden' dataPw='itg-visenze-footer-mobile' />
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
    </WidgetResultContext.Provider>
  );
};

export default IconTriggeredGrid;
