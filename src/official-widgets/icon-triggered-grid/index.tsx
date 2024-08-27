import version from './version';
import { deepMerge, initWidgetFactory } from '../../common/client/initialization';
import { WidgetType } from '../../common/visenze-core';
import App from './app';

// eslint-disable-next-line func-names
(function (context: Window): void {
  const widgetType = `wigmix_${WidgetType.ICON_TRIGGERED_GRID}`;
  context.visenzewigmixwidget = context.visenzewigmixwidget || {};
  context.visenzewigmixwidget[widgetType] = context.visenzewigmixwidget[widgetType] || {};
  context.visenzewigmixwidget[widgetType][version] = context.visenzewigmixwidget[widgetType][version] || {
    initWidget: initWidgetFactory(
        WidgetType.ICON_TRIGGERED_GRID,
        version,
        ({ config, client, index, element }) => <App config={config} productSearch={client} index={index} element={element}></App>,
        true,
    ),
    deepMerge,
  };
  // @ts-expect-error expect undefined env
  // eslint-disable-next-line no-restricted-globals
}(typeof self !== 'undefined' ? self : this));
