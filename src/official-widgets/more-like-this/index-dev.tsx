import { WidgetType } from '../../common/wigmix-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from '../../version';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

// set to true to retrieve the fields mappings from the backend
const shouldRetrieveFieldsMapping = true;

devInitWidget(
    WidgetType.MORE_LIKE_THIS,
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
