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
    WidgetType.SHOP_THE_LOOK,
    version,
    ({ config, client, fieldMappings, element }) => <App productSearch={client} fieldMappings={fieldMappings} config={config} element={element}></App>,
    false,
    devConfigs,
    devFieldMappings,
    customCss,
    shouldRetrieveFieldsMapping,
    window,
);
