import type { ReactElement } from 'react';
import { useEffect, memo, useCallback, useContext, useState } from 'react';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetResultContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';
import type { BoxData } from '../../common/types/product';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import { parseBox } from '../../common/utils';
import UploadScreen from './screens/UploadScreen';
import ResultScreen from './screens/ResultScreen';
import { ScreenType } from '../../common/types/constants';
import type { ProductDisplayConfig, WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import CameraIcon from './icons/CameraIcon';
import LoadingIcon from './icons/LoadingIcon';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import CroppingProvider from '../../common/components/providers/CroppingProvider';

const CameraSearch = memo((props: { config: WidgetConfig; productSearch: WidgetClient }) => {
  const { config, productSearch } = props;
  const breakpoint = useBreakpoint();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [image, setImage] = useState<SearchImage | undefined>();
  const [resizedImage, setResizedImage] = useState<SearchImage | undefined>();
  const [screen, setScreen] = useState<ScreenType>(ScreenType.UPLOAD);
  const [selectedChip, setSelectedChip] = useState<string>('');
  const [boxData, setBoxData] = useState<BoxData | undefined>();
  const [searchHistory, setSearchHistory] = useState<SearchImage[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<string[]>([]);
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
    config,
    productSearch,
  });

  const resetData = (): void => {
    setSearchHistory([]);
    setImage(undefined);
    setResizedImage(undefined);
    setBoxData(undefined);
    setTrendingKeywords([]);
    setSelectedChip('');
    setScreen(ScreenType.UPLOAD);
    resetSearch();
  };

  const onModalClose = useCallback((): void => {
    setDialogVisible(false);
    if (productResults.length > 0) {
      productSearch.send(Actions.CLOSE, {
        label: Labels.PAGE,
        metadata,
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

  const onMoreLikeThis = (data: SearchImage): void => {
    appendSearchHistory(data);
    if (image === data) {
      // Fake the search if same image
      setScreen(ScreenType.LOADING);
      setTimeout(() => setScreen(ScreenType.RESULT), 300);
    } else {
      setScreen(ScreenType.LOADING);
      setTrendingKeywords([]);
      setSelectedChip('');
      setBoxData(undefined);
      setImage(data);
    }
  };

  const onKeywordUpdate = (q: string): void => {
    autocompleteWithQuery(q);
  };

  const onKeywordSearch = (inputKeyword: string, chip: string): void => {
    setSelectedChip(chip);

    let query = chip ? chip.concat(' ', inputKeyword) : inputKeyword;
    if (query.length > QUERY_MAX_CHARACTER_LENGTH) {
      query = query.slice(0, QUERY_MAX_CHARACTER_LENGTH);
    }

    const params: Record<string, any> = {
      q: query,
      im_id: imageId,
      page: 1,
      limit: config.searchSettings.limit,
      get_all_fl: true,
    };
    const product = boxData?.index ? productTypes[boxData.index] : boxData;

    if (product) {
      params.box = parseBox(product.box);
      if ('type' in product) {
        params.detection = product.type;
      }
    }

    multisearchWithParams(params);
  };

  const onCameraButtonClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    productSearch.send(Actions.CLICK, {
      label: Labels.ENTER,
      cat: Category.ENTRANCE,
    });
    setDialogVisible(true);
  };

  const getScreen = (): ReactElement => {
    switch (screen) {
      case ScreenType.UPLOAD:
        return <UploadScreen onModalClose={onModalClose} setScreen={setScreen} onImageUpload={onImageUpload} />;
      case ScreenType.RESULT:
        return (
          <ResultScreen
            onModalClose={onModalClose}
            setScreen={setScreen}
            onKeywordSearch={onKeywordSearch}
            onMoreLikeThis={onMoreLikeThis}
            onImageUpload={onImageUpload}
            onKeywordUpdate={onKeywordUpdate}
            searchHistory={searchHistory}
            setSearchHistory={setSearchHistory}
            selectedChip={selectedChip}
            setSelectedChip={setSelectedChip}
            trendingKeywords={trendingKeywords}
            productCustomizations={config.customizations.productSlider || ({} as ProductDisplayConfig)}
          />
        );
      case ScreenType.LOADING:
        return (
          <div className='flex h-full items-center justify-center'>
            <LoadingIcon />
          </div>
        );
      default:
        return <UploadScreen onModalClose={onModalClose} onImageUpload={onImageUpload} setScreen={setScreen} />;
    }
  };

  // Accompanying logic to open the widget via the widget client's openWidget function
  useEffect(() => {
    const element = document.querySelector(config.displaySettings.cssSelector) as HTMLElement | null;
    const callback = (mutationList: MutationRecord[]): void => {
      mutationList.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-visenze-dialog-open') {
          if (element && element.dataset.visenzeDialogOpen === 'true') {
            setDialogVisible(true);
          }
        }
      });
    };
    const observer = new MutationObserver(callback);
    if (element) {
      observer.observe(element, {
        attributes: true,
        childList: false,
        subtree: false,
      });
    }
    return (): void => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    (async (): Promise<void> => {
      if (image && 'file' in image) {
        await productSearch.visearch.resizeImage(image.file, config.appSettings.resizeSettings, (resizedObj) => setResizedImage({ file: resizedObj ?? '', files: image.files }));
      }
    })();
  }, [image]);

  useEffect(() => {
    if (trendingKeywords.length === 0) {
      setTrendingKeywords(autocompleteResults);
    }
  }, [autocompleteResults]);

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
    productSearch.send(Actions.LOAD, {
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
        {config.customizations?.icons.cameraButton ? (
          <img
            src={config.customizations.icons.cameraButton}
            onClick={onCameraButtonClick}
            className='size-7 cursor-pointer'></img>
        ) : (
          <CameraIcon onClickHandler={onCameraButtonClick} />
        )}
        <ViSenzeModal
          open={dialogVisible}
          layout={breakpoint}
          onClose={onModalClose}
          placementId={`${config.appSettings.placementId}`}>
          {getScreen()}
        </ViSenzeModal>
      </CroppingProvider>
    </WidgetResultContext.Provider>
  );
});

export default CameraSearch;
