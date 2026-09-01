import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ChatWindow from './ChatWindow';
import type { Chat } from './use-chat';
import { DEFAULT_CUSTOMIZATIONS } from '../../../official-widgets/ai-search-launcher/default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../test-utils';
import { WidgetDataContext } from '../../types/contexts';

const messages = {
  a11yAssistantThinking: 'Assistant is thinking',
  a11yChatMessages: 'Chat messages',
  a11yProductResultsShown: '{count} products shown',
  a11yScrollToLatestMessage: 'Scroll to latest message',
  a11ySuggestedReplies: 'Suggested replies',
  a11yUploadedImage: 'Uploaded image',
  nowDescribing: 'Now describing',
  showMore: 'Show more...',
};

const createChat = (overrides: Partial<Chat> = {}): Chat => ({
  chatId: '',
  requestId: '',
  author: 'user',
  messages: [],
  ...overrides,
});

const renderChatWindow = (
  chats: Chat[],
  hideInitialUserMessage?: boolean,
): ReturnType<typeof render> => {
  const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher');
  return render(
    <WidgetDataContext.Provider value={{ widgetConfig, widgetClient, darkMode: false, locale: 'en' }}>
      <IntlProvider messages={messages} locale='en' defaultLocale='en'>
        <ChatWindow
          isWaiting={false}
          chats={chats}
          latestMessage=''
          suggestions={[]}
          showAllSuggestions={false}
          setShowAllSuggestions={jest.fn()}
          sendMessage={jest.fn()}
          wishlistPids={[]}
          setIsInWishlist={jest.fn()}
          pwPrefix='test'
          hideInitialUserMessage={hideInitialUserMessage}
        />
      </IntlProvider>
    </WidgetDataContext.Provider>,
  );
};

// Covers hideInitialUserMessage's narrow contract from both sides (ChatWindow.tsx) — regression
// coverage requested on review: the opt-in branch had no test asserting the first user row is
// actually absent, nor that later rows (of any author, including a follow-up 'user' row) stay
// visible, so an index/author typo in that condition could silently hide the wrong message.
describe('ChatWindow hideInitialUserMessage', () => {
  it("hides only the first row when it's the user's initial query and hideInitialUserMessage is true", () => {
    const chats: Chat[] = [
      createChat({ author: 'user', messages: ['first query'] }),
      createChat({ author: 'bot', messages: ['bot reply'] }),
      createChat({ author: 'user', messages: ['follow-up query'] }),
    ];

    renderChatWindow(chats, true);
    // Scoped to the visible log, not the whole document: the sr-only accessible-status region
    // (a separate live-region sibling) also echoes the last chat's text, which would otherwise
    // make a plain screen.getByText ambiguous whenever that text happens to be the final message.
    const log = within(screen.getByRole('log'));

    expect(log.queryByText('first query')).toBeNull();
    expect(log.getByText('bot reply')).toBeTruthy();
    expect(log.getByText('follow-up query')).toBeTruthy();
  });

  it('renders every row, including the initial user query, when hideInitialUserMessage is unset', () => {
    const chats: Chat[] = [
      createChat({ author: 'user', messages: ['first query'] }),
      createChat({ author: 'bot', messages: ['bot reply'] }),
    ];

    renderChatWindow(chats);
    const log = within(screen.getByRole('log'));

    expect(log.getByText('first query')).toBeTruthy();
    expect(log.getByText('bot reply')).toBeTruthy();
  });
});
