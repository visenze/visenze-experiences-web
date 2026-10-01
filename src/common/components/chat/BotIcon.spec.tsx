import { render } from '@testing-library/react';
import BotIcon from './BotIcon';
import { DEFAULT_CUSTOMIZATIONS } from '../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';
import type { Icon } from '../../wigmix-core';

const LOGO_URL = 'https://example.com/brand-logo.svg';

const renderBotIcon = (botIcon?: Partial<Icon>, darkMode = false): ReturnType<typeof render> => {
  const widgetConfig = createWidgetConfig({
    ...DEFAULT_CUSTOMIZATIONS,
    chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, botIcon },
  });
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher');
  return render(
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode, locale: 'en' }}>
      <BotIcon />
    </WidgetDataContext.Provider>,
  );
};

describe('BotIcon', () => {
  it('renders the default sparkle icon when no botIcon url is configured', () => {
    const { container } = renderBotIcon();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders the configured logo as-is when no color is set', () => {
    const { container } = renderBotIcon({ url: LOGO_URL });
    expect(container.querySelector('svg')).toBeNull();
    const logo = container.querySelector<HTMLElement>(`[style*="${LOGO_URL}"]`);
    expect(logo?.style.backgroundImage).toBe(`url(${LOGO_URL})`);
  });

  it('tints the configured logo with color, or colorDark in dark mode', () => {
    const icon = { url: LOGO_URL, color: 'rgb(255, 0, 0)', colorDark: 'rgb(0, 0, 255)' };

    const light = renderBotIcon(icon).container.querySelector<HTMLElement>(`[style*="${LOGO_URL}"]`);
    expect(light?.style.backgroundColor).toBe('rgb(255, 0, 0)');

    const dark = renderBotIcon(icon, true).container.querySelector<HTMLElement>(`[style*="${LOGO_URL}"]`);
    expect(dark?.style.backgroundColor).toBe('rgb(0, 0, 255)');
  });
});
