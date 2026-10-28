import type { FC } from 'react';
import './app.css';
import AssistantSurface from './AssistantSurface';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { type AppProps, AppWrapper } from '../../common/components/app-wrapper';

// The widget's body-hosted chat surface root (see WidgetInitOptions.surface): the same wrapper chain
// as an element root, around the one shared chat drawer.
const AssistantSurfaceApp: FC<AppProps> = ({ widgetConfig, widgetClient }) => (
  <AppWrapper widgetConfig={widgetConfig}
              widgetClient={widgetClient}
              defaultTexts={DEFAULT_TEXTS}
              defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
              enableCustomization>
    <AssistantSurface />
  </AppWrapper>
);

export default AssistantSurfaceApp;
