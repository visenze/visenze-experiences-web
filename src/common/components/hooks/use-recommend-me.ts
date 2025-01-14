import { useState } from 'react';
import type { WidgetClient, WidgetConfig } from '../../visenze-core';
import type { ProcessedProduct } from '../../types/product';
import { getFlattenProduct } from '../../utils';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { DEFAULT_ENDPOINT } from '../../constants';

interface RecommendMeProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  productId: string;
}

export interface RecommendMe {
  recommendMeWithQuery: (query: string) => void;
  productResults: ProcessedProduct[];
  isStreaming: boolean;
  requestId: string;
  error: string;
}

const useRecommendMe = ({
  config,
  productSearch,
  productId,
}: RecommendMeProps): RecommendMe => {
  const { appKey, placementId, endpoint } = config.appSettings;
  const [productResults, setProductResults] = useState<ProcessedProduct[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');

  // Retrieve user id and session id from ViSearch client
  let visenzeUserId = '';
  let visenzeSessionId = '';
  productSearch.visearch.getUid((uid) => { visenzeUserId = uid; });
  productSearch.visearch.getSid((sid) => { visenzeSessionId = sid; });

  const recommendMeWithQuery = (query: string): void => {
    if (!appKey || !placementId) {
      console.error('App Key or Placement Id not found');
      return;
    }

    // Prepare for a new list of products
    setProductResults([]);

    // Setup query params needed for Recommend Me api
    const params = new URLSearchParams({
      app_key: appKey,
      placement_id: placementId.toString(),
      pid: productId,
      q: query,
      va_uid: visenzeUserId,
      va_sid: visenzeSessionId,
      attrs_to_get: config.searchSettings.attrs_to_get.join(','),
    });

    // Listen to the event stream and retrieve relevant data based on the event type
    fetchEventSource(`${endpoint || DEFAULT_ENDPOINT}/v1/product/multisearch/chat/recommend-me?${params.toString()}`, {
      async onopen() {
        setIsStreaming(true);
      },
      onmessage(msg) {
        switch (msg.event) {
          case 'reqid':
            setRequestId(JSON.parse(msg.data).value);
            break;
          case 'product':
            const result = getFlattenProduct(JSON.parse(msg.data));
            setProductResults((prev) => [...prev, result]);
            break;
        }
      },
      onclose() {
        setIsStreaming(false);
      },
      onerror(err) {
        console.error(err);
        setError(err);
      },
    });
  };

  return {
    recommendMeWithQuery,
    productResults,
    isStreaming,
    requestId,
    error,
  };
};

export default useRecommendMe;
