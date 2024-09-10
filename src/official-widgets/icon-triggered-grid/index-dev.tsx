import { WidgetType } from '../../common/visenze-core';
import { devInitWidget } from '../../common/client/initialization';
import { devConfigs, devFieldMappings } from './dev-configs';
import App from './app';
import version from './version';

const customCss = `
/* Insert the custom CSS here */
`;

const initConfig = {
  ...devConfigs,
  customizations: {
    ...devConfigs.customizations,
    customCss,
  },
};

devInitWidget(
    WidgetType.ICON_TRIGGERED_GRID,
    version,
    ({ config, client, index, element }) => <App config={config} productSearch={client} index={index} element={element}></App>,
    true,
    initConfig,
    devFieldMappings,
    window,
);
