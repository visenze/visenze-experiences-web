import { useContext, useState } from 'react';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import { getFlattenProduct } from '../../utils';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from '../../client/endpoint';

// A product reference is a token that can appear anywhere in the assistant's text:
//   [[<product_id>]]
// Old format put the token at the START of the line (e.g. "- [[pid]] **title** ...");
// the new format puts it at the END (e.g. "- <description> ... [[pid]]").
// LEADING_PRODUCT_REGEX detects the old, line-leading form so its whole line can be dropped.
const LEADING_PRODUCT_REGEX = /^(?:\d+\.? |- )?\[\[[^\]]+]]/;
const SUGGESTION_LINE_REGEX = /\(\(([^)]+)\)\)/g;
const INCOMPLETE_PRODUCT_TOKEN_REGEX = /\[\[[^\]]*$/;

// Clean the accumulated text for display:
// - Old format (token leads the line): drop the whole line; the product card replaces it.
// - New format (token inline/trailing): strip only the token, keep the surrounding description.
// Also removes ((suggestion)) tokens and any trailing, not-yet-closed "[[..." fragment
// that is still mid-stream, so partial tokens never flash in the bubble.
const stripTokensForDisplay = (text: string): string => text
  .split('\n')
  .map((line): string | null => {
    if (LEADING_PRODUCT_REGEX.test(line)) {
      return null;
    }
    return line.replace(/\[\[[^\]]+]]/g, '');
  })
  .filter((line): line is string => line !== null)
  .join('\n')
  .replace(SUGGESTION_LINE_REGEX, '')
  .replace(INCOMPLETE_PRODUCT_TOKEN_REGEX, '');

// Resolve referenced products in first-appearance order. A product is included only when
// its token is present in the text AND its payload has arrived via a `product` event.
const resolveProducts = (text: string, products: ProcessedProduct[]): ProcessedProduct[] => {
  const tokenRegex = /\[\[([^\]]+)]]/g;
  const seen = new Set<string>();
  const ordered: ProcessedProduct[] = [];
  let match = tokenRegex.exec(text);
  while (match) {
    const pid = match[1];
    if (!seen.has(pid)) {
      const product = products.find((p) => p.product_id === pid);
      if (product) {
        seen.add(pid);
        ordered.push(product);
      }
    }
    match = tokenRegex.exec(text);
  }
  return ordered;
};

interface RecommendMeProps {
  productId: string;
}

export interface RecommendMe {
  recommendMeWithQuery: (query: string) => void;
  productResults: ProcessedProduct[];
  latestMessage: string;
  isStreaming: boolean;
  requestId: string;
  error: string;
}

const useRecommendMe = ({
  productId,
}: RecommendMeProps): RecommendMe => {
  const { widgetClient, widgetConfig } = useContext(WidgetDataContext);
  const { appSettings } = widgetConfig;
  const { appKey, placementId } = appSettings;
  const [productResults, setProductResults] = useState<ProcessedProduct[]>([]);
  const [latestMessage, setLatestMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');

  // Retrieve user id and session id from ViSearch client
  let visenzeUserId = '';
  let visenzeSessionId = '';
  widgetClient.visearch.getUid((uid) => { visenzeUserId = uid; });
  widgetClient.visearch.getSid((sid) => { visenzeSessionId = sid; });

  const recommendMeWithQuery = (query: string): void => {
    if (!appKey || !placementId) {
      console.error('App Key or Placement Id not found');
      return;
    }

    // Prepare for a new list of products
    setProductResults([]);
    setLatestMessage('');

    // Setup query params needed for Recommend Me api
    const params = new URLSearchParams({
      app_key: appKey,
      placement_id: placementId.toString(),
      pid: productId,
      q: query,
      va_uid: visenzeUserId,
      va_sid: visenzeSessionId,
      attrs_to_get: widgetConfig.searchSettings['attrs_to_get'].join(','),
    });

    // Resolve the API base + path, honouring manual endpoint > cloud > API endpoint > default
    const manualEndpoint = getManualEndpoint(placementId);
    const base = resolveBaseEndpoint(appSettings, manualEndpoint);
    const recommendMePath = usesCloudPaths(appSettings, manualEndpoint)
      ? '/v1/search/chat/recommend-me'
      : '/v1/product/multisearch/chat/recommend-me';

    const tokens: string[] = [];
    const products: ProcessedProduct[] = [];

    // Listen to the event stream and retrieve relevant data based on the event type
    fetchEventSource(`${base}${recommendMePath}?${params.toString()}`, {
      async onopen() {
        setIsStreaming(true);
      },
      onmessage(msg) {
        switch (msg.event) {
          case 'reqid':
            setRequestId(JSON.parse(msg.data).value);
            break;
          case 'heartbeat':
            break;
          case 'product':
            products.push(getFlattenProduct(JSON.parse(msg.data)));
            setProductResults(resolveProducts(tokens.join(''), products));
            break;
          case 'chat_token': {
            tokens.push(JSON.parse(msg.data).value);
            const currentText = tokens.join('');
            setLatestMessage(stripTokensForDisplay(currentText).trim());
            setProductResults(resolveProducts(currentText, products));
            break;
          }
          case 'stop_token':
            setIsStreaming(false);
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
    latestMessage,
    isStreaming,
    requestId,
    error,
  };
};

export default useRecommendMe;
