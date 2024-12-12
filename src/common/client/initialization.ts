import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WidgetType, WidgetClient, WidgetConfig, RecursivePartial } from '../visenze-core';
import { DEFAULT_CONFIGS } from '../default-configs';
import getWidgetClient from './product-search';
import { DEFAULT_ENDPOINT } from '../constants';

export interface WidgetInitResult {
  widgetClient: WidgetClient;
  config: WidgetConfig;
  fieldMappings: Record<string, string>;
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

export const setCssVariables = (config: WidgetConfig): void => {
  if (config.customizations) {
    const { fonts, colours } = config.customizations;
    const root = document.querySelector(':root') as HTMLElement;

    for (const [deviceType, obj] of Object.entries(fonts)) {
      for (const [targetElement, font] of Object.entries(obj)) {
        root.style.setProperty(
          `--widget-${deviceType}-${targetElement}-fontSize`,
          font.fontSize.toString() + 'px',
        );
        root.style.setProperty(`--widget-${deviceType}-${targetElement}-fontWeight`, font.fontWeight.toString());
      }
    }

    for (const [colourType, obj] of Object.entries(colours)) {
      for (const [colourName, colourNameValue] of Object.entries(obj)) {
        root.style.setProperty(`--widget-${colourType}-${colourName}`, colourNameValue);
      }
    }
  }
};

/*
 * Populate product details with alias names in field mappings
 * Assign the alias names to attrs_to_get in searchSettings
 */
const populateProductDetailsAndAttrsToGet = (config: WidgetConfig, fieldMappings: Record<string, string>): WidgetConfig => {
  config.displaySettings.productDetails.mainImageUrl = fieldMappings['main_image_url'] || '';
  config.displaySettings.productDetails.productUrl = fieldMappings['product_url'] || '';
  config.displaySettings.productDetails.title = fieldMappings['title'] || '';
  config.displaySettings.productDetails.price = fieldMappings['price'] || '';
  config.displaySettings.productDetails.originalPrice = fieldMappings['original_price'] || '';
  config.displaySettings.productDetails.category = fieldMappings['category'] || '';
  config.displaySettings.productDetails.brand = fieldMappings['brand'] || '';
  config.displaySettings.productDetails.gender = fieldMappings['gender'] || '';
  config.displaySettings.productDetails.sizes = fieldMappings['sizes'] || '';
  config.displaySettings.productDetails.colors = fieldMappings['colors'] || '';
  config.searchSettings.attrs_to_get = Object.values(config.displaySettings.productDetails).filter(value => Boolean(value));

  return config;
};


export const init = (
  initConfig: WidgetConfig,
  fieldMappings: Record<string, string>,
  widgetType: WidgetType,
  widgetVersion: string,
): WidgetInitResult | undefined => {
  if (isPlacementSkippable(initConfig.appSettings.placementId)) {
    return;
  }

  let config = deepMerge(initConfig, DEFAULT_CONFIGS);
  setCssVariables(config);
  config = populateProductDetailsAndAttrsToGet(config, fieldMappings);
  const widgetClient = getWidgetClient(config, widgetType, widgetVersion);
  return { widgetClient, fieldMappings, config };
};

type WidgetInitializer = (initConfig: WidgetConfig, fieldMappings: Record<string, string>, skipRender?: boolean)
    => WidgetClient | undefined;

interface WidgetRendererParam {
  config: WidgetConfig;
  fieldMappings: Record<string, string>;
  client: WidgetClient;
  index: number;
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

const render = (
    client: WidgetClient,
    fieldMappings: Record<string, string>,
    config: WidgetConfig,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
): void => {
  const roots: Root[] = [];

  if (isMultiRender) {
    const elements = getRenderElements(config);
    elements.forEach((element, index) => {
      const root = createRoot(element);
      root.render(renderer({ config, fieldMappings, client, index, element }));
      roots.push(root);
    });
  } else {
    const element = getRenderElement(config);
    if (!element) {
      throw new Error('Element not found');
    }
    const root = createRoot(element);
    root.render(renderer({ config, fieldMappings, client, index: 0, element }));
    roots.push(root);
  }

  client.setRenderRoots(roots);
};

export const initWidgetFactory = (
    widgetType: WidgetType,
    widgetVersion: string,
    renderer: WidgetRenderer,
    isMultiRender: boolean,
): WidgetInitializer => {
  return (initConfig, fieldMappings, skipRender) => {
    const result = init(initConfig, fieldMappings, widgetType, widgetVersion);
    if (!result) {
      return undefined;
    }

    const { widgetClient, config } = result;
    widgetClient.rerender = (selector?: string): void => {
      widgetClient.hideWidget();
      if (selector) {
        config.displaySettings.cssSelector = selector;
      }
      render(widgetClient, fieldMappings, config, renderer, isMultiRender);
    };

    if (!skipRender) {
      render(widgetClient, fieldMappings, config, renderer, isMultiRender);
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
): Promise<void> => {
  let fieldsMapping = fieldsMappingParam;
  if (shouldRetrieveFieldsMapping) {
    const widgetConfigResponse = await fetch((devConfigs.appSettings?.endpoint || DEFAULT_ENDPOINT)
        + `/v2/widget-configs?app_key=${devConfigs.appSettings?.appKey}`
        + `&placement_id=${devConfigs.appSettings?.placementId}&return_fields_mappings=true`);
    const widgetConfigObject = await widgetConfigResponse.json();
    fieldsMapping = widgetConfigObject.fields_mappings;
  }

  const result = init(devConfigs as WidgetConfig, fieldsMapping, widgetType, widgetVersion);
  if (!result) {
    return;
  }

  const { widgetClient, config } = result;
  render(widgetClient, fieldsMapping, config, renderer, isMultiRender);
  widgetClient.rerender = (selector?: string): void => {
    widgetClient.hideWidget();
    if (selector) {
      config.displaySettings.cssSelector = selector;
    }
    render(widgetClient, fieldsMapping, config, renderer, isMultiRender);
  };
  window.widget = widgetClient;
};
