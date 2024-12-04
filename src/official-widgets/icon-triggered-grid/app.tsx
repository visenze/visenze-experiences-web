import { IntlProvider } from 'react-intl';
import type { FC } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import IconTriggeredGrid from './icon-triggered-grid';
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
  const productId = element.dataset.pid ?? '';

  return (
    <WidgetDataContext.Provider value={{ ...config, productSearch }}>
      <ShadowWrapper>
        <IntlProvider messages={messages} locale={locale} defaultLocale='en'>
          <IconTriggeredGrid config={config} productSearch={productSearch} productId={productId} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
