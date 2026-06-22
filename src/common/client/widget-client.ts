import type { Root } from 'react-dom/client';
import ViSearch, { type ProductSearchResponse, type ViSearchClient } from 'visearch-javascript-sdk';
import type { Primitive, WidgetClient, WidgetConfig, WidgetRenderStatus } from '../wigmix-core';
import type { ErrorHandler, SuccessHandler } from '../types/function';
import { DEFAULT_ENDPOINT } from '../constants';
import { getManualEndpoint } from './endpoint';

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
  searchCallback: ((resp: ProductSearchResponse) => void) | undefined,
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

const getWidgetClient = (config: WidgetConfig, widgetType: string, widgetVersion: string, visearchFactory: () => ViSearchClient = () => ViSearch()): WidgetClient => {
  const { appSettings, callbacks, disableAnalytics, isCustomScript } = config;
  const { appKey, placementId, strategyId, endpoint, cloud, gtmTracking, resizeSettings, uid } = appSettings;
  const manualEndpoint = getManualEndpoint(placementId);
  const { onSearchCallback } = callbacks;
  let renderStatus: WidgetRenderStatus = 'UNRENDERED';
  let roots: Root[] = [];
  let widgetOpeners: ((id: string, bypassIdCheck: boolean) => void)[] = [];
  let widgetClosers: (() => void)[] = [];
  let darkModeTogglers: (() => void)[] = [];
  let configUpdaters: ((configOverride: WidgetConfig, isPartial: boolean) => void)[] = [];
  let localeUpdaters: ((locale: string) => void)[] = [];
  let lastTrackingMetadata: Record<string, Primitive> = {};
  let lastReference = '';

  const visearch = visearchFactory();
  visearch.setKeys({
    placement_id: placementId,
    strategy_id: strategyId,
    app_key: appKey,
    // Precedence: manual endpoint (JS) > cloud > API endpoint > default.
    // When cloud is set (and no manual endpoint), omit endpoint so the SDK resolves the
    // cloud-specific domain + paths itself.
    ...(manualEndpoint
      ? { endpoint: manualEndpoint }
      : cloud
        ? {}
        : { endpoint: endpoint || DEFAULT_ENDPOINT }),
    ...(cloud ? { cloud } : {}),
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

  const multisearchComplementary = (
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ): void => {
    const [success, error] = wrapCallbacks(onSearchCallback, handleSuccess, handleError);
    visearch.productMultisearchComplementary(
      {
        ...params,
        return_fields_mapping: true,
        return_query_sys_meta: true,
      },
      success,
      error,
    );
  };

  const multisearchOutfitRecommendations = (
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ): void => {
    const [success, error] = wrapCallbacks(onSearchCallback, handleSuccess, handleError);
    visearch.productMultisearchOutfitRecommendations(
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

    const analyticsParams = {
      ...params,
      ...(config.trackingSettings || {}),
    };

    if (!analyticsParams['queryId']) {
      analyticsParams['queryId'] = getLastClickQueryId();
    }
    if (!analyticsParams['widgetVersion']) {
      analyticsParams['widgetVersion'] = `${widgetType}.${widgetVersion}.js`;
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
        if (action.toLowerCase() === 'transaction' && !event['transId']) {
          event['transId'] = batchId;
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
    closeWidget();
    // flush react script
    roots.forEach((root) => {
      root.render(null);
    });
    renderStatus = 'HIDDEN';
    widgetOpeners = [];
    widgetClosers = [];
    darkModeTogglers = [];
    configUpdaters = [];
    localeUpdaters = [];
  };

  const disposeWidget = (): void => {
    hideWidget();
    // Clear all existing render roots on top of just null-rendering
    roots.forEach((root) => root.unmount());
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

  const getRenderRoots = (): Root[]  => {
    return roots;
  };

  const getLastReference = (): any => lastReference;

  const markAsRendered = (isRendered: boolean): void => {
    renderStatus = isRendered ? 'RENDERED' : 'UNRENDERED';
  };

  const getRenderStatus = (): WidgetRenderStatus => {
    return renderStatus;
  };

  const registerWidgetOpener = (fn: (id: string, bypassIdCheck: boolean) => void): void => {
    widgetOpeners.push(fn);
  };

  const openWidget = (id: string): void => {
    widgetOpeners.forEach((fn) => fn(id, widgetOpeners.length <= 1));
  };

  const registerWidgetCloser = (fn: () => void): void => {
    widgetClosers.push(fn);
  };

  const closeWidget = (): void => {
    widgetClosers.forEach((fn) => fn());
  };

  const registerDarkModeToggler = (fn: () => void): void => {
    darkModeTogglers.push(fn);
  };

  const toggleDarkMode = (): void => {
    darkModeTogglers.forEach((fn) => fn());
  };

  const registerConfigUpdater = (fn: (configOverride: WidgetConfig, isPartial: boolean) => void): void => {
    configUpdaters.push(fn);
  };

  const updateConfig = (configOverride: WidgetConfig, isPartial: boolean): void => {
    configUpdaters.forEach((fn) => fn(configOverride, isPartial));
  };

  const registerLocaleUpdater = (fn: (locale: string) => void): void => {
    localeUpdaters.push(fn);
  };

  const updateLocale = (locale: string): void => {
    localeUpdaters.forEach((fn) => fn(locale));
  };

  return {
    visearch,
    widgetType,
    widgetVersion,
    isCustomScript: isCustomScript === true || isCustomScript === 'true',
    placementId,
    setLastTrackingMeta,
    sendEvent,
    sendEvents,
    markAsRendered,
    getLastClickQueryId,
    getLastQueryId,
    getLastTrackingMeta,
    getLastReference,
    getRenderStatus,
    getRenderRoots,
    searchById,
    multisearchByImage,
    multisearchComplementary,
    multisearchOutfitRecommendations,
    multisearchAutocomplete,
    setRenderRoots,
    rerender: (): void => {}, // implemented in initialization.ts
    renderMissing: (): void => {}, // implemented in initialization.ts
    openWidget,
    registerWidgetOpener,
    closeWidget,
    registerWidgetCloser,
    hideWidget,
    disposeWidget,
    toggleDarkMode,
    registerDarkModeToggler,
    updateConfig,
    registerConfigUpdater,
    updateLocale,
    registerLocaleUpdater,
    forceErrorState: (): void => {}, // implemented in individual widgets
    sendChatMessage: (): void => {}, // implemented in individual widgets
  };
};

export default getWidgetClient;
