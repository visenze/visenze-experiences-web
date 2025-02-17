import { createContext } from 'react';
import type { Facet, ProductType } from 'visearch-javascript-sdk';
import { WidgetType, type WidgetClient, type WidgetConfig } from '../wigmix-core';
import { DEFAULT_CONFIGS } from '../default-configs';
import getWidgetClient from '../client/widget-client';
import type { SearchImage } from './image';
import type { BoxData, ProcessedProduct } from './product';

interface WidgetData {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  darkMode: boolean;
}

interface WidgetResultContextValue {
  productTypes?: ProductType[];
  image?: SearchImage;
  imageId?: string;
  productInfo?: ProcessedProduct;
  facets?: Facet[];
  productResults: ProcessedProduct[];
  metadata: Record<string, any>;
  autocompleteResults?: string[];
}

interface CroppingContextValue {
  selectedHotspot: number;
  setSelectedHotspot: (selectedHotspot: number) => void;
  boxData?: BoxData;
  setBoxData?: (data: BoxData) => void;
}

export const WidgetDataContext = createContext<WidgetData>({
  widgetConfig: DEFAULT_CONFIGS,
  widgetClient: getWidgetClient(DEFAULT_CONFIGS, WidgetType.CAMERA_SEARCH, '0.0.0'),
  darkMode: false,
});

export const WidgetResultContext = createContext<WidgetResultContextValue>({
  productResults: [],
  metadata: {},
});

export const CroppingContext = createContext<CroppingContextValue>({
  selectedHotspot: -1,
  setSelectedHotspot: () => {},
});
