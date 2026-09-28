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

const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_search_launcher');

// Split from renderChatWindow so a scrollAnchor test can build a second tree (same chats prop
// identity aside) to pass to the render result's own `rerender`, which is what actually re-runs
// ChatWindow's content-growth effect — a plain second renderChatWindow call would mount a whole
// new, unrelated instance instead.
const buildChatWindowTree = (
  chats: Chat[],
  hideInitialUserMessage?: boolean,
  scrollAnchor?: 'top' | 'bottom',
): JSX.Element => (
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
        scrollAnchor={scrollAnchor}
      />
    </IntlProvider>
  </WidgetDataContext.Provider>
);

const renderChatWindow = (
  chats: Chat[],
  hideInitialUserMessage?: boolean,
  scrollAnchor?: 'top' | 'bottom',
): ReturnType<typeof render> => render(buildChatWindowTree(chats, hideInitialUserMessage, scrollAnchor));

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

// jsdom never computes real layout, so scrollHeight/clientHeight default to 0 regardless of
// content — Object.defineProperty stands in for "the pane has more content than fits" so the
// scroll-to-bottom behavior (scrollTop = scrollHeight) is actually observable here.
describe('ChatWindow scrollAnchor', () => {
  it('auto-scrolls to follow new content by default (scrollAnchor unset)', () => {
    const initialChats: Chat[] = [createChat({ author: 'user', messages: ['first query'] })];
    const { rerender } = renderChatWindow(initialChats);
    const log = screen.getByRole('log') as HTMLDivElement;
    Object.defineProperty(log, 'scrollHeight', { value: 1000, configurable: true });
    log.scrollTop = 0;

    const grownChats: Chat[] = [...initialChats, createChat({ author: 'bot', messages: ['bot reply'] })];
    rerender(buildChatWindowTree(grownChats));

    expect(log.scrollTop).toBe(1000);
  });

  it('never auto-scrolls when scrollAnchor is "top", so the topmost content stays in view as new content streams in', () => {
    const initialChats: Chat[] = [createChat({ author: 'user', messages: ['first query'] })];
    const { rerender } = renderChatWindow(initialChats, false, 'top');
    const log = screen.getByRole('log') as HTMLDivElement;
    Object.defineProperty(log, 'scrollHeight', { value: 1000, configurable: true });
    log.scrollTop = 0;

    const grownChats: Chat[] = [...initialChats, createChat({ author: 'bot', messages: ['bot reply'] })];
    rerender(buildChatWindowTree(grownChats, false, 'top'));

    expect(log.scrollTop).toBe(0);
  });
});
