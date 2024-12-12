import { IntlProvider } from 'react-intl';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { WidgetConfig, WidgetClient } from '../../common/visenze-core';
import ShadowWrapper from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';
import IconTriggeredGrid from './icon-triggered-grid';
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
    widgetTitle: 'You may also like',
    'errorMessage.part1': 'Sorry, something went wrong',
    'errorMessage.part2': 'Please refresh to try again',
    sort: 'Sort',
    filter: 'Filter',
    cancel: 'Cancel',
    back: 'Back',
    priceFilterTitle: 'Price',
    minPriceFilterInputLabel: 'Min price',
    maxPriceFilterInputLabel: 'Max price',
    minPriceFilterInputPlaceholder: 'Enter minimum price',
    maxPriceFilterInputPlaceholder: 'Enter maximum price',
    minPriceFilterInputError: 'Min price must be less than max price',
    maxPriceFilterInputError: 'Max price must be more than min price',
    categoryFilterTitle: 'Category',
    'sortType.relevance': 'Relevance',
    'sortType.highToLowPrice': 'High to low (Price)',
    'sortType.lowToHighPrice': 'Low to high (Price)',
  },
};

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
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.localization?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, DEFAULT_TEXTS, configInternal.customizations.localization?.text));
    setCssVariables(configInternal);
  }, [configInternal]);

  return (
    <WidgetDataContext.Provider value={{ ...configInternal, productSearch }}>
      <ShadowWrapper fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
        <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
          <IconTriggeredGrid config={configInternal} productSearch={productSearch} productId={productId} />
        </IntlProvider>
      </ShadowWrapper>
    </WidgetDataContext.Provider>
  );
};

export default App;
