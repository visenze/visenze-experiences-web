import type { FC } from 'react';
import { IntlProvider } from 'react-intl';
import type { WidgetClient, WidgetConfig } from '../../common/visenze-core';
import { WidgetType } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import MoreLikeThis from './more-like-this';
import version from './version';
import './app.css';

interface AppProps {
  config: WidgetConfig;
  productSearch: WidgetClient;
  fieldMappings: Record<string, string>;
  element: HTMLElement;
}

const App: FC<AppProps> = ({ config, fieldMappings, productSearch, element }) => {
  const locale = config.languageSettings.locale || 'en';
  const messages = config.languageSettings.text[locale];
  const widgetType = WidgetType.MORE_LIKE_THIS;
  const productId = element.dataset.pid ?? '';

  return (
    <WidgetDataContext.Provider value={{ ...config, fieldMappings, productSearch, widgetType, version }}>
      <ShadowWrapper>
        <IntlProvider messages={messages} locale={locale} defaultLocale='en'>
          <MoreLikeThis config={config} productSearch={productSearch} productId={productId}/>
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
