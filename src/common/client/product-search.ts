import type { Root } from 'react-dom/client';
import ViSearch, { type ProductSearchResponse } from 'visearch-javascript-sdk';
import type { Primitive, WidgetClient, WidgetConfig } from '../visenze-core';
import type { ErrorHandler, SuccessHandler } from '../types/function';
import { DEFAULT_ENDPOINT } from '../constants';

const validateBatchEvents = (
  events: Record<string, string>[],
  failCallback: (err: any) => void = (): void => {},
): boolean => {
  if (!Array.isArray(events)) {
    failCallback(Error('events must be an array'));
    return false;
  }

  if (events.length <= 0) {
    failCallback(Error('events must have at least 1 item'));
    return false;
  }

  return true;
};

const callIfValidFunction = (fn: any, args: any): void => {
  if (fn && typeof fn === 'function') {
    fn(args);
  }
};

const wrapCallbacks = (
  searchCallback: ((apiResponse: ProductSearchResponse) => void) | undefined,
  onSuccess: SuccessHandler,
  onFailure: ErrorHandler,
): ((args: any) => void)[] => {
  const newOnSuccess = (args: any): void => {
    callIfValidFunction(onSuccess, args);
    callIfValidFunction(searchCallback, args);
  };
  const newOnError = (args: any): void => {
    callIfValidFunction(onFailure, args);
    callIfValidFunction(searchCallback, args);
  };
  return [newOnSuccess, newOnError];
};

export default function getWidgetClient(config: WidgetConfig, widgetType: string, widgetVersion: string): WidgetClient {
  const { disableAnalytics } = config;
  const { placementId, appKey, strategyId, endpoint, gtmTracking, resizeSettings, uid } = config.appSettings;
  const { onSearchCallback } = config.callbacks;
  let roots: Root[] = [];
  let lastTrackingMetadata: Record<string, Primitive> = {};
  let lastReference = '';

  const visearch = ViSearch();
  visearch.setKeys({
    placement_id: placementId,
    strategy_id: strategyId,
    app_key: appKey,
    endpoint: endpoint || DEFAULT_ENDPOINT,
    gtm_tracking: gtmTracking,
    resize_settings: resizeSettings || {},
  });
  if (uid) {
    visearch.set('uid', uid);
  }

  const searchById = (
    pid: string,
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ): void => {
    const [success, error] = wrapCallbacks(onSearchCallback, handleSuccess, handleError);
    lastReference = pid;
    visearch.productSearchById(
      pid,
      {
        ...params,
        return_fields_mapping: true,
        return_query_sys_meta: true,
      },
      success,
      error,
    );
  };

  const multisearchByImage = (
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ): void => {
    const [success, error] = wrapCallbacks(onSearchCallback, handleSuccess, handleError);
    visearch.productMultisearch(
      {
        ...params,
        return_fields_mapping: true,
        return_query_sys_meta: true,
      },
      success,
      error,
    );
  };

  const multisearchAutocomplete = (
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ): void => {
    const [success, error] = wrapCallbacks(onSearchCallback, handleSuccess, handleError);
    visearch.productMultisearchAutocomplete(
      {
        ...params,
        return_fields_mapping: true,
        return_query_sys_meta: true,
      },
      success,
      error,
    );
  };

  /**
   * Sends event to ViSenze Analytics
   */
  const sendEvent = async (
    action: string,
    params: Record<string, any> = {},
    callback?: (...args: any) => any,
    failure?: (err: any) => void,
  ): Promise<void> => {
    const trackingCallback = config?.callbacks.trackingCallback;
    if (trackingCallback && typeof trackingCallback === 'function') {
      trackingCallback(action, params);
    }

    if (disableAnalytics) {
      return;
    }

    const analyticsParams = params;

    if (!analyticsParams.queryId) {
      analyticsParams.queryId = getLastClickQueryId();
    }
    if (!analyticsParams.widgetVersion) {
      analyticsParams.widgetVersion = `${widgetType}.${widgetVersion}.js`;
    }

    visearch.sendEvent(action, analyticsParams, callback, failure);
  };

  /**
   * Sends batch event to ViSenze Analytics
   */
  const sendEvents = async (
    action: string,
    events: Record<string, string>[],
    callback?: (...args: any) => any,
    failure?: (err: any) => void,
  ): Promise<void> => {
    if (!validateBatchEvents(events, failure)) {
      return;
    }

    visearch.generateUuid((batchId) => {
      events.forEach((event) => {
        if (action.toLowerCase() === 'transaction' && !event.transId) {
          event.transId = batchId;
        }
        sendEvent(action, event, callback, failure);
      });
    });
  };

  /**
   * Gets the metadata of the last request
   */
  const getLastTrackingMeta = (): Record<string, any> => {
    return lastTrackingMetadata;
  };

  const setLastTrackingMeta = (metadata: Record<string, Primitive> | undefined): void => {
    lastTrackingMetadata = metadata || {};
  };

  /**
   * Gets query id of the last request, fallback to local storage if there is none
   */
  const getLastQueryId = (): Promise<string> => {
    return new Promise((resolve) => {
      visearch.getLastQueryId((queryId) => resolve(queryId ?? ''));
    });
  };

  const getLastClickQueryId = (): string => {
    let lastClickQueryId = localStorage.getItem(`visenze_last_click_query_id_${placementId}`);
    if (!lastClickQueryId) {
      // defaults to 'none', this indicates that an event happens without visenze influence
      lastClickQueryId = 'none';
    }

    return lastClickQueryId;
  };

  const hideWidget = (): void => {
    // flush react script
    roots.forEach((root) => {
      root.render(null);
    });
  };

  const disposeWidget = (): void => {
    hideWidget();
    if (window.visenzeWidgets?.[placementId]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete window.visenzeWidgets[placementId];
    }
    if (window[`visenzeWidgets${placementId}`]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete window[`visenzeWidgets${placementId}`];
    }
  };

  const setRenderRoots = (renderRoots: Root[]): void => {
    roots = renderRoots;
  };

  const getLastReference = (): any => lastReference;

  return {
    visearch,
    widgetType,
    widgetVersion,
    placementId,
    setLastTrackingMeta,
    sendEvent,
    sendEvents,
    getLastClickQueryId,
    getLastQueryId,
    getLastTrackingMeta,
    getLastReference,
    searchById,
    multisearchByImage,
    multisearchAutocomplete,
    setRenderRoots,
    rerender: (): void => {},
    openWidget: (): void => {},
    hideWidget,
    disposeWidget,
    updateConfig: (): void => {},
  };
}
