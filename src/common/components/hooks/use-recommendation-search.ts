import { useEffect, useState } from 'react';
import type {
  Facet,
  ObjectProductResponse,
  ProductSearchResponse,
  ProductSearchResponseSuccess,
  ProductType,
} from 'visearch-javascript-sdk';
import type { WidgetClient, WidgetConfig } from '../../visenze-core';
import {type FacetType, SortType} from '../../types/constants';
import { Actions, Category } from '../../types/tracking-constants';
import type { ProcessedProduct } from '../../types/product';
import {getFacets, getFilterQueries, getFlattenProduct, getFlattenProducts, parseToProductTypes} from '../../utils';

interface RecommendationSearchProps {
  productSearch: WidgetClient;
  config: WidgetConfig;
  productId: string;
  retryCount: number;
  sortType?: SortType;
  filters?: Record<FacetType, any>;
}

export interface RecommendationSearch {
  metadata: Record<string, any>;
  error: string;
  resetSearch: () => void;
  productInfo: ProcessedProduct | undefined;
  productResults: ProcessedProduct[];
  productTypes: ProductType[];
  referenceImageUrl: string;
  objectIndex: number;
  setObjectIndex: (objectIndex: number) => void;
  objects: ObjectProductResponse[];
  facets: Facet[];
}

const useRecommendationSearch = ({
  productSearch,
  config,
  productId,
  retryCount,
  sortType,
  filters,
}: RecommendationSearchProps): RecommendationSearch => {
  const [response, setResponse] = useState<ProductSearchResponseSuccess | undefined>();
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [productResults, setProductResults] = useState<ProcessedProduct[]>([]);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [objects, setObjects] = useState<ObjectProductResponse[]>([]);
  const [productInfo, setProductInfo] = useState<ProcessedProduct | undefined>();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [objectIndex, setObjectIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const productDetails = config.displaySettings.productDetails;
  const MAX_RETRY_COUNT = config.maxRetryCount;

  const handleSuccess = (res: ProductSearchResponse): void => {
    if (res.status === 'fail') {
      handleError(res.error.message);
      return;
    } else {
      setError('');
      setResponse(res);
    }
  };

  const handleError = (err: string): void => {
    setError(err);
  };

  const resetSearch = (): void => {
    setError('');
    setMetadata({});
    setResponse(undefined);
    setProductResults([]);
    setProductTypes([]);
  };

  const searchById = (): void => {
    const params = config.searchSettings;
    params['return_product_info'] = true;
    params['show_best_product_images'] = true;
    params['sort_by'] = '';
    params.facets = getFacets(productDetails);
    params.facets_show_count = true;

    if (sortType === SortType.PRICE_HTL) {
      params['sort_by'] = `${productDetails.price}:desc`;
    } else if (sortType === SortType.PRICE_LTH) {
      params['sort_by'] = `${productDetails.price}:asc`;
    }

    if (filters) {
      params.filters = getFilterQueries(productDetails, filters);
    }

    productSearch.searchById(productId, params, handleSuccess, handleError);
  };

  const getMetadata = (): Record<string, any> => {
    const urlParams = new URLSearchParams(window.location.search);

    return {
      cat: Category.RESULT,
      queryId: response?.reqid,
      fromReqId: urlParams.get('vsFromReqId'),
      sPid: urlParams.get('vsFromPid'),
      sPos: urlParams.get('vsFromPos'),
    };
  };

  const parseResults = (res: ProductSearchResponseSuccess): ProcessedProduct[] => {
    if (res.result) {
      return getFlattenProducts(res.result);
    }
    if (res.objects?.[objectIndex].result) {
      return getFlattenProducts(res.objects[objectIndex].result);
    }
    return [];
  };

  const setModelOutfitAsReference = (): void => {
    if (response) {
      const modelImage = response.product_info?.best_images?.find((bestImage) => bestImage.type === 'outfit');
      if (modelImage) {
        setReferenceImageUrl(modelImage.url);
      }
    }
  };

  useEffect(() => {
    if (response?.status === 'OK') {
      const metadata = getMetadata();
      const results = parseResults(response);
      if (response.product_info) {
        const productInfo = getFlattenProduct(response.product_info);
        setProductInfo(productInfo);
      }
      setReferenceImageUrl(response.product_info?.main_image_url  || '');
      setProductResults(results);
      setMetadata(metadata);
      setObjects(response.objects || []);

      // Set facets only once
      if (facets.length === 0 && response.facets) {
        setFacets(response.facets);
      }

      const productTypes = parseToProductTypes(response);
      if (productTypes.length > 0) {
        setProductTypes(productTypes);
      }

      // Model Outfit should be the reference image if strategy is STL
      const strategy: any = response.strategy;
      if (strategy.algorithm === 'STL') {
        setModelOutfitAsReference();
      }

      // Send RESULT LOAD tracking event if there are results
      if (results.length) {
        productSearch.sendEvent(Actions.RESULT_LOAD, metadata);
        productSearch.setLastTrackingMeta(metadata);
      }
    }
  }, [response]);

  // Trigger search when product id / sort type / filter  changes
  useEffect(() => {
    if (productId) {
      searchById();
    } else {
      resetSearch();
    }
  }, [productId, sortType, filters]);

  // Attempt the API call again up to the maximum allowed retries
  useEffect(() => {
    if (retryCount && retryCount <= MAX_RETRY_COUNT) {
      searchById();
    }
  }, [retryCount]);

  // Update product results when objectIndex changes
  useEffect(() => {
    if (objects.length > 0) {
      setProductResults(getFlattenProducts(objects[objectIndex].result));
    }
  }, [objectIndex]);

  return {
    metadata,
    productInfo,
    productResults,
    productTypes,
    error,
    resetSearch,
    referenceImageUrl,
    objectIndex,
    setObjectIndex,
    objects,
    facets,
  };
};

export default useRecommendationSearch;
