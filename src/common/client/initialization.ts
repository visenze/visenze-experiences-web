import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  WidgetType,
  WidgetClient,
  WidgetConfig,
  RecursivePartial,
  MultiViewportFont,
  ColoredInterface,
} from '../wigmix-core';
import { resetChatSessionStore } from '../components/chat/session/chat-session-map';
import { DEFAULT_CONFIGS } from '../default-configs';
import getWidgetClient from './widget-client';
import { resolveBaseEndpoint, usesCloudPaths } from './endpoint';
import { Actions } from '../types/tracking-constants';
import { getActiveOptionFields, getOptionCatalogField } from '../components/add-to-cart-options/add-to-cart-options';

interface WidgetInitResult {
  widgetClient: WidgetClient;
  widgetConfig: WidgetConfig;
}

export function deepMerge<T extends Record<string, any> | undefined | null>(overrides: any, base: T): T {
  if (overrides === null || typeof overrides === 'undefined') {
    return base;
  }

  if (base === null || typeof base === 'undefined') {
    return overrides as T;
  }

  const result: Record<string, any> = {};

  for (const [key, val] of Object.entries(base)) {
    if (key in overrides) {
      if (Array.isArray(val) && Array.isArray(overrides[key])) {
        result[key] = overrides[key];
      } else if (typeof val === 'object' && typeof overrides[key] === 'object') {
        result[key] = deepMerge(overrides[key], val);
      } else {
        result[key] = overrides[key];
      }
    } else {
      result[key] = val;
    }
  }

  for (const [key, val] of Object.entries(overrides)) {
    if (!(key in result)) {
      result[key] = val;
    }
  }

  return result as T;
}

const isPlacementSkippable = (placementId: number | string | undefined): boolean => {
  if (!placementId) {
    return true;
  }
  let placementsToSkip: string[] = [];
  const placementsToSkipString = new URLSearchParams(window.location.search).get('visenzeSkipPlacements');
  if (placementsToSkipString) {
    placementsToSkip = placementsToSkipString.split(',').map((id) => id.trim());
  }
  return placementsToSkip.includes(placementId.toString());
};

export const setCssVariables = (config: WidgetConfig, darkMode: boolean): void => {
  if (config.customizations) {
    const fontCustomizations: Record<string, MultiViewportFont | undefined> = {
      heading: config.customizations.generalLayout?.headingFont,
      body: config.customizations.generalLayout?.bodyFont,
      productCardTitle: config.customizations.productCard?.title?.font,
      productCardSecondaryTitle: config.customizations.productCard?.secondaryTitle?.font,
      productCardPrice: config.customizations.productCard?.price?.font,
      productCardOriginalPrice: config.customizations.productCard?.originalPrice?.font,
      productCardDiscount: config.customizations.productCard?.discount?.font,
    };
    const colorCustomizations: Record<string, ColoredInterface | undefined> = {
      primary: config.customizations.generalLayout,
      buttonPrimary: config.customizations.buttons?.primary,
      buttonSecondary: config.customizations.buttons?.secondary,
      buttonIcon: config.customizations.buttons?.icon,
      breadcrumbActive: config.customizations.breadcrumbTrail?.active,
      breadcrumbInactive: config.customizations.breadcrumbTrail?.inactive,
      inputBarMenuPanel: config.customizations.chatbot?.inputBar?.menuPanel,
    };
    const root = document.querySelector(':root') as HTMLElement;

    for (const [targetElement, obj] of Object.entries(fontCustomizations)) {
      if (!obj) {
        continue;
      }
      for (const [viewportType, font] of Object.entries(obj)) {
        root.style.setProperty(
          `--wigmix-${viewportType}-${targetElement}-fontSize`,
          font.size.toString() + 'px',
        );
        root.style.setProperty(`--wigmix-${viewportType}-${targetElement}-fontWeight`, font.weight.toString());
      }
    }

    for (const [colorType, obj] of Object.entries(colorCustomizations)) {
      if (!obj) {
        continue;
      }
      for (const [colorFieldName, colorNameValue] of Object.entries(obj)) {
        let colorName = '';
        if (darkMode) {
          if (colorFieldName === 'fontColorDark') {
            colorName = 'text';
          } else if (colorFieldName === 'backgroundColorDark') {
            colorName = 'background';
          }
        } else {
          if (colorFieldName === 'fontColor') {
            colorName = 'text';
          } else if (colorFieldName === 'backgroundColor') {
            colorName = 'background';
          }
        }
        if (colorName) {
          root.style.setProperty(`--wigmix-${colorName}-${colorType}`, colorNameValue);
        }
      }
    }

    const productCardBorder = config.customizations.productCard?.border;
    if (productCardBorder) {
      root.style.setProperty('--wigmix-border-width-productCard', (productCardBorder.width || 0) + 'px');
      if (darkMode) {
        root.style.setProperty('--wigmix-border-color-productCard', productCardBorder.colorDark || '#fff');
      } else {
        root.style.setProperty('--wigmix-border-color-productCard', productCardBorder.color || '#000');
      }
      root.style.setProperty('--wigmix-border-radius-productCard', (productCardBorder.radius || 0) + 'px');
    } else {
      root.style.setProperty('--wigmix-border-width-productCard', '0px');
      if (darkMode) {
        root.style.setProperty('--wigmix-border-color-productCard', '#fff');
      } else {
        root.style.setProperty('--wigmix-border-color-productCard', '#000');
      }
      root.style.setProperty('--wigmix-border-radius-productCard', '0px');
    }

    const searchBarBorder = config.customizations.searchBar?.border;
    if (searchBarBorder) {
      root.style.setProperty('--wigmix-border-width-searchBar', (searchBarBorder.width || 0) + 'px');
      if (darkMode) {
        root.style.setProperty('--wigmix-border-color-searchBar', searchBarBorder.colorDark || '#fff');
      } else {
        root.style.setProperty('--wigmix-border-color-searchBar', searchBarBorder.color || '#000');
      }
      root.style.setProperty('--wigmix-border-radius-searchBar', (searchBarBorder.radius || 0) + 'px');
    } else {
      root.style.setProperty('--wigmix-border-width-searchBar', '0px');
      if (darkMode) {
        root.style.setProperty('--wigmix-border-color-searchBar', '#fff');
      } else {
        root.style.setProperty('--wigmix-border-color-searchBar', '#000');
      }
      root.style.setProperty('--wigmix-border-radius-searchBar', '0px');
    }
  }
};

/*
 * Populates product details with alias names in field mappings and
 * assigns the alias names to attrs_to_get in searchSettings
 */
export const populateProductDetailsAndAttrsToGet = (config: WidgetConfig, fieldMappings: Record<string, string>): WidgetConfig => {
  const productDetailsToOverride: Record<string, string> = {};
  Object.keys(config.displaySettings.productDetails || {}).forEach((key) => {
    if (config.displaySettings.productDetails[key]) {
      productDetailsToOverride[key] = config.displaySettings.productDetails[key];
    }
  });
  config.displaySettings.productDetails = {
    ...fieldMappings,
    main_image_url: fieldMappings['main_image_url'] || '',
    product_url: fieldMappings['product_url'] || '',
    title: fieldMappings['title'] || '',
    price: fieldMappings['price'] || '',
    original_price: fieldMappings['original_price'] || '',
    category: fieldMappings['category'] || '',
    brand: fieldMappings['brand'] || '',
    gender: fieldMappings['gender'] || '',
    sizes: fieldMappings['sizes'] || '',
    colors: fieldMappings['colors'] || '',
    ...productDetailsToOverride,
  };
  if (!config.searchSettings['attrs_to_get'] || config.searchSettings['attrs_to_get'].length === 0) {
    config.searchSettings['attrs_to_get'] = Object.values(config.displaySettings.productDetails).filter(value => Boolean(value));
  }
  // Add-to-cart option fields must be fetched even when they aren't otherwise displayed.
  const optionCatalogFields = getActiveOptionFields(config.customizations?.productCard?.addToCart?.options)
    .map((field) => getOptionCatalogField(field, config.displaySettings.productDetails));
  const attrsToGet: string[] = config.searchSettings['attrs_to_get'] || [];
  const missingOptionFields = optionCatalogFields.filter((field, index) => !attrsToGet.includes(field) && optionCatalogFields.indexOf(field) === index);
  if (missingOptionFields.length > 0) {
    config.searchSettings['attrs_to_get'] = [...attrsToGet, ...missingOptionFields];
  }

  return config;
};


const init = (
  initConfig: WidgetConfig,
  fieldMappings: Record<string, string>,
  widgetType: WidgetType,
  widgetVersion: string,
  customizations: WidgetConfig['customizations'],
): WidgetInitResult | undefined => {
  if (isPlacementSkippable(initConfig.appSettings.placementId)) {
    return;
  }

  let widgetConfig = deepMerge(initConfig, {
    ...DEFAULT_CONFIGS,
    customizations,
  });
  setCssVariables(widgetConfig, widgetConfig.customizations.generalLayout.darkModeDefault);
  widgetConfig = populateProductDetailsAndAttrsToGet(widgetConfig, fieldMappings);
  const widgetClient = getWidgetClient(widgetConfig, widgetType, widgetVersion);
  widgetClient.sendEvent(Actions.SESSION_INIT, {});
  return { widgetClient, widgetConfig };
};

type WidgetInitializer = (initConfig: WidgetConfig, fieldMappings: Record<string, string>, skipRender?: boolean)
    => WidgetClient | undefined;

interface WidgetRendererParam {
  config: WidgetConfig;
  client: WidgetClient;
  element: HTMLElement;
}
type WidgetRenderer = (param: WidgetRendererParam) => ReactNode;

export interface SurfaceRendererParam {
  config: WidgetConfig;
  client: WidgetClient;
}
export type SurfaceRenderer = (param: SurfaceRendererParam) => ReactNode;
export interface WidgetInitOptions {
  // Optional extra root, appended to document.body and mounted once per client, for widgets whose
  // several element roots share one chat surface (ai_assistant). It is tracked with the other render
  // roots, so rerender()/hideWidget()/disposeWidget() mount and unmount it like any of them.
  surface?: SurfaceRenderer;
}

const SURFACE_HOST_ID_PREFIX = 'vi_surface__';
const surfaceHosts = new WeakMap<WidgetClient, { host: HTMLElement; root: Root }>();
// Elements each client has rendered into, per client so one placement's rerender() can't make another's
// renderMissing() mount a second root on an element that is still mounted.
const rootElementsByClient = new WeakMap<WidgetClient, HTMLElement[]>();

const mountSurface = (client: WidgetClient, config: WidgetConfig, surface: SurfaceRenderer): Root => {
  const host = document.createElement('div');
  host.id = `${SURFACE_HOST_ID_PREFIX}${config.appSettings.placementId}`;
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(surface({ config, client }));
  // The client unmounts its roots on rerender()/disposeWidget(): take the host div down with the root.
  const surfaceRoot: Root = {
    render: (children: ReactNode): void => root.render(children),
    unmount: (): void => {
      root.unmount();
      host.remove();
      surfaceHosts.delete(client);
    },
  };
  surfaceHosts.set(client, { host, root: surfaceRoot });
  return surfaceRoot;
};

const getRenderElements = (config: WidgetConfig): NodeListOf<HTMLElement> => {
  const { cssSelector } = config.displaySettings;
  return document.body.querySelectorAll(cssSelector || `.ps-widget-${config.appSettings.placementId}`);
};

const getRenderElement = (config: WidgetConfig): HTMLElement | null => {
  const { cssSelector } = config.displaySettings;
  return document.body.querySelector(cssSelector || `.ps-widget-${config.appSettings.placementId}`);
};

const render = (
    client: WidgetClient,
    config: WidgetConfig,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
    onlyMissing = false,
    surface?: SurfaceRenderer,
): void => {
  if (!onlyMissing) {
    // Clear all existing render roots
    client.getRenderRoots().forEach((r) => r.unmount());
    rootElementsByClient.set(client, []);
    // Only now that the mounted components are gone: dropping the chat session earlier would leave them
    // pinned to disposed stores (and let a late render recreate one nobody disposes). The remount then
    // starts a fresh session (and re-restores from storage).
    resetChatSessionStore(client);
  }

  const rootElements = rootElementsByClient.get(client) ?? [];
  rootElementsByClient.set(client, rootElements);
  const roots: Root[] = onlyMissing ? [...client.getRenderRoots()] : [];

  if (isMultiRender) {
    const elements = getRenderElements(config);
    elements.forEach((element) => {
      if (rootElements.indexOf(element) < 0) {
        const root = createRoot(element);
        root.render(renderer({config, client, element}));
        rootElements.push(element);
        roots.push(root);
      }
    });
  } else {
    const element = getRenderElement(config);
    if (element && rootElements.indexOf(element) < 0) {
      const root = createRoot(element);
      root.render(renderer({ config, client, element }));
      rootElements.push(element);
      roots.push(root);
    }
  }

  // Elements the widget actually rendered; the surface is not an element, it only exists to serve them.
  const surfaceRoot = surfaceHosts.get(client)?.root;
  const hasElementRoots = roots.filter((r) => r !== surfaceRoot).length > 0;
  if (surface && hasElementRoots && !surfaceHosts.has(client)) {
    roots.push(mountSurface(client, config, surface));
  }
  if (!hasElementRoots && surfaceHosts.has(client)) {
    // Nothing is left for the surface to serve: take it down so an open drawer can't outlive its page.
    roots.splice(0).forEach((r) => r.unmount());
  }

  client.setRenderRoots(roots);
  client.markAsRendered(hasElementRoots);
};

export const initWidgetFactory = (
    widgetType: WidgetType,
    widgetVersion: string,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
    customizations: WidgetConfig['customizations'],
    options: WidgetInitOptions = {},
): WidgetInitializer => {
  return (initConfig, fieldMappings, skipRender) => {
    const result = init(initConfig, fieldMappings, widgetType, widgetVersion, customizations);
    if (!result) {
      return undefined;
    }

    const { widgetClient, widgetConfig } = result;
    widgetClient.rerender = (selector?: string): void => {
      // render() drops the client's shared chat session once its roots are unmounted, so the remount
      // starts fresh. Not done by renderMissing(), which keeps the existing roots.
      widgetClient.hideWidget();
      if (selector) {
        widgetConfig.displaySettings.cssSelector = selector;
      }
      render(widgetClient, widgetConfig, renderer, isMultiRender, false, options.surface);
    };
    widgetClient.renderMissing = (): void => {
      render(widgetClient, widgetConfig, renderer, isMultiRender, true, options.surface);
    };

    if (!skipRender) {
      render(widgetClient, widgetConfig, renderer, isMultiRender, false, options.surface);
    }

    return widgetClient;
  };
};

export const devInitWidget = async (
    widgetType: WidgetType,
    widgetVersion: string,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
    devConfigs: RecursivePartial<WidgetConfig>,
    fieldsMappingParam: Record<string, string>,
    shouldRetrieveFieldsMapping: boolean,
    window: Window,
    customizations: WidgetConfig['customizations'],
    options: WidgetInitOptions = {},
): Promise<void> => {
  let fieldsMapping = fieldsMappingParam;
  if (shouldRetrieveFieldsMapping) {
    // In dev there is no window.visenzeConfigs; treat devConfigs.appSettings.endpoint as the manual
    // endpoint (an explicit dev endpoint wins, otherwise `cloud` drives resolution).
    const devAppSettings = devConfigs.appSettings ?? {};
    const base = resolveBaseEndpoint(devAppSettings, devAppSettings.endpoint);
    const configPath = usesCloudPaths(devAppSettings, devAppSettings.endpoint) ? '/v2/widget/configs' : '/v2/widget-configs';
    const widgetConfigResponse = await fetch(`${base}${configPath}?app_key=${devAppSettings.appKey}`
        + `&placement_id=${devAppSettings.placementId}&return_fields_mappings=true`);
    const widgetConfigObject = await widgetConfigResponse.json();
    if (widgetConfigObject?.fields_mappings) {
      fieldsMapping = widgetConfigObject.fields_mappings;
    } else {
      console.warn('[dev] No fields_mappings in the widget-configs response, using devFieldMappings instead:', widgetConfigObject);
    }
  }

  const result = init(devConfigs as WidgetConfig, fieldsMapping, widgetType, widgetVersion, customizations);
  if (!result) {
    return;
  }

  const { widgetClient, widgetConfig } = result;
  render(widgetClient, widgetConfig, renderer, isMultiRender, false, options.surface);
  widgetClient.rerender = (selector?: string): void => {
    // See initWidgetFactory's rerender: render() resets the chat session after unmounting.
    widgetClient.hideWidget();
    if (selector) {
      widgetConfig.displaySettings.cssSelector = selector;
    }
    render(widgetClient, widgetConfig, renderer, isMultiRender, false, options.surface);
  };
  widgetClient.renderMissing = (): void => {
    render(widgetClient, widgetConfig, renderer, isMultiRender, true, options.surface);
  };
  window['widget'] = widgetClient;
};
