import type { CSSProperties, FC } from 'react';
import { useEffect, useCallback, useContext, useState } from 'react';
import { Button } from '@nextui-org/button';
import { useIntl } from 'react-intl';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetResultContext } from '../../common/types/contexts';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { type FacetType, SortType, WidgetBreakpoint } from '../../common/types/constants';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useRecommendationSearch from '../../common/components/hooks/use-recommendation-search';
import IconTriggeredGridIcon from './components/IconTriggeredGridIcon';
import Footer from '../../common/components/Footer';
import Result from './components/Result';
import CloseIcon from '../../common/icons/CloseIcon';
import SortOptions from './components/SortOptions';
import FilterOptions from './components/FilterOptions';
import { getSortTypeIntlId } from '../../common/utils';

export enum ScreenType {
  SORT = 'sort',
  FILTER = 'filter',
}

interface IconTriggeredGridProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  productId: string;
}

const IconTriggeredGrid: FC<IconTriggeredGridProps> = ({ config, productSearch, productId }) => {
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cardBorderRadius, setCardBorderRadius] = useState('');
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
    productSearch,
    config,
    productId,
    retryCount,
    sortType,
    filters: selectedFilters,
  });

  const onModalClose = useCallback((): void => {
    setDialogVisible(false);
    setSortType(SortType.RELEVANCE);
    setRetryCount(0);
    if (productResults.length > 0) {
      productSearch.sendEvent(Actions.CLOSE, {
        label: Labels.PAGE,
        metadata,
      });
    }
  }, [productResults]);

  const onPopupIconClick = (): void => {
    productSearch.sendEvent(Actions.CLICK, {
      cat: Category.ENTRANCE,
      label: Labels.ICON,
    });
    if (config.customizations.productSlider?.borderRadius
      && config.customizations.productSlider?.borderRadius !== 0) {
      setCardBorderRadius(`${config.customizations.productSlider?.borderRadius}px`);
    }
    setDialogVisible(true);
  };

  const getProductCardCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    if (config.customizations.productSlider?.borderRadius
      && config.customizations.productSlider?.borderRadius !== 0) {
      cssConfig.borderRadius = `${config.customizations.productSlider?.borderRadius}px`;
    }
    if (config.customizations.productSlider?.contentPadding
      && config.customizations.productSlider?.contentPadding !== 0) {
      cssConfig.padding = `${config.customizations.productSlider?.contentPadding}px`;
    }
    if (config.customizations.productSlider?.marginVertical
      && config.customizations.productSlider?.marginVertical !== 0) {
      cssConfig.marginTop = `${config.customizations.productSlider?.marginVertical}px`;
      cssConfig.marginBottom = `${config.customizations.productSlider?.marginVertical}px`;
    }
    if (config.customizations.productSlider?.marginHorizontal
      && config.customizations.productSlider?.marginHorizontal !== 0) {
      cssConfig.marginLeft = `${config.customizations.productSlider?.marginHorizontal}px`;
      cssConfig.marginRight = `${config.customizations.productSlider?.marginHorizontal}px`;
    }
    return cssConfig;
  };

  const getProductGridStyles = (): string => {
    if (config.customizations.productSlider) {
      return (
        `grid-cols-${config.customizations.productSlider.display.mobile.slideToShow} `
        + `md:grid-cols-${config.customizations.productSlider.display.tablet.slideToShow} `
        + `lg:grid-cols-${config.customizations.productSlider.display.desktop.slideToShow}`
      );
    }
    return '';
  };

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
      <Button isIconOnly radius='full' size='sm' className='bg-white' onClick={onPopupIconClick}>
        <IconTriggeredGridIcon className='size-6' />
      </Button>

      <ViSenzeModal
        open={dialogVisible}
        layout={breakpoint}
        onClose={onModalClose}
        placementId={`${config.appSettings.placementId}`}>
        <div className='relative flex size-full flex-col bg-primary lg:flex-row lg:justify-between lg:divide-x-1'>
          {/* Close Button */}
          <Button
            isIconOnly
            className='absolute right-3 top-3 z-10 border-none bg-transparent'
            onClick={onModalClose}
            data-pw='itg-close-button'>
            <CloseIcon className='size-6' />
          </Button>

          <div className='flex flex-col border-none p-4 lg:w-3/10 lg:px-10 lg:py-6'>
            {/* Widget Title */}
            <div className='flex items-center'>
              <div className='widget-title text-primary' data-pw='itg-widget-title'>
                {intl.formatMessage({ id: 'iconTriggeredGrid.title' })}
              </div>
            </div>

            {/* Reference Product */}
            {productInfo && (
              <div className='pt-4 lg:pt-8' data-pw='itg-reference-product'>
                <Result index={0} result={productInfo} isReferenceProduct={true} />
              </div>
            )}

            {/* ViSenze Footer desktop */}
            <Footer className='mt-auto hidden bg-transparent lg:flex' dataPw='itg-visenze-footer-desktop' />
          </div>

          <div className='relative flex w-full flex-col bg-primary px-6 pb-4 lg:w-7/10 lg:pt-[6.5%]'>
            <div className='flex items-center pb-4'>
              {/* Sort Type */}
              <div className='text-lg text-primary'>
                {intl.formatMessage({ id: 'iconTriggeredGrid.sort' })}:&nbsp;
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
                  <span className='calls-to-action-text text-buttonPrimary'>
                    {intl.formatMessage({ id: 'iconTriggeredGrid.sort' })}
                  </span>
                </Button>
                <Button
                  className='rounded bg-black bg-buttonPrimary'
                  size='sm'
                  radius='none'
                  onClick={() => setScreen(ScreenType.FILTER)}
                  data-pw='itg-filter-button'>
                  <span className='calls-to-action-text text-buttonPrimary'>
                    {intl.formatMessage({ id: 'iconTriggeredGrid.filter' })}
                  </span>
                </Button>
              </div>
            </div>

            {/* Product Result Grid */}
            <div
              className={`grid ${getProductGridStyles() !== '' ? getProductGridStyles() : 'grid-cols-2 lg:grid-cols-3'} gap-x-2 gap-y-4 overflow-y-auto`}
              data-pw='itg-product-result-grid'>
              {productResults.map((result, index) => (
                <div
                  className={`${cardBorderRadius !== '' ? 'border-2' : ''}`}
                  key={`${result.product_id}-${index}`}
                  data-pw={`itg-product-result-card-${index + 1}`}
                  style={getProductCardCssConfig()}
                >
                  <Result index={index} result={result} isReferenceProduct={false} />
                </div>
              ))}
            </div>

            {/* ViSenze Footer mobile */}
            <Footer className='mt-auto bg-transparent pt-4 lg:hidden' dataPw='itg-visenze-footer-mobile' />

            {/* Sort Options Desktop */}
            {screen === ScreenType.SORT && breakpoint === WidgetBreakpoint.DESKTOP && (
              <SortOptions
                className='absolute left-0 top-14 hidden h-9/10 w-full flex-col justify-between gap-4 px-8 pb-8 pt-4 text-primary lg:flex'
                sortType={sortType}
                setSortType={setSortType}
                setScreen={setScreen}
              />
            )}
            {/* Filter Options Desktop */}
            {screen === ScreenType.FILTER && breakpoint === WidgetBreakpoint.DESKTOP && (
              <FilterOptions
                className='absolute left-0 top-14 hidden h-9/10 w-full flex-col justify-between gap-4 bg-primary px-4 pb-8 pt-4 text-primary lg:flex'
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
              placementId={`${config.appSettings.placementId}`}>
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
