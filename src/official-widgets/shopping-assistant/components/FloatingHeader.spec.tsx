import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import FloatingHeader from './FloatingHeader';
import type { UseChatResult } from '../../../common/components/chat/use-chat';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from '../default-config';

describe('FloatingHeader', () => {
  const baseChat = {
    speechOutputEnabled: false,
    isVoiceReadingEnabled: false,
    toggleVoiceReading: jest.fn(),
  } as unknown as UseChatResult;

  const renderHeader = (chat: UseChatResult, onNewChat = jest.fn(), onMinimize = jest.fn()): ReturnType<typeof render> => render(
    <IntlProvider locale='en' messages={DEFAULT_TEXTS['en']}>
      <FloatingHeader darkMode={false} customizations={DEFAULT_CUSTOMIZATIONS} chat={chat} onNewChat={onNewChat} onMinimize={onMinimize} titleId='title-id' />
    </IntlProvider>,
  );

  it('renders the title and calls onNewChat/onMinimize', () => {
    const onNewChat = jest.fn();
    const onMinimize = jest.fn();
    const { getByText, getByLabelText } = renderHeader(baseChat, onNewChat, onMinimize);

    expect(getByText(DEFAULT_TEXTS['en']['widgetTitle'])).toBeTruthy();

    fireEvent.click(getByLabelText(DEFAULT_TEXTS['en']['a11yStartNewChat']));
    expect(onNewChat).toHaveBeenCalledTimes(1);

    fireEvent.click(getByLabelText(DEFAULT_TEXTS['en']['a11yMinimizeShoppingAssistant']));
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it('omits the speaker toggle when speech output is unavailable', () => {
    const { queryByLabelText } = renderHeader(baseChat);
    expect(queryByLabelText(DEFAULT_TEXTS['en']['a11yEnableVoiceReading'])).toBeNull();
  });

  it('shows a directly-clickable speaker toggle when speech output is enabled', () => {
    const toggleVoiceReading = jest.fn();
    const chat = { ...baseChat, speechOutputEnabled: true, toggleVoiceReading } as UseChatResult;
    const { getByLabelText } = renderHeader(chat);

    fireEvent.click(getByLabelText(DEFAULT_TEXTS['en']['a11yEnableVoiceReading']));
    expect(toggleVoiceReading).toHaveBeenCalledTimes(1);
  });
});
