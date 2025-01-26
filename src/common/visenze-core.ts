import type { Root } from 'react-dom/client';
import type { ProductSearchResponse, ProductSearchResponseSuccess, ViSearchClient } from 'visearch-javascript-sdk';
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
  url?: string;
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

/**
 * Configuration for ViSenze widgets.
 */
export interface WidgetConfig {
  appSettings: {
    /**
     * ViSenze app key; obtainable from Discovery Suite console.
     */
    appKey: string;
    /**
     * ViSenze placement ID; obtainable from Discovery Suite console.
     */
    placementId: string | number;
    /**
     * (optional) ViSenze strategy ID; obtainable from Discovery Suite console.
     */
    strategyId?: string | number;
    /**
     * UID used to override ViSenze tracking parameter.
     */
    uid?: string;
    /**
     * If true, the widget will push result_load event to GTM (Google Tag Manager) objects.
     */
    gtmTracking?: boolean;
    /**
     * ViSenze search/recommendations API endpoint.
     */
    endpoint?: string;
    resizeSettings?: {
      maxWidth: number;
      maxHeight: number;
    };
  };
  displaySettings: {
    /**
     * CSS selector on which the widget will be rendered on.
     */
    cssSelector: string;
    /**
     * Field mapping for product card. The fields are based on the schema of the Discovery Suite catalog.
     */
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
  /**
   * Additional key-value parameters that will be sent to ViSenze search/recommendation APIs.
   */
  searchSettings: Record<string, any>;
  languageSettings: {
    locale: string;
    currency: string;
  };
  callbacks: {
    /**
     * Pre-processes API response before being passed further down into the components.
     * The modification is expected to happen in-place.
     *
     * @param resp The original API response.
     */
    preprocessResponse?: (resp: ProductSearchResponseSuccess) => void;
    /**
     * Fires whenever an event is sent to ViSenze Analytics, or when `sendEvent` is called.
     *
     * @param action The action that is being recorded
     * @param params The attached metadata related to the action
     */
    trackingCallback?: (action: string, params: Record<string, any>) => void;
    /**
     * Fires whenever a product card is clicked on.
     *
     * @param productDetails The details of the product
     * @param trackingMeta Relevant metadata attached to the action
     */
    onProductClick?: (productDetails: Record<string, any>, trackingMeta: Record<string, any>) => void;
    /**
     * Fires whenever response from a search/recommendation API result is returned.
     *
     * @param apiResponse Response from ViSenze search/recommendation API.
     */
    onSearchCallback?: (apiResponse: ProductSearchResponse) => void;
    /**
     * Fires when there is an input change within the search bar (when exists),
     * such as clicking enter in search bar, selecting an autocomplete option, or uploading a new image.
     *
     * @param text Text query of the search bar
     * @param image Image query of the search bar
     */
    onSearchBarInput?: (text: string | undefined, image: SearchImage | undefined) => void;
  };
  /**
   * Widget look-and-feel customization. The values for this section is set
   * through configurations within the Discovery Suite console.
   */
  customizations: {
    generalLayout: ColoredInterface & {
      fontFamily: string;
      headingFont: {
        [D in DeviceType]: Font;
      };
      bodyFont: {
        [D in DeviceType]: Font;
      };
      /**
       * Whether to show the widget title.
       */
      showWidgetTitle: boolean;
      /**
       * Whether to show "Powered by ViSenze" footer in appropriate places.
       */
      showViSenzeLogo: boolean;
    };
    /**
     * Popup-related settings. This section is relevant only for widgets that have popup behavior.
     */
    popup?: {
      /**
       * Popup position on the screen.
       */
      position: 'left' | 'center' | 'right';
      /**
       * Configurations for the icon that triggers the popup.
       */
      triggerIcon: Icon;
    };
    buttons?: {
      primary: ColoredInterface;
      secondary: ColoredInterface;
    };
    breakpoints: {
      mobile: ViewportWidth;
      tablet: ViewportWidth;
    };
    /**
     * Additional custom CSS to be applied to the widget.
     */
    customCss?: string;
    localization?: {
      defaultLocale: string;
      defaultCurrency: string;
      text: LanguagePack;
    };
    /**
     * Product grid- or slider-related settings.
     */
    productGrid?: {
      [D in DeviceType]: {
        productsPerRow: number;
        marginVertical: number | undefined;
        marginHorizontal: number | undefined;
      };
    };
    /**
     * Product card-related settings.
     */
    productCard?: {
      /**
       * Indicates whether clicking a product card opens the link in the same or different browser tab.
       */
      openLinksInNewTab: boolean;
      /**
       * Configuration for price field.
       */
      price: HideableText & {
        fontColor: string;
      };
      /**
       * Configuration for original price (i.e. before discount) field.
       */
      originalPrice: HideableText & {
        fontColor: string;
      };
      /**
       * Configuration for primary title field.
       */
      title: HideableField;
      /**
       * Configuration for secondary title field.
       */
      secondaryTitle: HideableField;
      /**
       * Configuration for the "find similar" feature within a product card image.
       */
      findSimilar?: {
        /**
         * Whether the "find similar" feature is enabled or not.
         */
        enable: boolean;
        /**
         * Position of the "find similar" icon relative to the product card image.
         */
        position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
        /**
         * Configurations for the find similar icon.
         */
        icon: Icon;
      };
    };
    /**
     * Image upload-related settings. This section is relevant only for widgets that intend to support image upload.
     */
    imageUpload?: {
      /**
       * Whether the "image upload" feature is enabled or not.
       */
      enable: boolean;
      icon: Icon;
      /**
       * List of images which will be used as a gallery of images for quick upload.
       */
      images: ImageWithLabel[];
    };
  };
  platformSettings?: {
    platformName: string;
    customCss: string;
  };
  /**
   * Set to true to disable sending of events to ViSenze Analytics.
   * Mainly used for development purpose.
   *
   * Note that setting this to true does NOT disable the trackingCallback event.
   */
  disableAnalytics: boolean;
}

interface ViewportWidth {
  minWidth?: number;
  maxWidth?: number;
}

export type RecursivePartial<T> = T extends never[] ? T : { [P in keyof T]?: RecursivePartial<T[P]> };
