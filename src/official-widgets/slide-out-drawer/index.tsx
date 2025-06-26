import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { deepMerge, initWidgetFactory } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

// eslint-disable-next-line func-names
(function (context: Window): void {
  const widgetType = `wigmix_${WidgetType.SLIDE_OUT_DRAWER}`;
  context.visenzewigmixwidget = context.visenzewigmixwidget || {};
  context.visenzewigmixwidget[widgetType] = context.visenzewigmixwidget[widgetType] || {};
  context.visenzewigmixwidget[widgetType][version] = context.visenzewigmixwidget[widgetType][version] || {
    initWidget: initWidgetFactory(
        WidgetType.SLIDE_OUT_DRAWER,
        version,
        ({ config, client, element }) => (
            <App widgetConfig={config} widgetClient={client} element={element} />
        ),
        true,
        DEFAULT_CUSTOMIZATIONS,
    ),
    deepMerge,
  };
  // @ts-expect-error expect undefined env
  // eslint-disable-next-line no-restricted-globals
}(typeof self !== 'undefined' ? self : this));
