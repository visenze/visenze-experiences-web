import App from './app';
import AssistantSurfaceApp from './AssistantSurfaceApp';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import { devInitWidget } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

devInitWidget(
    WidgetType.AI_ASSISTANT,
    version,
    ({ config, client, element }) => (
        <App widgetClient={client} widgetConfig={config} element={element} />
    ),
    true,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
    {
      surface: ({ config, client }) => (
          <AssistantSurfaceApp widgetClient={client} widgetConfig={config} />
      ),
    },
);
