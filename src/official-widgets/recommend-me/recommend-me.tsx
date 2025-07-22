import { Input } from '@heroui/input';
import { type FC, useContext, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import type { ProductSearchResponse } from 'visearch-javascript-sdk';
import Carousel from './components/Carousel';
import CarouselLoader from './components/CarouselLoader';
import useRecommendMe from '../../common/components/hooks/use-recommend-me';
import { RootContext } from '../../common/components/shadow-wrapper';
import { QUERY_MAX_CHARACTER_LENGTH } from '../../common/constants';
import { WidgetDataContext } from '../../common/types/contexts';
import type { ProcessedProduct } from '../../common/types/product';
import { Actions, Category } from '../../common/types/tracking-constants';
import { getFlattenProducts } from '../../common/utils';

interface RecommendMeProps {
  productId: string;
}

const RecommendMe: FC<RecommendMeProps> = ({ productId }) => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { customizations, searchSettings } = widgetConfig;
  const [searchBarValue, setSearchBarValue] = useState('');
  const [query, setQueryValue] = useState('');
  const [error, setError] = useState('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [results, setResults] = useState<ProcessedProduct[]>([]);
  const [mergedResults, setMergedResults] = useState<ProcessedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [isRecommendInputFocused, setIsRecommendInputFocused] = useState(false);
  const root = useContext(RootContext);
  const intl = useIntl();

  const { productResults, recommendMeWithQuery, isStreaming, requestId } = useRecommendMe({
    productId,
  });

  const handleError = (errorMsg: string): void => {
    setHasError(true);
    if (errorMsg.includes('im_url') || errorMsg.includes('image')) {
      setError(intl.formatMessage({ id: 'imageOrQueryNotFound' }));
    } else {
      setError(intl.formatMessage({ id: 'systemError' }));
    }
  };

  const handleSuccess = (res: ProductSearchResponse): void => {
    if (widgetConfig.callbacks?.preprocessResponse && typeof widgetConfig.callbacks.preprocessResponse === 'function') {
      widgetConfig.callbacks.preprocessResponse(res);
    }
    if (res.status === 'fail') {
      handleError(res.error.message);
    } else {
      setError('');
      setHasError(false);
      const md = {
        cat: Category.RESULT,
        queryId: res.reqid,
      };
      setMetadata(md);

      const newProducts = getFlattenProducts(res.result);
      setResults((prev) => (res.page === 1 ? newProducts : [...prev, ...newProducts]));
      setMergedResults(newProducts); // Always display the latest suggestion/tab results

      if (newProducts.length) {
        widgetClient.sendEvent(Actions.RESULT_LOAD, md);
        widgetClient.setLastTrackingMeta(md);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productResults && productResults.length) {
      setMergedResults(productResults);
    }
  }, [productResults]);

  useEffect(() => {
    if (results && results.length) {
      setMergedResults(results);
    }
  }, [results]);

  const suggestionSearch = (): void => {
    setIsLoading(true);
    const params: Record<string, any> = {
      ...searchSettings,
    };
    params['pid'] = productId;

    widgetClient.multisearchByImage(
      params,
      (res) => {
        handleSuccess(res);
      },
      handleError,
    );
  };

  useEffect(() => {
    if (query && !isStreaming) {
      // Send Result Load event if there are product results returned
      const requestMetadata = {
        queryId: requestId,
        cat: Category.RESULT,
      };
      widgetClient.sendEvent(Actions.RESULT_LOAD, requestMetadata);
      widgetClient.setLastTrackingMeta(requestMetadata);
      setMetadata(requestMetadata);
    }
  }, [isStreaming]);

  if (!root) {
    return <></>;
  }

  return (
    <div className='pt-4 px-4 border border-gray-200 dark:border-gray-700 rounded-md'>
      <div className='flex justify-between items-center'>
        {customizations.generalLayout?.showWidgetTitle && (
          <div className='wigmix-widget-title text-primary' data-pw='rm-widget-title'>
            {intl.formatMessage({ id: 'widgetTitle' })}
          </div>
        )}

        {/* Tab buttons */}
        <div className='flex gap-2'>
          <button
            className='px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-semibold transition-colors'
            onClick={() => suggestionSearch()}>
            {intl.formatMessage({ id: 'similarItemsTabButton' })}
          </button>
        </div>
      </div>

      <div className='wigmix-widget-description text-sm text-gray-600 pb-2'>{intl.formatMessage({ id: 'widgetDescription' })}</div>

      {/* Search input bar with Recommend me button */}
      <div className='flex gap-0 border border-gray-300 rounded overflow-hidden w-full'>
        <button
          className={`font-bold px-4 rounded-none h-10 text-sm transition-colors ${
            isRecommendInputFocused
              ? 'bg-gray-600 hover:bg-gray-700 text-white'
              : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
          }`}
          disabled={isStreaming || !searchBarValue.trim()}
          onClick={() => {
            if (!searchBarValue) {
              return;
            }
            setQueryValue(searchBarValue);
            recommendMeWithQuery(searchBarValue);
          }}
          data-pw='rm-recommend-me-button'>
          <span>{intl.formatMessage({ id: 'searchBarButton' })}</span>
        </button>

        <div className='relative flex-1'>
          <Input
            classNames={{
              inputWrapper: 'border-l-0 rounded-r bg-default-100 text-black',
            }}
            disabled={isStreaming}
            isClearable
            maxLength={QUERY_MAX_CHARACTER_LENGTH}
            autoComplete='off'
            variant='bordered'
            radius='none'
            value={searchBarValue}
            onFocus={() => setIsRecommendInputFocused(true)}
            onBlur={() => setIsRecommendInputFocused(false)}
            placeholder={intl.formatMessage({ id: 'searchBarPlaceholder' })}
            onValueChange={(value) => {
              setSearchBarValue(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchBarValue) {
                setQueryValue(searchBarValue);
                recommendMeWithQuery(searchBarValue);
              }
            }}
            data-pw='rm-recommend-me-search-bar'
          />
        </div>
      </div>

      {hasError && <div className='w-full text-center text-red-500 py-8'>{error}</div>}

      {/* Product card carousels */}
      {!hasError && (
        <div className='flex flex-col'>
          {(isStreaming || isLoading) ? <CarouselLoader /> : <Carousel results={mergedResults} metadata={metadata} />}
        </div>
      )}
    </div>
  );
};

export default RecommendMe;
