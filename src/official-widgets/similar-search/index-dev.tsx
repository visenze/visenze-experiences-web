import { WidgetType } from '../../common/visenze-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from '../../version';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

// set to true to retrieve the fields mappings from the backend
const shouldRetrieveFieldsMapping = true;

devInitWidget(
    WidgetType.SIMILAR_SEARCH,
    version,
    ({ config, client, index, element, fieldMappings }) => <App config={config} fieldMappings={fieldMappings} widgetClient={client} index={index} element={element}></App>,
    true,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
