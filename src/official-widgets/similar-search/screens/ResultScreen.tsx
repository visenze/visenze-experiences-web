import type { CSSProperties, FC, ReactElement } from 'react';
import { useMemo, useState, useEffect, useRef, useContext } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { Chip } from '@nextui-org/chip';
import { Listbox, ListboxItem } from '@nextui-org/listbox';
import { cn } from '@nextui-org/theme';
import { useIntl } from 'react-intl';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import type { ProcessedProduct } from '../../../common/types/product';
import type { SearchImage } from '../../../common/types/image';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';
import Result from '../components/Result';
import ArrowDownIcon from '../../../common/icons/ArrowDownIcon';
import ArrowUpIcon from '../../../common/icons/ArrowUpIcon';
import Footer from '../../../common/components/Footer';
import Header from '../components/Header';
import PrevArrow from '../components/PrevArrow';
import NextArrow from '../components/NextArrow';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import type { ProductDisplayConfig } from '../../../common/visenze-core';

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
  onKeywordSearch: (keyword: string, chip: string) => void;
  onMoreLikeThis: (data: SearchImage) => void;
  onKeywordUpdate: (q: string) => void;
  searchHistory: SearchImage[];
  selectedChip: string;
  trendingKeywords: string[];
  productCustomizations: ProductDisplayConfig;
}

const ResultScreen: FC<ResultScreenProps> = ({
  onModalClose,
  onKeywordSearch = (): void => {},
  onMoreLikeThis = (): void => {},
  onKeywordUpdate,
  searchHistory,
  selectedChip,
  trendingKeywords,
  productCustomizations,
}) => {
  const { productResults, image, autocompleteResults } = useContext(WidgetResultContext);
  const { customizations } = useContext(WidgetDataContext);
  const [search, setSearch] = useState<string>('');
  const [showFullResults, setShowFullResults] = useState(false);
  const [showInputSuggest, setShowInputSuggest] = useState(false);
  const [inputSuggestions, setInputSuggestions] = useState<string[]>([]);
  const [autocompleteSuggestionsHeight, setAutocompleteSuggestionsHeight] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const intl = useIntl();

  const carouselScrollOffset = 400;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselPos, setCarouselPos] = useState(0);

  const autocompleteSuggestionsStyle = {
    height: `${showInputSuggest ? autocompleteSuggestionsHeight : 0}px`,
    top: `${showInputSuggest ? -autocompleteSuggestionsHeight : 0}px`,
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

  const getProductCardCssConfig = (): CSSProperties => {
    const cssConfig = {} as CSSProperties;
    if (productCustomizations?.borderRadius
      && productCustomizations.borderRadius !== 0) {
      cssConfig.borderRadius = `${productCustomizations.borderRadius}px`;
    }
    if (productCustomizations?.contentPadding
      && productCustomizations.contentPadding !== 0) {
      cssConfig.padding = `${productCustomizations.contentPadding}px`;
    }
    if (productCustomizations?.marginVertical
      && productCustomizations.marginVertical !== 0) {
      cssConfig.marginTop = `${productCustomizations.marginVertical}px`;
      cssConfig.marginBottom = `${productCustomizations.marginVertical}px`;
    }
    if (productCustomizations?.marginHorizontal
      && productCustomizations.marginHorizontal !== 0) {
      cssConfig.marginLeft = `${productCustomizations.marginHorizontal}px`;
      cssConfig.marginRight = `${productCustomizations.marginHorizontal}px`;
    }
    return cssConfig;
  };

  const onClickMoreLikeThisHandler = (queryImage: SearchImage): void => {
    onMoreLikeThis(queryImage);
  };

  const maxCarouselPos = useMemo(() => {
    if (carouselRef.current) {
      return carouselRef.current.scrollWidth - carouselRef.current.clientWidth;
    }
    return 0;
  }, [carouselRef.current]);

  const onClickPrevArrow = (): void => {
    let newCarouselPos;
    if (carouselPos < carouselScrollOffset) {
      newCarouselPos = 0;
    } else {
      newCarouselPos = carouselPos - carouselScrollOffset;
    }

    carouselRef?.current?.scrollTo({
      left: newCarouselPos,
      behavior: 'smooth',
    });

    setCarouselPos(newCarouselPos);
  };

  const onClickNextArrow = (): void => {
    const newCarouselPos = Math.min(carouselPos + carouselScrollOffset, maxCarouselPos);

    carouselRef?.current?.scrollTo({
      left: newCarouselPos,
      behavior: 'smooth',
    });

    setCarouselPos(newCarouselPos);
  };

  const handleScroll = (): void => {
    setCarouselPos(carouselRef.current?.scrollLeft ? carouselRef.current?.scrollLeft : 0);
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

  const getAutocompleteChips = (): ReactElement[] | null => {
    if (trendingKeywords.length > 0) {
      return trendingKeywords.slice(6, 10).map((keyword, index) => (
        <Chip
          key={`keyword-${index}`}
          size='md'
          variant='bordered'
          className={cn('hover:bg-blue-200 cursor-pointer', {
            'bg-blue-200': keyword === selectedChip,
          })}
          onClick={() => {
            onKeywordSearch(search, keyword === selectedChip ? '' : keyword);
            scrollToResultsTop();
          }}>
          <span className='calls-to-action-text leading-6 text-primary' data-pw={`ss-autocomplete-chip-${index + 1}`}>{keyword}</span>
        </Chip>
      ));
    }

    return null;
  };

  const getMobileView = (): ReactElement => (
    <div className='flex h-full flex-col gap-8 bg-primary md:hidden'>
      <Header onCloseHandler={onModalClose}/>
      <div className='relative h-screen grow overflow-hidden'>
        <div
          {...minimizedDrawerHandler}
          {...mobileInputFocusHandler}>
          <img
            className={cn(showFullResults ? 'opacity-0' : 'w-full opacity-100 max-h-[80vh]', 'transition-all duration-500')}
            alt='ViSenze Recommendations Reference Image'
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
                className='w-2/5'
                src={getFile(searchImage)}
                onClick={() => onClickMoreLikeThisHandler(searchImage)}
                data-pw={`ss-previous-views-image-${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            showFullResults ? 'top-1/5 bottom-32 left-0 right-0' : 'top-11/20 bottom-14 left-3 right-3',
            'transition-all duration-1000 z-10 absolute rounded-xl bg-primary shadow-inner pt-8',
          )}
          {...minimizedDrawerHandler}>
          <div className='absolute top-0 h-8 w-full' {...maximizedDrawerHandler}>
            <Button
              isIconOnly
              radius='full'
              className='absolute inset-x-0 -top-3 m-auto bg-buttonSecondary'
              onClick={(): void => toggleFullResults()}
              data-pw='ss-arrow-button'
            >
              {showFullResults ? <ArrowDownIcon className='size-6'/> : <ArrowUpIcon className='size-6'/>}
            </Button>
          </div>

          <div ref={resultsRef} className='no-scrollbar flex size-full justify-center overflow-y-auto'>
            <div
              className={`mx-2 grid h-full pb-20
              ${productCustomizations?.display?.mobile ? `grid-cols-${productCustomizations.display.mobile.slideToShow}` : 'grid-cols-2'}`}
              data-pw='ss-product-result-grid'
            >
              {productResults.map((result: ProcessedProduct, index: number) => (
                <div
                  key={result.product_id}
                  className='border-gray-300 px-2 pt-2'
                  style={getProductCardCssConfig()}
                >
                  <Result
                    onMoreLikeThis={onMoreLikeThis}
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
          showFullResults ? 'opacity-100 h-24 z-20' : 'opacity-0',
          'absolute bottom-8 left-0 w-full pt-1 transition-all duration-700',
        )}>
        <div className='bg-primary px-3 pt-2'>
          {/* Refinement Text Bar */}
          <Input
            classNames={{
              input: '!text-mobile-searchBarText !font-mobile-searchBarText',
            }}
            isClearable
            maxLength={QUERY_MAX_CHARACTER_LENGTH}
            type='filters'
            placeholder={intl.formatMessage({ id: 'similarSearch.searchBarPlaceholder' })}
            value={search}
            onValueChange={(input): void => {
              setSearch(input);
            }}
            onKeyDown={(event): void => {
              if (event.nativeEvent.code === 'Enter') {
                onKeywordSearch(search, selectedChip || '');
                scrollToResultsTop();

                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
              }
            }}
            onClear={(): void => {
              setSearch('');
              onKeywordSearch('', selectedChip || '');
              scrollToResultsTop();
            }}
            data-pw='ss-refinement-text-bar'
          />

          {/* Autocomplete Chips */}
          <div className='no-scrollbar mb-2 flex flex-row gap-1 overflow-scroll pt-2' data-pw='ss-autocomplete-chips'>
            {getAutocompleteChips()}
          </div>
        </div>
      </div>
    </div>
  );

  const getTabletAndDesktopView = (): ReactElement => (
    <div className='hidden md:block'>
      <Header onCloseHandler={onModalClose}/>
      <div className='absolute left-0 top-14 w-full overflow-hidden bg-primary sm:py-8 lg:py-0'>
        <div className='flex h-full flex-row'>
          <div className='relative left-0 row-span-1 h-full w-1/4 py-4'>
            <div className='flex h-full flex-col justify-between px-16 md:px-6'>
              <div
                className='mt-4 flex flex-col items-center rounded-2xl border border-black text-center md:h-72 md:w-48'>
                <img src={getFile(image)} className='rounded-2xl object-cover object-center md:h-full' data-pw='ss-reference-image'/>
              </div>

              {searchHistory && searchHistory?.length > 1 && (
                <div className='pt-2'>
                  <p className='calls-to-action-text text-primary'>Previous views</p>
                  <div className='no-scrollbar flex h-full flex-row gap-1 overflow-scroll pt-1' data-pw='ss-previous-views'>
                    {searchHistory
                      ?.slice(1)
                      .map((searchImage, index) => (
                        <img
                          key={`image-history-${index}`}
                          className='w-1/3 cursor-pointer rounded-lg object-cover object-center'
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

          <div className='flex size-full flex-col pb-4 pt-8'>
            {/* Product Result Carousel */}
            <div className='relative w-3/4' data-pw='ss-product-result-carousel'>
              <div className='absolute h-80 w-full rounded-xl'>
                <PrevArrow isDisabled={carouselPos === 0} onClickHandler={onClickPrevArrow}
                           iconColour={customizations?.colours.background.buttonSecondary}/>
                <NextArrow isDisabled={carouselPos >= maxCarouselPos} onClickHandler={onClickNextArrow}
                           iconColour={customizations?.colours.background.buttonSecondary}/>
              </div>
              <div className='no-scrollbar flex overflow-x-scroll pb-5' ref={carouselRef} onScroll={handleScroll}>
                <div className='mx-2 flex flex-nowrap'>
                  {productResults.map((result, index) => (
                    <div className='flex h-80 w-48 items-center border-gray-300 px-2 pt-2' key={result.product_id}>
                      <Result
                        onMoreLikeThis={onMoreLikeThis}
                        clearSearch={() => setSearch('')}
                        index={index}
                        result={result}
                        carouselRef={carouselRef}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='z-30 h-1/5 w-3/4'>
              <div className='relative'>
                {/* Autocomplete Suggestions */}
                <Listbox
                  style={autocompleteSuggestionsStyle}
                  classNames={{ base: 'absolute w-full overflow-y-auto rounded-t-lg border-1 border-gray-200 bg-white transition-all' }}
                  aria-label='Actions'
                  onAction={(key): void => {
                    const newSearch = String(key);
                    onKeywordSearch(newSearch, selectedChip || '');
                    setSearch(String(newSearch));
                    setTimeout(() => {
                      setShowInputSuggest(false);
                    });
                  }}>
                  {inputSuggestions.map((keyword, index) => (
                    <ListboxItem key={keyword} className={cn(keyword === search ? 'bg-gray' : '', 'pl-8')}>
                      <span className='text-base' data-pw={`ss-autocomplete-suggestion-${index + 1}`}>{keyword}</span>
                    </ListboxItem>
                  ))}
                </Listbox>

                {/* Refinement Text Bar */}
                <div className='relative z-20 border-t-1 border-gray-200 bg-primary px-2 pt-3'>
                  <Input
                    classNames={{
                      input: 'text-tablet-searchBarText lg:text-desktop-searchBarText font-tablet-searchBarText lg:font-desktop-searchBarText',
                    }}
                    isClearable
                    maxLength={QUERY_MAX_CHARACTER_LENGTH}
                    type='filters'
                    placeholder={intl.formatMessage({ id: 'similarSearch.searchBarPlaceholder' })}
                    value={search}
                    onClick={() => setShowInputSuggest(true)}
                    onBlur={() => setTimeout(() => setShowInputSuggest(false), 100)}
                    onValueChange={(input): void => {
                      setSearch(input);
                      onKeywordUpdate(input);
                    }}
                    onKeyDown={(event): void => {
                      if (event.nativeEvent.code === 'Enter') {
                        onKeywordSearch(search, selectedChip || '');
                        setShowInputSuggest(false);
                      }
                    }}
                    onClear={(): void => {
                      setSearch('');
                      onKeywordSearch('', selectedChip || '');
                    }}
                    data-pw='ss-refinement-text-bar'
                  />
                </div>

                {/* Autocomplete Chips */}
                <div className='relative z-20 flex min-h-10 items-center bg-primary px-3 pb-1 pt-2'>
                  {
                    trendingKeywords.length > 0
                    && <p className='calls-to-action-text pr-2'>{intl.formatMessage({ id: 'similarSearch.trending' })}</p>
                  }
                  <div data-pw='ss-autocomplete-chips' className='flex gap-1'>
                    {getAutocompleteChips()}
                  </div>
                </div>
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
      setAutocompleteSuggestionsHeight(Math.min(36 * inputSuggestions.length + 5, 144));
    }
  }, [inputSuggestions]);

  return (
    <>
      {breakpoint === 'mobile' && getMobileView()}
      {(breakpoint === 'tablet' || breakpoint === 'desktop') && getTabletAndDesktopView()}
      <Footer className='fixed bottom-0 bg-white py-2 md:absolute lg:rounded-b-3xl' dataPw='ss-visenze-footer'/>
    </>
  );
};

export default ResultScreen;
