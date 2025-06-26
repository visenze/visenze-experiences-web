import { Input } from '@heroui/input';
import { useContext, useEffect, useState } from 'react';
import type { FC, ReactElement } from 'react';
import { useIntl } from 'react-intl';
import Footer from '../../../common/components/Footer';
import useBreakpoint from '../../../common/components/hooks/use-breakpoint';
import ProductCard from '../../../common/components/product-card/ProductCard';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../../common/constants';
import { WidgetDataContext } from '../../../common/types/contexts';
import { isImageDataUrl, isImageUrl } from '../../../common/types/image';
import type { SearchImageOrPid } from '../../../common/types/image';
import type { ProcessedProduct } from '../../../common/types/product';
import { getProductGridCssClasses, getProductGridCssConfig } from '../../../common/utils';
import Header from '../components/Header';

interface ResultScreenProps {
  productResults: ProcessedProduct[];
  image?: SearchImageOrPid;
  autocompleteResults?: string[];
  metadata: Record<string, any>;
  onModalClose: () => void;
  onTextSearch: (text: string) => void;
  onFindSimilar: (data: SearchImageOrPid) => void;
  onKeywordUpdate: (q: string) => void;
  searchHistory: SearchImageOrPid[];
}

const ResultScreen: FC<ResultScreenProps> = ({
  productResults,
  image,
  metadata,
  onModalClose,
  onTextSearch = (): void => {},
  onFindSimilar = (): void => {},
  onKeywordUpdate,
  // searchHistory,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [search, setSearch] = useState('');
  const [debouncedOnKeywordUpdate, setDebouncedOnKeywordUpdate] = useState<string | null>(null);
  const [isRecommendInputFocused, setIsRecommendInputFocused] = useState(false);
  const breakpoint = useBreakpoint();
  const intl = useIntl();

  // const autocompleteSuggestionsStyle = {
  //   height: `${showInputSuggest ? autocompleteSuggestionsHeight : 0}px`,
  //   width: 'calc(100% - 16px)',
  //   top: '52px',
  // };

  // const toggleFullResults = (): void => {
  //   setShowFullResults((v) => !v);
  // };

  const getFile = (searchImage: SearchImageOrPid | undefined): string => {
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

  // const getReferenceImage = (): string => {
  //   if (searchHistory && searchHistory.length > 0) {
  //     return getFile(searchHistory[0]);
  //   }
  //   return '';
  // };

  // const minimizedDrawerHandler = useSwipeable({
  //   onSwipedUp: () => setShowFullResults(true),
  //   ...swipeConfig,
  // });

  // const maximizedDrawerHandler = useSwipeable({
  //   onSwipedDown: () => setShowFullResults(false),
  //   ...swipeConfig,
  //   preventScrollOnSwipe: false,
  // });

  // const mobileInputFocusHandler = useSwipeable({
  //   onSwipedDown: () => {
  //     if (document.activeElement instanceof HTMLElement) {
  //       document.activeElement.blur();
  //     }
  //   },
  //   ...swipeConfig,
  //   preventScrollOnSwipe: false, // prevents scroll during swipe (*See Details*)
  // });

  // const scrollToResultsTop = (): void => {
  //   resultsRef.current?.scrollTo({
  //     top: 0,
  //     left: 0,
  //     behavior: 'smooth',
  //   });
  // };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedOnKeywordUpdate != null) {
        onKeywordUpdate(debouncedOnKeywordUpdate);
      }
    }, 300);

    return (): void => {
      clearTimeout(handler);
    };
  }, [debouncedOnKeywordUpdate]);

  // const getMobileView = (): ReactElement => (
  //   <div className='flex h-full flex-col gap-8 md:hidden'>
  //     <Header onCloseHandler={onModalClose}
  //             showTitle={customizations.generalLayout?.showWidgetTitle}
  //             iconColor={darkMode
  //               ? customizations.generalLayout?.fontColorDark
  //               : customizations.generalLayout?.fontColor} />
  //     <div className='relative h-screen grow overflow-hidden'>
  //       <div className='flex justify-center'
  //         {...minimizedDrawerHandler}
  //         {...mobileInputFocusHandler}>
  //         <img
  //           className={cn(showFullResults ? 'opacity-0' : 'opacity-100 max-h-[50vh]', 'wigmix-reference-image transition-all duration-500')}
  //           src={getReferenceImage()}
  //           data-pw='ss-reference-image'
  //         />

  //         <div
  //           className={`no-scrollbar fixed left-3/20 top-14 m-auto flex w-2/3 gap-1 overflow-scroll ${showFullResults ? 'block' : 'hidden'}`}
  //           data-pw='ss-previous-views'
  //         >
  //           {searchHistory?.map((searchImage, index) => (
  //             <img
  //               key={`image-history-${index}`}
  //               className='aspect-square size-20 cursor-pointer object-contain'
  //               src={getFile(searchImage)}
  //               onClick={() => onFindSimilar(searchImage)}
  //               data-testid='wigmix-previous-views-image'
  //               data-pw={`ss-previous-views-image-${index + 1}`}
  //             />
  //           ))}
  //         </div>
  //       </div>

  //       <div
  //         className={cn(
  //           showFullResults ? 'top-10 bottom-14 left-0 right-0' : 'top-60 bottom-14 left-3 right-3',
  //           'transition-all duration-1000 z-10 absolute rounded-xl bg-primary shadow-inner pt-8',
  //         )}
  //         {...minimizedDrawerHandler}>
  //         <div className='absolute top-0 h-8 w-full' {...maximizedDrawerHandler}>
  //           <div className='absolute inset-x-0 -top-3 m-auto w-fit rounded-full bg-buttonPrimary p-1 hover:opacity-90'
  //                onClick={(): void => toggleFullResults()}
  //                data-testid='wigmix-full-results-toggle'
  //                data-pw='ss-arrow-button'
  //           >
  //             {showFullResults ? (
  //                 <ChevronDownIcon color={darkMode
  //                                    ? (customizations.buttons?.primary?.fontColorDark || '')
  //                                    : (customizations.buttons?.primary?.fontColor || '')}
  //                                  className='size-6 cursor-pointer' />
  //             ) : (
  //                 <ChevronUpIcon color={darkMode
  //                                  ? (customizations.buttons?.primary?.fontColorDark || '')
  //                                  : (customizations.buttons?.primary?.fontColor || '')}
  //                                className='size-6 cursor-pointer' />
  //             )}
  //           </div>
  //         </div>

  //         <div ref={resultsRef} className='no-scrollbar flex size-full justify-center overflow-y-auto'>
  //           <div
  //             className={`wigmix-product-grid mx-2 grid h-full pb-20 pt-2 ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-2', 'gap-x-4', 'gap-y-2')}`}
  //             style={getProductGridCssConfig(customizations, breakpoint)}
  //             data-pw='ss-product-result-grid'
  //           >
  //             {productResults.map((result, index) => (
  //                 <ProductCard key={`${result.product_id}-${index}`}
  //                              onFindSimilar={(data) => {
  //                                setSearch('');
  //                                return onFindSimilar({ imgUrl: data.im_url, pid: data.product_id });
  //                              }}
  //                              index={index}
  //                              result={result}
  //                              metadata={metadata}
  //                              isRecommendation={false}
  //                              hasFindSimilar={true}
  //                              pwPrefix='ss' />
  //             ))}
  //           </div>
  //         </div>
  //       </div>
  //     </div>

  //     <div
  //       className={cn(
  //         showFullResults ? 'opacity-100 pb-2 z-20' : 'opacity-0',
  //         'absolute bottom-8 left-0 w-full pt-1 transition-all duration-700',
  //       )}>
  //       <div className='bg-primary px-3 pt-2'>
  //         {/* Refinement Text Bar */}
  //         <Input
  //           isClearable
  //           maxLength={QUERY_MAX_CHARACTER_LENGTH}
  //           type='filters'
  //           placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
  //           value={search}
  //           onValueChange={(input): void => {
  //             setSearch(input);
  //           }}
  //           onKeyDown={(event): void => {
  //             if (event.key === 'Enter') {
  //               onTextSearch(search);
  //               scrollToResultsTop();

  //               if (document.activeElement instanceof HTMLElement) {
  //                 document.activeElement.blur();
  //               }
  //             }
  //           }}
  //           onClear={(): void => {
  //             setSearch('');
  //             onTextSearch('');
  //             scrollToResultsTop();
  //           }}
  //           data-pw='ss-refinement-text-bar'
  //         />
  //       </div>
  //     </div>
  //   </div>
  // );

  const getTabletAndDesktopView = (): ReactElement => (
    <div className='flex flex-col gap-4'>
      <Header onCloseHandler={onModalClose}
              showTitle={customizations.generalLayout?.showWidgetTitle}
              iconColor={darkMode
                ? customizations.generalLayout?.fontColorDark
                : customizations.generalLayout?.fontColor} />
      <div className='size-full '>
        <div className='flex h-full flex-col gap-4 overflow-y-scroll'>
          <div className='h-full px-4 flex flex-col gap-4'>
            <div className='flex justify-between px-2'>
              <div
                className='wigmix-reference-image-container flex items-center text-center'>
                <img src={getFile(image)} className='wigmix-reference-image rounded-md md:h-full' data-pw='ss-reference-image'/>
              </div>

              {/* {searchHistory && searchHistory?.length > 1 && (
                <div>
                  <span>
                    {intl.formatMessage({ id: 'previousViews' })}
                  </span>
                  <div className='no-scrollbar flex h-full flex-row gap-1 overflow-scroll pt-1' data-pw='ss-previous-views'>
                    {searchHistory
                      ?.slice(1)
                      .map((searchImage, index) => (
                        <img
                          key={`image-history-${index}`}
                          className='aspect-square size-24 cursor-pointer rounded-lg object-contain'
                          src={getFile(searchImage)}
                          onClick={() => onFindSimilar(searchImage)}
                          data-pw={`ss-previous-views-image-${index + 1}`}
                          data-testid='wigmix-previous-views-image'
                        />
                      ))}
                  </div>
                </div>
              )} */}
              <div className='flex w-full flex-col gap-2 px-4'>
                <button className='text-sm border border-gray-200 px-2 py-1 rounded-full bg-blue-50 text-blue-800'>similar products</button>

                <button className='text-sm border border-gray-200 px-2 py-1 rounded-full bg-blue-50 text-blue-800'>suggested products</button>
              </div>
            </div>

            <div className='border-b border-gray-200'></div>
          </div>

          {/* Search input bar with Recommend me button */}
          <div className='flex gap-0 overflow-hidden w-full px-4'>
            <button
              className={`font-bold px-4 rounded-l-md h-10 text-sm transition-colors ${
                isRecommendInputFocused
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
              disabled={!search.trim()}
              onClick={() => {
                if (!search) {
                  return;
                }
                onTextSearch(search);
              }}
              data-pw='rm-recommend-me-button'>
              <span>{intl.formatMessage({ id: 'searchBarButton' })}</span>
            </button>

            <div className='relative flex-1'>
              <Input
                isClearable
                maxLength={QUERY_MAX_CHARACTER_LENGTH}
                type='filters'
                placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
                value={search}
                onValueChange={(input): void => {
                  setSearch(input);
                  setDebouncedOnKeywordUpdate(input);
                }}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter') {
                    onTextSearch(search);
                  }
                }}
                onClear={(): void => {
                  setSearch('');
                  onTextSearch('');
                }}
                onFocus={(): void => {
                  setIsRecommendInputFocused(true);
                }}
                onBlur={(): void => {
                  setIsRecommendInputFocused(false);
                }}
                data-pw='ss-refinement-text-bar'
                data-testid='wigmix-text-bar'
              />
            </div>
          </div>

          <div className='flex flex-col px-4 gap-4'>
            <div className='overflow-y-auto'>
              <div className={`wigmix-product-grid grid px-2 pb-3 ${getProductGridCssClasses(customizations, breakpoint, 'grid-cols-3', 'gap-x-2', 'gap-y-3')}`}
                   style={getProductGridCssConfig(customizations, breakpoint)}
                   data-pw='ss-product-result-grid'>
                {productResults.map((result, index) => (
                    <ProductCard key={`${result.product_id}-${index}`}
                                 onFindSimilar={(data) => {
                                   setSearch('');
                                   return onFindSimilar({ imgUrl: data.im_url, pid: data.product_id });
                                 }}
                                 index={index}
                                 result={result}
                                 metadata={metadata}
                                 isRecommendation={false}
                                 hasFindSimilar={true}
                                 pwPrefix='ss' />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* {breakpoint === 'mobile' && getMobileView()} */}
      {/* {(breakpoint === 'tablet' || breakpoint === 'desktop') && getTabletAndDesktopView()} */}
      {getTabletAndDesktopView()}
      {customizations.generalLayout?.showViSenzeLogo && (
        <Footer className='fixed bottom-0 py-2 md:absolute lg:rounded-b-3xl bg-white' dataPw='ss-visenze-footer'/>
      )}
    </>
  );
};

export default ResultScreen;
