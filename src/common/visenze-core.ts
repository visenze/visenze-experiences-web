import type { Root } from 'react-dom/client';
import type { ProductSearchResponse, ViSearchClient } from 'visearch-javascript-sdk';
import type { ErrorHandler, SuccessHandler } from './types/function';
import type { SearchImage } from './types/image';
import type { LanguagePack } from './locales/locale';

// model

export type Primitive = boolean | string | number;

export enum WidgetType {
  CAMERA_SEARCH = 'camera_search',
  SIMILAR_SEARCH = 'similar_search',
  SEARCH_RESULTS_PAGE = 'search_results_page',
  SHOPPING_ASSISTANT = 'shopping_assistant',
  RECOMMEND_ME = 'recommend_me',
  MORE_LIKE_THIS = 'more_like_this',
  SHOP_THE_LOOK = 'shop_the_look',
  EMBEDDED_GRID = 'embedded_grid',
  SHOPPABLE_LOOKBOOK = 'shoppable_lookbook',
  SHOPPABLE_GALLERY = 'shoppable_gallery',
  ICON_TRIGGERED_GRID = 'icon_triggered_grid',
  SEARCH_BAR = 'search_bar',
  EMBEDDED_SEARCH_RESULTS = 'embedded_search_results',
}

/**
 * Widget client for ViSenze widgets.
 */
export interface WidgetClient {
  /**
   * Widget type
   */
  widgetType: string;
  /**
   * Widget version
   */
  widgetVersion: string;
  /**
   * Widget placement ID.
   */
  placementId: string | number;
  /**
   * Gets the query id of the API call results in the last click event
   */
  getLastClickQueryId: () => string;
  /**
   * Gets the last API call query id.
   */
  getLastQueryId: () => Promise<string>;
  /**
   * Gets the last successful search tracking metadata.
   */
  getLastTrackingMeta: () => Record<string, Primitive> | undefined;
  /**
   * Gets last reference id or product id used for search/recommendations
   */
  getLastReference: () => any;
  /**
   * Sends an event to ViSenze Analytics
   * @param action - action name
   * @param params - query parameters
   * @param callback - callback to be executed upon event sent
   * @param failure - callback to be executed upon event sent failure
   *
   * @example
   * // Sends an add to cart event.
   * ```
   * widgetClient.sendEvent('add_to_cart', {pid: 'my_product_id'});
   * ```
   */
  sendEvent: (
    action: string,
    params: Record<string, any>,
    callback?: SuccessHandler,
    failure?: ErrorHandler,
  ) => Promise<void>;
  /**
   * Sends batch events to ViSenze Analytics
   * @param action - action name
   * @param params - list of query parameters for events
   * @param callback - callback to be executed upon event sent
   * @param failure - callback to be executed upon event sent failure
   *
   * @example
   * // Sends transaction batch events.
   * ```
   * widgetClient.sendEvents('transaction', [
   *   {pid: 'my_product_id', value: 50},
   *   {pid: 'my_product_id_2', value: 100}
   * ]);
   * ```
   */
  sendEvents: (
    action: string,
    events: Record<string, string>[],
    callback?: SuccessHandler,
    failure?: ErrorHandler,
  ) => Promise<void>;
  /**
   * Visearch client.
   */
  visearch: ViSearchClient;
  /**
   * Tracking metadata from the last search result.
   */
  setLastTrackingMeta: (metadata: Record<string, Primitive> | undefined) => void;
  /**
   *
   * @param roots - render root for the widget.
   */
  setRenderRoots: (roots: Root[]) => void;
  /**
   * Search by product id.
   * @param pid - product id
   * @param params - search query parameters
   * @param handleSuccess - callback to be executed upon search success
   * @param handleError - callback to be executed upon search failure
   */
  searchById: (
    pid: string,
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ) => void;
  /**
   * Multisearch by product image.
   * @param params - search query parameters
   * @param handleSuccess - callback to be executed upon search success
   * @param handleError - callback to be executed upon search failure
   */
  multisearchByImage: (params: Record<string, any>, handleSuccess: SuccessHandler, handleError: ErrorHandler) => void;
  /**
   * Multisearch autocomplete.
   * @param params - search query parameters
   * @param handleSuccess - callback to be executed upon search success
   * @param handleError - callback to be executed upon search failure
   */
  multisearchAutocomplete: (
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ) => void;
  /**
   * Triggers rendering for the widgets.
   *
   * For recommendations widget, this will also trigger a search.
   */
  rerender: (selector?: string, ...args: any) => void;
  /**
   * Opens the widget popup; applicable only for widget types that have popup behavior.
   */
  openWidget: ((params: any) => void) | undefined;
  /**
   * Hides the widget from view.
   */
  hideWidget: () => void;
  /**
   * Destroys the widget object and reference.
   */
  disposeWidget: () => void;
  updateConfig: (configOverride: WidgetConfig, isPartial: boolean) => void;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface ImageWithLabel {
  url: string;
  label: string;
}

export interface Icon {
  url: string;
  color: string;
}

export interface Font {
  size: number;
  weight: number;
}

interface MultiDeviceFont {
  font: {
    [D in DeviceType]: Font;
  };
}

interface HideableText extends MultiDeviceFont {
  show: boolean;
}

interface HideableField extends HideableText {
  fieldSource: string;
}

interface ColoredInterface {
  fontColor: string;
  backgroundColor: string;
}

export interface WidgetConfig {
  appSettings: {
    appKey: string;
    placementId: string | number;
    strategyId?: string | number;
    uid?: string;
    gtmTracking?: boolean;
    endpoint?: string;
    resizeSettings?: {
      maxWidth: number;
      maxHeight: number;
    };
  };
  displaySettings: {
    cssSelector: string;
    productDetails: {
      main_image_url: string;
      product_url: string;
      title: string;
      price: string;
      original_price: string;
      category: string;
      brand: string;
      gender: string;
      sizes: string;
      colors: string;
      [key: string]: string;
    };
  };
  searchSettings: Record<string, any>;
  languageSettings: {
    locale: string;
    currency: string;
  };
  callbacks: {
    trackingCallback?: (action: string, params: Record<string, any>) => void;
    onProductClick?: (productDetails: Record<string, any>, trackingMeta: Record<string, any>) => void;
    onSearchCallback?: (apiResponse: ProductSearchResponse) => void;
    onSearchBarInput?: (text: string | undefined, image: SearchImage | undefined) => void;
  };
  customizations: {
    generalLayout: ColoredInterface & {
      fontFamily: string;
      headingFont: {
        [D in DeviceType]: Font;
      };
      bodyFont: {
        [D in DeviceType]: Font;
      };
      showWidgetTitle: boolean;
      showViSenzeLogo: boolean;
    };
    popup: {
      position: 'left' | 'center' | 'right';
      triggerIcon: Icon;
    };
    buttons: {
      primary: ColoredInterface;
      secondary: ColoredInterface;
    };
    breakpoints: {
      mobile: ViewportWidth;
      tablet: ViewportWidth;
    };
    customCss: string;
    localization?: {
      defaultLocale: string;
      defaultCurrency: string;
      text: LanguagePack;
    };
    productGrid?: {
      [D in DeviceType]: {
        productsPerRow: number;
        marginVertical: number | undefined;
        marginHorizontal: number | undefined;
      };
    };
    productCard?: {
      openLinksInNewTab: boolean;
      price: HideableText & {
        fontColor: string;
      };
      originalPrice: HideableText & {
        fontColor: string;
      };
      title: HideableField;
      secondaryTitle: HideableField;
      findSimilar: {
        enable: boolean;
        position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
        icon: Icon;
      };
    };
    imageUpload: {
      enable: boolean;
      icon: Icon;
      images: ImageWithLabel[];
    };
  };
  platformSettings?: {
    platformName: string;
    customCss: string;
  };
  hideTrigger: boolean;
  disableAnalytics: boolean;
  maxRetryCount: number;
}

interface ViewportWidth {
  minWidth?: number;
  maxWidth?: number;
}

export type RecursivePartial<T> = T extends never[] ? T : { [P in keyof T]?: RecursivePartial<T[P]> };
