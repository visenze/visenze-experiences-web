import { createRoot } from 'react-dom/client';
import { deepMerge, init } from '../../common/client/initialization';
import version from './version';
import { WidgetType } from '../../common/visenze-core';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import App from './app';

const getRenderElement = (configs: WidgetConfig): HTMLElement | null => {
  const { cssSelector } = configs.displaySettings;
  return document.body.querySelector(cssSelector || `.ps-widget-${configs.appSettings.placementId}`);
};

const render = (client: WidgetClient, fieldMappings: Record<string, string>, configs: WidgetConfig): void => {
  const element = getRenderElement(configs);
  if (!element) {
    throw new Error('Element not found');
  }
  const root = createRoot(element);
  root.render(<App productSearch={client} fieldMappings={fieldMappings} config={configs} element={element}></App>);
  client.setRenderRoots([root]);
};

const initWidget = (
  initConfig: WidgetConfig,
  fieldMappings: Record<string, string>,
  skipRender?: boolean,
): WidgetClient | undefined => {
  const result = init(initConfig, fieldMappings, WidgetType.RECOMMEND_ME, '/');
  if (!result) {
    return undefined;
  }

  const { widgetClient, config } = result;
  widgetClient.rerender = (): void => {
    render(widgetClient, fieldMappings, config);
  };

  if (!skipRender) {
    render(widgetClient, fieldMappings, config);
  }

  return widgetClient;
};

// eslint-disable-next-line func-names
(function (context: Window): void {
  const widgetType = `wigmix_${WidgetType.RECOMMEND_ME}`;
  context.visenzewigmixwidget = context.visenzewigmixwidget || {};
  context.visenzewigmixwidget[widgetType] = context.visenzewigmixwidget[widgetType] || {};
  context.visenzewigmixwidget[widgetType][version] = context.visenzewigmixwidget[widgetType][version] || {
    initWidget,
    deepMerge,
  };
  // @ts-expect-error expect undefined env
  // eslint-disable-next-line no-restricted-globals
}(typeof self !== 'undefined' ? self : this));
