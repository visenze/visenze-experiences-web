import { useEffect, useState } from 'react';
import type { ProductSearchResponse, ProductSearchResponseSuccess, ProductType } from 'visearch-javascript-sdk';
import type { WidgetClient, WidgetConfig } from '../../visenze-core';
import { Actions, Category } from '../../types/tracking-constants';
import type { SearchImage } from '../../types/image';
import { isImageFile, isImageUrl } from '../../types/image';
import type { BoxData, ProcessedProduct } from '../../types/product';
import { getFlattenProducts, parseBox, parseToProductTypes } from '../../utils';

const getMetadata = (
  response: ProductSearchResponseSuccess,
): Record<string, any> => {
  return {
    cat: Category.RESULT,
    queryId: response.reqid,
  };
};

const getSearchParams = (
  img: SearchImage,
  imageId: string,
  config: WidgetConfig,
  product: BoxData | ProductType | undefined,
): Record<string, any> => {
  const params = { ...config.searchSettings };

  if (isImageUrl(img)) {
    params.im_url = img.imgUrl;
  } else if (isImageFile(img)) {
    params.image = img.files[0];
  } else {
    params.im_id = imageId;
  }

  if (product) {
    params.box = parseBox(product.box);
    if ('type' in product) {
      params.detection = product.type;
    }
  }

  return params;
};

const parseResults = (res: ProductSearchResponseSuccess, boxData?: BoxData): ProcessedProduct[] => {
  if ('objects' in res) {
    const index = boxData?.index ?? 0;
    return getFlattenProducts(res.objects?.[index].result);
  }

  if ('result' in res) {
    return getFlattenProducts(res.result);
  }

  return [];
};

interface ImageMultisearchProps {
  productSearch: WidgetClient;
  image: SearchImage | undefined;
  boxData: BoxData | undefined;
  config: WidgetConfig;
}

export interface ImageMultisearch {
  imageId: string;
  metadata: Record<string, any>;
  productTypes: ProductType[];
  error: string;
  resetSearch: () => void;
  multisearchWithParams: (params: Record<string, any>) => void;
  productResults: ProcessedProduct[];
  autocompleteWithQuery: (query: string) => void;
  autocompleteResults: string[];
}

const useImageMultisearch = ({
  image,
  boxData,
  config,
  productSearch,
}: ImageMultisearchProps): ImageMultisearch => {
  const [response, setResponse] = useState<ProductSearchResponseSuccess | undefined>();
  const [imageId, setImageId] = useState<string>('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [productResults, setProductResults] = useState<ProcessedProduct[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [error, setError] = useState<string>('');
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);

  const handleImageSuccess = (res: ProductSearchResponse): void => {
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else {
      setError('');
      setResponse(res);
    }
  };

  const handleAutocompleteSuccess = (res: ProductSearchResponse): void => {
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else {
      setError('');

      const newAutocompleteResults = (res.result || []).map((r: any) => r.text);
      setAutocompleteResults(newAutocompleteResults);
    }
  };

  const handleError = (err: string): void => {
    setError(err);
  };

  const resetSearch = (): void => {
    setError('');
    setImageId('');
    setMetadata({});
    setResponse(undefined);
    setProductResults([]);
    setProductTypes([]);
  };

  const getProductType = (boxData: BoxData | undefined): ProductType | BoxData | undefined => {
    if (boxData?.index) {
      return productTypes[boxData.index];
    } else {
      return boxData;
    }
  };

  const multisearch = (): void => {
    if (image) {
      const product = getProductType(boxData);
      const params = getSearchParams(image, imageId, config, product);
      productSearch.multisearchByImage(params, handleImageSuccess, handleError);
    } else {
      resetSearch();
    }
  };

  const multisearchWithParams = (params: Record<string, any>): void => {
    params = {...params, ...config.searchSettings};
    productSearch.multisearchByImage(params, handleImageSuccess, handleError);
  };

  const autocompleteWithQuery = (q: string): void => {
    let params = { q };

    if (image) {
      const product = getProductType(boxData);
      params = { q, ...getSearchParams(image, imageId, config, product) };
    } else if (!q) {
      return;
    }

    productSearch.multisearchAutocomplete(params, handleAutocompleteSuccess, handleError);
  };

  useEffect(() => {
    if (response?.status === 'OK') {
      const metadata = getMetadata(response);
      const results = parseResults(response, boxData);
      setProductResults(results);
      setMetadata(metadata);
      setImageId(response.im_id ?? '');

      const productTypes = parseToProductTypes(response);
      if (productTypes.length) {
        setProductTypes(productTypes);
      }

      autocompleteWithQuery('');

      if (results.length) {
        productSearch.sendEvent(Actions.RESULT_LOAD, metadata);
        productSearch.setLastTrackingMeta(metadata);
      }
    }
  }, [response]);

  useEffect(() => {
    if (image) {
      multisearch();
    }
  }, [boxData]);

  useEffect(() => {
    if (image) {
      multisearch();
    } else {
      resetSearch();
    }
  }, [image]);

  return {
    imageId,
    metadata,
    productResults,
    productTypes,
    error,
    autocompleteResults,
    resetSearch,
    autocompleteWithQuery,
    multisearchWithParams,
  };
};

export default useImageMultisearch;
