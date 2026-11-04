import { useContext, useEffect, useRef, useState } from 'react';
import type {
  Facet,
  ObjectProductResponse,
  ProductSearchResponse,
  ProductSearchResponseSuccess,
  ProductType,
} from 'visearch-javascript-sdk';
import { WidgetDataContext } from '../../types/contexts';
import { type FacetType, SortType } from '../../types/constants';
import { Actions, Category } from '../../types/tracking-constants';
import type { ProcessedProduct } from '../../types/product';
import { BEST_OUTFIT_IMAGE_SYS_ATTR } from '../../constants';
import {
  getBestImageSysAttrsToGet, getBestImageUrl, getFacets, getFilterQueries, getFlattenProduct, getFlattenProducts,
  parseToProductTypes,
} from '../../utils';

interface RecommendationMultiSearchProps {
  productId: string;
  /** Outfit mode only: query by image when there is no productId. A productId takes precedence. */
  imageUrl?: string;
  sortType?: SortType;
  filters?: Record<FacetType, any>;
  shouldDisplayAlternatives?: boolean;
  /**
   * Shop-the-look mode: also request the query metadata and a temporary public query image, and prefer the
   * best outfit image of the query product as the reference image, and always call the outfit recommendations
   * API. Set `searchSettings.boi_only` to restrict results to objects found in best outfit images.
   */
  useOutfitReference?: boolean;
}

export interface RecommendationMultiSearch {
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
  isLoading: boolean;
}

const useRecommendationMultiSearch = ({
  productId,
  imageUrl,
  sortType,
  filters,
  shouldDisplayAlternatives,
  useOutfitReference,
}: RecommendationMultiSearchProps): RecommendationMultiSearch => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const [response, setResponse] = useState<ProductSearchResponseSuccess | undefined>();
  const latestRequestId = useRef(0);
  const [processedResponse, setProcessedResponse] = useState<ProductSearchResponseSuccess | undefined>();
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [productResults, setProductResults] = useState<ProcessedProduct[]>([]);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [objects, setObjects] = useState<ObjectProductResponse[]>([]);
  const [productInfo, setProductInfo] = useState<ProcessedProduct | undefined>();
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [objectIndex, setObjectIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const productDetails = widgetConfig.displaySettings.productDetails;

  const hasQuery = !!productId || (!!useOutfitReference && !!imageUrl);

  const handleSuccess = (res: ProductSearchResponse): void => {
    if (widgetConfig.callbacks?.preprocessResponse && typeof widgetConfig.callbacks.preprocessResponse === 'function') {
      widgetConfig.callbacks.preprocessResponse(res);
    }
    if (res.status === 'fail') {
      handleError(res.error.message);
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
    if (useOutfitReference) {
      setProcessedResponse(undefined);
      setReferenceImageUrl('');
      setProductInfo(undefined);
      setObjects([]);
    }
  };

  const multisearchById = (): void => {
    const params: Record<string, any> = {};
    params['sort_by'] = '';
    params['facets'] = getFacets(productDetails);
    params['facets_show_count'] = true;
    params['limit'] = customizations.results?.limit || 20;
    if (productId) {
      params['pid'] = productId;
    } else if (useOutfitReference && imageUrl) {
      params['im_url'] = imageUrl;
    }
    params['sys_attrs_to_get'] = getBestImageSysAttrsToGet(customizations);

    if (sortType === SortType.PRICE_HTL) {
      params['sort_by'] = `${productDetails['price']}:desc`;
    } else if (sortType === SortType.PRICE_LTH) {
      params['sort_by'] = `${productDetails['price']}:asc`;
    }

    if (filters) {
      params['filters'] = getFilterQueries(productDetails, filters);
    }

    const searchParams = { ...params, ...widgetConfig.searchSettings };
    if (useOutfitReference) {
      // The reference image needs these regardless of what searchSettings says; extra sys attrs requested by the integrator are kept.
      searchParams['qinfo'] = true;
      searchParams['return_query_temp_url'] = true;
      const sysAttrs = [params['sys_attrs_to_get'], widgetConfig.searchSettings?.['sys_attrs_to_get'], BEST_OUTFIT_IMAGE_SYS_ATTR];
      searchParams['sys_attrs_to_get'] = [...new Set(sysAttrs.flatMap((attrs) => String(attrs ?? '').split(',')).filter(Boolean))].join(',');
      // A new query shows the loading state instead of the previous product's outfit.
      resetSearch();
      // Ignore the answer of a request that a newer query has superseded.
      latestRequestId.current += 1;
      const requestId = latestRequestId.current;
      widgetClient.multisearchOutfitRecommendations(
        searchParams,
        (res) => requestId === latestRequestId.current && handleSuccess(res),
        (err) => requestId === latestRequestId.current && handleError(err),
      );
    } else {
      widgetClient.multisearchRouter(searchParams, handleSuccess, handleError);
    }
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
      return getFlattenProducts(res.result, shouldDisplayAlternatives);
    }
    if (res.objects?.[objectIndex].result) {
      return getFlattenProducts(res.objects[objectIndex].result, shouldDisplayAlternatives);
    }
    return [];
  };

  // Best outfit image of the query product > query image shown by the API > query product main image.
  const getBestOutfitImageUrl = (res: ProductSearchResponseSuccess): string | undefined =>
    getBestImageUrl(res.product_info, 'outfit') ?? getBestImageUrl(res.qinfo, 'outfit');

  const getOutfitReferenceImageUrl = (res: ProductSearchResponseSuccess): string => {
    return getBestOutfitImageUrl(res)
      ?? res.query_tmp_url
      ?? res.qinfo?.main_image_url
      ?? res.product_info?.main_image_url
      ?? '';
  };

  const setModelOutfitAsReference = (): void => {
    if (response) {
      const modelImageUrl = getBestImageUrl(response.product_info, 'outfit');
      if (modelImageUrl) {
        setReferenceImageUrl(modelImageUrl);
      }
    }
  };

  useEffect(() => {
    if (response && response.status !== 'OK') {
      setProcessedResponse(response);
    }
    if (response?.status === 'OK') {
      const metadata = getMetadata();
      const results = parseResults(response);
      const queryProduct = response.product_info ?? (useOutfitReference ? response.qinfo : undefined);
      if (queryProduct) {
        const productInfo = getFlattenProduct(queryProduct);
        setProductInfo(productInfo);
      } else if (useOutfitReference) {
        setProductInfo(undefined);
      }
      if (useOutfitReference) {
        setReferenceImageUrl(getOutfitReferenceImageUrl(response));
      } else {
        setReferenceImageUrl(response.product_info?.main_image_url  || '');
      }
      setProductResults(results);
      setMetadata(metadata);
      setObjects(response.objects || []);
      setProcessedResponse(response);

      // Set facets only once
      if (facets.length === 0 && response.facets) {
        setFacets(response.facets);
      }

      const productTypes = parseToProductTypes(response);
      if (productTypes.length > 0) {
        setProductTypes(productTypes);
      }

      // Model Outfit should be the reference image if strategy is STL
      const strategy: any = response['strategy'];
      if (!useOutfitReference && strategy?.algorithm === 'STL') {
        setModelOutfitAsReference();
      }

      // Send RESULT LOAD tracking event if there are results
      if (results.length) {
        widgetClient.sendEvent(Actions.RESULT_LOAD, metadata);
        widgetClient.setLastTrackingMeta(metadata);
      }
    }
  }, [response]);

  // Trigger search when product id / sort type / filter  changes
  useEffect(() => {
    if (hasQuery) {
      multisearchById();
    } else {
      resetSearch();
    }
  }, [productId, imageUrl, sortType, filters]);

  // Update product results when objectIndex changes
  useEffect(() => {
    if (objects.length > 0) {
      setProductResults(getFlattenProducts(objects[objectIndex].result, shouldDisplayAlternatives));
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
    isLoading: hasQuery && !error && (!response || processedResponse !== response),
  };
};

export default useRecommendationMultiSearch;
