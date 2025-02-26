import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import { devInitWidget } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

devInitWidget(
    WidgetType.SEARCH_RESULTS_PAGE,
    version,
    ({ config, client }) => (
        <App widgetClient={client} widgetConfig={config} />
    ),
    false,
    devConfigs,
    devFieldMappings,
    shouldRetrieveFieldsMapping,
    window,
    DEFAULT_CUSTOMIZATIONS,
);
