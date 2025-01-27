import type { CSSProperties, FC, ReactElement } from 'react';
import { useState, useEffect, useRef, useContext } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { Listbox, ListboxItem } from '@nextui-org/listbox';
import { cn } from '@nextui-org/theme';
import { useIntl } from 'react-intl';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import type { SearchImage } from '../../../common/types/image';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';
import Result from '../components/Result';
import Footer from '../../../common/components/Footer';
import Header from '../components/Header';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
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
  onTextSearch: (text: string) => void;
  onImageSearch: (data: SearchImage) => void;
  onKeywordUpdate: (q: string) => void;
  searchHistory: SearchImage[];
}

const ResultScreen: FC<ResultScreenProps> = ({
  onModalClose,
  onTextSearch = (): void => {},
  onImageSearch = (): void => {},
  onKeywordUpdate,
  searchHistory,
}) => {
  const { widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const { productResults, image, autocompleteResults } = useContext(WidgetResultContext);
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

  const getFile = (searchImage: SearchImage | undefined): string => {
    if (!searchImage) {
      return '';
    }
    if (isImageUrl(searchImage)) {
      return searchImage.imgUrl;
    }
    if (isImageDataUrl(searchImage)) {
      return searchImage.file;
    }
    return '';
  };

  const getReferenceImage = (): string => {
    if (searchHistory && searchHistory.length > 0) {
      return getFile(searchHistory[0]);
    }
    return '';
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

  const onClickMoreLikeThisHandler = (queryImage: SearchImage): void => {
    onImageSearch(queryImage);
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

  const getMobileView = (): ReactElement => (
    <div className='flex h-full flex-col gap-8 md:hidden'>
      <Header onCloseHandler={onModalClose}
              showTitle={customizations.generalLayout?.showWidgetTitle}
              iconColor={customizations.generalLayout?.fontColor} />
      <div className='relative h-screen grow overflow-hidden'>
        <div className='flex justify-center'
          {...minimizedDrawerHandler}
          {...mobileInputFocusHandler}>
          <img
            className={cn(showFullResults ? 'opacity-0' : 'opacity-100 max-h-[50vh]', 'wigmix-reference-image transition-all duration-500')}
            src={getReferenceImage()}
            data-pw='ss-reference-image'
          />

          <div
            className={`no-scrollbar fixed left-3/20 top-14 m-auto flex w-2/3 gap-1 overflow-scroll ${showFullResults ? 'block' : 'hidden'}`}
            data-pw='ss-previous-views'
          >
            {searchHistory?.map((searchImage, index) => (
              <img
                key={`image-history-${index}`}
                className='wigmix-search-history-image aspect-square w-1/5 object-cover'
                src={getFile(searchImage)}
                onClick={() => onClickMoreLikeThisHandler(searchImage)}
                data-pw={`ss-previous-views-image-${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            showFullResults ? 'top-10 bottom-14 left-0 right-0' : 'top-60 bottom-14 left-3 right-3',
            'transition-all duration-1000 z-10 absolute rounded-xl bg-primary shadow-inner pt-8',
          )}
          {...minimizedDrawerHandler}>
          <div className='absolute top-0 h-8 w-full' {...maximizedDrawerHandler}>
            <Button
              isIconOnly
              radius='full'
              className='absolute inset-x-0 -top-3 m-auto bg-buttonPrimary'
              onClick={(): void => toggleFullResults()}
              data-pw='ss-arrow-button'
            >
              <CustomizableIcon
                  height={24}
                  width={24}
                  url={`https://cdn.visenze.com/images/arrow-${showFullResults ? 'down' : 'up'}-icon.svg`}
                  color={customizations.buttons?.primary?.fontColor}
                  className='cursor-pointer'
              />
            </Button>
          </div>

          <div ref={resultsRef} className='no-scrollbar flex size-full justify-center overflow-y-auto'>
            <div
              className={`wigmix-product-grid mx-2 grid h-full pb-20 pt-2 ${getProductGridCssClasses('grid-cols-2', 'gap-x-4', 'gap-y-2')}`}
              style={getProductGridCssConfig()}
              data-pw='ss-product-result-grid'
            >
              {productResults.map((result, index) => (
                <div key={result.product_id} className='border-gray-300'>
                  <Result
                    onImageSearch={onImageSearch}
                    clearSearch={() => setSearch('')}
                    index={index}
                    result={result}
                  />
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
        <div className='px-3 pt-2'>
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
            data-pw='ss-refinement-text-bar'
          />
        </div>
      </div>
    </div>
  );

  const getTabletAndDesktopView = (): ReactElement => (
    <div className='hidden md:block'>
      <Header onCloseHandler={onModalClose}
              showTitle={customizations.generalLayout?.showWidgetTitle}
              iconColor={customizations.generalLayout?.fontColor} />
      <div className='absolute bottom-8 left-0 top-16 w-full overflow-hidden'>
        <div className='flex h-full flex-row'>
          <div className='relative left-0 row-span-1 h-full w-1/4 py-4'>
            <div className='flex h-full flex-col justify-between px-16 md:px-6'>
              <div
                className='mt-4 flex flex-col items-center rounded-2xl border border-black text-center'>
                <img src={getFile(image)} className='rounded-2xl object-cover object-center md:h-full' data-pw='ss-reference-image'/>
              </div>

              {searchHistory && searchHistory?.length > 1 && (
                <div className='pt-2'>
                  <p>
                    {intl.formatMessage({ id: 'previousViews' })}
                  </p>
                  <div className='no-scrollbar flex h-full flex-row gap-1 overflow-scroll pt-1' data-pw='ss-previous-views'>
                    {searchHistory
                      ?.slice(1)
                      .map((searchImage, index) => (
                        <img
                          key={`image-history-${index}`}
                          className='aspect-square w-1/3 cursor-pointer rounded-lg object-cover'
                          src={getFile(searchImage)}
                          onClick={() => onClickMoreLikeThisHandler(searchImage)}
                          data-pw={`ss-previous-views-image-${index + 1}`}
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
                    {['dress', 'red', 'blue'].map((keyword, index) => (
                      <ListboxItem key={keyword} className={cn(keyword === search ? 'bg-gray' : '', 'pl-8')}>
                        <span className='text-base' data-pw={`ss-autocomplete-suggestion-${index + 1}`}>{keyword}</span>
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
                   data-pw='ss-product-result-grid'>
                {productResults.map((result, index) => (
                  <div key={result.product_id}>
                    <Result onImageSearch={onImageSearch} clearSearch={() => setSearch('')} index={index}
                            result={result}/>
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
    if (search.length > 0) {
      setShowInputSuggest(true);
    } else {
      setShowInputSuggest(false);
    }
  }, [search]);

  useEffect(() => {
    setInputSuggestions(autocompleteResults || []);
  }, [autocompleteResults]);

  // Set dynamic height for autocomplete suggestions container based on the number of suggestions
  useEffect(() => {
    if (inputSuggestions.length === 0) {
      setAutocompleteSuggestionsHeight(0);
    } else {
      setAutocompleteSuggestionsHeight(Math.min(38 * inputSuggestions.length + 8, 144));
    }
  }, [inputSuggestions]);

  return (
    <>
      {breakpoint === 'mobile' && getMobileView()}
      {(breakpoint === 'tablet' || breakpoint === 'desktop') && getTabletAndDesktopView()}
      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer className='fixed bottom-0 py-2 md:absolute lg:rounded-b-3xl' dataPw='ss-visenze-footer'/>
      )}
    </>
  );
};

export default ResultScreen;
