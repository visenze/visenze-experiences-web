import { WidgetType } from '../../common/wigmix-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import App from './app';
import version from '../../version';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

devInitWidget(
    WidgetType.EMBEDDED_GRID,
    version,
    ({ config, client, fieldMappings, element }) => (
        <App widgetClient={client} fieldMappings={fieldMappings} widgetConfig={config} element={element} />
    ),
    false,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
