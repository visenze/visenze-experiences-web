import { IntlProvider } from 'react-intl';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import SimilarSearch from './similar-search';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts, type LanguagePack } from '../../common/locales/locale';
import { deepMerge, setCssVariables } from '../../common/client/initialization';

interface AppProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  element: HTMLElement;
  index: number;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'MORE LIKE THIS',
    searchBarPlaceholder: 'Type here to refine your results...',
    previousViews: 'Previous views',
  },
};

const App: FC<AppProps> = ({ config, productSearch, element }) => {
  const [configInternal, setConfigInternal] = useState(config);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(DEFAULT_TEXTS[DEFAULT_LOCALE]);

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
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.localization?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, DEFAULT_TEXTS, configInternal.customizations.localization?.text));
    setCssVariables(configInternal);
  }, [configInternal]);

  return (
    <WidgetDataContext.Provider value={{ ...configInternal, productSearch }}>
      <ShadowWrapper fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <SimilarSearch config={configInternal} productSearch={productSearch} element={element} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
