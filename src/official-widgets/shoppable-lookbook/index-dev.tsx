import { WidgetType } from '../../common/wigmix-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import App from './app';
import version from '../../version';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

devInitWidget(
    WidgetType.SHOPPABLE_LOOKBOOK,
    version,
    ({ config, client, element }) => (
        <App widgetClient={client} widgetConfig={config} element={element} />
    ),
    false,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
