import { deepMerge, initWidgetFactory } from '../../common/client/initialization';
import version from '../../version';
import { WidgetType } from '../../common/visenze-core';
import App from './app';

// eslint-disable-next-line func-names
(function (context: Window): void {
  const widgetType = `wigmix_${WidgetType.SHOP_THE_LOOK}`;
  context.visenzewigmixwidget = context.visenzewigmixwidget || {};
  context.visenzewigmixwidget[widgetType] = context.visenzewigmixwidget[widgetType] || {};
  context.visenzewigmixwidget[widgetType][version] = context.visenzewigmixwidget[widgetType][version] || {
    initWidget: initWidgetFactory(
        WidgetType.SHOP_THE_LOOK,
        version,
        ({ config, client, fieldMappings, element }) => <App productSearch={client} fieldMappings={fieldMappings} config={config} element={element}></App>,
        false,
    ),
    deepMerge,
  };
  // @ts-expect-error expect undefined env
  // eslint-disable-next-line no-restricted-globals
}(typeof self !== 'undefined' ? self : this));
