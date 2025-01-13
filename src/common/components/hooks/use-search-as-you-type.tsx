import { useContext, useEffect, useState } from 'react';
import type { ProductSearchResponse } from 'visearch-javascript-sdk';
import type { SearchImage } from '../../types/image';
import { isImageUrl } from '../../types/image';
import { WidgetDataContext } from '../../types/contexts';
import { Actions, Category } from '../../types/tracking-constants';
import type { ProcessedProduct } from '../../types/product';
import { getFlattenProducts } from '../../utils';

interface SearchAsYouTypeProps {
  image: SearchImage | undefined;
  query: string;
}

interface SearchAsYouType {
  imageId: string;
  searchAsYouTypeResults: ProcessedProduct[];
  error: string;
}

const useSearchAsYouType = ({
  query,
  image,
}: SearchAsYouTypeProps): SearchAsYouType => {
  const { searchSettings, productSearch } = useContext(WidgetDataContext);
  const [imageId, setImageId] = useState('');
  const [searchAsYouTypeResults, setSearchAsYouTypeResults] = useState<ProcessedProduct[]>([]);
  const [error, setError] = useState<string>('');

  const handleError = (err: string): void => {
    setError(err);
  };

  const handleSearchAsYouTypeSuccess = (res: ProductSearchResponse): void => {
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else if (res?.status === 'OK') {
      setError('');
      const newMetadata = {
        cat: Category.RESULT,
        queryId: res.reqid,
      };

      if (res.im_id) {
        setImageId(res.im_id);
      }

      const newSearchAsYouTypeResults = getFlattenProducts(res.result || []);
      setSearchAsYouTypeResults(newSearchAsYouTypeResults);

      if (newSearchAsYouTypeResults.length > 0) {
        productSearch.send(Actions.RESULT_LOAD, newMetadata);
        productSearch.lastTrackingMetadata = newMetadata;
      }
    }
  };

  const searchAsYouType = (): void => {
    const params = { ...searchSettings };
    params.q = query;
    params.sayt = true;
    params.limit = 3;

    if (image) {
      if (isImageUrl(image)) {
        params.im_url = image.imgUrl;
      } else {
        const [file] = image.files;
        params.image = file;
      }
    }

    productSearch.multisearchByImage(params, handleSearchAsYouTypeSuccess, handleError);
  };

  useEffect(() => {
    if (query || image) {
      searchAsYouType();
    }
  }, [query, image]);

  return {
    imageId,
    searchAsYouTypeResults,
    error,
  };
};

export default useSearchAsYouType;
