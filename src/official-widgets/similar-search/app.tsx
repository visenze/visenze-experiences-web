import { IntlProvider } from 'react-intl';
import type { FC } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import SimilarSearch from './similar-search';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts } from '../../common/locales/locale';

interface AppProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  element: HTMLElement;
  index: number;
}

const App: FC<AppProps> = ({ config, productSearch, element }) => {
  const locale = config.languageSettings.locale || config.customizations.languageSettings?.defaultLocale || DEFAULT_LOCALE;
  const messages = getLocaleTexts(locale, config.languageSettings.text, config.customizations.languageSettings?.text);

  return (
    <WidgetDataContext.Provider value={{ ...config, productSearch }}>
      <ShadowWrapper>
        <IntlProvider messages={messages} locale={locale} defaultLocale='en'>
          <SimilarSearch config={config} productSearch={productSearch} element={element} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
