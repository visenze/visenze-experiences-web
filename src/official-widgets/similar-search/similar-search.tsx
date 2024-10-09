import type { FC, ReactElement } from 'react';
import { useEffect, useState, useCallback, useContext } from 'react';
import { Button } from '@nextui-org/button';
import { Actions, Category, Labels } from '../../common/types/tracking-constants';
import { WidgetResultContext } from '../../common/types/contexts';
import type { SearchImage } from '../../common/types/image';
import type { BoxData } from '../../common/types/product';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import useImageMultisearch from '../../common/components/hooks/use-image-multisearch';
import { parseBox } from '../../common/utils';
import ResultScreen from './screens/ResultScreen';
import { ScreenType } from '../../common/types/constants';
import type { WidgetConfig, WidgetClient, ProductDisplayConfig } from '../../common/visenze-core';
import { RootContext } from '../../common/components/shadow-wrapper';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import LoadingIcon from './icons/LoadingIcon';
import SimilarSearchIcon from './icons/SimilarSearchIcon';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';

interface SimilarSearchProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  element: HTMLElement | null;
}

const SimilarSearch: FC<SimilarSearchProps> = ({ config, productSearch, element }) => {
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
    productTypes,
    metadata,
    error,
    resetSearch,
    autocompleteWithQuery,
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

  const onPopupIconClick = (event: any): void => {
    event.stopPropagation();
    event.preventDefault();
    productSearch.send(Actions.CLICK, {
      cat: Category.ENTRANCE,
      label: Labels.ICON,
    });
    setDialogVisible(true);
    setScreen(ScreenType.LOADING);
  };

  const getScreen = (): ReactElement => {
    switch (screen) {
      case ScreenType.RESULT:
        return (
          <ResultScreen
            onModalClose={onModalClose}
            onKeywordSearch={onKeywordSearch}
            onMoreLikeThis={onMoreLikeThis}
            onKeywordUpdate={onKeywordUpdate}
            searchHistory={searchHistory}
            selectedChip={selectedChip}
            trendingKeywords={trendingKeywords}
            productCustomizations={config.customizations.productSlider || ({} as ProductDisplayConfig)}
          />
        );
      case ScreenType.LOADING:
        return (
          <div className='my-40 flex justify-center'>
            <LoadingIcon />
          </div>
        );
      default:
        return (
          <ResultScreen
            onModalClose={onModalClose}
            onKeywordSearch={onKeywordSearch}
            onMoreLikeThis={onMoreLikeThis}
            onKeywordUpdate={onKeywordUpdate}
            searchHistory={searchHistory}
            selectedChip={selectedChip}
            trendingKeywords={trendingKeywords}
            productCustomizations={config.customizations.productSlider || ({} as ProductDisplayConfig)}
          />
        );
    }
  };

  useEffect(() => {
    if (!productResults.length && dialogVisible) {
      const imgUrl = element?.dataset.url ?? '';

      appendSearchHistory({ imgUrl });
      setImage({ imgUrl });
    }
  }, [dialogVisible]);

  useEffect(() => {
    (async (): Promise<void> => {
      if (image && 'file' in image) {
        await productSearch.visearch.resizeImage(image.file, config.appSettings.resizeSettings, (resizedObj) => setResizedImage({ file: resizedObj ?? '', files: image.files }));
      }
    })();
  }, [image]);

  useEffect(() => {
    if (productResults.length > 0) {
      setScreen(ScreenType.RESULT);
    }
  }, [productResults]);

  useEffect(() => {
    if (trendingKeywords.length === 0) {
      setTrendingKeywords(autocompleteResults);
    }
  }, [autocompleteResults]);

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

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
      <Button isIconOnly radius='full' size='sm' className='bg-white' onClick={onPopupIconClick}>
        <SimilarSearchIcon>
          <text
            style={{ fontFamily: 'Arial, sans-serif', fontSize: '167.8px', whiteSpace: 'pre' }}
            x='-1.867'
            y='427.772'
            transform='matrix(1, 0, 0, 1, 2.842170943040401e-14, 7.105427357601002e-15)'>
            MORE
          </text>
        </SimilarSearchIcon>
      </Button>

      <ViSenzeModal open={dialogVisible} layout={breakpoint} onClose={onModalClose}
                    placementId={`${config.appSettings.placementId}`}>
        {getScreen()}
      </ViSenzeModal>
    </WidgetResultContext.Provider>
  );
};

export default SimilarSearch;
