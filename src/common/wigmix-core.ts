import type { Root } from 'react-dom/client';
import type { ProductSearchResponse, ViSearchClient } from 'visearch-javascript-sdk';
import type { LanguagePack } from './locales/locale';
import type { Cloud } from './types/cloud';
import type { ErrorHandler, SuccessHandler } from './types/function';
import type { SearchImage, SearchImageOrPid } from './types/image';

export type Primitive = boolean | string | number;

export type WidgetRenderStatus = 'UNRENDERED' | 'HIDDEN' | 'RENDERED';

export type ProductCardIconPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';

export enum WidgetType {
  CAMERA_SEARCH = 'camera_search',
  SIMILAR_SEARCH = 'similar_search',
  SHOPPING_ASSISTANT = 'shopping_assistant',
  RECOMMEND_ME = 'recommend_me',
  MORE_LIKE_THIS = 'more_like_this',
  SHOP_THE_LOOK = 'shop_the_look',
  EMBEDDED_GRID = 'embedded_grid',
  SHOPPABLE_LOOKBOOK = 'shoppable_lookbook',
  SHOPPABLE_GALLERY = 'shoppable_gallery',
  ICON_TRIGGERED_GRID = 'icon_triggered_grid',
  SEARCH_BAR = 'search_bar',
  MERCHANDISE_SEARCH_BAR = 'merchandise_search_bar',
  EMBEDDED_SEARCH_RESULTS = 'embedded_search_results',
  IN_PAGE_CAROUSEL = 'in_page_carousel',
  SLIDE_OUT_DRAWER = 'slide_out_drawer',
  BUY_THE_LOOK = 'buy_the_look',
  IN_PAGE_CAROUSEL_V3 = 'in_page_carousel_v3',
}

export enum WidgetErrorState {
  GENERIC_ERROR = 'generic_error',
}

/**
 * Client for programmatic access to Rezolve widgets.
 */
export interface WidgetClient {
  /**
   * Widget type.
   *
   * @since 1.0.0
   */
  widgetType: string;
  /**
   * Widget version.
   *
   * @since 1.0.0
   */
  widgetVersion: string;
  /**
   * Widget placement ID.
   *
   * @since 1.0.0
   */
  placementId: string | number;
  /**
   * Indicates whether this placement is using preset code or custom code.
   *
   * @internal
   *
   * @since 1.0.2
   */
  isCustomScript: boolean;
  /**
   * Gets the query ID of the API call that results in the last click event.
   *
   * @since 1.0.0
   */
  getLastClickQueryId: () => string;
  /**
   * Gets the last API call query ID.
   *
   * @since 1.0.0
   */
  getLastQueryId: () => Promise<string>;
  /**
   * Gets the last successful search tracking metadata.
   *
   * @since 1.0.0
   */
  getLastTrackingMeta: () => Record<string, Primitive> | undefined;
  /**
   * Gets last reference ID or product ID used for search/recommendations.
   *
   * @since 1.0.0
   */
  getLastReference: () => any;
  /**
   * Returns the rendering status of the widget.
   *
   * The return value will be one of the following:
   * - UNRENDERED: Widget is not rendered anywhere in the page.
   *   Most likely, it is because the reference element cannot be found.
   * - HIDDEN: Widget was rendered in the page but is currently hidden.
   * - RENDERED: Widget is rendered in the page and is currently shown.
   *   If a widget with this status is not visible in the page,
   *   it is likely that one of the following has occurred:
   *   - The widget is placed under a reference element that is not visible in the page.
   *   - There are some styling rules in the page that prevents the widget from being visible.
   *   - The widget has been removed from view by other scripts in the page, or by navigation in SPAs.
   *
   * @since 1.0.0
   */
  getRenderStatus: () => WidgetRenderStatus;
  /**
   * Sends an event to Rezolve Analytics.
   *
   * @param action Action name
   * @param params Query parameters
   * @param callback Callback to be executed upon event sent success
   * @param failure Callback to be executed upon event sent failure
   *
   * @example
   * ```ts
   * // Sends an add to cart event.
   * widgetClient.sendEvent('add_to_cart', { pid: 'my_product_id' });
   * ```
   *
   * @since 1.0.0
   */
  sendEvent: (
    action: string,
    params: Record<string, any>,
    callback?: SuccessHandler,
    failure?: ErrorHandler,
  ) => Promise<void>;
  /**
   * Sends a list of events to Rezolve Analytics.
   *
   * @param action Action name
   * @param params List of query parameters for events
   * @param callback Callback to be executed upon event sent success
   * @param failure Callback to be executed upon event sent failure
   *
   * @example
   * ```ts
   * // Sends transaction batch events
   * widgetClient.sendEvents('transaction', [
   *   { pid: 'my_product_id', value: 50 },
   *   { pid: 'my_product_id_2', value: 100 },
   * ]);
   * ```
   *
   * @since 1.0.0
   */
  sendEvents: (
    action: string,
    events: Record<string, string>[],
    callback?: SuccessHandler,
    failure?: ErrorHandler,
  ) => Promise<void>;
  /**
   * ViSearch client, as defined in Rezolve JavaScript SDK.
   *
   * @since 1.0.0
   */
  visearch: ViSearchClient;
  /**
   * Sets tracking metadata from the last search result.
   *
   * @internal
   *
   * @since 1.0.0
   */
  setLastTrackingMeta: (metadata: Record<string, Primitive> | undefined) => void;
  /**
   * Sets the render roots for the widget.
   *
   * @internal
   *
   * @since 1.0.0
   */
  setRenderRoots: (roots: Root[]) => void;
  /**
   * Gets the render roots of the widget.
   *
   * @internal
   *
   * @since 1.0.0
   */
  getRenderRoots: () => Root[];
  /**
   * Marks the widget as rendered or unrendered.
   *
   * @internal
   *
   * @since 1.0.0
   */
  markAsRendered: (isRendered: boolean) => void;
  /**
   * Search by product ID; also known as recommendations.
   *
   * @param pid Product ID
   * @param params Query parameters to be used for searching
   * @param handleSuccess Callback to be executed upon search success
   * @param handleError Callback to be executed upon search failure
   *
   * @since 1.0.0
   */
  searchById: (
    pid: string,
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ) => void;
  /**
   * Multisearch by product image.
   *
   * @param params Query parameters to be used for searching
   * @param handleSuccess Callback to be executed upon search success
   * @param handleError Callback to be executed upon search failure
   *
   * @since 1.0.0
   */
  multisearch: (params: Record<string, any>, handleSuccess: SuccessHandler, handleError: ErrorHandler) => void;
  /**
   * Multisearch dispatch that routes to the multisearch / complementary / outfit-recommendations
   * API based on `appSettings.msApiId`.
   *
   * @param params Query parameters to be used for searching
   * @param handleSuccess Callback to be executed upon search success
   * @param handleError Callback to be executed upon search failure
   *
   * @since 1.0.21
   */
  multisearchRouter: (params: Record<string, any>, handleSuccess: SuccessHandler, handleError: ErrorHandler) => void;
  /**
   * Multisearch complementary suggestions.
   *
   * @param params Query parameters to be used for searching
   * @param handleSuccess Callback to be executed upon search success
   * @param handleError Callback to be executed upon search failure
   *
   * @since 1.0.18
   */
  multisearchComplementary: (params: Record<string, any>, handleSuccess: SuccessHandler, handleError: ErrorHandler) => void;
  /**
   * Multisearch outfit recommendations.
   *
   * @param params Query parameters to be used for searching
   * @param handleSuccess Callback to be executed upon search success
   * @param handleError Callback to be executed upon search failure
   *
   * @since 1.0.18
   */
  multisearchOutfitRecommendations: (params: Record<string, any>, handleSuccess: SuccessHandler, handleError: ErrorHandler) => void;
  /**
   * Multisearch autocomplete.
   *
   * @param params Query parameters to be used for searching
   * @param handleSuccess Callback to be executed upon search success
   * @param handleError Callback to be executed upon search failure
   *
   * @since 1.0.0
   */
  multisearchAutocomplete: (
    params: Record<string, any>,
    handleSuccess: SuccessHandler,
    handleError: ErrorHandler,
  ) => void;
  /**
   * Triggers rendering for the widgets, including all of existing, already rendered widgets.
   *
   * For recommendations widget, this will also trigger a new call to Rezolve API.
   *
   * @param selector (optional) New selector to render the widget on
   *
   * @since 1.0.0
   */
  rerender: (selector?: string) => void;
  /**
   * Triggers rendering for the widgets that are not present in the designated selectors,
   * typically when the selectors are dynamically added to the page.
   *
   * For recommendations widget, this will also trigger a new call to Rezolve API.
   *
   * @since 1.0.6
   */
  renderMissing: () => void;
  /**
   * Opens the widget popup; applicable only for widget types that have popup behavior.
   *
   * @param id Identifier to differentiate widgets that are rendered over multiple selectors
   *
   * @since 1.0.0
   */
  openWidget: (id: string) => void;
  /**
   * @internal
   *
   * @since 1.0.0
   */
  registerWidgetOpener: (fn: (id: string, bypassIdCheck: boolean) => void) => void;
  /**
   * Closes the widget popup; applicable only for widget types that have popup behavior.
   *
   * @since 1.0.18
   */
  closeWidget: () => void;
  /**
   * @internal
   *
   * @since 1.0.18
   */
  registerWidgetCloser: (fn: () => void) => void;
  /**
   * Hides the widget from view.
   *
   * @since 1.0.0
   */
  hideWidget: () => void;
  /**
   * Destroys the widget object and reference.
   *
   * @since 1.0.0
   */
  disposeWidget: () => void;
  /**
   * Toggles dark mode on/off.
   *
   * @since 1.0.0
   */
  toggleDarkMode: () => void;
  /**
   * @internal
   *
   * @since 1.0.0
   */
  registerDarkModeToggler: (fn: () => void) => void;
  /**
   * Updates the widget config.
   *
   * @param configOverride The new configuration object
   * @param isPartial Indicates whether to apply the config partially (patching) or fully (replacing)
   *
   * @internal
   *
   * @since 1.0.0
   */
  updateConfig: (configOverride: WidgetConfig, isPartial: boolean) => void;
  /**
   * @internal
   *
   * @since 1.0.0
   */
  registerConfigUpdater: (fn: (configOverride: WidgetConfig, isPartial: boolean) => void) => void;
  /**
   * Updates the widget locale.
   *
   * @param locale The new locale
   *
   * @since 1.0.1
   */
  updateLocale: (locale: string) => void;
  /**
   * @internal
   *
   * @since 1.0.1
   */
  registerLocaleUpdater: (fn: (locale: string) => void) => void;
  /**
   * @internal
   *
   * @since 1.0.0
   */
  forceErrorState: (errorState: WidgetErrorState, errorMessage?: string) => void;
  /**
   * Sends a chat message; applicable only for widget types that have chatbox-like interface.
   *
   * @since 1.0.14
   */
  sendChatMessage: (message: string, image?: SearchImageOrPid) => void;
}

type ViewportType = 'mobile' | 'tablet' | 'desktop';

type ProductCardImageSrc = 'main' | 'best_product' | 'best_outfit' | 'additional';

/**
 * A URL-based image with accompanying label.
 *
 * @since 1.0.0
 */
interface ImageWithLabel {
  /**
   * URL source of the image.
   *
   * @since 1.0.0
   */
  url: string;
  /**
   * Label of the image.
   *
   * @since 1.0.0
   */
  label: string;
}

/**
 * A colorable icon.
 *
 * @since 1.0.0
 */
export interface Icon {
  /**
   * URL source of the icon.
   *
   * @since 1.0.0
   */
  url?: string;
  /**
   * Color of the icon.
   *
   * @since 1.0.0
   */
  color: string;
  /**
   * Color of the icon in dark mode.
   *
   * @since 1.0.0
   */
  colorDark: string;
}

/**
 * A colorable icon with a colorable background.
 */
interface IconWithBackground extends Icon {
  /**
   * Background color of the icon.
   *
   * @since 1.0.0
   */
  backgroundColor: string;
  /**
   * Background color of the icon in dark mode.
   *
   * @since 1.0.0
   */
  backgroundColorDark: string;
}

/**
 * A minimalistic font settings.
 *
 * @since 1.0.0
 */
interface Font {
  /**
   * Font size in px.
   *
   * @since 1.0.0
   */
  size: number;
  /**
   * Font weight.
   *
   * @since 1.0.0
   */
  weight: number;
}

/**
 * Font settings for different viewports.
 *
 * @since 1.0.0
 */
export type MultiViewportFont = {
  [V in ViewportType]: Font;
};

/**
 * A text that can be hidden.
 *
 * @since 1.0.0
 */
interface HideableText {
  /**
   * Font settings.
   *
   * @since 1.0.0
   */
  font: MultiViewportFont;
  /**
   * Whether to show the text.
   *
   * @since 1.0.0
   */
  show: boolean;
}

/**
 * A text taken from field source that can be hidden.
 *
 * @since 1.0.0
 */
interface HideableField extends HideableText {
  /**
   * Field source of the displayed text.
   *
   * @since 1.0.0
   */
  fieldSource: string;
}

/**
 * An interface (roughly speaking: a bounded area) that has a defined color set.
 *
 * @since 1.0.0
 */
export interface ColoredInterface {
  /**
   * Font color of the interface.
   *
   * @since 1.0.0
   */
  fontColor: string;
  /**
   * Font color of the interface in dark mode.
   *
   * @since 1.0.0
   */
  fontColorDark: string;
  /**
   * Background color of the interface.
   *
   * @since 1.0.0
   */
  backgroundColor: string;
  /**
   * Background color of the interface in dark mode.
   *
   * @since 1.0.0
   */
  backgroundColorDark: string;
}

/**
 * Border settings.
 *
 * @since 1.0.12
 */
export interface Border {
  /**
   * Width (thickness) of the border.
   *
   * @since 1.0.12
   */
  width: number;
  /**
   * Color of the border.
   *
   * @since 1.0.12
   */
  color: string;
  /**
   * Color of the border in dark mode.
   *
   * @since 1.0.12
   */
  colorDark: string;
  /**
   * Radius of the border.
   *
   * @since 1.0.12
   */
  radius: number;
}

/**
 * An interface for a trending product (will be changed when API is integrated)
 *
 * @internal
 *
 * @since 1.0.6
 */
export interface TrendingProduct {
  /**
   * product ID of the interface.
   *
   * @since 1.0.6
   */
  productId: string;
  /**
   * product URL of the interface.
   *
   * @since 1.0.6
   */
  productUrl: string;
  /**
   * image URL of the interface.
   *
   * @since 1.0.6
   */
  imUrl: string;
  /**
   * price object of product of the interface.
   *
   * @since 1.0.6
   */
  price: {
    /**
     * type of currency of the interface.
     *
     * @since 1.0.6
     */
    currency: string;
    /**
     * price amount of the interface.
     *
     * @since 1.0.6
     */
    value: number;
  };
  /**
   * title of product of the interface.
   *
   * @since 1.0.6
   */
  title: string;
}

/**
 * Configuration for Rezolve widgets.
 */
export interface WidgetConfig {
  /**
   * Search/Recommendation API- and tracking-related settings.
   *
   * @since 1.0.0
   */
  appSettings: {
    /**
     * Rezolve app key; obtainable from Discovery Suite console.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.0
     */
    appKey: string;
    /**
     * Rezolve placement ID; obtainable from Discovery Suite console.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.0
     */
    placementId: string | number;
    /**
     * (optional) Rezolve strategy ID; obtainable from Discovery Suite console.
     *
     * @since 1.0.0
     */
    strategyId?: string | number;
    /**
     * (optional) UID used to override Rezolve tracking parameter.
     *
     * @since 1.0.0
     */
    uid?: string;
    /**
     * If true, the widget will push result_load event to GTM (Google Tag Manager) objects.
     *
     * @since 1.0.0
     */
    gtmTracking?: boolean;
    /**
     * Rezolve search/recommendations API endpoint.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.0
     */
    endpoint?: string;
    /**
     * (optional) Cloud deployment target. Set to 'aws' or 'azure' to route requests to the
     * cloud-specific domains with their updated API paths. When set, it overrides the API-provided
     * `endpoint` — but a manually specified endpoint (via window.visenzeConfigs) still wins.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.21
     */
    cloud?: Cloud;
    /**
     * (optional) Multi-search family API selector. Chooses which API the multisearch-based widgets
     * call: 1 = multisearch, 2 = complementary, 3 = outfit-recommendations. Blank or unrecognized
     * values fall back to multisearch. Injected as a string by the widget-init backend.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.21
     */
    msApiId?: string | number;
    /**
     * (optional) Gates voice capability in the shopping-assistant widget: voice input is
     * captured via the browser's built-in speech recognition, and assistant replies to voice
     * messages are spoken aloud via ElevenLabs text-to-speech. When unset (or false), all voice
     * UI is hidden and no voice requests are made.
     *
     * The ElevenLabs credential itself is never held client-side — the voice proxy backend
     * resolves it server-side from the tenant's `app_key` (see
     * docs/shopping-assistant-voice-proxy.md). This flag only controls whether the widget shows
     * voice UI and calls the proxy for this placement.
     *
     * @since 1.0.26
     */
    voiceEnabled?: boolean;
    /**
     * Dimensions of the image to be considered for the algorithm.
     *
     * The ViSearch SDK by default resize image uploaded to 512x512;
     * on larger image with very fine details, this downsizing may cause some loss of details
     * resulting in algorithm not being able to process the image to the best of its capabilities.
     *
     * @since 1.0.0
     */
    resizeSettings?: {
      /**
       * Maximum resize width of the image.
       *
       * @since 1.0.0
       */
      maxWidth: number;
      /**
       * Maximum resize height of the image.
       *
       * @since 1.0.0
       */
      maxHeight: number;
    };
  };
  /**
   * Display-related settings.
   *
   * This field is defined for backward-compatibility with legacy widgets.
   * All the look-and-feel customizations have been moved to a separate field.
   *
   * @since 1.0.0
   */
  displaySettings: {
    /**
     * CSS selector on which the widget will be rendered on.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.0
     */
    cssSelector: string;
    /**
     * Field mapping for product card. The fields are based on the schema of the Discovery Suite catalog.
     *
     * @internal This value is expected to be set automatically by Rezolve widget initialization API.
     *
     * @since 1.0.0
     */
    productDetails: Record<string, string>;
  };
  /**
   * Additional key-value parameters that will be sent to Rezolve search/recommendation APIs.
   *
   * @since 1.0.0
   */
  searchSettings: Record<string, any>;
  /**
   * Additional key-value parameters that will be sent to Rezolve analytics API.
   *
   * @since 1.0.0
   */
  trackingSettings: Record<string, any>;
  /**
   * Localization- and internationalization-related settings.
   *
   * @since 1.0.0
   */
  languageSettings: {
    /**
     * Locale to be used by the widget.
     *
     * This will override the locale set in the customization object.
     *
     * @since 1.0.0
     */
    locale: string;
    /**
     * Currency to be used by the widget.
     *
     * This will override the currency set in the customization object,
     * but will not override the currency from the product metadata.
     *
     * @since 1.0.0
     */
    currency: string;
  };
  /**
   * Callbacks settings.
   *
   * @since 1.0.0
   */
  callbacks: {
    /**
     * Pre-processes API response before being passed further down into the components.
     * The modification is expected to happen in-place.
     *
     * The callback will be applied uniformly to all API responses regardless of the exact method being called.
     * If different processing is required for different API methods, the field `method` of the response
     * can be used to differentiate:
     * ```ts
     * preprocessResponse: (resp) => {
     *   if (resp.method === 'product/multisearch') {
     *     // preprocess multisearch API response
     *   } else if (resp.method === 'product/recommendations') {
     *     // preprocess recommendations API response
     *   }
     *   // etc.
     * },
     * ```
     *
     * @param resp The original API response.
     *
     * @since 1.0.0
     */
    preprocessResponse?: (resp: ProductSearchResponse) => void;
    /**
     * Fires whenever an event is sent to Rezolve Analytics (precisely: when `sendEvent` is called).
     *
     * @param action The action that is being recorded
     * @param params The attached metadata related to the action
     *
     * @since 1.0.0
     */
    trackingCallback?: (action: string, params: Record<string, any>) => void;
    /**
     * Fires whenever a product card is clicked on.
     *
     * If this function is defined, clicking on the product will not redirect to the product URL.
     * If such behavior is still needed, the following callback function can be used:
     * ```ts
     * onProductClick: (productDetails, trackingMeta, productUrl) => {
     *   // ... enter custom behavior ...
     *
     *   window.open(productUrl); // this line restores the redirect behavior
     * },
     * ```
     *
     * @param productDetails The details of the product
     * @param trackingMeta Relevant metadata attached to the action
     * @param productUrl The URL of the product
     *
     * @since 1.0.0
     */
    onProductClick?: (productDetails: Record<string, any>, trackingMeta: Record<string, any>, productUrl: string) => void;
    /**
     * Fires whenever response from a search/recommendation API result is returned.
     *
     * If `preprocessResponse` is defined, the `resp` parameter of this callback will be the object
     * AFTER the pre-processing has been applied.
     *
     * The callback will be applied uniformly to all API responses regardless of the exact method being called.
     * If different processing is required for different API methods, the field `method` of the response
     * can be used to differentiate:
     * ```ts
     * onSearchCallback: (resp) => {
     *   if (resp.method === 'product/multisearch') {
     *     // preprocess multisearch API response
     *   } else if (resp.method === 'product/recommendations') {
     *     // preprocess recommendations API response
     *   }
     *   // etc.
     * },
     * ```
     *
     * @param resp Response from Rezolve search/recommendation API
     *
     * @since 1.0.0
     */
    onSearchCallback?: (resp: ProductSearchResponse) => void;
    /**
     * Fires when there is an input change within the search bar (when exists),
     * such as clicking enter in search bar, selecting an autocomplete option, or uploading a new image.
     *
     * @param text Text query of the search bar
     * @param image Image query of the search bar
     *
     * @since 1.0.0
     */
    onSearchBarInput?: (text: string | undefined, image: SearchImage | undefined) => void;
    /**
     * Fires an event that indicates that a product should be added to or removed from wishlist.
     *
     * If defined, the callback should return whether the operation succeeds,
     * and the icon shall be toggled only if the operation returns true.
     *
     * @param add True if the intention is to add to wishlist, false if the intention is to remove from wishlist
     * @param pid The product ID
     * @param productDetails (optional) Additional details of the product
     *
     * @since 1.0.18
     */
    onAddToWishlistToggle?: (add: boolean, pid: string, productDetails?: Record<string, any>) => boolean | Promise<boolean>;
    /**
     * Fires an event that indicates that a product should be added to or removed from cart.
     *
     * If defined, the callback should return whether the operation succeeds.
     *
     * The first parameter is left empty on purpose.
     *
     * @param pid The product ID
     * @param productDetails (optional) Additional details of the product
     *
     * @since 1.0.18
     */
    onAddToCartToggle?: (_: boolean, pid: string, productDetails?: Record<string, any>) => boolean | Promise<boolean>;
    /**
     * Fires an event that indicates that a "find similar" request is sent to the widget.
     *
     * Some widget types internally define the action done after a "find similar" request is received.
     * If such default behavior is not desired, you can define this callback with an operation
     * that returns false, such as:
     * ```ts
     * onFindSimilar: (product) => {
     *   // ... enter custom behavior ...
     *
     *   return false; // This line prevents the internal onFindSimilar behavior from firing
     * },
     * ```
     *
     * @param image The image used as the basis for "finding similar"
     *
     * @internal
     *
     * @since 1.0.15
     */
    onFindSimilar?: (image: SearchImageOrPid) => boolean | Promise<boolean>;
  };
  /**
   * Initial state of the widget.
   *
   * This structure is useful to preload some data into the widget.
   *
   * @since 1.0.18
   */
  initState?: {
    /**
     * Product IDs marked as already present in the wishlist.
     *
     * For products whose ID are present in this list, when they are returned in the search/recommendation results,
     * the corresponding product card will have its wishlist state initially set to true instead of false.
     *
     * @since 1.0.18
     */
    wishlistProductIds: string[];
  };
  /**
   * Widget look-and-feel customization. The values for this section is set
   * through configurations within the Discovery Suite console.
   *
   * @internal While it is technically possible to set overriding customization parameters
   * in the configuration object, it is not recommended to do such as this section
   * can and should be configured entirely from the Discovery Suite console.
   *
   * @since 1.0.0
   */
  customizations: {
    /**
     * General look-and-feel and layout.
     *
     * @since 1.0.0
     */
    generalLayout: ColoredInterface & {
      /**
       * Font family of the widget.
       *
       * @since 1.0.0
       */
      fontFamily: string;
      /**
       * Settings for heading font.
       *
       * @since 1.0.0
       */
      headingFont: MultiViewportFont;
      /**
       * Settings for body font.
       *
       * @since 1.0.0
       */
      bodyFont: MultiViewportFont;
      /**
       * Whether to show the widget title.
       *
       * @since 1.0.0
       */
      showWidgetTitle: boolean;
      /**
       * Whether to show "Powered by Rezolve" footer in appropriate places.
       *
       * @since 1.0.0
       */
      showViSenzeLogo: boolean;
      /**
       * Whether to use dark mode theme by default.
       *
       * @since 1.0.0
       */
      darkModeDefault: boolean;
    };
    /**
     * Settings to influence API results or how the responses are parsed.
     *
     * This section is expected to be lightweight as most of API settings should instead
     * be set through the searchSettings parameter.
     *
     * @internal
     *
     * @since 1.0.0
     */
    results?: {
      /**
       * Number of results to be returned from API.
       *
       * @internal
       *
       * @since 1.0.5
       */
      limit?: number;
    };
    /**
     * Popup-related settings. This section is relevant only for widgets that have popup behavior.
     *
     * @since 1.0.0
     */
    popup?: {
      /**
       * Popup position on the screen.
       *
       * @since 1.0.0
       */
      position: 'left' | 'center' | 'right';
      /**
       * Configurations for the icon that triggers the popup.
       *
       * Since v1.0.4, this behaves more like a full-fledged button rather than just an icon,
       * however the field name is kept as such for backward compatibility.
       *
       * @since 1.0.0
       */
      triggerIcon: Icon & Partial<ColoredInterface> & {
        /**
         * Whether to hide the trigger button.
         *
         * Without the provided trigger button, the only way to open the widget popup is
         * to use the openWidget function of the widget client.
         *
         * @since 1.0.0
         */
        hide: boolean;
        /**
         * Layout of icon and text contents of the trigger button.
         *
         * - ICON: icon only
         * - TEXT: text only
         * - ICON_TEXT: icon, followed by text
         * - TEXT_ICON: text, followed by icon
         *
         * @since 1.0.4
         */
        layout: 'ICON' | 'TEXT' | 'ICON_TEXT' | 'TEXT_ICON';
      };
    };
    /**
     * Buttons configuration.
     *
     * @since 1.0.0
     */
    buttons?: {
      /**
       * Primary button configuration.
       *
       * @since 1.0.0
       */
      primary: ColoredInterface;
      /**
       * Secondary button configuration.
       *
       * @since 1.0.0
       */
      secondary: ColoredInterface;
    };
    /**
     * Breakpoints configuration.
     *
     * @internal Customizable breakpoint is not currently effective as Tailwind builds code based on preset breakpoints,
     * i.e. classes such as `md:*`, `lg:*` will follow Tailwind's preset instead of the values from here.
     * Although Tailwind preset can be customized, it cannot be updated on runtime -- this configuration object
     * would need to pass in the values during runtime after the bundle has been built.
     *
     * @since 1.0.0
     */
    breakpoints: {
      /**
       * Mobile breakpoint settings.
       *
       * @since 1.0.0
       */
      mobile: ViewportWidth;
      /**
       * Tablet breakpoint settings.
       *
       * @since 1.0.0
       */
      tablet: ViewportWidth;
    };
    /**
     * Additional custom CSS to be applied to the widget.
     *
     * @since 1.0.0
     */
    customCss?: string;
    /**
     * Localization- and internationalization-related settings.
     *
     * @since 1.0.0
     */
    localization?: {
      /**
       * Default locale to be used by the widget.
       *
       * @since 1.0.0
       */
      defaultLocale: string;
      /**
       * Default currency to be used by the widget, if not present in the product metadata.
       *
       * @since 1.0.0
       */
      defaultCurrency: string;
      /**
       * Mapping of locale to displayable texts.
       *
       * @since 1.0.0
       */
      text: LanguagePack;
    };
    /**
     * Product grid- or slider-related settings.
     *
     * @since 1.0.0
     */
    productGrid?: {
      [V in ViewportType]: {
        /**
         * Number of products shown per row in grid or per slide in slider.
         *
         * @since 1.0.0
         */
        productsPerRow: number;
        /**
         * Vertical margin between each row of product cards in a grid.
         *
         * @since 1.0.0
         */
        marginVertical: number | undefined;
        /**
         * Horizontal margin between each product card in a row or slide.
         *
         * @since 1.0.0
         */
        marginHorizontal: number | undefined;
      };
    };
    /**
     * Product card-related settings.
     *
     * @since 1.0.0
     */
    productCard?: {
      /**
       * Indicates whether clicking a product card opens the link in the same or different browser tab.
       *
       * @since 1.0.0
       */
      openLinksInNewTab: boolean;
      /**
       * The aspect ratio for the product card image; defaults to 1 / 1 (square image) if not specified.
       *
       * @since 1.0.0
       */
      imageAspectRatio?: string;
      /**
       * Border settings for the product card.
       *
       * @internal
       *
       * @since 1.0.12
       */
      border?: Border;
      /**
       * Configuration for price field.
       *
       * @since 1.0.0
       */
      price: HideableText & {
        /**
         * Font color for the price field.
         *
         * @since 1.0.0
         */
        fontColor: string;
        /**
         * Font color for the price field in dark mode.
         *
         * @since 1.0.0
         */
        fontColorDark: string;
        /**
         * Whether to hide the price value after the decimal point.
         *
         * @since 1.0.4
         */
        hideDecimal?: boolean;
      };
      /**
       * Configuration for original price (i.e. before discount) field.
       *
       * @since 1.0.0
       */
      originalPrice: HideableText & {
        /**
         * Font color for the original price field.
         *
         * @since 1.0.0
         */
        fontColor: string;
        /**
         * Font color for the original price field in dark mode.
         *
         * @since 1.0.0
         */
        fontColorDark: string;
        /**
         * Whether to hide the original price value after the decimal point.
         *
         * @since 1.0.4
         */
        hideDecimal?: boolean;
        /**
         * Position of the original price relative to the post-discount price.
         *
         * @since 1.0.18
         */
        position?: 'BEFORE' | 'AFTER';
        /**
         * Whether the original price, if different from the post-discount price, should be striked through.
         *
         * @since 1.0.18
         */
        strikethrough?: boolean;
      };
      /**
       * Configuration for discount display.
       *
       * @since 1.0.18
       */
      discount?: HideableText & {
        /**
         * Font color for the discount.
         *
         * @since 1.0.18
         */
        fontColor: string;
        /**
         * Font color for the discount in dark mode.
         *
         * @since 1.0.18
         */
        fontColorDark: string;
        /**
         * Configures whether the discount value is displayed as the numeric difference between
         * the original price and the discount price (<code>originalPrice - price</code>)
         * or the percentage difference (code>(originalPrice - price) / originalPrice * 100%</code>).
         *
         * @since 1.0.18
         */
        showPercentage: boolean;
        /**
         * The unit to round the discount value against. For example, if the rounding unit is 5,
         * a discount value of 17 will be rounded to 15, but if the rounding unit is 10,
         * the same value will be rounded to 20.
         *
         * Values usually used are 1, 5, and 10.
         *
         * @since 1.0.18
         */
        rounding: number;
      };
      /**
       * Configuration for primary title field.
       *
       * @since 1.0.0
       */
      title: HideableField;
      /**
       * Configuration for secondary title field.
       *
       * @since 1.0.0
       */
      secondaryTitle: HideableField;
      /**
       * Configuration for the "find similar" feature within a product card image.
       *
       * @since 1.0.0
       */
      findSimilar?: {
        /**
         * Whether the "find similar" feature is enabled or not.
         *
         * @since 1.0.0
         */
        enable: boolean;
        /**
         * Position of the "find similar" icon relative to the product card image.
         *
         * @since 1.0.0
         */
        position: ProductCardIconPosition;
        /**
         * Configurations for the find similar icon.
         *
         * @since 1.0.0
         */
        icon: IconWithBackground;
      };
      /**
       * Configuration for the "add to wishlist" feature within a product card image.
       *
       * @since 1.0.18
       */
      addToWishlist?: {
        /**
         * Whether the "add to wishlist" feature is enabled or not.
         *
         * @since 1.0.18
         */
        enable: boolean;
        /**
         * Position of the "add to wishlist" icon relative to the product card image.
         *
         * @since 1.0.18
         */
        position: ProductCardIconPosition;
        /**
         * Configurations for the add to wishlist icon, i.e. the icon when the product is not in the wishlist.
         *
         * @since 1.0.18
         */
        iconInactive?: IconWithBackground;
        /**
         * Configurations for the remove from wishlist icon, i.e. the icon when the product is in the wishlist.
         *
         * @since 1.0.18
         */
        iconActive?: IconWithBackground;
      };
      /**
       * Configuration for the "add to cart" button within a product card image.
       *
       * @since 1.0.18
       */
      addToCart?: Icon & Partial<ColoredInterface> & {
        /**
         * Whether the "add to cart" button is enabled or not.
         *
         * @since 1.0.18
         */
        enable: boolean;
        /**
         * Layout of icon and text contents of the add-to-cart button.
         *
         * - TEXT: text only
         * - ICON_TEXT: icon, followed by text
         * - TEXT_ICON: text, followed by icon
         *
         * @since 1.0.18
         */
        layout: 'TEXT' | 'ICON_TEXT' | 'TEXT_ICON';
      };
      /**
       * Configuration for the image shown on product card.
       *
       * @since 1.0.10
       */
      images?: {
        /**
         * Indicates which image should be used for the main product card image.
         *
         * Possible values are:
         * - main = the main image URL of the product
         * - best_product = the best product image URL of the product
         * - best_outfit = the best outfit image URL of the product
         *
         * @since 1.0.10
         */
        mainImage: Exclude<ProductCardImageSrc, 'additional'>;
        /**
         * Indicates which image should be used when the main product card image is hovered on.
         *
         * Possible values are:
         * - best_product = the best product image URL of the product
         * - best_outfit = the best outfit image URL of the product
         * - additional = the first additional image URL of the product
         * - none = do not change the image on hover
         *
         * @since 1.0.10
         */
        hoverImage: Exclude<ProductCardImageSrc, 'main'> | 'none';
        /**
         * Whether to display alternatives as the recommendation result.
         *
         * @since 1.0.10
         */
        showAlternatives: boolean;
      };
    };
    /**
     * Configuration for the search bar.
     *
     * @internal
     *
     * @since 1.0.12
     */
    searchBar?: {
      /**
       * Configuration for the border of the search bar.
       *
       * @since 1.0.12
       */
      border?: Border;
      /**
       * Whether to show the dropdown of the search bar.
       *
       * @since 1.0.12
       */
      showDropdown?: boolean;
    };
    /**
     * Image upload-related settings. This section is relevant only for widgets that intend to support image upload.
     *
     * @since 1.0.0
     */
    imageUpload?: {
      /**
       * Whether the "image upload" feature is enabled or not.
       *
       * @since 1.0.0
       */
      enable: boolean;
      /**
       * Configurations for the "upload image" icon.
       *
       * @since 1.0.0
       */
      icon: Icon;
      /**
       * List of images which will be used as a gallery of images for quick upload.
       *
       * @since 1.0.0
       */
      images: ImageWithLabel[];
    };
    /**
     * Popular terms settings. This is only applicable for widgets with popular terms setting available.
     *
     * @internal
     *
     * @since 1.0.6
     */
    popularTerms?: {
      /**
       * Whether the "popular term" feature is enabled or not.
       *
       * @internal
       *
       * @since 1.0.6
       */
      enable: boolean;
      /**
       * List of terms which will be used as a quick query search.
       *
       * @internal
       *
       * @since 1.0.6
       */
      terms: string[];
    };
    /**
     * Trending product settings. This is only applicable for widgets with recommended products setting available.
     *
     * @internal
     *
     * @since 1.0.6
     */
    trendingProducts?: {
      /**
       * Whether the "trending product" feature is enabled or not.
       *
       * @internal
       *
       * @since 1.0.6
       */
      enable: boolean;
      /**
       * List of trending products which will be showcased.
       *
       * @internal
       *
       * @since 1.0.6
       */
      products: TrendingProduct[];
    };
    /**
     * @internal
     *
     * @since 1.0.14
     */
    chatbot?: {
      /**
       * The chat agent to be used.
       *
       * This should be set by internal ViSenze personnel as the value needs to correspond
       * to an internally recognized chat agent.
       *
       * @internal
       *
       * @since 1.0.14
       */
      chatAgent: string;
      /**
       * (optional) ElevenLabs voice ID used for spoken replies. Defaults to the widget's
       * built-in voice when unset. Only takes effect when `appSettings.voiceEnabled` is set.
       *
       * @since 1.0.26
       */
      voiceId?: string;
    };
  };
  /**
   * Additional settings to be applied to the widget that are set from external platforms,
   * such as e-commerce connectors.
   *
   * @internal
   *
   * @since 1.0.0
   */
  platformSettings?: {
    /**
     * The name of the platform.
     *
     * @since 1.0.0
     */
    platformName: string;
    /**
     * Custom CSS set by the platform.
     *
     * @since 1.0.0
     */
    customCss: string;
  };
  /**
   * Set to true to disable sending of events to ViSenze Analytics.
   *
   * Note that setting this to true does NOT disable the trackingCallback event.
   *
   * @internal
   *
   * @since 1.0.0
   */
  disableAnalytics: boolean;
  /**
   * Indicates whether this placement is using preset code or custom code.
   *
   * @internal
   *
   * @since 1.0.2
   */
  isCustomScript?: boolean | string;
}

/**
 * Represents a viewport width.
 *
 * This interface is actually a very small subset of MediaQueryFeatures from react-responsive,
 * used to determine a viewport based on width only.
 */
interface ViewportWidth {
  /**
   * Minimum width of the viewport. Not currently used.
   *
   * @since 1.0.0
   */
  minWidth?: number;
  /**
   * Maximum width of the viewport.
   *
   * @since 1.0.0
   */
  maxWidth?: number;
}

export type RecursivePartial<T> = T extends never[] ? T : { [P in keyof T]?: RecursivePartial<T[P]> };
