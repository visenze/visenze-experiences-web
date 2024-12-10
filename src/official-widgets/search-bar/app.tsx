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
import { deepMerge } from '../../common/client/initialization';

interface AppProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  fieldMappings: Record<any, any>;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    searchBarPlaceholder: 'What are you looking for?',
    'searchBar.uploadScreenTitle.part1': 'SHOW US WHAT',
    'searchBar.uploadScreenTitle.part2': "YOU'RE LOOKING FOR",
    'searchBar.dragImageToSearch.part1': 'drag an image to',
    'searchBar.dragImageToSearch.part2': 'search or',
    'searchBar.dragImageToSearch.part3': 'click to browse',
    'searchBar.tapToSearchImage.part1': 'tap here to',
    'searchBar.tapToSearchImage.part2': 'search an image',
    'searchBar.tapProductGallery.part1': 'or tap our trending',
    'searchBar.tapProductGallery.part2': 'product gallery below',
  },
};

const App: FC<AppProps> = ({ config, fieldMappings, productSearch }) => {
  const [configInternal, setConfigInternal] = useState(config);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, string>>({});

  productSearch.updateConfig = (configOverride, isPartial): void => {
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
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.languageSettings?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, DEFAULT_TEXTS, configInternal.customizations.languageSettings?.text));
  }, [configInternal]);

  return (
    <WidgetDataContext.Provider value={{ ...configInternal, fieldMappings, productSearch }}>
      <ShadowWrapper>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <SearchBar config={configInternal} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
