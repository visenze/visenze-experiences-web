import { WidgetType } from '../../common/visenze-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from './version';

const customCss = `
/* Insert the custom CSS here */
`;

// set to true to retrieve the fields mappings from the backend
const shouldRetrieveFieldsMapping = true;

devInitWidget(
    WidgetType.SEARCH_BAR,
    version,
    ({ config, client, fieldMappings }) => <App productSearch={client} fieldMappings={fieldMappings} config={config}></App>,
    false,
    devConfigs,
    devFieldMappings,
    customCss,
    shouldRetrieveFieldsMapping,
    window,
);
