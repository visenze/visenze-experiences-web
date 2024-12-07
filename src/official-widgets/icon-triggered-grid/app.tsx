import { IntlProvider } from 'react-intl';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import IconTriggeredGrid from './icon-triggered-grid';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts } from '../../common/locales/locale';
import { deepMerge } from '../../common/client/initialization';

interface AppProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  element: HTMLElement;
  index: number;
}

const App: FC<AppProps> = ({ config, productSearch, element }) => {
  const [configInternal, setConfigInternal] = useState(config);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const productId = element.dataset.pid ?? '';

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
    setMessages(getLocaleTexts(localeFromConfig, configInternal.languageSettings.text, configInternal.customizations.languageSettings?.text));
  }, [configInternal]);

  return (
    <WidgetDataContext.Provider value={{ ...configInternal, productSearch }}>
      <ShadowWrapper>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <IconTriggeredGrid config={configInternal} productSearch={productSearch} productId={productId} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
