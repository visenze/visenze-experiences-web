import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import SearchBarInput from './components/SearchBarInput';
import FileDropzone from '../../common/components/FileDropzone';
import useAutocomplete from '../../common/components/hooks/use-autocomplete';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useSearchAsYouType from '../../common/components/hooks/use-search-as-you-type';
import ProductCard from '../../common/components/product-card/ProductCard';
import { RootContext } from '../../common/components/shadow-wrapper';
import CloseIcon from '../../common/icons/CloseIcon';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import UploadIcon from '../../common/icons/UploadIcon';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';
import { isImageFile } from '../../common/types/image';
import type { ProcessedProduct } from '../../common/types/product';

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

interface SearchBarResultProps {
  renderModalWithoutPortal?: boolean;
}

const SEARCH_HISTORY_BASE_KEY = 'wigmix_internal_search_history_';

const MerchandiseSearchBar: FC<SearchBarResultProps> = ({
  renderModalWithoutPortal,
}): ReactElement => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations, initState } = widgetConfig;
  const [wishlistPids, setWishlistPids] = useState<string[]>(initState?.wishlistProductIds || []);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [suggestionMax, setSuggestionMax] = useState(6);
  const [relatedMax] = useState(8);
  const breakpoint = useBreakpoint();
  const root = useContext(RootContext);
  const intl = useIntl();
  const { imageUrl, autocompleteResults, error } = useAutocomplete({
    image: undefined,
    query: debouncedQuery,
  });

  const { searchAsYouTypeResults, metadata } = useSearchAsYouType({
    image,
    query: debouncedQuery,
  });
  const trendingProducts: ProcessedProduct[] = (customizations.trendingProducts?.products || []).map((p) => ({
    product_id: p.productId,
    im_url: p.imUrl,
    title: p.title,
    price: p.price,
    product_url: p.productUrl,
  }));
  const popularTerms = customizations.popularTerms?.terms || [];

  useEffect(() => {
    if (breakpoint === WidgetBreakpoint.MOBILE) {
      setSuggestionMax(4);
    }
  }, [breakpoint]);

  const emitSearchBarCallback = (t: string | undefined, i: SearchImage | undefined): void => {
    if (widgetConfig.callbacks?.onSearchBarInput && typeof widgetConfig.callbacks.onSearchBarInput === 'function') {
      widgetConfig.callbacks.onSearchBarInput(t, i);
    }
  };

  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
    if (imageUrl) {
      if (image) {
        if (isImageFile(image)) {
          setImage({
            imgUrl: imageUrl,
          });
          emitSearchBarCallback(query, {
            imgUrl: imageUrl,
          });
        }
      } else {
        setImage({
          imgUrl: imageUrl,
        });
      }
    } else {
      setImage(undefined);
    }
  }, [imageUrl]);

  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
    const handler = setTimeout(() => {
      if (query && query.length >= 3) {
        setDebouncedQuery(query);
      }
    }, 300);

    return (): void => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    const historyFromLocalStorage = localStorage.getItem(
      `${SEARCH_HISTORY_BASE_KEY}${widgetConfig.appSettings.appKey}`,
    );
    const historyFull: SearchHistoryEntry[] = historyFromLocalStorage ? JSON.parse(historyFromLocalStorage) : [];
    const now = new Date().getTime();
    setSearchHistory(historyFull.filter((h) => now - h.timestamp <= 7 * 24 * 60 * 60 * 1000));
  }, []);

  if (error && !hasError) {
    setHasError(true);
  }

  const updateSavedHistory = (search: string): void => {
    setSearchHistory((prevHistory) => {
      const newEntry: SearchHistoryEntry = {
        query: search,
        timestamp: new Date().getTime(),
      };
      const newHistory = [newEntry, ...prevHistory.filter((h) => h.query !== search)].slice(0, 20);
      localStorage.setItem(`${SEARCH_HISTORY_BASE_KEY}${widgetConfig.appSettings.appKey}`, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const useOutsideAlerter = (ref: any): void => {
    useEffect(() => {
      const handleClickOutside = (event: any): void => {
        if (!ref.current || !event.target || !event.target.shadowRoot || !event.target.shadowRoot.contains(ref.current)) {
          setShowDropdown(false);
          setShowImageUpload(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return (): void => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  };

  const OutsideAlerter = (props: any): ReactElement => {
    const wrapperRef = useRef(null);
    useOutsideAlerter(wrapperRef);

    return (
      <div
        ref={wrapperRef}
        className='wigmix-search-bar-overlay absolute top-14 z-20 h-fit w-full overflow-y-scroll border border-gray-200 shadow-md bg-primary transition-all'>
        {props.children}
      </div>
    );
  };

  const imageUploadHandler = (img: SearchImage | undefined): void => {
    setImage(img);
    if (img && !isImageFile(img)) {
      emitSearchBarCallback(query, img);
    }
  };

  const onImageUpload = (im: SearchImage): void => {
    imageUploadHandler(im);
  };

  const onGallerySelect = (index: number): void => {
    if (customizations.imageUpload?.images[index]) {
      imageUploadHandler({ imgUrl: customizations.imageUpload.images[index].url });
    }
  };

  const getGalleryCards = (): React.ReactNode => {
    if (customizations) {
      return Object.entries(customizations.imageUpload?.images || []).map(([, imageWithLabel], index) => (
        <div
          key={index}
          className='relative row-span-1 border-none cursor-pointer'
          style={{ minWidth: '150px' }}
          onClick={(): void => onGallerySelect(index)}
          onKeyDown={(evt): void => {
            if (evt.key === 'Enter') {
              onGallerySelect(index);
            }
          }}>
          <img
            className='h-52 w-48 lg:w-fit object-cover hover:opacity-75'
            src={imageWithLabel.url}
            data-pw={`msb-gallery-image-${index + 1}`}
          />
          {imageWithLabel.label && (
            <div
              className='absolute bottom-0 z-10 w-full overflow-hidden border-1
          border-white/20 bg-gray-800 bg-opacity-80 py-1 text-center text-white shadow-small'>
              <p>{imageWithLabel.label}</p>
            </div>
          )}
        </div>
      ));
    }

    return <></>;
  };

  if (!root) {
    return <></>;
  }

  return (
    <>
      <div className='flex size-full flex-col bg-primary'>
        <div className='relative flex w-full flex-col items-center'>
          {/* Search bar */}
          <SearchBarInput
            query={query}
            setQuery={setQuery}
            image={image}
            imageUploadHandler={() => {}}
            emitSearchBarCallback={() => {
              if (query) {
                updateSavedHistory(query);
              }
              emitSearchBarCallback(query, image);
            }}
            setShowDropdown={(s) => {
              if (s) {
                setShowDropdown(true);
              }
            }}
            setShowImageUpload={(s) => {
              if (s) {
                setShowImageUpload(s);
              }
            }}
            placementId={`${widgetConfig.appSettings.placementId}`}
            renderModalWithoutPortal={!!renderModalWithoutPortal}
          />
        </div>
        {/* Autocomplete dropdown */}
        {/* eslint-disable no-nested-ternary */}
        {showDropdown && showImageUpload ? (
          <OutsideAlerter>
            <div className='flex flex-col items-end gap-2 px-4 py-1 pt-4'>
              <button data-testid='wigmix-msb-close-button' onClick={() => {
                setShowDropdown(false);
                setShowImageUpload(false);
              }}>
                <CloseIcon
                  className='size-6'
                  color={darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || ''}
                />
              </button>
            </div>

            <div className='flex flex-col-reverse lg:flex-row-reverse divide-gray-200 py-1 px-4'>
              <div className='px-4 py-1 w-full lg:3/4 overflow-x-scroll'>
                <p className='text-large font-semibold leading-6 text-primary pb-1'>
                  {intl.formatMessage({ id: 'suggestions' })}
                </p>
                <div className='flex py-2 overflow-x-scroll gap-x-3'>{getGalleryCards()}</div>
              </div>

              <div className='px-4 py-1 w-full lg:w-1/4'>
                <p className='text-large font-semibold leading-6 text-primary pb-1'>
                  {intl.formatMessage({ id: 'imageUploadTitle' })}
                </p>
                <div className='flex flex-col gap-2 pt-2'>
                  <FileDropzone onImageUpload={onImageUpload} name='msb-image-upload'>
                    <div
                      className={cn(
                        'wigmix-reference-image-container flex h-52 flex-col lg:aspect-square items-center justify-center text-center',
                        'py-8 md:py-0 border border-gray md:border-0',
                        darkMode ? 'bg-gray-800' : 'bg-gray-100',
                      )}>
                      {customizations.imageUpload?.icon?.url ? (
                        <CustomizableIcon
                          height={80}
                          width={80}
                          url={customizations.imageUpload.icon.url}
                          color={
                            darkMode
                              ? customizations.imageUpload.icon.colorDark || ''
                              : customizations.imageUpload.icon.color || ''
                          }
                        />
                      ) : (
                        <UploadIcon
                          className='size-20'
                          color={
                            darkMode
                              ? customizations.imageUpload?.icon?.colorDark || ''
                              : customizations.imageUpload?.icon?.color || ''
                          }
                        />
                      )}

                      <p
                        className='hidden px-3 py-2 leading-6 md:block'
                        style={{ color: darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || '' }}
                      >
                        {intl.formatMessage({ id: 'dragImageToSearch' })}
                      </p>

                      <p
                        className='pt-3 leading-6 md:hidden'
                        style={{ color: darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || '' }}
                      >
                        {intl.formatMessage({ id: 'tapToSearchImage' })}
                      </p>
                    </div>
                  </FileDropzone>
                </div>
              </div>
            </div>
          </OutsideAlerter>
        ) : showDropdown && query && (autocompleteResults.length > 0 || searchAsYouTypeResults.length > 0) ? (
          <OutsideAlerter>
            <div className='flex flex-col items-end gap-2 px-4 py-1 pt-4'>
              <button data-testid='wigmix-msb-close-button' onClick={() => {
                setShowDropdown(false);
                setShowImageUpload(false);
              }}>
                <CloseIcon
                  className='size-6'
                  color={darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || ''}
                />
              </button>
            </div>

            <div className='flex flex-col-reverse lg:flex-row-reverse divide-gray-200 py-1 px-4'>
              <div className='px-4 py-1 w-full lg:3/4 overflow-x-scroll text-primary'>
                <p className='text-large font-semibold leading-6 pb-1'>
                  {intl.formatMessage({ id: 'suggestions' })}
                </p>
                <div className='flex py-2 w-full overflow-x-auto gap-x-3'>
                  {searchAsYouTypeResults.slice(0, relatedMax).map((result, index) => (
                    <div
                      className='size-1/8'
                      key={`${result.product_id}-${index}`}
                      data-pw={`msb-product-result-card-${index + 1}`}
                      style={{ minHeight: '250px', minWidth: '150px' }}>
                      <ProductCard
                        key={`${result.product_id}-${index}`}
                        index={index}
                        result={result}
                        metadata={metadata}
                        isInWishlist={wishlistPids.includes(result.product_id)}
                        setIsInWishlist={(pid, isInWishlist) => {
                          setWishlistPids((prev) => {
                            const newPids = [...prev];
                            if (isInWishlist && !newPids.includes(pid)) {
                              newPids.push(pid);
                            }
                            if (!isInWishlist && newPids.includes(pid)) {
                              newPids.splice(newPids.indexOf(pid), 1);
                            }
                            return newPids;
                          });
                        }}
                        hasFindSimilar={false}
                        isRecommendation={false}
                        pwPrefix='msb'
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className='px-4 py-1 w-full lg:w-1/4'>
                <p className='text-large font-semibold leading-6 text-primary pb-1'>
                  {intl.formatMessage({ id: 'popularChoices' })}
                </p>
                <div className='flex flex-col gap-2'>
                  {autocompleteResults.slice(0, suggestionMax).map((result) => (
                    <button
                      className={cn(
                        'p-2 text-small font-normal text-left',
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200',
                      )}
                      data-testid='wigmix-msb-autocomplete-value'
                      style={{ color: darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || '' }}
                      key={result}
                      onClick={() => {
                        setQuery(result);
                        emitSearchBarCallback(result, image);
                      }}>
                      {result}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </OutsideAlerter>
        ) : showDropdown
          && (searchHistory.length > 0 || customizations.popularTerms?.enable || customizations.trendingProducts?.enable) ? (
          <OutsideAlerter>
            <div className='flex flex-col items-end gap-2 px-4 py-1 pt-4'>
              <button data-testid='wigmix-msb-close-button' onClick={() => {
                setShowDropdown(false);
                setShowImageUpload(false);
              }}>
                <CloseIcon
                  className='size-6'
                  color={darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || ''}
                />
              </button>
            </div>

            {hasError && (
              <div className='flex w-full ps-4 py-4 justify-center items-center text-center border-b-2'>
                <p className='text-large font-semibold leading-10 text-primary'>
                  {intl.formatMessage({ id: 'errorMessage' })}
                </p>
              </div>
            )}
            <div className='flex flex-col-reverse lg:flex-row-reverse divide-x-reverse divide-gray-200 py-1 px-4'>
              {customizations.trendingProducts?.enable && trendingProducts.length > 0 && (
                <div className='px-4 py-1 w-full md:3/4 overflow-x-scroll text-primary'>
                  <p className='text-large font-semibold leading-6 pb-1'>
                    {intl.formatMessage({ id: 'trending' })}
                  </p>
                  <div className='flex py-2 w-full overflow-x-auto gap-x-3'>
                    {trendingProducts.map((result, index) => (
                      <div
                        className='size-1/8'
                        key={`${result.product_id}-${index}`}
                        data-pw={`msb-product-result-card-${index + 1}`}
                        style={{ minHeight: '250px', minWidth: '150px' }}>
                        <ProductCard
                          key={`${result.product_id}-${index}`}
                          index={index}
                          result={result}
                          metadata={metadata}
                          isInWishlist={wishlistPids.includes(result.product_id)}
                          setIsInWishlist={(pid, isInWishlist) => {
                            setWishlistPids((prev) => {
                              const newPids = [...prev];
                              if (isInWishlist && !newPids.includes(pid)) {
                                newPids.push(pid);
                              }
                              if (!isInWishlist && newPids.includes(pid)) {
                                newPids.splice(newPids.indexOf(pid), 1);
                              }
                              return newPids;
                            });
                          }}
                          hasFindSimilar={false}
                          isRecommendation={false}
                          pwPrefix='msb'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {customizations.popularTerms?.enable && popularTerms.length > 0 && (
                <div className='px-4 py-1 w-full md:w-1/4'>
                  <p className='text-large font-semibold leading-6 text-primary pb-1'>
                    {intl.formatMessage({ id: 'popularChoices' })}
                  </p>
                  <div className='flex flex-col gap-2'>
                    {popularTerms.map((term) => (
                      <button
                        className={cn(
                          'p-2 text-small font-normal text-left',
                          darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200',
                        )}
                        style={{ color: darkMode ? customizations.generalLayout?.fontColorDark || '' : customizations.generalLayout?.fontColor || '' }}
                        key={term}
                        onClick={() => {
                          setQuery(term);
                          emitSearchBarCallback(term, image);
                        }}>
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </OutsideAlerter>
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default MerchandiseSearchBar;
