import { WidgetType } from '../../common/wigmix-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import App from './app';
import version from '../../version';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

devInitWidget(
    WidgetType.SIMILAR_SEARCH,
    version,
    ({ config, client, element, fieldMappings }) => (
        <App widgetConfig={config} fieldMappings={fieldMappings} widgetClient={client} element={element} />
    ),
    true,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
