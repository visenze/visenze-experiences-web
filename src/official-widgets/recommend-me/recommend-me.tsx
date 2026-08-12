import { Input } from '@heroui/input';
import { cn } from '@heroui/theme';
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

const FOCUS_VISIBLE_CLASSES = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';
// Same ring, but drawn inward: the search bar wraps its button/input in an `overflow-hidden`
// container (for the rounded border), which clips an outward-offset outline before it can show.
const FOCUS_VISIBLE_INSET_CLASSES = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 '
  + 'focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';
const FOCUS_WITHIN_INSET_CLASSES = 'focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 '
  + 'focus-within:outline-blue-600 dark:focus-within:outline-blue-300';

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
  const [hasSearched, setHasSearched] = useState(false);
  // recommendMeWithQuery is async - isStreaming only flips true once the SSE connection's onopen
  // fires, which lags behind the click. Without this, there's a gap where isStreaming/isLoading are
  // both still false and mergedResults is already cleared, so the "no products found" fallback would
  // flash before the request has even started.
  const [isChatQueryPending, setIsChatQueryPending] = useState(false);
  const root = useContext(RootContext);
  const intl = useIntl();

  const { productResults, recommendMeWithQuery, isStreaming, requestId, latestMessage } = useRecommendMe({
    productId,
  });

  const handleError = (errorMsg: string): void => {
    setHasError(true);
    if (errorMsg.includes('im_url') || errorMsg.includes('image') || errorMsg.includes('no outfit')) {
      setError(intl.formatMessage({ id: 'imageOrQueryNotFound' }));
    } else {
      setError(intl.formatMessage({ id: 'systemError' }));
    }
    setIsLoading(false);
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

  // recommendMeWithQuery resets its own productResults/latestMessage at request start, but
  // mergedResults lives in this component and the effect above only applies non-empty results -
  // without this, a prose-only or unmatched-token response would keep showing the previous query's
  // stale products. Clear it explicitly whenever a new query is submitted.
  const startRecommendMeSearch = (value: string): void => {
    setMergedResults([]);
    setQueryValue(value);
    setHasSearched(true);
    setIsChatQueryPending(true);
    recommendMeWithQuery(value);
  };

  useEffect(() => {
    if (isStreaming) {
      setIsChatQueryPending(false);
    }
  }, [isStreaming]);

  const suggestionSearch = (isComplementary: boolean): void => {
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    const params: Record<string, any> = {
      ...searchSettings,
    };
    params['pid'] = productId;

    if (isComplementary) {
      widgetClient.multisearchComplementary(params, handleSuccess, handleError);
    } else {
      widgetClient.multisearch(params, handleSuccess, handleError);
    }
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

  const getFinalStatusMessage = (): string => {
    if (mergedResults.length) {
      return [
        latestMessage,
        intl.formatMessage({ id: 'a11yProductResultsShown' }, { count: mergedResults.length }),
      ].filter(Boolean).join(' ');
    }
    return hasSearched ? intl.formatMessage({ id: 'noProductsFound' }) : '';
  };
  const finalStatusMessage = getFinalStatusMessage();

  const getInProgressMessage = (): string => (mergedResults.length
    ? latestMessage
    : intl.formatMessage({ id: 'a11yLoadingRecommendations' }));

  return (
    <div className='pt-4 px-4 border border-gray-200 dark:border-gray-700 rounded-md'>
      <div className='flex justify-between items-center'>
        {customizations.generalLayout?.showWidgetTitle && (
          <div className='wigmix-widget-title text-primary' data-pw='rm-widget-title'>
            {intl.formatMessage({ id: 'widgetTitle' })}
          </div>
        )}
      </div>

      <div className='flex gap-2 pt-1'>
        <button
            className={cn(
              'px-3 py-2 bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md text-sm font-semibold transition-colors',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => suggestionSearch(false)}>
          {intl.formatMessage({ id: 'similarProducts' })}
        </button>
        <button
            className={cn(
              'px-3 py-2 bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md text-sm font-semibold transition-colors',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => suggestionSearch(true)}>
          {intl.formatMessage({ id: 'complementaryProducts' })}
        </button>
      </div>

      <div className='text-sm py-2 text-primary'>
        {intl.formatMessage({ id: 'searchBarInstructions' })}
      </div>

      {/* Search input bar with Recommend me button */}
      <div className='flex gap-0 border border-gray-300 rounded overflow-hidden w-full'>
        <button
          className={cn(
            `font-bold px-4 rounded-none h-10 text-sm transition-colors ${
              isRecommendInputFocused
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
            }`,
            FOCUS_VISIBLE_INSET_CLASSES,
          )}
          disabled={isStreaming || isChatQueryPending || !searchBarValue.trim()}
          onClick={() => {
            if (!searchBarValue) {
              return;
            }
            startRecommendMeSearch(searchBarValue);
          }}
          data-pw='rm-recommend-me-button'>
          <span>{intl.formatMessage({ id: 'searchBarButton' })}</span>
        </button>

        <div className='relative flex-1'>
          <Input
            aria-label={intl.formatMessage({ id: 'a11ySearchBarInput' })}
            classNames={{
              inputWrapper: cn('border-s-0 rounded-e bg-default-100 text-primary', FOCUS_WITHIN_INSET_CLASSES),
            }}
            disabled={isStreaming || isChatQueryPending}
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
                startRecommendMeSearch(searchBarValue);
              }
            }}
            data-pw='rm-recommend-me-search-bar'
          />
        </div>
      </div>

      {hasError && <div className='w-full text-center text-red-500 py-8' role='alert'>{error}</div>}

      {/* Product card carousels */}
      {!hasError && (
        <div className='flex flex-col'>
          {/*
            Visible, live-updating text - purely visual, not wired to aria-live. Screen readers would
            otherwise try to announce every token as the message streams in, cutting themselves off
            mid-sentence repeatedly (a known anti-pattern for streaming text in a live region).
            The live backend text only shows once a product has actually resolved - otherwise a
            response that ends up with zero products would flash the backend's raw text before it
            gets replaced by the "no products found" fallback.
          */}
          <div className='text-sm py-2 text-primary' data-pw='rm-status-message'>
            {(isStreaming || isLoading || isChatQueryPending)
              ? getInProgressMessage()
              : finalStatusMessage}
          </div>
          {/*
            Screen-reader announcement - stays constant while streaming (so it announces once, not
            per token), then updates once to the final message + result count when the request ends.
          */}
          <div className='sr-only' role='status' aria-live='polite' aria-atomic='true'>
            {(isStreaming || isLoading || isChatQueryPending)
              ? intl.formatMessage({ id: 'a11yLoadingRecommendations' })
              : finalStatusMessage}
          </div>
          {(isStreaming || isLoading || isChatQueryPending)
            ? <CarouselLoader />
            : <Carousel results={mergedResults} metadata={metadata} />}
        </div>
      )}
    </div>
  );
};

export default RecommendMe;
