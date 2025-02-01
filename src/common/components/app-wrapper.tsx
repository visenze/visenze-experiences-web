import { type FC, type ReactNode, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import ShadowWrapper from './shadow-wrapper';
import { deepMerge, setCssVariables } from '../client/initialization';
import { DEFAULT_LOCALE } from '../default-configs';
import { getLocaleTexts, type LanguagePack } from '../locales/locale';
import { WidgetDataContext } from '../types/contexts';
import type { WidgetClient, WidgetConfig } from '../wigmix-core';

interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  fieldMappings: Record<string, string>;
  defaultTexts: LanguagePack;
  defaultCustomizations: WidgetConfig['customizations'];
  enableCustomization: boolean;
  children: ReactNode;
}

const AppWrapper: FC<AppProps> = ({
  widgetConfig,
  fieldMappings,
  widgetClient,
  defaultTexts,
  defaultCustomizations,
  enableCustomization,
  children,
}) => {
  const [configInternal, setConfigInternal] = useState(widgetConfig);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(defaultTexts[DEFAULT_LOCALE]);

  useEffect(() => {
    if (!enableCustomization || !widgetConfig.customizations) {
      setConfigInternal({
        ...widgetConfig,
        customizations: defaultCustomizations,
      });
    }

    widgetClient.registerConfigUpdater((configOverride, isPartial) => {
      if (!enableCustomization) {
        return;
      }
      if (configOverride) {
        if (isPartial) {
          setConfigInternal(deepMerge(configOverride, widgetConfig));
        } else {
          setConfigInternal((c) => ({
            ...c,
            customizations: configOverride.customizations,
          }));
        }
      }
    });
  }, []);

  useEffect(() => {
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.localization?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, defaultTexts, configInternal.customizations.localization?.text));
    setCssVariables(configInternal);
  }, [configInternal]);

  return (
      <WidgetDataContext.Provider value={{ widgetConfig: configInternal, fieldMappings, widgetClient }}>
        <ShadowWrapper fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
          <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
            {children}
          </IntlProvider>
        </ShadowWrapper>
      </WidgetDataContext.Provider>
  );
};

export default AppWrapper;
