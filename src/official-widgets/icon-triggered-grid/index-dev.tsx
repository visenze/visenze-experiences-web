import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import { devInitWidget } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

devInitWidget(
    WidgetType.ICON_TRIGGERED_GRID,
    version,
    ({ config, client, element }) => (
        <App widgetConfig={config} widgetClient={client} element={element} />
    ),
    true,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
