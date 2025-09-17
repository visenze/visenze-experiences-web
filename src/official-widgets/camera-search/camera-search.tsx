import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import type { ProductType } from 'visearch-javascript-sdk';
import { CameraSearchMessageKey } from './default-config';
import ResultScreen from './screens/ResultScreen';
import UploadScreen from './screens/UploadScreen';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import PopupTriggerButton from '../../common/components/popup-trigger-button/PopupTriggerButton';
import CroppingProvider from '../../common/components/providers/CroppingProvider';
import { RootContext } from '../../common/components/shadow-wrapper';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import CameraIcon from '../../common/icons/CameraIcon';
import { WidgetBreakpoint } from '../../common/types/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { SearchImage, SearchImageOrPid } from '../../common/types/image';
import type { BoxData } from '../../common/types/product';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { parseBox } from '../../common/utils';

enum ScreenType {
  LOADING = 'loading',
  UPLOAD = 'upload',
  RESULT = 'result',
  ERROR = 'error',
}

interface CameraSearchProps {
  renderModalWithoutPortal?: boolean;
}

interface SearchHistoryEntry {
  image: SearchImageOrPid;
  productTypes: ProductType[];
  box?: BoxData;
}

const CameraSearch: FC<CameraSearchProps> = ({ renderModalWithoutPortal }) => {
  const { widgetConfig, widgetClient, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const breakpoint = useBreakpoint();
  const intl = useIntl();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [image, setImage] = useState<SearchImageOrPid | undefined>();
  const [error, setError] = useState('');
  const [screen, setScreen] = useState(ScreenType.UPLOAD);
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [activeHistory, setActiveHistory] = useState<SearchHistoryEntry>();
  const [showFullResults, setShowFullResults] = useState(false);
  const [lastSuccessfulImage, setLastSuccessfulImage] = useState<SearchImageOrPid | undefined>();
  const root = useContext(RootContext);

  const {
    imageId,
    productResults,
    autocompleteResults,
    autocompleteWithQuery,
    productTypes,
    metadata,
    error: errorFromApi,
    resetSearch,
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
        setScreen(ScreenType.UPLOAD);
        if (lastSuccessfulImage) {
          setImage(lastSuccessfulImage);
        } else {
          resetSearch();
        }
      }
    }, 300);
  };

  const onBack = (): void => {
    setScreen(ScreenType.UPLOAD);
    setLastSuccessfulImage(undefined);
  };

  const appendSearchHistory = (searchImage: SearchImageOrPid, pts: ProductType[]): void => {
    if (pts.length) {
      const newEntries: SearchHistoryEntry[] = [];
      pts.forEach((pt, i) => {
        const newEntry: SearchHistoryEntry = {
          image: searchImage,
          productTypes: pts,
          box: {
            box: {
              x1: pt.box[0],
              y1: pt.box[1],
              x2: pt.box[2],
              y2: pt.box[3],
            },
            index: i,
          },
        };
        newEntries.push(newEntry);
      });
      if (!searchHistory.find((entry) => entry.image === searchImage)) {
        setSearchHistory((prevHistory) => [...newEntries, ...prevHistory].slice(0, 20));
      }
      setActiveHistory(newEntries[0]);
    } else {
      const newEntry: SearchHistoryEntry = {
        image: searchImage,
        productTypes: [],
      };
      if (!searchHistory.find((entry) => entry.image === searchImage)) {
        setSearchHistory((prevHistory) => [newEntry, ...prevHistory].slice(0, 20));
      }
      setActiveHistory(newEntry);
    }
  };

  const onImageUpload = (data: SearchImage): void => {
    setScreen(ScreenType.LOADING);
    setBoxData(undefined);
    setImage(data);
  };

  const onFindSimilar = (data: SearchHistoryEntry): void => {
    if (JSON.stringify(activeHistory) === JSON.stringify(data)) {
      // Fake the search if same image
      setScreen(ScreenType.LOADING);
      setTimeout(() => setScreen(ScreenType.RESULT), 300);
    } else {
      setScreen(ScreenType.LOADING);
      setBoxData(data.box);
      setImage(data.image);
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
      limit: customizations.results?.limit || 20,
      get_all_fl: true,
    };

    if (activeHistory?.box) {
      params['box'] = parseBox(activeHistory.box.box);
    }

    multisearchWithParams(params);
  };

  const openWidgetPopup = (): void => {
    setDialogVisible(true);
    widgetClient.forceErrorState = (): void => {
      setError('Sample error message here');
    };
  };

  const onCameraButtonClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    widgetClient.sendEvent(Actions.CLICK, {
      label: Labels.ENTER,
      cat: Category.ENTRANCE,
    });
    openWidgetPopup();
  };

  const getScreen = (): ReactElement => {
    switch (screen) {
      case ScreenType.ERROR:
        return (
            <div className='flex size-full flex-col items-center justify-center gap-1 text-center'>
              <div className='font-bold'>
                {intl.formatMessage({ id: CameraSearchMessageKey.errorDescription })}
              </div>
              <div>{error}</div>
              <button className='mt-3 w-fit rounded-md bg-buttonPrimary px-5 py-2 text-buttonPrimary'
                      data-testid='wigmix-back'
                      onClick={() => {
                        setError('');
                        if (lastSuccessfulImage) {
                          setImage(lastSuccessfulImage);
                          setScreen(ScreenType.RESULT);
                        } else {
                          resetSearch();
                          setScreen(ScreenType.UPLOAD);
                        }
                      }}>
                {intl.formatMessage({ id: CameraSearchMessageKey.back })}
              </button>
            </div>
        );
      case ScreenType.UPLOAD:
        return <UploadScreen onModalClose={onModalClose} onImageUpload={onImageUpload} />;
      case ScreenType.RESULT: {
        return (
          <ResultScreen
            productResults={productResults}
            productTypes={activeHistory?.productTypes || []}
            autocompleteResults={autocompleteResults}
            metadata={metadata}
            onModalClose={onModalClose}
            onBack={onBack}
            onTextSearch={onTextSearch}
            onFindSimilar={onFindSimilar}
            onImageUpload={onImageUpload}
            onKeywordUpdate={onKeywordUpdate}
            searchHistory={searchHistory}
            setSearchHistory={setSearchHistory}
            showFullResults={showFullResults}
            setShowFullResults={setShowFullResults}
            toggleFullResults={() => {
              setShowFullResults((v) => !v);
            }}
            activeHistory={activeHistory}
          />
        );
      }
      case ScreenType.LOADING:
        return (
          <div className='flex h-full items-center justify-center'>
            <img className='w-48 md:w-60' src='https://cdn.visenze.com/images/loading-results.gif' />
          </div>
        );
      default:
        return <UploadScreen onModalClose={onModalClose} onImageUpload={onImageUpload} />;
    }
  };

  useEffect(() => {
    if (productResults.length > 0) {
      if (image) {
        if (boxData) {
          setActiveHistory(searchHistory.find((h) => JSON.stringify(h.image) === JSON.stringify(image)
            && JSON.stringify(h.box) === JSON.stringify(boxData)));
        } else {
          appendSearchHistory(image, productTypes);
        }
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

  useEffect(() => {
    // Send Entrance Load event on widget render
    widgetClient.sendEvent(Actions.LOAD, {
      cat: Category.ENTRANCE,
      label: Labels.PAGE,
    });
    widgetClient.registerWidgetOpener(() => {
      openWidgetPopup();
    });
  }, []);

  if (!root) {
    return <></>;
  }

  return (
      <CroppingProvider boxData={boxData} setBoxData={setBoxData}>
        <PopupTriggerButton config={customizations.popup}
                            text={intl.formatMessage({ id: CameraSearchMessageKey.triggerCTA })}
                            darkMode={darkMode}
                            onClick={onCameraButtonClick}
                            defaultIcon={
                              <CameraIcon
                                  color={darkMode
                                      ? customizations.popup?.triggerIcon?.colorDark || ''
                                      : customizations.popup?.triggerIcon?.color || ''}
                                  className='wigmix-popup-trigger-icon default size-6'
                              />
                            } />
        <ViSenzeModal
          className={screen === ScreenType.UPLOAD && breakpoint !== WidgetBreakpoint.MOBILE ? 'h-fit' : ''}
          open={dialogVisible}
          layout={breakpoint}
          onClose={onModalClose}
          position={customizations.popup?.position || 'center'}
          darkMode={darkMode}
          fontFamily={customizations.generalLayout?.fontFamily}
          placementId={`${appSettings.placementId}`}
          renderWithoutPortal={!!renderModalWithoutPortal}>
          {getScreen()}
        </ViSenzeModal>
      </CroppingProvider>
  );
};

export default CameraSearch;
