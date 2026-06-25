import type { WidgetClient } from './common/wigmix-core';

declare global {
  interface Window {
    visenzeConfigs?: Record<string, { appSettings?: { endpoint?: string; msApiId?: string | number } }>;
    visenzeWidgets?: Record<string, WidgetClient>;
    visenzewigmixwidget?: Record<string, Record<string, any>>;
    [key: string]: any;
  }
}
