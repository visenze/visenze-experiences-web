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
import { DEFAULT_CONFIGS } from '../default-configs';
import getWidgetClient from './widget-client';
import { DEFAULT_ENDPOINT } from '../constants';

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
    };
    const colorCustomizations: Record<string, ColoredInterface | undefined> = {
      primary: config.customizations.generalLayout,
      buttonPrimary: config.customizations.buttons?.primary,
      buttonSecondary: config.customizations.buttons?.secondary,
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
  }
};

/*
 * Populates product details with alias names in field mappings and
 * assigns the alias names to attrs_to_get in searchSettings
 */
const populateProductDetailsAndAttrsToGet = (config: WidgetConfig, fieldMappings: Record<string, string>): WidgetConfig => {
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

const getRenderElements = (config: WidgetConfig): NodeListOf<HTMLElement> => {
  const { cssSelector } = config.displaySettings;
  return document.body.querySelectorAll(cssSelector || `.ps-widget-${config.appSettings.placementId}`);
};

const getRenderElement = (config: WidgetConfig): HTMLElement | null => {
  const { cssSelector } = config.displaySettings;
  return document.body.querySelector(cssSelector || `.ps-widget-${config.appSettings.placementId}`);
};

let rootElements: HTMLElement[] = [];

const render = (
    client: WidgetClient,
    config: WidgetConfig,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
    onlyMissing = false,
): void => {
  if (!onlyMissing) {
    // Clear all existing render roots
    client.getRenderRoots().forEach((r) => r.unmount());
    rootElements = [];
  }

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

  client.setRenderRoots(roots);
  client.markAsRendered(roots.length > 0);
};

export const initWidgetFactory = (
    widgetType: WidgetType,
    widgetVersion: string,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
    customizations: WidgetConfig['customizations'],
): WidgetInitializer => {
  return (initConfig, fieldMappings, skipRender) => {
    const result = init(initConfig, fieldMappings, widgetType, widgetVersion, customizations);
    if (!result) {
      return undefined;
    }

    const { widgetClient, widgetConfig } = result;
    widgetClient.rerender = (selector?: string): void => {
      widgetClient.hideWidget();
      if (selector) {
        widgetConfig.displaySettings.cssSelector = selector;
      }
      render(widgetClient, widgetConfig, renderer, isMultiRender);
    };
    widgetClient.renderMissing = (): void => {
      render(widgetClient, widgetConfig, renderer, isMultiRender, true);
    };

    if (!skipRender) {
      render(widgetClient, widgetConfig, renderer, isMultiRender);
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
): Promise<void> => {
  let fieldsMapping = fieldsMappingParam;
  if (shouldRetrieveFieldsMapping) {
    const widgetConfigResponse = await fetch((devConfigs.appSettings?.endpoint || DEFAULT_ENDPOINT)
        + `/v2/widget-configs?app_key=${devConfigs.appSettings?.appKey}`
        + `&placement_id=${devConfigs.appSettings?.placementId}&return_fields_mappings=true`);
    const widgetConfigObject = await widgetConfigResponse.json();
    fieldsMapping = widgetConfigObject.fields_mappings;
  }

  const result = init(devConfigs as WidgetConfig, fieldsMapping, widgetType, widgetVersion, customizations);
  if (!result) {
    return;
  }

  const { widgetClient, widgetConfig } = result;
  render(widgetClient, widgetConfig, renderer, isMultiRender);
  widgetClient.rerender = (selector?: string): void => {
    widgetClient.hideWidget();
    if (selector) {
      widgetConfig.displaySettings.cssSelector = selector;
    }
    render(widgetClient, widgetConfig, renderer, isMultiRender);
  };
  widgetClient.renderMissing = (): void => {
    render(widgetClient, widgetConfig, renderer, isMultiRender, true);
  };
  window['widget'] = widgetClient;
};
