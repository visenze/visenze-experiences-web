import App from './app';
import AssistantSurfaceApp from './AssistantSurfaceApp';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { deepMerge, initWidgetFactory } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

// eslint-disable-next-line func-names
(function (context: Window): void {
  const widgetType = `wigmix_${WidgetType.AI_ASSISTANT}`;
  context.visenzewigmixwidget = context.visenzewigmixwidget || {};
  context.visenzewigmixwidget[widgetType] = context.visenzewigmixwidget[widgetType] || {};
  context.visenzewigmixwidget[widgetType][version] = context.visenzewigmixwidget[widgetType][version] || {
    initWidget: initWidgetFactory(
        WidgetType.AI_ASSISTANT,
        version,
        ({ config, client, element }) => (
            <App widgetClient={client} widgetConfig={config} element={element} />
        ),
        true,
        DEFAULT_CUSTOMIZATIONS,
        {
          surface: ({ config, client }) => (
              <AssistantSurfaceApp widgetClient={client} widgetConfig={config} />
          ),
        },
    ),
    deepMerge,
  };
  // @ts-expect-error expect undefined env
  // eslint-disable-next-line no-restricted-globals
}(typeof self !== 'undefined' ? self : this));
