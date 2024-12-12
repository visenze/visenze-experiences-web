import { useContext, useEffect, useState } from 'react';
import type { ProductSearchResponse } from 'visearch-javascript-sdk';
import type { SearchImage } from '../../types/image';
import { isImageFile, isImageUrl } from '../../types/image';
import { WidgetDataContext } from '../../types/contexts';
import { Actions, Category } from '../../types/tracking-constants';

interface AutocompleteProps {
  image: SearchImage | undefined;
  query: string;
}

interface Autocomplete {
  imageId: string;
  autocompleteResults: string[];
  error: string;
}

const useAutocomplete = ({
  query,
  image,
}: AutocompleteProps): Autocomplete => {
  const { searchSettings, productSearch } = useContext(WidgetDataContext);
  const [imageId, setImageId] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const handleError = (err: string): void => {
    setError(err);
  };

  const handleAutocompleteSuccess = (res: ProductSearchResponse): void => {
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

      const newAutocompleteResults = (res.result || []).map((r: any) => r.text);
      setAutocompleteResults(newAutocompleteResults);

      if (newAutocompleteResults.length > 0) {
        productSearch.sendEvent(Actions.RESULT_LOAD, newMetadata);
        productSearch.setLastTrackingMeta(newMetadata);
      }
    }
  };

  const autocomplete = (): void => {
    const params = { ...searchSettings };
    params.q = query;

    if (image) {
      if (isImageUrl(image)) {
        params.im_url = image.imgUrl;
      } else if (isImageFile(image)) {
        const [file] = image.files;
        params.image = file;
      }
    }

    productSearch.multisearchAutocomplete(params, handleAutocompleteSuccess, handleError);
  };

  useEffect(() => {
    if (query || image) {
      autocomplete();
    }
  }, [query, image]);

  return {
    imageId,
    autocompleteResults,
    error,
  };
};

export default useAutocomplete;
