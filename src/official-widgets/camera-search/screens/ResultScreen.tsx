import type { CSSProperties, FC, ReactElement } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Listbox, ListboxItem } from '@heroui/listbox';
import { useSwipeable } from 'react-swipeable';
import { cn } from '@heroui/theme';
import { useIntl } from 'react-intl';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import FileDropzone from '../../../common/components/FileDropzone';
import { ScreenType } from '../../../common/types/constants';
import type { SearchImage } from '../../../common/types/image';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';
import ProductCard from '../../../common/components/product-card/ProductCard';
import Footer from '../../../common/components/Footer';
import Header from '../components/Header';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import HotspotContainer from '../../../common/components/hotspots/hotspot-container';
import { Actions, Category, Labels } from '../../../common/types/tracking-constants';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';

const swipeConfig = {
  delta: 10, // min distance(px) before a swipe starts. *See Notes*
  trackTouch: true, // track touch input
  trackMouse: false, // track mouse input
  rotationAngle: 0, // set a rotation angle
  swipeDuration: Infinity, // allowable duration of a swipe (ms). *See Notes*
  touchEventOptions: { passive: true }, // options for touch listeners (*See Details*)
};

interface ResultScreenProps {
  onModalClose: () => void;
  setScreen: (screen: ScreenType) => void;
  searchHistory: SearchImage[];
  setSearchHistory: (searchHistory: SearchImage[]) => void;
  onTextSearch: (text: string) => void;
  onFindSimilar: (data: SearchImage) => void;
  onImageUpload: (img: SearchImage) => void;
  onKeywordUpdate: (q: string) => void;
}

const ResultScreen: FC<ResultScreenProps> = ({
  onModalClose,
  setScreen,
  onTextSearch = (): void => {},
  onFindSimilar = (): void => {},
  onImageUpload,
  onKeywordUpdate,
  searchHistory,
  setSearchHistory,
}) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const { productResults, autocompleteResults } = useContext(WidgetResultContext);
  const [search, setSearch] = useState<string>('');
  const [showFullResults, setShowFullResults] = useState(false);
  const [showInputSuggest, setShowInputSuggest] = useState(false);
  const [inputSuggestions, setInputSuggestions] = useState<string[]>([]);
  const [autocompleteSuggestionsHeight, setAutocompleteSuggestionsHeight] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const intl = useIntl();

  const autocompleteSuggestionsStyle = {
    height: `${showInputSuggest ? autocompleteSuggestionsHeight : 0}px`,
    width: 'calc(100% - 16px)',
    top: '52px',
  };

  const toggleFullResults = (): void => {
    setShowFullResults(!showFullResults);
  };

  const getFile = (image: SearchImage | undefined): string => {
    if (!image) {
      return '';
    }
    if (isImageUrl(image)) {
      return image.imgUrl;
    }
    if (isImageDataUrl(image)) {
      return image.file;
    }
    return '';
  };

  const getReferenceImage = (): string => {
    if (searchHistory && searchHistory.length > 0) {
      return getFile(searchHistory[0]);
    }
    return '';
  };

  const minimizedDrawerHandler = useSwipeable({
    onSwipedUp: () => setShowFullResults(true),
    ...swipeConfig,
  });

  const maximizedDrawerHandler = useSwipeable({
    onSwipedDown: () => setShowFullResults(false),
    ...swipeConfig,
    preventScrollOnSwipe: false, // prevents scroll during swipe (*See Details*)
  });

  const mobileInputFocusHandler = useSwipeable({
    onSwipedDown: () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    ...swipeConfig,
    preventScrollOnSwipe: false, // prevents scroll during swipe (*See Details*)
  });

  const scrollToResultsTop = (): void => {
    resultsRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  };

  const onBackHandler = (): void => {
    setSearch('');
    setSearchHistory([]);
    setScreen(ScreenType.UPLOAD);
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

  const getMobileView = (): ReactElement => (
    <div className='flex h-full flex-col gap-8 md:hidden'>
      <Header onCloseHandler={onModalClose} onBackHandler={onBackHandler} isResultScreen={true}
              showTitle={customizations.generalLayout?.showWidgetTitle}
              iconColor={customizations.generalLayout?.fontColor} />
      <div className='relative h-screen grow overflow-hidden'>
        <div className='flex justify-center'
          {...minimizedDrawerHandler}
          {...mobileInputFocusHandler}>
          <div className={cn('transition-all duration-500', showFullResults ? 'opacity-0' : 'w-full opacity-100')}>
            <HotspotContainer referenceImage={getReferenceImage()} />
          </div>

          <div
            className={`no-scrollbar fixed left-3/20 top-14 m-auto flex w-2/3 gap-1 overflow-scroll ${showFullResults ? 'block' : 'hidden'}`}
            data-pw='cs-previous-views'>
            {searchHistory?.map((searchImage, index) => (
              <img
                key={`image-history-${index}`}
                className='aspect-square w-1/5 object-cover'
                src={getFile(searchImage)}
                onClick={() => onFindSimilar(searchImage)}
                data-pw={`cs-previous-views-image-${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            showFullResults ? 'top-20 bottom-24 left-0 right-0' : 'top-11/20 bottom-14 left-3 right-3',
            'transition-all duration-1000 z-10 absolute rounded-xl bg-primary shadow-inner pt-8',
          )}
          {...minimizedDrawerHandler}>
          <div className='absolute top-0 h-8 w-full' {...maximizedDrawerHandler}>
            <Button
              isIconOnly
              radius='full'
              className='absolute inset-x-0 -top-3 m-auto bg-buttonPrimary'
              onClick={(): void => toggleFullResults()}
              data-pw='cs-arrow-button'>
              <CustomizableIcon
                  height={24}
                  width={24}
                  url={`https://cdn.visenze.com/images/arrow-${showFullResults ? 'down' : 'up'}-icon.svg`}
                  color={customizations.buttons?.primary?.fontColor || ''}
                  className='cursor-pointer'
              />
            </Button>
          </div>

          <div ref={resultsRef} className='no-scrollbar flex size-full justify-center overflow-y-auto md:hidden'>
            <div
              className={`wigmix-product-grid mx-2 grid h-full pb-20 pt-2 ${getProductGridCssClasses('grid-cols-2', 'gap-x-4', 'gap-y-2')}`}
              style={getProductGridCssConfig()}
              data-pw='cs-product-result-grid'>
              {productResults.map((result, index) => (
                <div key={result.product_id} className='border-gray-300'>
                  <ProductCard onFindSimilar={(data) => {
                                 setSearch('');
                                 return onFindSimilar({ imgUrl: data.im_url });
                               }}
                               index={index}
                               result={result}
                               isRecommendation={false}
                               hasFindSimilar={true}
                               pwPrefix='cs' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          showFullResults ? 'opacity-100 pb-2 z-20' : 'opacity-0',
          'absolute bottom-8 left-0 w-full pt-1 transition-all duration-700',
        )}>
        <div className='bg-primary px-3 pt-2'>
          {/* Refinement Text Bar */}
          <Input
            isClearable
            maxLength={QUERY_MAX_CHARACTER_LENGTH}
            type='filters'
            placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
            value={search}
            onValueChange={(input): void => {
              setSearch(input);
            }}
            onKeyDown={(event): void => {
              if (event.nativeEvent.code === 'Enter') {
                onTextSearch(search);
                scrollToResultsTop();

                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }
            }}
            onClear={(): void => {
              setSearch('');
              onTextSearch('');
              scrollToResultsTop();
            }}
            data-pw='cs-refinement-text-bar'
          />
        </div>
      </div>
    </div>
  );

  const getTabletAndDesktopView = (): ReactElement => (
    <div className='hidden md:block md:overflow-hidden lg:rounded-t-3xl'>
      <Header onCloseHandler={onModalClose} onBackHandler={onBackHandler} isResultScreen={true}
              showTitle={customizations.generalLayout?.showWidgetTitle}
              iconColor={customizations.generalLayout?.fontColor} />
      <div className='absolute bottom-8 left-0 top-16 w-full overflow-hidden'>
        <div className='flex h-full flex-row'>
          <div className='relative left-0 row-span-1 h-full w-1/3 border-r-2 border-gray-300 px-8'>
            <div className='flex h-9/10 flex-col justify-between px-2'>
              <div className='wigmix-reference-image flex w-full flex-col items-center rounded-3xl border border-gray-300 pt-2 text-center'>
                <HotspotContainer className='w-3/5' referenceImage={getReferenceImage()} />

                <FileDropzone onImageUpload={onImageUpload} name='upload-icon'>
                  <p className='px-3 py-2 leading-6'>
                    {intl.formatMessage({ id: 'dragImageToSearch' })}
                  </p>
                </FileDropzone>
              </div>

              {searchHistory && searchHistory.length > 1 && (
                <div>
                  <span>
                    {intl.formatMessage({ id: 'previousViews' })}
                  </span>
                  <div
                    className='no-scrollbar flex h-full flex-row gap-1 overflow-scroll pt-1'
                    data-pw='cs-previous-views'>
                    {searchHistory
                      ?.slice(1)
                      .map((searchImage, index) => (
                        <img
                          key={`image-history-${index}`}
                          className='aspect-square w-1/3 cursor-pointer rounded-lg object-cover'
                          src={getFile(searchImage)}
                          onClick={() => onFindSimilar(searchImage)}
                          data-pw={`cs-previous-views-image-${index + 1}`}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex w-2/3 flex-col'>
            <div className='z-20 col-span-2 pb-4'>
              <div className='relative'>
                {/* Autocomplete Suggestions */}
                {showInputSuggest && inputSuggestions.length > 0 && (
                  <Listbox
                      style={autocompleteSuggestionsStyle}
                      classNames={{ base: 'absolute overflow-y-auto rounded-b-lg border-1 border-gray-200 bg-default-100 text-black mx-2 transition-all' }}
                      aria-label='Actions'
                      onAction={(key): void => {
                        const newSearch = String(key);
                        onTextSearch(newSearch);
                        setSearch(String(newSearch));
                        setTimeout(() => {
                          setShowInputSuggest(false);
                        });
                      }}>
                    {inputSuggestions.map((keyword, index) => (
                      <ListboxItem key={keyword} className={cn(keyword === search ? 'bg-gray' : '', 'pl-8')}>
                        <span className='text-base' data-pw={`cs-autocomplete-suggestion-${index + 1}`}>{keyword}</span>
                      </ListboxItem>
                    ))}
                  </Listbox>
                )}

                {/* Refinement Text Bar */}
                <div className='relative z-20 px-2 pt-3'>
                  <Input
                    isClearable
                    maxLength={QUERY_MAX_CHARACTER_LENGTH}
                    type='filters'
                    placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
                    value={search}
                    onClick={() => setShowInputSuggest(true)}
                    onBlur={() => setTimeout(() => setShowInputSuggest(false), 100)}
                    onValueChange={(input): void => {
                      setSearch(input);
                      onKeywordUpdate(input);
                    }}
                    onKeyDown={(event): void => {
                      if (event.nativeEvent.code === 'Enter') {
                        onTextSearch(search);
                        setShowInputSuggest(false);
                      }
                    }}
                    onClear={(): void => {
                      setSearch('');
                      onTextSearch('');
                    }}
                    data-pw='ss-refinement-text-bar'
                  />
                </div>
              </div>
            </div>

            <div className='overflow-y-auto'>
              <div className={`wigmix-product-grid grid px-2 pb-3 ${getProductGridCssClasses('grid-cols-3', 'gap-x-2', 'gap-y-3')}`}
                   style={getProductGridCssConfig()}
                   data-pw='cs-product-result-grid'>
                {productResults.map((result, index) => (
                  <div key={result.product_id}>
                    <ProductCard onFindSimilar={(data) => {
                                   setSearch('');
                                   return onFindSimilar({ imgUrl: data.im_url });
                                 }}
                                 index={index}
                                 result={result}
                                 isRecommendation={false}
                                 hasFindSimilar={true}
                                 pwPrefix='cs' />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setInputSuggestions(autocompleteResults || []);
  }, [autocompleteResults]);

  useEffect(() => {
    if (search.length > 0) {
      setShowInputSuggest(true);
    } else {
      setShowInputSuggest(false);
    }
  }, [search]);

  // Set dynamic height for autocomplete suggestions container based on the number of suggestions
  useEffect(() => {
    if (inputSuggestions.length === 0) {
      setAutocompleteSuggestionsHeight(0);
    } else {
      setAutocompleteSuggestionsHeight(Math.min(38 * inputSuggestions.length + 8, 144));
    }
  }, [inputSuggestions]);

  useEffect(() => {
    // Send Result Load Page event on page load
    widgetClient.sendEvent(Actions.LOAD, {
      cat: Category.RESULT,
      label: Labels.PAGE,
    });

    return (): void => {
      // Send Result Close Page event on page close
      widgetClient.sendEvent(Actions.CLOSE, {
        cat: Category.RESULT,
        label: Labels.PAGE,
      });
    };
  }, []);

  return (
    <>
      {breakpoint === 'mobile' && getMobileView()}
      {(breakpoint === 'tablet' || breakpoint === 'desktop') && getTabletAndDesktopView()}
      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer className='fixed bottom-0 bg-primary py-2 md:absolute md:justify-start md:pl-20 lg:rounded-b-3xl' />
      )}
    </>
  );
};

export default ResultScreen;
