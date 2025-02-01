import type { FC, ReactElement } from 'react';
import { useEffect, useCallback, useContext, useState } from 'react';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetDataContext, WidgetResultContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';
import { isImageDataUrl } from '../../common/types/image';
import type { BoxData } from '../../common/types/product';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { parseBox } from '../../common/utils';
import UploadScreen from './screens/UploadScreen';
import ResultScreen from './screens/ResultScreen';
import { ScreenType } from '../../common/types/constants';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import LoadingIcon from './icons/LoadingIcon';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import CroppingProvider from '../../common/components/providers/CroppingProvider';
import CustomizableIcon from '../../common/icons/CustomizableIcon';
import CameraIcon from '../../common/icons/CameraIcon';

interface CameraSearchProps {
  // no properties at the moment
}

const CameraSearch: FC<CameraSearchProps> = () => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { appSettings, customizations, searchSettings } = widgetConfig;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [resizedImage, setResizedImage] = useState<SearchImage | undefined>();
  const [screen, setScreen] = useState<ScreenType>(ScreenType.UPLOAD);
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [searchHistory, setSearchHistory] = useState<SearchImage[]>([]);
  const root = useContext(RootContext);

  const {
    imageId,
    productResults,
    autocompleteResults,
    autocompleteWithQuery,
    productTypes,
    metadata,
    error,
    resetSearch,
    multisearchWithParams,
  } = useImageMultisearch({
    image,
    boxData,
  });

  const resetData = (): void => {
    setSearchHistory([]);
    setImage(undefined);
    setResizedImage(undefined);
    setBoxData(undefined);
    setScreen(ScreenType.UPLOAD);
    resetSearch();
  };

  const onModalClose = useCallback((): void => {
    setDialogVisible(false);
    if (productResults.length > 0) {
      widgetClient.sendEvent(Actions.CLOSE, {
        label: Labels.PAGE,
        ...metadata,
      });
    }

    setTimeout(() => {
      resetData();
    }, 300);
  }, [productResults]);

  const appendSearchHistory = (searchImage: SearchImage): void => {
    const previousSearches = searchHistory.filter((prev) => prev !== searchImage);
    setSearchHistory([searchImage, ...previousSearches]);
  };

  const onImageUpload = (data: SearchImage): void => {
    appendSearchHistory(data);
    setScreen(ScreenType.LOADING);
    setBoxData(undefined);
    setImage(data);
  };

  const onFindSimilar = (data: SearchImage): void => {
    appendSearchHistory(data);
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
      limit: searchSettings['limit'],
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

  const onCameraButtonClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    widgetClient.sendEvent(Actions.CLICK, {
      label: Labels.ENTER,
      cat: Category.ENTRANCE,
    });
    setDialogVisible(true);
  };

  const getScreen = (): ReactElement => {
    switch (screen) {
      case ScreenType.UPLOAD:
        return <UploadScreen onModalClose={onModalClose} onImageUpload={onImageUpload} />;
      case ScreenType.RESULT:
        return (
          <ResultScreen
            onModalClose={onModalClose}
            setScreen={setScreen}
            onTextSearch={onTextSearch}
            onFindSimilar={onFindSimilar}
            onImageUpload={onImageUpload}
            onKeywordUpdate={onKeywordUpdate}
            searchHistory={searchHistory}
            setSearchHistory={setSearchHistory}
          />
        );
      case ScreenType.LOADING:
        return (
          <div className='flex h-full items-center justify-center'>
            <LoadingIcon />
          </div>
        );
      default:
        return <UploadScreen onModalClose={onModalClose} onImageUpload={onImageUpload} />;
    }
  };

  widgetClient.openWidget = (): void => {
    setDialogVisible(true);
  };

  useEffect(() => {
    (async (): Promise<void> => {
      if (image && isImageDataUrl(image)) {
        await widgetClient.visearch.resizeImage(image.file, appSettings.resizeSettings, (resizedObj) => setResizedImage({ file: resizedObj ?? '' }));
      }
    })();
  }, [image]);

  useEffect(() => {
    if (productResults.length > 0) {
      setScreen(ScreenType.RESULT);
    }
  }, [productResults]);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    // Send Entrance Load event on widget render
    widgetClient.sendEvent(Actions.LOAD, {
      cat: Category.ENTRANCE,
      label: Labels.PAGE,
    });
  }, []);

  if (!root) {
    return <></>;
  }

  return (
    <WidgetResultContext.Provider
      value={{
        productTypes,
        autocompleteResults,
        productResults,
        imageId,
        image: resizedImage ?? image,
        metadata,
      }}>
      <CroppingProvider boxData={boxData} setBoxData={setBoxData}>
        {!customizations.popup?.triggerIcon?.hide && (
            <div className='wigmix-popup-trigger-button w-fit cursor-pointer'
                 onClick={onCameraButtonClick}>
              {customizations.popup?.triggerIcon?.url ? (
                  <CustomizableIcon
                      height={24}
                      width={24}
                      url={customizations.popup.triggerIcon.url}
                      color={customizations.popup?.triggerIcon?.color || ''}
                      className='wigmix-popup-trigger-icon'
                  />
              ) : (
                  <CameraIcon color={customizations.popup?.triggerIcon?.color || ''}
                              className='wigmix-popup-trigger-icon size-6' />
              )}
            </div>
        )}
        <ViSenzeModal
          open={dialogVisible}
          layout={breakpoint}
          onClose={onModalClose}
          position={customizations.popup?.position || 'center'}
          fontFamily={customizations.generalLayout?.fontFamily}
          placementId={`${appSettings.placementId}`}>
          {getScreen()}
        </ViSenzeModal>
      </CroppingProvider>
    </WidgetResultContext.Provider>
  );
};

export default CameraSearch;
