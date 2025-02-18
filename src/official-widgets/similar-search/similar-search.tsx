import type { FC, ReactElement } from 'react';
import { useEffect, useState, useContext } from 'react';
import { useIntl } from 'react-intl';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';
import type { BoxData } from '../../common/types/product';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import { parseBox } from '../../common/utils';
import ResultScreen from './screens/ResultScreen';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import LoadingIcon from './icons/LoadingIcon';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';

enum ScreenType {
  LOADING = 'loading',
  RESULT = 'result',
  ERROR = 'error',
}

interface SimilarSearchProps {
  imUrl: string;
}

const SimilarSearch: FC<SimilarSearchProps> = ({ imUrl }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { customizations, searchSettings } = widgetConfig;
  const breakpoint = useBreakpoint();
  const intl = useIntl();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [error, setError] = useState('');
  const [screen, setScreen] = useState(ScreenType.LOADING);
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [searchHistory, setSearchHistory] = useState<SearchImage[]>([]);
  const [lastSuccessfulImage, setLastSuccessfulImage] = useState<SearchImage | undefined>();
  const root = useContext(RootContext);

  const {
    imageId,
    productResults,
    autocompleteResults,
    productTypes,
    metadata,
    error: errorFromApi,
    resetSearch,
    autocompleteWithQuery,
    multisearchWithParams,
  } = useImageMultisearch({
    image,
    boxData,
  });

  const onModalClose = (): void => {
    setDialogVisible(false);
    if (productResults.length > 0) {
      widgetClient.sendEvent(Actions.CLOSE, {
        label: Labels.PAGE,
        ...metadata,
      });
    }

    setTimeout(() => {
      if (error) {
        setError('');
        setScreen(ScreenType.LOADING);
        if (lastSuccessfulImage) {
          setImage(lastSuccessfulImage);
        } else {
          resetSearch();
        }
      }
    }, 300);
  };

  const appendSearchHistory = (searchImage: SearchImage): void => {
    const previousSearches = searchHistory.filter((prev) => prev !== searchImage);
    setSearchHistory([searchImage, ...previousSearches]);
  };

  const onFindSimilar = (data: SearchImage): void => {
    if (image === data) {
      // Fake the search if same image
      setScreen(ScreenType.LOADING);
      setTimeout(() => setScreen(ScreenType.RESULT), 300);
    } else {
      setScreen(ScreenType.LOADING);
      setBoxData(undefined);
      setImage(data);
    }
  };

  const onKeywordUpdate = (q: string): void => {
    autocompleteWithQuery(q);
  };

  const onTextSearch = (text: string): void => {
    let query = text;
    if (query.length > QUERY_MAX_CHARACTER_LENGTH) {
      query = query.slice(0, QUERY_MAX_CHARACTER_LENGTH);
    }

    const params: Record<string, any> = {
      q: query,
      im_id: imageId,
      page: 1,
      limit: searchSettings['limit'] || 20,
      get_all_fl: true,
    };
    const product = boxData?.index ? productTypes[boxData.index] : boxData;

    if (product) {
      params['box'] = parseBox(product.box);
      if ('type' in product) {
        params['detection'] = product.type;
      }
    }

    multisearchWithParams(params);
  };

  const openWidgetPopup = (): void => {
    setDialogVisible(true);
    widgetClient.forceErrorState = (): void => {
      setError('Sample error message here');
    };
  };

  const onPopupIconClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    widgetClient.sendEvent(Actions.CLICK, {
      cat: Category.ENTRANCE,
      label: Labels.ICON,
    });
    openWidgetPopup();
  };

  const getScreen = (): ReactElement => {
    switch (screen) {
      case ScreenType.ERROR:
        return (
            <div className='size-full flex flex-col text-center justify-center items-center gap-1'>
              <div className='font-bold'>
                {intl.formatMessage({ id: 'errorDescription' })}
              </div>
              <div>{error}</div>
              <button className='text-buttonPrimary bg-buttonPrimary px-5 py-2 rounded-md w-fit mt-3'
                      data-testid='wigmix-back'
                      onClick={() => {
                        if (lastSuccessfulImage) {
                          setError('');
                          setImage(lastSuccessfulImage);
                          setScreen(ScreenType.RESULT);
                        } else {
                          onModalClose();
                        }
                      }}>
                {intl.formatMessage({ id: 'back' })}
              </button>
            </div>
        );
      case ScreenType.RESULT:
        return (
          <ResultScreen
            productResults={productResults}
            image={image}
            autocompleteResults={autocompleteResults}
            metadata={metadata}
            onModalClose={onModalClose}
            onTextSearch={onTextSearch}
            onFindSimilar={onFindSimilar}
            onKeywordUpdate={onKeywordUpdate}
            searchHistory={searchHistory}
          />
        );
      case ScreenType.LOADING:
        return (
          <div className='flex h-full items-center justify-center'>
            <LoadingIcon />
          </div>
        );
      default:
        return <></>;
    }
  };

  useEffect(() => {
    if (!productResults.length && dialogVisible) {
      setImage({ imgUrl: imUrl });
    }
  }, [dialogVisible]);

  useEffect(() => {
    widgetClient.registerWidgetOpener((id, bypassIdCheck) => {
      if (id === imUrl || bypassIdCheck) {
        openWidgetPopup();
      }
    });
  }, []);

  useEffect(() => {
    if (productResults.length > 0) {
      if (image) {
        appendSearchHistory(image);
      }
      setScreen(ScreenType.RESULT);
      setLastSuccessfulImage(image);
    }
  }, [productResults]);

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

      <ViSenzeModal open={dialogVisible} layout={breakpoint} onClose={onModalClose}
                    position={customizations.popup?.position || 'right'}>
        {getScreen()}
      </ViSenzeModal>
    </>
  );
};

export default SimilarSearch;
