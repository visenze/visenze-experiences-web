import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import ResultScreen from './screens/ResultScreen';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import { RootContext } from '../../common/components/shadow-wrapper';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import MagnifyingGlassIcon from '../../common/icons/MagnifyingGlassIcon';
import { WidgetDataContext } from '../../common/types/contexts';
import { isImageUrl, isPid, type SearchImageOrPid } from '../../common/types/image';
import type { BoxData } from '../../common/types/product';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { parseBox } from '../../common/utils';

enum ScreenType {
  LOADING = 'loading',
  RESULT = 'result',
  ERROR = 'error',
}

interface SlideOutDrawerProps {
  pid: string;
  renderModalWithoutPortal?: boolean;
}

const SlideOutDrawer: FC<SlideOutDrawerProps> = ({ pid, renderModalWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations, callbacks } = widgetConfig;
  const breakpoint = useBreakpoint();
  const intl = useIntl();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [image, setImage] = useState<SearchImageOrPid | undefined>();
  const [error, setError] = useState('');
  const [screen, setScreen] = useState(ScreenType.LOADING);
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [searchHistory, setSearchHistory] = useState<SearchImageOrPid[]>([]);
  const [lastSuccessfulImage, setLastSuccessfulImage] = useState<SearchImageOrPid | undefined>();
  const root = useContext(RootContext);

  const {
    mainImageUrl,
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

  const appendSearchHistory = (searchImage: SearchImageOrPid): void => {
    const previousSearches = searchHistory.filter((prev) => prev !== searchImage);
    setSearchHistory([searchImage, ...previousSearches]);
  };

  const onFindSimilar = async (data: SearchImageOrPid): Promise<void> => {
    let executeDefault = true;
    if (callbacks.onFindSimilar) {
      executeDefault = await callbacks.onFindSimilar(data);
    }
    if (!executeDefault) {
      return;
    }
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
      page: 1,
      limit: customizations.results?.limit || 20,
      get_all_fl: true,
    };

    if (image && isPid(image)) {
      params['pid'] = image.pid;
    }
    if (image && isImageUrl(image)) {
      params['im_url'] = image.imgUrl;
    }
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
          <div className='flex size-full flex-col items-center justify-center gap-1 text-center'>
            <div className='font-bold'>{intl.formatMessage({ id: 'errorDescription' })}</div>
            <div>{error}</div>
            <button
              className='mt-3 w-fit rounded-md bg-buttonPrimary px-5 py-2 text-buttonPrimary'
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
            <img className='w-48 md:w-60' src='https://cdn.visenze.com/images/loading-results.gif' />
          </div>
        );
      default:
        return <></>;
    }
  };

  useEffect(() => {
    if (!productResults.length && dialogVisible) {
      setImage({ pid });
    }
  }, [dialogVisible]);

  useEffect(() => {
    widgetClient.registerWidgetOpener((id, bypassIdCheck) => {
      if (id === pid || bypassIdCheck) {
        openWidgetPopup();
      }
    });
  }, []);

  useEffect(() => {
    if (productResults.length > 0) {
      const imageWithUrlAppended = image && mainImageUrl && !isImageUrl(image) ? {
        ...image,
        imgUrl: mainImageUrl,
      } : image;
      if (imageWithUrlAppended) {
        appendSearchHistory(imageWithUrlAppended);
      }
      setScreen(ScreenType.RESULT);
      setLastSuccessfulImage(imageWithUrlAppended);
    }
  }, [productResults]);

  useEffect(() => {
    if (image && mainImageUrl && !isImageUrl(image)) {
      setImage((prev) => ({
        ...prev,
        imgUrl: mainImageUrl,
      }));
    }
  }, [mainImageUrl]);

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
      <PopupTriggerButton
        config={customizations.popup}
        text={intl.formatMessage({ id: 'triggerCTA' })}
        darkMode={darkMode}
        onClick={onPopupIconClick}
        defaultIcon={
          <MagnifyingGlassIcon
            color={
              darkMode
                ? customizations.popup?.triggerIcon?.colorDark || ''
                : customizations.popup?.triggerIcon?.color || ''
            }
            className='wigmix-popup-trigger-icon default size-6'
          />
        }
      />

      <ViSenzeModal
        open={dialogVisible}
        layout={breakpoint}
        onClose={onModalClose}
        renderWithoutPortal={!!renderModalWithoutPortal}
        position={customizations.popup?.position || 'right'}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        placementId={`${appSettings.placementId}`}>
        {getScreen()}
      </ViSenzeModal>
    </>
  );
};

export default SlideOutDrawer;
