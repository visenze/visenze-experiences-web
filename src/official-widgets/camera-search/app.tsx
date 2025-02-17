import { type FC } from 'react';
import CameraSearch from './camera-search';
import './app.css';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { type AppProps, AppWrapper } from '../../common/components/app-wrapper';

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ widgetConfig, widgetClient }) => (
  <AppWrapper widgetConfig={widgetConfig}
              widgetClient={widgetClient}
              defaultTexts={DEFAULT_TEXTS}
              defaultCustomizations={DEFAULT_CUSTOMIZATIONS}
              enableCustomization={ENABLE_CUSTOMIZATION}>
    <CameraSearch />
  </AppWrapper>
);

export default App;
