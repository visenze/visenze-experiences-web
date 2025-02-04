import type { CSSProperties, FC } from 'react';
import { useEffect, useCallback, useContext, useState } from 'react';
import { Button } from '@heroui/button';
import { useIntl } from 'react-intl';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetDataContext, WidgetResultContext } from '../../common/types/contexts';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { type FacetType, SortType, WidgetBreakpoint } from '../../common/types/constants';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import Footer from '../../common/components/Footer';
import ProductCard from '../../common/components/product-card/ProductCard';
import SortOptions from './components/SortOptions';
import FilterOptions from './components/FilterOptions';
import { getSortTypeIntlId } from '../../common/utils';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import CloseIcon from '../../common/icons/CloseIcon';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';

export enum ScreenType {
  SORT = 'sort',
  FILTER = 'filter',
}

interface IconTriggeredGridProps {
  productId: string;
}

const IconTriggeredGrid: FC<IconTriggeredGridProps> = ({ productId }) => {
  const { widgetClient, widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [screen, setScreen] = useState<ScreenType | null>(null);
  const [sortType, setSortType] = useState<SortType>(SortType.RELEVANCE);
  const defaultFilters = {
    price: [],
    category: new Set<string>(),
    gender: new Set<string>(),
    brand: new Set<string>(),
    sizes: new Set<string>(),
    colors: new Set<string>(),
  };
  const [selectedFilters, setSelectedFilters] = useState<Record<FacetType, any>>(defaultFilters);
  const root = useContext(RootContext);
  const intl = useIntl();

  const { productInfo, productResults, facets, metadata, error } = useRecommendationSearch({
    productId,
    sortType,
    filters: selectedFilters,
  });

  const onModalClose = useCallback((): void => {
    setDialogVisible(false);
    setSortType(SortType.RELEVANCE);
    if (productResults.length > 0) {
      widgetClient.sendEvent(Actions.CLOSE, {
        label: Labels.PAGE,
        ...metadata,
      });
    }
  }, [productResults]);

  const onPopupIconClick = (): void => {
    widgetClient.sendEvent(Actions.CLICK, {
      cat: Category.ENTRANCE,
      label: Labels.ICON,
    });
    setDialogVisible(true);
  };

  const getProductGridCssClasses = (defaultCols: string, defaultGapX: string, defaultGapY: string): string => {
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    const classes = [];
    if (cssConfigSrc) {
      if (!cssConfigSrc.productsPerRow) {
        classes.push(defaultCols);
      }
      if (!cssConfigSrc.marginHorizontal && cssConfigSrc.marginHorizontal !== 0) {
        classes.push(defaultGapX);
      }
      if (!cssConfigSrc.marginVertical && cssConfigSrc.marginVertical !== 0) {
        classes.push(defaultGapY);
      }
      return classes.join(' ');
    }
    return [defaultCols, defaultGapX, defaultGapY].join(' ');
  };

  const getProductGridCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    const cssConfigSrc = customizations.productGrid?.[breakpoint];
    if (cssConfigSrc) {
      if (cssConfigSrc.productsPerRow) {
        cssConfig.gridTemplateColumns = `repeat(${cssConfigSrc.productsPerRow}, minmax(0, 1fr))`;
      }
      if (cssConfigSrc.marginVertical || cssConfigSrc.marginVertical === 0) {
        cssConfig.rowGap = `${cssConfigSrc.marginVertical}px`;
      }
      if (cssConfigSrc.marginHorizontal || cssConfigSrc.marginHorizontal === 0) {
        cssConfig.columnGap = `${cssConfigSrc.marginHorizontal}px`;
      }
    }
    return cssConfig;
  };

  useEffect(() => {
    widgetClient.registerWidgetOpener((id, bypassIdCheck) => {
      if (id === productId || bypassIdCheck) {
        setDialogVisible(true);
      }
    });
  }, []);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

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

          <div className='flex flex-col border-none p-4 md:w-3/10 md:px-10 md:py-6'>
            {/* Widget Title */}
            {customizations.generalLayout?.showWidgetTitle && (
              <div className='wigmix-widget-title text-primary' data-pw='itg-widget-title'>{intl.formatMessage({ id: 'widgetTitle' })}</div>
            )}

            {/* Reference Product */}
            {productInfo && (
              <div className='wigmix-reference-image-container pt-4 md:pt-8' data-pw='itg-reference-product'>
                <img
                    className='wigmix-reference-image size-full object-cover'
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

          <div className='relative flex w-full flex-col bg-primary px-6 pb-4 md:w-7/10 md:pt-[6.5%]'>
            <div className='flex items-center pb-4'>
              {/* Sort Type */}
              <div className='text-lg text-primary'>
                {intl.formatMessage({ id: 'sort' })}:&nbsp;
                {intl.formatMessage({ id: getSortTypeIntlId(sortType) })}
              </div>
              {/* Sort and Filter buttons */}
              <div className='ml-auto flex gap-2'>
                <Button
                  className='rounded bg-black bg-buttonPrimary'
                  size='sm'
                  radius='none'
                  onClick={() => setScreen(ScreenType.SORT)}
                  data-pw='itg-sort-button'>
                  <span className='text-buttonPrimary'>
                    {intl.formatMessage({ id: 'sort' })}
                  </span>
                </Button>
                <Button
                  className='rounded bg-black bg-buttonPrimary'
                  size='sm'
                  radius='none'
                  onClick={() => setScreen(ScreenType.FILTER)}
                  data-pw='itg-filter-button'>
                  <span className='text-buttonPrimary'>
                    {intl.formatMessage({ id: 'filter' })}
                  </span>
                </Button>
              </div>
            </div>

            {/* Product Result Grid */}
            <div
              className={`wigmix-product-grid grid ${getProductGridCssClasses('grid-cols-2 lg:grid-cols-3', 'gap-x-2', 'gap-y-4')} overflow-y-auto`}
              style={getProductGridCssConfig()}
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

            {/* Sort Options Desktop */}
            {screen === ScreenType.SORT && (breakpoint === WidgetBreakpoint.DESKTOP || breakpoint === WidgetBreakpoint.TABLET) && (
              <SortOptions
                className='absolute left-0 top-14 hidden h-9/10 w-full flex-col justify-between gap-4 px-8 pb-8 pt-4 text-primary md:flex'
                sortType={sortType}
                setSortType={setSortType}
                setScreen={setScreen}
              />
            )}
            {/* Filter Options Desktop */}
            {screen === ScreenType.FILTER && (breakpoint === WidgetBreakpoint.DESKTOP || breakpoint === WidgetBreakpoint.TABLET) && (
              <FilterOptions
                className='absolute left-0 top-14 hidden h-9/10 w-full flex-col justify-between gap-4 bg-primary px-4 pb-8 pt-4 text-primary md:flex'
                facets={facets}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                setScreen={setScreen}
              />
            )}
          </div>
        </div>
        <>
          {/* Sort/Filter Options Mobile & Tablet */}
          {breakpoint === WidgetBreakpoint.MOBILE && (
            <ViSenzeModal
              open={!!screen}
              layout='nested_mobile'
              onClose={() => setScreen(null)}
              position='center'
              darkMode={darkMode}
              fontFamily={customizations.generalLayout?.fontFamily}
              placementId={`${appSettings.placementId}`}>
              <>
                {screen === ScreenType.SORT && (
                  <SortOptions
                    className='flex h-full flex-col justify-between'
                    sortType={sortType}
                    setSortType={setSortType}
                    setScreen={setScreen}
                  />
                )}
              </>
              <>
                {screen === ScreenType.FILTER && (
                  <FilterOptions
                    className='flex h-full flex-col justify-between'
                    facets={facets}
                    selectedFilters={selectedFilters}
                    setSelectedFilters={setSelectedFilters}
                    setScreen={setScreen}
                  />
                )}
              </>
            </ViSenzeModal>
          )}
        </>
      </ViSenzeModal>
    </WidgetResultContext.Provider>
  );
};

export default IconTriggeredGrid;
