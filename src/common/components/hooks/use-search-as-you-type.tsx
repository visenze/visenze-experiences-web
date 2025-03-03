import { useContext, useEffect, useState } from 'react';
import type { ProductSearchResponse } from 'visearch-javascript-sdk';
import { WidgetDataContext } from '../../types/contexts';
import type { SearchImage } from '../../types/image';
import { isImageFile, isImageUrl } from '../../types/image';
import type { ProcessedProduct } from '../../types/product';
import { Actions, Category } from '../../types/tracking-constants';
import { getFlattenProducts } from '../../utils';

interface SearchAsYouTypeProps {
  image: SearchImage | undefined;
  query: string;
}

interface SearchAsYouType {
  productCount: number;
  searchAsYouTypeResults: ProcessedProduct[];
  metadata: Record<string, any>;
  error: string;
}

const useSearchAsYouType = ({
  query,
  image,
}: SearchAsYouTypeProps): SearchAsYouType => {
  const { widgetConfig, widgetClient } = useContext(WidgetDataContext);
  const { searchSettings } = widgetConfig;
  const [productCount, setProductCount] = useState(0);
  const [searchAsYouTypeResults, setSearchAsYouTypeResults] = useState<ProcessedProduct[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [error, setError] = useState<string>('');

  const handleError = (err: string): void => {
    setError(err);
  };

  const handleSearchAsYouTypeSuccess = (res: ProductSearchResponse): void => {
    if (widgetConfig.callbacks?.preprocessResponse && typeof widgetConfig.callbacks.preprocessResponse === 'function') {
      widgetConfig.callbacks.preprocessResponse(res);
    }
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else if (res?.status === 'OK') {
      setError('');
      const newMetadata = {
        cat: Category.RESULT,
        queryId: res.reqid,
      };
      setMetadata(newMetadata);

      if (res.total) {
        setProductCount(res.total);
      }

      const newSearchAsYouTypeResults = getFlattenProducts(res.result || []);
      setSearchAsYouTypeResults(newSearchAsYouTypeResults);

      if (newSearchAsYouTypeResults.length > 0) {
        widgetClient.sendEvent(Actions.RESULT_LOAD, newMetadata);
        widgetClient.setLastTrackingMeta(newMetadata);
      }
    }
  };

  const searchAsYouType = (): void => {
    const params = { ...searchSettings };
    params['q'] = query;
    params['sayt'] = true;
    params['limit'] = 8;

    if (image) {
      if (isImageUrl(image)) {
        params['im_url'] = image.imgUrl;
      } else if (isImageFile(image)) {
        const [file] = image.files;
        params['image'] = file;
      }
    }

    widgetClient.multisearchByImage(params, handleSearchAsYouTypeSuccess, handleError);
  };

  useEffect(() => {
    if (query || image) {
      searchAsYouType();
    }
  }, [query, image]);

  return {
    productCount,
    searchAsYouTypeResults,
    metadata,
    error,
  };
};

export default useSearchAsYouType;
