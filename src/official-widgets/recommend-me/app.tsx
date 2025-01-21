import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import RecommendMe from './recommend-me';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts, type LanguagePack } from '../../common/locales/locale';
import { deepMerge, setCssVariables } from '../../common/client/initialization';

interface AppProps {
  config: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<string, string>;
  element: HTMLElement;
}

const DEFAULT_TEXTS: LanguagePack = {
  en: {
    widgetTitle: 'Personalize your recommendations',
    searchBarButton: 'Recommend Me',
    searchBarPlaceholder: 'an outfit to go with this',
    resultLoading1: 'Searching the latest trends...',
    resultLoading2: 'Finding the perfect look...',
    resultLoading3: 'Almost there...',
    resultRendering: 'Here\'s what I found for you',
    resultCarouselTitle: 'Results for',
  },
};

const App: FC<AppProps> = ({ config, fieldMappings, widgetClient, element }) => {
  const [configInternal, setConfigInternal] = useState(config);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(DEFAULT_TEXTS[DEFAULT_LOCALE]);
  const productId = element.dataset.pid ?? '';

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
    <WidgetDataContext.Provider value={{ ...configInternal, fieldMappings, widgetClient }}>
      <ShadowWrapper fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <RecommendMe config={configInternal} widgetClient={widgetClient} productId={productId}/>
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
