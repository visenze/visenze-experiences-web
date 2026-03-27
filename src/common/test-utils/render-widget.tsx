import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { RootContext } from '../components/shadow-wrapper';
import { WidgetDataContext } from '../types/contexts';
import type { WidgetClient, WidgetConfig } from '../wigmix-core';

interface RenderWidgetOptions extends Omit<RenderOptions, 'wrapper'> {
  widgetConfig: WidgetConfig;
  widgetClient: WidgetClient;
  darkMode?: boolean;
  locale?: string;
  messages: Record<string, string>;
  rootElement?: HTMLElement;
}

/**
 * Renders a widget component wrapped in the full provider stack
 * (RootContext, WidgetDataContext, IntlProvider).
 *
 * Usage:
 * ```tsx
 * const result = renderWidget(<BuyTheLook productId="my-pid" />, {
 *   widgetConfig,
 *   widgetClient,
 *   messages: texts['en'],
 * });
 * ```
 */
const renderWidget = (
  ui: ReactNode,
  {
    widgetConfig,
    widgetClient,
    darkMode = false,
    locale = 'en',
    messages,
    rootElement,
    ...renderOptions
  }: RenderWidgetOptions,
): RenderResult => {
  const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <RootContext.Provider value={rootElement ?? document.body}>
      <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode, locale }}>
        <IntlProvider messages={messages} locale={locale} defaultLocale='en'>
          {children}
        </IntlProvider>
      </WidgetDataContext.Provider>
    </RootContext.Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export default renderWidget;
