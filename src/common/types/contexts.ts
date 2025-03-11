import { createContext } from 'react';
import { WidgetType, type WidgetClient, type WidgetConfig } from '../wigmix-core';
import { DEFAULT_CONFIGS, DEFAULT_LOCALE } from '../default-configs';
import getWidgetClient from '../client/widget-client';
import type { BoxData } from './product';

interface WidgetData {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  darkMode: boolean;
  locale: string;
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
  locale: DEFAULT_LOCALE,
});

export const CroppingContext = createContext<CroppingContextValue>({
  selectedHotspot: -1,
  setSelectedHotspot: () => {},
});
