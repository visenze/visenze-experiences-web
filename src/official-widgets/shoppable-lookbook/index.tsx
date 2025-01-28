import { deepMerge, initWidgetFactory } from '../../common/client/initialization';
import version from '../../version';
import { WidgetType } from '../../common/wigmix-core';
import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

// eslint-disable-next-line func-names
(function (context: Window): void {
  const widgetType = `wigmix_${WidgetType.SHOPPABLE_LOOKBOOK}`;
  context.visenzewigmixwidget = context.visenzewigmixwidget || {};
  context.visenzewigmixwidget[widgetType] = context.visenzewigmixwidget[widgetType] || {};
  context.visenzewigmixwidget[widgetType][version] = context.visenzewigmixwidget[widgetType][version] || {
    initWidget: initWidgetFactory(
        WidgetType.SHOPPABLE_LOOKBOOK,
        version,
        ({ config, client, fieldMappings, element }) => (
            <App widgetClient={client} fieldMappings={fieldMappings} widgetConfig={config} element={element} />
        ),
        false,
        DEFAULT_CUSTOMIZATIONS,
    ),
    deepMerge,
  };
  // @ts-expect-error expect undefined env
  // eslint-disable-next-line no-restricted-globals
}(typeof self !== 'undefined' ? self : this));
