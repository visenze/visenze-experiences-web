import { createContext } from 'react';
import type { Facet, ProductType } from 'visearch-javascript-sdk';
import type { WidgetType, WidgetClient, WidgetConfig } from '../visenze-core';
import DEFAULT_CONFIGS from '../../default-configs';
import type { SortType } from './constants';
import getWidgetClient from '../client/product-search';
import type { SearchImage } from './image';
import type { BoxData, ProcessedProduct } from './product';

interface WidgetData extends WidgetConfig {
  productSearch: WidgetClient;
  fieldMappings?: Record<string, string>;
  widgetType?: WidgetType;
  version?: string;
  width?: number;
}

export interface WidgetResultContextValue {
  products?: ProductType[];
  image?: SearchImage;
  imageId?: string;
  productInfo?: ProcessedProduct;
  facets?: Facet[];
  productResults: ProcessedProduct[];
  metadata: Record<string, any>;
  autocompleteResults?: string[];
}

export interface CroppingContextValue {
  boxData?: BoxData;
  toggleCropMode?: () => void;
  setCroppingApply?: (data: BoxData) => void;
  setBoxData?: (data: BoxData) => void;
}

export interface FilterContextValue {
  setFilters: (filters: string[]) => void;
  setSortMode: (sort: SortType) => void;
  sortMode: SortType;
  filterNumber: number;
}

export const WidgetDataContext = createContext<WidgetData>({
  ...DEFAULT_CONFIGS,
  productSearch: getWidgetClient({
    config: DEFAULT_CONFIGS,
    widgetType: undefined,
    widgetDirectory: '/',
    deployTypeId: 0,
  }),
});
export const WidgetResultContext = createContext<WidgetResultContextValue>({
  productResults: [],
  metadata: {},
});
export const CroppingContext = createContext<CroppingContextValue>({});
export const WidgetFilterContext = createContext<FilterContextValue | undefined>(undefined);
