import { WidgetType } from '../../common/visenze-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from '../../version';

// set to true to retrieve the fields mappings from the backend
const shouldRetrieveFieldsMapping = true;

devInitWidget(
    WidgetType.ICON_TRIGGERED_GRID,
    version,
    ({ config, client, index, element, fieldMappings }) => <App config={config} fieldMappings={fieldMappings} widgetClient={client} index={index} element={element}></App>,
    true,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
);
