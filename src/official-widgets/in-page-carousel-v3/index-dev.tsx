import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { devConfigs, devFieldMappings, shouldRetrieveFieldsMapping } from './dev-configs';
import { devInitWidget } from '../../common/client/initialization';
import { WidgetType } from '../../common/wigmix-core';
import version from '../../version';

devInitWidget(
  WidgetType.IN_PAGE_CAROUSEL_V3,
  version,
  ({ config, client, element }) => <App widgetClient={client} widgetConfig={config} element={element} />,
  false,
  devConfigs,
  devFieldMappings,
  shouldRetrieveFieldsMapping,
  window,
  DEFAULT_CUSTOMIZATIONS,
);
