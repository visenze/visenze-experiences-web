import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { Listbox, ListboxItem } from '@nextui-org/listbox';
import { useSwipeable } from 'react-swipeable';
import { cn } from '@nextui-org/theme';
import { useIntl } from 'react-intl';
import type { ProcessedProduct } from '../../../common/types/product';
import { WidgetDataContext, WidgetResultContext } from '../../../common/types/contexts';
import FileDropzone from '../../../common/components/FileDropzone';
import { ScreenType } from '../../../common/types/constants';
import type { SearchImage } from '../../../common/types/image';
import Result from '../components/Result';
import Footer from '../../../common/components/Footer';
import Header from '../components/Header';
import ArrowUpIcon from '../../../common/icons/ArrowUpIcon';
import ArrowDownIcon from '../../../common/icons/ArrowDownIcon';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import HotspotContainer from '../../../common/components/hotspots/hotspot-container';
import { Actions, Category, Labels } from '../../../common/types/tracking-constants';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';

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
  onKeywordSearch: (keyword: string, chip: string) => void;
  onMoreLikeThis: (data: SearchImage) => void;
  onImageUpload: (img: SearchImage) => void;
  onKeywordUpdate: (q: string) => void;
  selectedChip: string;
  setSelectedChip: (chip: string) => void;
  trendingKeywords: string[];
}

const ResultScreen: FC<ResultScreenProps> = ({
  onModalClose,
  setScreen,
  onKeywordSearch = (): void => {},
  onMoreLikeThis = (): void => {},
  onImageUpload,
  onKeywordUpdate,
  searchHistory,
  setSearchHistory,
  selectedChip,
  setSelectedChip,
}) => {
  const { productSearch } = useContext(WidgetDataContext);
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
    top: `${showInputSuggest ? -autocompleteSuggestionsHeight : 0}px`,
  };

  const toggleFullResults = (): void => {
    setShowFullResults(!showFullResults);
  };

  const getFile = (image: SearchImage | undefined): string => {
    if (!image) {
      return '';
    }
    if ('imgUrl' in image) {
      return image.imgUrl;
    }
    return image.file;
  };

  const clearSearch = (): void => {
    setSearch('');
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
    setSelectedChip('');
    setSearchHistory([]);
    setScreen(ScreenType.UPLOAD);
  };

  const onClickMoreLikeThisHandler = (queryImage: SearchImage): void => {
    onMoreLikeThis(queryImage);
  };

  const getMobileView = (): ReactElement => (
    <div className='flex h-full flex-col gap-8 bg-primary md:hidden'>
      <Header onCloseHandler={onModalClose} onBackHandler={onBackHandler} isResultScreen={true}/>
      <div className='relative h-screen grow overflow-hidden'>
        <div className='flex justify-center'
          {...minimizedDrawerHandler}
          {...mobileInputFocusHandler}>
          <div className={cn('transition-all duration-500', showFullResults ? 'opacity-0' : 'opacity-100 max-h-[50vh]')}>
            <HotspotContainer referenceImage={getReferenceImage()}/>
          </div>

          <div
            className={`no-scrollbar fixed left-3/20 top-14 m-auto flex w-2/3 gap-1 overflow-scroll ${showFullResults ? 'block' : 'hidden'}`}
            data-pw='cs-previous-views'
          >
            {searchHistory?.map((searchImage, index) => (
              <img
                key={`image-history-${index}`}
                className='w-1/6'
                src={getFile(searchImage)}
                onClick={() => onClickMoreLikeThisHandler(searchImage)}
                data-pw={`cs-previous-views-image-${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div
          className={cn(
            showFullResults ? 'top-10 bottom-14 left-0 right-0' : 'top-11/20 bottom-14 left-3 right-3',
            'transition-all duration-1000 z-10 absolute rounded-xl bg-primary shadow-inner pt-8',
          )}
          {...minimizedDrawerHandler}>
          <div className='absolute top-0 h-8 w-full' {...maximizedDrawerHandler}>
            <Button
              isIconOnly
              radius='full'
              className='absolute inset-x-0 -top-3 m-auto bg-buttonSecondary'
              onClick={(): void => toggleFullResults()}
              data-pw='cs-arrow-button'
            >
              {showFullResults ? <ArrowDownIcon className='size-6'/> : <ArrowUpIcon className='size-6'/>}
            </Button>
          </div>

          <div ref={resultsRef} className='no-scrollbar flex size-full justify-center overflow-y-auto md:hidden'>
            <div className='mx-2 grid h-full grid-cols-2 pb-20' data-pw='cs-product-result-grid'>
              {productResults.map((result: ProcessedProduct, index: number) => (
                <div
                  key={result.product_id}
                  className='border-gray-300 px-2 pt-2'>
                  <Result
                    onMoreLikeThis={onMoreLikeThis}
                    clearSearch={clearSearch}
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
        <div className='bg-primary px-3 pt-2'>
          {/* Refinement Text Bar */}
          <Input
            classNames={{
              input: '!text-mobile-searchBarText !font-mobile-searchBarText',
            }}
            isClearable
            maxLength={QUERY_MAX_CHARACTER_LENGTH}
            type='filters'
            placeholder={intl.formatMessage({ id: 'cameraSearch.searchBarPlaceholder' })}
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
            data-pw='cs-refinement-text-bar'
          />
        </div>
      </div>
    </div>
  );

  const getTabletAndDesktopView = (): ReactElement => (
    <div className='hidden md:block md:overflow-hidden lg:rounded-t-3xl'>
      <Header onCloseHandler={onModalClose} onBackHandler={onBackHandler} isResultScreen={true}/>
      <div className='absolute bottom-8 left-0 top-16 w-full overflow-hidden bg-primary'>
        <div className='flex h-full flex-row'>
          <div className='relative left-0 row-span-1 h-full w-1/3 border-r-2 border-gray-300 px-8'>
            <div className='flex h-9/10 flex-col justify-between px-2'>
              <div className='flex w-full flex-col items-center rounded-3xl border border-black pt-2 text-center'>
                <HotspotContainer className='w-3/5' referenceImage={getReferenceImage()}/>

                <FileDropzone onImageUpload={onImageUpload} name='upload-icon'>
                  <p className='calls-to-action-text px-3 py-2 leading-6 text-primary'>
                    {intl.formatMessage({ id: 'cameraSearch.dragImageToSearch.part1' })}<br/>
                    {intl.formatMessage({ id: 'cameraSearch.dragImageToSearch.part2' })}
                    <span className='underline'>
                      &nbsp;{intl.formatMessage({ id: 'cameraSearch.dragImageToSearch.part3' })}
                    </span>
                  </p>
                </FileDropzone>
              </div>

              {searchHistory && searchHistory.length > 1 && (
                <div>
                  <span className='calls-to-action-text text-primary'>
                    {intl.formatMessage({ id: 'cameraSearch.previousViews' })}
                  </span>
                  <div className='no-scrollbar flex h-full flex-row gap-1 overflow-scroll pt-1' data-pw='cs-previous-views'>
                    {searchHistory
                      ?.slice(1)
                      .map((searchImage, index) => (
                        <img
                          key={`image-history-${index}`}
                          className='aspect-[4/5] w-1/3 cursor-pointer rounded-lg object-cover object-center'
                          src={getFile(searchImage)}
                          onClick={() => onClickMoreLikeThisHandler(searchImage)}
                          data-pw={`cs-previous-views-image-${index + 1}`}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='flex w-2/3 flex-col'>
            <div className='z-10 col-span-2 pb-4'>
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
                <div className='relative z-20 bg-primary px-2 pt-3'>
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
              </div>
            </div>

            <div className='overflow-y-auto'>
              <div className={'grid grid-cols-3 gap-x-2 gap-y-3 px-2 pb-3'}
                   data-pw='cs-product-result-grid'>
                {productResults.map((result: ProcessedProduct, index: number) => (
                  <div key={result.product_id} className={cn('bg-primary')}>
                    <Result onMoreLikeThis={onMoreLikeThis} clearSearch={() => setSearch('')} index={index}
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
      setAutocompleteSuggestionsHeight(Math.min(36 * inputSuggestions.length + 5, 144));
    }
  }, [inputSuggestions]);

  useEffect(() => {
    // Send Result Load Page event on page load
    productSearch.send(Actions.LOAD, {
      cat: Category.RESULT,
      label: Labels.PAGE,
    });

    return (): void => {
      // Send Result Close Page event on page close
      productSearch.send(Actions.CLOSE, {
        cat: Category.RESULT,
        label: Labels.PAGE,
      });
    };
  }, []);

  return (
    <>
      {breakpoint === 'mobile' && getMobileView()}
      {(breakpoint === 'tablet' || breakpoint === 'desktop') && getTabletAndDesktopView()}
      <Footer className='fixed bottom-0 bg-white py-2 md:absolute md:justify-start md:pl-20 lg:rounded-b-3xl'/>
    </>
  );
};

export default ResultScreen;
