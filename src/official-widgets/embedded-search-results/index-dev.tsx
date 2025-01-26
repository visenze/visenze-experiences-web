import { WidgetType } from '../../common/visenze-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from '../../version';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

// set to true to retrieve the fields mappings from the backend
const shouldRetrieveFieldsMapping = true;

devInitWidget(
    WidgetType.EMBEDDED_SEARCH_RESULTS,
    version,
    ({ config, client, fieldMappings, element }) => <App widgetClient={client} fieldMappings={fieldMappings} config={config} element={element}></App>,
    false,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
