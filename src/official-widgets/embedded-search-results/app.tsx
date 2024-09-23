import type { FC } from 'react';
import { IntlProvider } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { WidgetType } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import EmbeddedSearchResults from './embedded-search-results';
import version from './version';
import './app.css';
import { DEFAULT_LOCALE } from '../../common/default-configs';
import { getLocaleTexts } from '../../common/locales/locale';

interface AppProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  fieldMappings: Record<any, any>;
}

const App: FC<AppProps> = ({ config, fieldMappings, productSearch }) => {
  const locale = config.customizations.languageSettings.locale || config.languageSettings.locale || DEFAULT_LOCALE;
  const messages = getLocaleTexts(config.customizations.languageSettings.text, locale)
    || getLocaleTexts(config.languageSettings.text, locale);
  const widgetType = WidgetType.EMBEDDED_SEARCH_RESULTS;

  return (
    <WidgetDataContext.Provider value={{ ...config, fieldMappings, productSearch, widgetType, version }}>
      <ShadowWrapper>
        <IntlProvider messages={messages} locale={locale} defaultLocale='en'>
          <EmbeddedSearchResults config={config} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
