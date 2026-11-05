import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import { devInitWidget } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

devInitWidget(
    WidgetType.SHOP_THE_LOOK_V2,
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
