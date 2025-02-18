import { type FC, type ReactNode, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import ShadowWrapper from './shadow-wrapper';
import { deepMerge, setCssVariables } from '../client/initialization';
import { DEFAULT_LOCALE } from '../default-configs';
import { getLocaleTexts, type LanguagePack } from '../locales/locale';
import { WidgetDataContext } from '../types/contexts';
import type { WidgetClient, WidgetConfig } from '../wigmix-core';

export interface AppProps {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
}

export interface AppPropsWithReferenceElement extends AppProps {
  element: HTMLElement;
}

interface AppWrapperProps extends AppProps {
  defaultTexts: LanguagePack;
  defaultCustomizations: WidgetConfig['customizations'];
  enableCustomization: boolean;
  children: ReactNode;
}

export const AppWrapper: FC<AppWrapperProps> = ({
  widgetConfig,
  widgetClient,
  defaultTexts,
  defaultCustomizations,
  enableCustomization,
  children,
}) => {
  const [configInternal, setConfigInternal] = useState(widgetConfig);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState(defaultTexts[DEFAULT_LOCALE]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let { customizations } = widgetConfig;
    if (!enableCustomization || !customizations) {
      customizations = defaultCustomizations;
    }
    if (customizations?.generalLayout?.darkModeDefault) {
      setDarkMode(true);
    }
    setConfigInternal({
      ...widgetConfig,
      customizations,
    });

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
    widgetClient.registerDarkModeToggler(() => {
      setDarkMode((dm) => {
        setCssVariables(configInternal, !dm);
        return !dm;
      });
    });
  }, []);

  useEffect(() => {
    const localeFromConfig = configInternal.languageSettings.locale || configInternal.customizations.localization?.defaultLocale || DEFAULT_LOCALE;
    setLocale(localeFromConfig);
    setMessages(getLocaleTexts(localeFromConfig, defaultTexts, configInternal.customizations.localization?.text));
    setCssVariables(configInternal, darkMode);
  }, [configInternal]);

  return (
      <WidgetDataContext.Provider value={{ widgetConfig: configInternal, widgetClient, darkMode }}>
        <ShadowWrapper darkMode={darkMode} fontFamily={configInternal.customizations.generalLayout?.fontFamily}>
          <IntlProvider messages={messages} locale={locale.replace('_', '-')} defaultLocale='en'>
            {children}
          </IntlProvider>
        </ShadowWrapper>
      </WidgetDataContext.Provider>
  );
};
