import { type FC, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import CameraSearch from './camera-search';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts, type LanguagePack } from '../../common/locales/locale';
import { deepMerge, setCssVariables } from '../../common/client/initialization';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';

interface AppProps {
  config: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<string, string>;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    uploadScreenTitle: "SHOW US WHAT YOU'RE LOOKING FOR",
    resultScreenTitle: "HERE'S WHAT WE FOUND",
    dragImageToSearch: 'drag an image to search or click to browse',
    tapToSearchImage: 'tap here to search an image',
    tapProductGallery: 'or tap our trending product gallery below',
    useCamera: 'USE CAMERA',
    searchBarPlaceholder: 'Type here to refine your results...',
    previousViews: 'Previous views',
  },
};

// Set to true to enable customization via WidgetConfig
const ENABLE_CUSTOMIZATION = true;

const App: FC<AppProps> = ({ config, fieldMappings, widgetClient }) => {
  const [configInternal, setConfigInternal] = useState(config);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(DEFAULT_TEXTS[DEFAULT_LOCALE]);

  widgetClient.updateConfig = (configOverride, isPartial): void => {
    if (!ENABLE_CUSTOMIZATION) {
      return;
    }
    if (configOverride) {
      if (isPartial) {
        setConfigInternal(deepMerge(configOverride, config));
      } else {
        setConfigInternal((c) => ({
          ...c,
          customizations: configOverride.customizations,
        }));
      }
    }
  };

  useEffect(() => {
    if (!ENABLE_CUSTOMIZATION || !config.customizations) {
      setConfigInternal({
        ...config,
        customizations: DEFAULT_CUSTOMIZATIONS,
      });
    }
  }, []);

  useEffect(() => {
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.localization?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, DEFAULT_TEXTS, configInternal.customizations.localization?.text));
    setCssVariables(configInternal);
  }, [configInternal]);

  return (
    <WidgetDataContext.Provider value={{ widgetConfig: configInternal, fieldMappings, widgetClient }}>
      <ShadowWrapper fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <CameraSearch config={configInternal} widgetClient={widgetClient} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
