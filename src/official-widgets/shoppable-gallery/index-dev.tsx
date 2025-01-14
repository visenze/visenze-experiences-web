import { WidgetType } from '../../common/visenze-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from '../../version';

// set to true to retrieve the fields mappings from the backend
const shouldRetrieveFieldsMapping = true;

devInitWidget(
    WidgetType.SHOPPABLE_GALLERY,
    version,
    ({ config, client, fieldMappings }) => <App productSearch={client} fieldMappings={fieldMappings} config={config}></App>,
    false,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
);
