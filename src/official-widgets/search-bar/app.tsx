import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import SearchBar from './search-bar';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts, type LanguagePack } from '../../common/locales/locale';
import { deepMerge, setCssVariables } from '../../common/client/initialization';

interface AppProps {
  config: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<any, any>;
  element: HTMLElement;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    searchBarPlaceholder: 'What are you looking for?',
    uploadScreenTitle: "SHOW US WHAT YOU'RE LOOKING FOR",
    dragImageToSearch: 'drag an image to search or click to browse',
    tapToSearchImage: 'tap here to search an image',
    tapProductGallery: 'or tap our trending product gallery below',
  },
};

const App: FC<AppProps> = ({ config, fieldMappings, widgetClient, element }) => {
  const [configInternal, setConfigInternal] = useState(config);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(DEFAULT_TEXTS[DEFAULT_LOCALE]);
  const textQuery = element.dataset.text ?? '';
  const imUrl = element?.dataset.url ?? '';

  widgetClient.updateConfig = (configOverride, isPartial): void => {
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
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.localization?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, DEFAULT_TEXTS, configInternal.customizations.localization?.text));
    setCssVariables(configInternal);
  }, [configInternal]);

  return (
    <WidgetDataContext.Provider value={{ widgetConfig: configInternal, fieldMappings, widgetClient }}>
      <ShadowWrapper fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <SearchBar config={configInternal} textQuery={textQuery} imUrl={imUrl} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
