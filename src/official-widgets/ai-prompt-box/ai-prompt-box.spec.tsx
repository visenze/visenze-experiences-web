import { act, fireEvent, type RenderResult, waitFor, within } from '@testing-library/react';
import AiPromptBox from './ai-prompt-box';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from './default-config';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../common/test-utils';
import type { WidgetConfig } from '../../common/wigmix-core';

// Same SSE / webcam / voice mocks as embedded-shopping-assistant-chat.spec.tsx.
const mockFetchEventSource = jest.fn();
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (...args: any[]): any => mockFetchEventSource(...args),
}));
jest.mock('react-webcam', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return {
    __esModule: true,
    default: forwardRef((_props: any, ref: any) => {
      useImperativeHandle(ref, () => ({ getScreenshot: jest.fn(() => 'data:image/png;base64,mock') }));
      return <video data-testid='mock-webcam' />;
    }),
  };
});
jest.mock('../../common/assistant/use-voice', () => ({
  __esModule: true,
  default: (): unknown => ({
    voiceEnabled: false,
    speechOutputEnabled: false,
    status: 'idle',
    liveTranscript: '',
    hasError: false,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    speak: jest.fn(() => false),
    hasPendingSpeech: jest.fn(() => false),
    stopAudio: jest.fn(),
  }),
}));

const QUESTIONS = ['How cushioned?', 'Compare similar shoes'];
const texts = DEFAULT_TEXTS['en'];

const setup = (
  aiPromptBox: Partial<NonNullable<WidgetConfig['customizations']['aiPromptBox']>> = { suggestedQuestions: QUESTIONS },
  darkMode = false,
  productId: string | null = 'pid-1',
): RenderResult => {
  const widgetConfig = createWidgetConfig(
    { ...DEFAULT_CUSTOMIZATIONS, aiPromptBox: { ...DEFAULT_CUSTOMIZATIONS.aiPromptBox, ...aiPromptBox } },
    { searchSettings: { attrs_to_get: ['product_url', 'title', 'price'] } },
  );
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_prompt_box', {
    getUid: jest.fn((cb: (uid: string) => void) => cb('uid')),
    getSid: jest.fn((cb: (sid: string) => void) => cb('sid')),
    generateUuid: jest.fn((cb: (uuid: string) => void) => cb('chat-id')),
  });
  return renderWidget(
    <AiPromptBox productId={productId ?? undefined} renderWithoutPortal />,
    { widgetConfig, widgetClient, darkMode, messages: texts },
  );
};

const lastRequestParams = (): URLSearchParams => {
  const url = mockFetchEventSource.mock.calls[mockFetchEventSource.mock.calls.length - 1][0] as string;
  return new URLSearchParams(url.split('?')[1]);
};

// The chip row is only clickable once chat.open() has enabled input (effect on mount).
const clickChip = async (result: RenderResult, question: string): Promise<void> => {
  const chip = result.getByText(question) as HTMLButtonElement;
  await waitFor(() => expect(chip.disabled).toBe(false));
  await act(async () => {
    fireEvent.click(chip);
  });
};

// Every ask opens the chat drawer; closing it (react-modal keeps it mounted for its close animation)
// leaves just the panel, so its own header icons and chips can be reached without duplicates.
const closeDrawer = async (result: RenderResult): Promise<void> => {
  await act(async () => {
    fireEvent.click(within(result.getByRole('dialog', { hidden: true })).getByLabelText(texts['a11yCloseChat']));
  });
  await waitFor(() => expect(result.queryByRole('dialog', { hidden: true })).toBeNull());
};

beforeEach(() => {
  mockFetchEventSource.mockReset();
  mockFetchEventSource.mockImplementation(async () => {});
  localStorage.clear();
});

describe('ai-prompt-box (collapsed)', () => {
  it('renders the title, suggested questions and input', () => {
    const { getAllByText, getByText, getByLabelText } = setup();
    expect(getAllByText(texts['aiPromptBoxTitle']).length).toBeGreaterThan(0);
    QUESTIONS.forEach((q) => expect(getByText(q)).toBeTruthy());
    expect(getByLabelText(texts['a11yChatInput'])).toBeTruthy();
  });

  it('renders in dark mode without crashing', () => {
    const { getAllByText } = setup({ suggestedQuestions: QUESTIONS }, true);
    expect(getAllByText(texts['aiPromptBoxTitle']).length).toBeGreaterThan(0);
  });

  it.each([[[]], [undefined]])('renders no chip row when suggestedQuestions is %j', (suggestedQuestions) => {
    const { queryByRole } = setup({ suggestedQuestions });
    expect(queryByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeNull();
  });

  it('lays chips out side by side, wrapping onto the next row when space runs out', () => {
    const { getByRole } = setup();
    const group = getByRole('group', { name: texts['a11ySuggestedReplies'] });
    expect(group.className).toContain('flex-wrap');
    expect(group.className).not.toContain('flex-col');
    expect(group.className).not.toContain('overflow-x-auto');
  });

  it('shows at most 5 chips by default', () => {
    const many = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
    const { getByRole } = setup({ suggestedQuestions: many });
    expect(getByRole('group', { name: texts['a11ySuggestedReplies'] }).querySelectorAll('button')).toHaveLength(5);
  });

  it('caps the chips at customizations.aiPromptBox.maxSuggestedQuestions, keeping the first ones', () => {
    const many = ['q1', 'q2', 'q3', 'q4', 'q5'];
    const { getByRole, queryByText } = setup({ suggestedQuestions: many, maxSuggestedQuestions: 3 });
    expect(getByRole('group', { name: texts['a11ySuggestedReplies'] }).querySelectorAll('button')).toHaveLength(3);
    expect(queryByText('q3')).toBeTruthy();
    expect(queryByText('q4')).toBeNull();
  });

  it('sends a tapped chip with the product id', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    expect(lastRequestParams().get('q')).toBe(QUESTIONS[0]);
    expect(lastRequestParams().get('pid')).toBe('pid-1');
  });

  it('sends typed text on submit', async () => {
    const { getByLabelText } = setup();
    const input = getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await act(async () => {
      fireEvent.change(input, { target: { value: 'is it waterproof?' } });
    });
    await act(async () => {
      fireEvent.submit(input.closest('form') as HTMLFormElement);
    });
    expect(lastRequestParams().get('q')).toBe('is it waterproof?');
  });

  it('does not allow sending whitespace-only text', async () => {
    const { getByLabelText } = setup();
    const input = getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await act(async () => {
      fireEvent.change(input, { target: { value: '   ' } });
    });
    const form = input.closest('form') as HTMLFormElement;
    expect((form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(mockFetchEventSource).not.toHaveBeenCalled();
  });

  it('enables the input once the chat session is open', async () => {
    const { getByLabelText } = setup();
    await waitFor(() => expect((getByLabelText(texts['a11yChatInput']) as HTMLInputElement).disabled).toBe(false));
  });
});

describe('ai-prompt-box (side chat drawer)', () => {
  it('reopens the side chat drawer from the maximize icon after closing it, same session', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    expect(result.getByRole('dialog', { hidden: true })).toBeTruthy();
    expect(result.getAllByText(QUESTIONS[0]).length).toBeGreaterThan(0);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);

    await closeDrawer(result);
    expect(result.getAllByText(QUESTIONS[0]).length).toBe(1); // only the chip is left in the panel

    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yMaximizeChat']));
    });
    expect(within(result.getByRole('dialog', { hidden: true })).getByText(QUESTIONS[0])).toBeTruthy();
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1); // nothing was re-sent
  });

  it('does not abort an in-flight reply when the side drawer is closed', async () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      signal = options.signal;
    });
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yMaximizeChat']));
    });
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yCloseChat']));
    });
    expect(signal?.aborted).toBe(false);
  });

  it('mounts the drawer on the right by default, like a side-mounted shopping assistant', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yMaximizeChat']));
    });
    const dialog = result.getByRole('dialog', { hidden: true });
    expect(dialog.className).toContain('wigmix-modal-position-right');
    expect(dialog.className).not.toContain('wigmix-modal-position-center');
  });

  it('mounts the drawer on the left when customizations.aiPromptBox.chatPosition is left', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, chatPosition: 'left' });
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yMaximizeChat']));
    });
    expect(result.getByRole('dialog', { hidden: true }).className).toContain('wigmix-modal-position-left');
  });

  it('shows the title and a close button in the drawer header', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, title: 'Ask Fitzy' });
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yMaximizeChat']));
    });
    const dialog = result.getByRole('dialog', { hidden: true });
    expect(within(dialog).getByRole('heading', { name: 'Ask Fitzy', hidden: true })).toBeTruthy();
    expect(within(dialog).getByLabelText(texts['a11yCloseChat'])).toBeTruthy();
  });

  it('hides the maximize icon until a message has been sent', () => {
    const { queryByLabelText } = setup();
    expect(queryByLabelText(texts['a11yMaximizeChat'])).toBeNull();
  });

  it('shows the maximize icon once a suggestion chip has been sent', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    expect(result.getByLabelText(texts['a11yMaximizeChat'])).toBeTruthy();
  });

  it('shows the maximize icon once the shopper has typed and sent a message', async () => {
    const { getByLabelText } = setup();
    const input = getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await act(async () => {
      fireEvent.change(input, { target: { value: 'is it waterproof?' } });
    });
    await act(async () => {
      fireEvent.submit(input.closest('form') as HTMLFormElement);
    });
    expect(getByLabelText(texts['a11yMaximizeChat'])).toBeTruthy();
  });

  it('hides the maximize icon again after a new chat reset', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await closeDrawer(result);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yStartNewChat']));
    });
    expect(result.queryByLabelText(texts['a11yMaximizeChat'])).toBeNull();
  });
});

describe('ai-prompt-box (title logo)', () => {
  const LOGO = 'https://example.com/fitzy.gif';
  const logoImg = (result: RenderResult): HTMLImageElement | null => result.container.querySelector(`img[src="${LOGO}"]`);
  const visibleTitle = (result: RenderResult): HTMLElement | undefined => result.getAllByText(texts['aiPromptBoxTitle']).find((el) => el.tagName === 'H2');

  it('shows the default sparkle and the title text when no logo is configured', () => {
    const result = setup();
    expect(logoImg(result)).toBeNull();
    expect(result.container.querySelector('svg')).toBeTruthy();
    expect(visibleTitle(result)?.className).not.toContain('sr-only');
  });

  it('shows the logo and the configured title text by default when a url is set', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, title: 'Ask Fitzy', titleIcon: { url: LOGO } });
    expect(logoImg(result)).toBeTruthy();
    expect(result.getAllByText('Ask Fitzy').find((el) => el.tagName === 'H2')?.className).not.toContain('sr-only');
  });

  it('shows only the logo when a url is set but no title is configured, keeping a heading for screen readers', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, titleIcon: { url: LOGO } });
    expect(logoImg(result)).toBeTruthy();
    expect(visibleTitle(result)?.className).toContain('sr-only');
  });

  it('lets an explicit layout win over that default', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, titleIcon: { url: LOGO, layout: 'ICON_TEXT' } });
    expect(visibleTitle(result)?.className).not.toContain('sr-only');
  });

  it('shows only the logo for layout ICON, keeping the title for screen readers', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, titleIcon: { url: LOGO, layout: 'ICON' } });
    expect(logoImg(result)).toBeTruthy();
    expect(visibleTitle(result)?.className).toContain('sr-only');
  });

  it('shows the logo and the title text for layout ICON_TEXT', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, titleIcon: { url: LOGO, layout: 'ICON_TEXT' } });
    expect(logoImg(result)).toBeTruthy();
    expect(visibleTitle(result)?.className).not.toContain('sr-only');
  });

  it('shows only the title text for layout TEXT even if a url is set', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, titleIcon: { url: LOGO, layout: 'TEXT' } });
    expect(logoImg(result)).toBeNull();
    expect(visibleTitle(result)?.className).not.toContain('sr-only');
  });

  it('applies the configured logo height', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, titleIcon: { url: LOGO, height: 40 } });
    expect(logoImg(result)?.style.height).toBe('40px');
  });
});

describe('ai-prompt-box (title text)', () => {
  it('uses customizations.aiPromptBox.title when set, over the localized default', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, title: 'Ask Fitzy' });
    expect(result.getAllByText('Ask Fitzy').some((el) => el.tagName === 'H2')).toBe(true);
    expect(result.queryByText(texts['aiPromptBoxTitle'])).toBeNull();
    // the maximized view's header uses the same title
    expect(result.getByLabelText('Ask Fitzy')).toBeTruthy();
  });

  it('falls back to the localized aiPromptBoxTitle text when no title is configured', () => {
    const result = setup();
    expect(result.getAllByText(texts['aiPromptBoxTitle']).some((el) => el.tagName === 'H2')).toBe(true);
  });

  it('falls back to the localized text when the configured title is blank', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, title: '   ' });
    expect(result.getAllByText(texts['aiPromptBoxTitle']).some((el) => el.tagName === 'H2')).toBe(true);
  });
});

describe('ai-prompt-box (new chat)', () => {
  it('has no new-chat button before the first message', () => {
    const { queryByLabelText } = setup();
    expect(queryByLabelText(texts['a11yStartNewChat'])).toBeNull();
  });

  it('shows a new-chat button beside the maximize icon once a conversation has started', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await closeDrawer(result);
    const newChat = result.getByLabelText(texts['a11yStartNewChat']);
    const maximize = result.getByLabelText(texts['a11yMaximizeChat']);
    expect(newChat.parentElement).toBe(maximize.parentElement);
  });

  it('resets the panel, with the new-chat button gone and the reply aborted', async () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      signal = options.signal;
    });
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await closeDrawer(result);

    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yStartNewChat']));
    });

    expect(signal?.aborted).toBe(true);
    expect(result.getByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeTruthy();
    expect(result.queryByLabelText(texts['a11yStartNewChat'])).toBeNull();
    expect(result.queryByLabelText(texts['a11yMaximizeChat'])).toBeNull();
  });

  it('lets a new question be sent after a reset', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await closeDrawer(result);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yStartNewChat']));
    });
    await clickChip(result, QUESTIONS[1]);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(2);
    expect(lastRequestParams().get('q')).toBe(QUESTIONS[1]);
  });

  it('offers new chat in the maximized view too, and resetting there clears the conversation', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    const dialog = result.getByRole('dialog', { hidden: true });
    await act(async () => {
      fireEvent.click(within(dialog).getByLabelText(texts['a11yStartNewChat']));
    });
    // the conversation is gone from the dialog (the chip behind it is back, which is expected)
    expect(within(dialog).queryByText(QUESTIONS[0])).toBeNull();
  });
});

describe('ai-prompt-box (chip prominence)', () => {
  it('renders chips with a transparent background, so the panel color shows through', () => {
    const chip = setup().getByText(QUESTIONS[0]);
    expect(chip.className).toContain('bg-transparent');
    expect(chip.className).not.toContain('bg-white');
    expect(chip.className).not.toContain('dark:bg-neutral-800');
  });

  it('renders chips in a medium weight with a thin accent border', () => {
    const { getByText } = setup();
    const chip = getByText(QUESTIONS[0]);
    expect(chip.className).toContain('font-medium');
    expect(chip.className).not.toContain('font-semibold');
    // generalLayout.fontColor defaults to #000000
    expect(chip.style.borderColor).toMatch(/^(#000000|rgb\(0, 0, 0\))$/);
    expect(chip.style.color).toBe('rgb(0, 0, 0)');
  });
});

describe('ai-prompt-box (find similar)', () => {
  const FS_LABEL = texts['aiPromptBoxFindSimilar'];
  const findSimilarButton = (result: RenderResult): HTMLButtonElement => result.getByText(FS_LABEL).closest('button') as HTMLButtonElement;

  it('is not shown unless enabled', () => {
    const { queryByText } = setup();
    expect(queryByText(FS_LABEL)).toBeNull();
  });

  it('sits beside the text input, in the same row', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true } });
    const input = result.getByLabelText(texts['a11yChatInput']);
    expect(findSimilarButton(result).closest('form')).toBe(input.closest('form'));
  });

  it('sends "find similar products" with the product id when clicked', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true } });
    await waitFor(() => expect(findSimilarButton(result).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(findSimilarButton(result));
    });
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
    expect(lastRequestParams().get('q')).toBe('find similar products');
    expect(lastRequestParams().get('pid')).toBe('pid-1');
  });

  it('uses the configured label and message', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true, label: 'More like this', message: 'show me alternatives' } });
    const button = result.getByText('More like this').closest('button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await act(async () => {
      fireEvent.click(button);
    });
    expect(lastRequestParams().get('q')).toBe('show me alternatives');
  });

  it('falls back to the defaults when the configured label and message are blank', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true, label: '  ', message: '' } });
    await waitFor(() => expect(findSimilarButton(result).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(findSimilarButton(result));
    });
    expect(lastRequestParams().get('q')).toBe('find similar products');
  });

  it('is disabled while a reply is in flight, so it cannot be double-sent', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true } });
    await waitFor(() => expect(findSimilarButton(result).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(findSimilarButton(result));
    });
    expect(findSimilarButton(result).disabled).toBe(true);
    await act(async () => {
      fireEvent.click(findSimilarButton(result));
    });
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
  });
});

describe('ai-prompt-box (send button)', () => {
  const sendButton = (result: RenderResult): HTMLElement => result.getByLabelText(texts['a11ySendMessage']);
  const findSimilarButton = (result: RenderResult): HTMLElement => result.getByText(texts['aiPromptBoxFindSimilar']).closest('button') as HTMLElement;
  const FS = { suggestedQuestions: QUESTIONS, findSimilar: { enabled: true } };

  it('sits inside the text input field, with the arrow icon', () => {
    const result = setup();
    const field = result.getByTestId('ai-prompt-box-input-field');
    expect(field.contains(sendButton(result))).toBe(true);
    expect(field.contains(result.getByLabelText(texts['a11yChatInput']))).toBe(true);
    // SubmitChatIcon's arrow path
    expect(sendButton(result).querySelector('path')?.getAttribute('d')).toContain('M2.25 12');
  });

  it('has the same shape as the Find Similar button', () => {
    const result = setup(FS);
    expect(sendButton(result).className).toContain('rounded-md');
    expect(findSimilarButton(result).className).toContain('rounded-md');
    expect(sendButton(result).className).not.toContain('rounded-full');
  });

  it('is colored like the Find Similar button by default (accent background, light text)', () => {
    const result = setup(FS);
    expect(sendButton(result).style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(sendButton(result).style.color).toBe('rgb(255, 255, 255)');
    expect(sendButton(result).style.backgroundColor).toBe(findSimilarButton(result).style.backgroundColor);
    expect(sendButton(result).style.color).toBe(findSimilarButton(result).style.color);
  });

  it('follows the dark-mode accent colors like Find Similar', () => {
    const result = setup(FS, true);
    expect(sendButton(result).style.backgroundColor).toBe(findSimilarButton(result).style.backgroundColor);
    expect(sendButton(result).style.color).toBe(findSimilarButton(result).style.color);
    expect(sendButton(result).style.backgroundColor).not.toBe('rgb(0, 0, 0)');
  });

  describe('customizations.aiPromptBox.buttonColors', () => {
    const colors = { backgroundColor: '#112233', fontColor: '#ffeedd', backgroundColorDark: '#445566', fontColorDark: '#aabbcc' };

    it('colors both buttons', () => {
      const result = setup({ ...FS, buttonColors: colors });
      [sendButton(result), findSimilarButton(result)].forEach((button) => {
        expect(button.style.backgroundColor).toBe('rgb(17, 34, 51)');
        expect(button.style.color).toBe('rgb(255, 238, 221)');
      });
    });

    it('uses the dark-mode colors in dark mode', () => {
      const result = setup({ ...FS, buttonColors: colors }, true);
      [sendButton(result), findSimilarButton(result)].forEach((button) => {
        expect(button.style.backgroundColor).toBe('rgb(68, 85, 102)');
        expect(button.style.color).toBe('rgb(170, 187, 204)');
      });
    });

    it('falls back to the default accent for any color left unset', () => {
      const result = setup({ ...FS, buttonColors: { backgroundColor: '#112233' } });
      expect(sendButton(result).style.backgroundColor).toBe('rgb(17, 34, 51)');
      expect(sendButton(result).style.color).toBe('rgb(255, 255, 255)');
    });
  });
});

describe('ai-prompt-box (the product changes during a conversation)', () => {
  it('continues the same chat, sending the new product id with the next message', async () => {
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      options.onclose(); // the reply finishes, so the next question can be asked
    });
    const result = setup({ suggestedQuestions: QUESTIONS }, false, 'pid-1');
    await clickChip(result, QUESTIONS[0]);
    const firstChatId = lastRequestParams().get('chat_id');
    expect(lastRequestParams().get('pid')).toBe('pid-1');

    result.rerender(<AiPromptBox productId='pid-2' renderWithoutPortal />);
    await clickChip(result, QUESTIONS[1]);

    expect(mockFetchEventSource).toHaveBeenCalledTimes(2);
    expect(lastRequestParams().get('pid')).toBe('pid-2');
    expect(lastRequestParams().get('chat_id')).toBe(firstChatId); // not a new chat
  });

  it('starts sending a product id once one appears, and stops when it goes away', async () => {
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      options.onclose();
    });
    const result = setup({ suggestedQuestions: QUESTIONS }, false, '');
    await clickChip(result, QUESTIONS[0]);
    expect(lastRequestParams().has('pid')).toBe(false);

    result.rerender(<AiPromptBox productId='pid-5' renderWithoutPortal />);
    await clickChip(result, QUESTIONS[1]);
    expect(lastRequestParams().get('pid')).toBe('pid-5');
  });
});

describe('ai-prompt-box (without a product id)', () => {
  it.each([null, ''])('still renders and sends questions, without a pid param, when productId is %j', async (productId) => {
    const result = setup({ suggestedQuestions: QUESTIONS }, false, productId);
    await clickChip(result, QUESTIONS[0]);
    expect(lastRequestParams().get('q')).toBe(QUESTIONS[0]);
    expect(lastRequestParams().has('pid')).toBe(false);
  });

  it('hides the Find Similar button even when enabled, since there is no product to compare against', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true } }, false, '');
    expect(result.queryByText(texts['aiPromptBoxFindSimilar'])).toBeNull();
  });

  it('still shows the Find Similar button when enabled and a product id is given', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, findSimilar: { enabled: true } });
    expect(result.getByText(texts['aiPromptBoxFindSimilar'])).toBeTruthy();
  });
});

describe('ai-prompt-box (asking opens the chat drawer)', () => {
  const OPEN = { suggestedQuestions: QUESTIONS };
  const dialogOf = (result: RenderResult): HTMLElement => result.getByRole('dialog', { hidden: true });

  const typeAndSubmit = async (result: RenderResult, text: string): Promise<void> => {
    const input = result.getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await act(async () => {
      fireEvent.change(input, { target: { value: text } });
    });
    await act(async () => {
      fireEvent.submit(input.closest('form') as HTMLFormElement);
    });
  };

  it('opens a tapped chip in the side drawer', async () => {
    const result = setup(OPEN);
    await clickChip(result, QUESTIONS[0]);
    expect(lastRequestParams().get('q')).toBe(QUESTIONS[0]);
    const dialog = dialogOf(result);
    expect(within(dialog).getByText(QUESTIONS[0])).toBeTruthy(); // the question is in the drawer's conversation
  });

  it('opens a typed message in the side drawer', async () => {
    const result = setup(OPEN);
    await typeAndSubmit(result, 'is it waterproof?');
    expect(lastRequestParams().get('q')).toBe('is it waterproof?');
    expect(within(dialogOf(result)).getByText('is it waterproof?')).toBeTruthy();
  });

  it('opens Find Similar in the side drawer', async () => {
    const result = setup({ ...OPEN, findSimilar: { enabled: true } });
    const button = result.getByText(texts['aiPromptBoxFindSimilar']).closest('button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await act(async () => {
      fireEvent.click(button);
    });
    expect(lastRequestParams().get('q')).toBe('find similar products');
    expect(within(dialogOf(result)).getByText('find similar products')).toBeTruthy();
  });

  it('sends exactly one request per message when it opens the drawer', async () => {
    const result = setup(OPEN);
    await clickChip(result, QUESTIONS[0]);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1);
  });

  it('leaves the panel as it was once the drawer is closed: chips back, maximize available', async () => {
    const result = setup(OPEN);
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(within(dialogOf(result)).getByLabelText(texts['a11yCloseChat']));
    });
    await waitFor(() => expect(result.queryByRole('dialog', { hidden: true })).toBeNull());
    expect(result.getByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeTruthy();
    expect(result.getByLabelText(texts['a11yMaximizeChat'])).toBeTruthy();
  });

  it('continues the same conversation when another chip is tapped after closing the drawer', async () => {
    // The first reply finishes (chips are disabled while a reply is still in flight).
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      options.onclose();
    });
    const result = setup(OPEN);
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(within(dialogOf(result)).getByLabelText(texts['a11yCloseChat']));
    });
    await waitFor(() => expect(result.queryByRole('dialog', { hidden: true })).toBeNull());
    await clickChip(result, QUESTIONS[1]);
    expect(mockFetchEventSource).toHaveBeenCalledTimes(2);
    const dialog = dialogOf(result);
    expect(within(dialog).getByText(QUESTIONS[0])).toBeTruthy();
    expect(within(dialog).getByText(QUESTIONS[1])).toBeTruthy();
  });

  it('does not abort the reply when the drawer is closed, so reopening shows it still streaming in', async () => {
    let signal: AbortSignal | undefined;
    mockFetchEventSource.mockImplementation(async (_url: string, options: any) => {
      signal = options.signal;
    });
    const result = setup(OPEN);
    await clickChip(result, QUESTIONS[0]);
    await act(async () => {
      fireEvent.click(within(dialogOf(result)).getByLabelText(texts['a11yCloseChat']));
    });
    expect(signal?.aborted).toBe(false);
  });
});

describe('ai-prompt-box (message above the chips)', () => {
  const MESSAGE = 'Need a hand?';

  it('is not shown unless configured, or when configured blank', () => {
    expect(setup().queryByText(MESSAGE)).toBeNull();
    expect(setup({ suggestedQuestions: QUESTIONS, message: '   ' }).container.querySelector('[data-testid="ai-prompt-box-message"]')).toBeNull();
  });

  it('is shown between the title row and the suggestion chips', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, message: MESSAGE });
    const message = result.getByText(MESSAGE);
    const heading = result.getAllByText(texts['aiPromptBoxTitle']).find((el) => el.tagName === 'H2') as HTMLElement;
    const chips = result.getByRole('group', { name: texts['a11ySuggestedReplies'] });
    const order = Array.from(result.container.querySelectorAll('*'));
    expect(order.indexOf(heading)).toBeLessThan(order.indexOf(message));
    expect(order.indexOf(message)).toBeLessThan(order.indexOf(chips));
  });

  it('is small, gray and medium weight', () => {
    const { className } = setup({ suggestedQuestions: QUESTIONS, message: MESSAGE }).getByText(MESSAGE);
    expect(className).toContain('text-xs');
    expect(className).toContain('font-medium');
    expect(className).toContain('text-neutral-500');
  });

  it('is shown even when there are no suggested questions', () => {
    expect(setup({ suggestedQuestions: [], message: MESSAGE }).getByText(MESSAGE)).toBeTruthy();
  });

  it('stays after something is asked, since the panel never turns into a chat', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, message: MESSAGE });
    await clickChip(result, QUESTIONS[0]);
    expect(result.getByText(MESSAGE)).toBeTruthy();
  });
});

describe('ai-prompt-box (input icon)', () => {
  const ICON = 'https://example.com/face.png';
  const iconImg = (result: RenderResult): HTMLImageElement | null => result.container.querySelector(`img[src="${ICON}"]`);

  it('is not shown unless configured', () => {
    const result = setup();
    expect(iconImg(result)).toBeNull();
    expect(result.container.querySelector('[data-testid="ai-prompt-box-input-field"] img')).toBeNull();
  });

  it('is shown inside the input field, before the text', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, inputIcon: { url: ICON } });
    const input = result.getByLabelText(texts['a11yChatInput']);
    const field = result.getByTestId('ai-prompt-box-input-field');
    expect(iconImg(result)).toBeTruthy();
    expect(field.contains(iconImg(result))).toBe(true);
    expect(iconImg(result)?.parentElement?.parentElement).toBe(input.parentElement);
    const order = Array.from(field.querySelectorAll('*'));
    expect(order.indexOf(iconImg(result) as HTMLElement)).toBeLessThan(order.indexOf(input));
  });

  it('is decorative and does not take clicks away from the input', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, inputIcon: { url: ICON } });
    expect(iconImg(result)?.getAttribute('aria-hidden')).toBe('true');
    expect(iconImg(result)?.closest('.pointer-events-none')).toBeTruthy();
  });

  it('applies the configured icon height', () => {
    const result = setup({ suggestedQuestions: QUESTIONS, inputIcon: { url: ICON, height: 28 } });
    expect(iconImg(result)?.style.height).toBe('28px');
  });
});

describe('ai-prompt-box (chat drawer header text)', () => {
  // Asking opens the drawer; its heading is what is under test.
  const drawerHeading = async (aiPromptBox: Partial<NonNullable<WidgetConfig['customizations']['aiPromptBox']>>): Promise<string | null | undefined> => {
    const result = setup({ suggestedQuestions: QUESTIONS, ...aiPromptBox });
    await clickChip(result, QUESTIONS[0]);
    const heading = result.getByRole('dialog', { hidden: true }).querySelector('h2')?.textContent;
    result.unmount(); // several calls per test: keep each one's DOM (and its chips) separate
    return heading;
  };

  it('uses the title when one is set, ignoring chatTitle', async () => {
    expect(await drawerHeading({ title: 'Ask Fitzy', chatTitle: 'Fitzy Assistant' })).toBe('Ask Fitzy');
  });

  it('uses chatTitle when the title is empty', async () => {
    expect(await drawerHeading({ title: '', chatTitle: 'Fitzy Assistant' })).toBe('Fitzy Assistant');
    expect(await drawerHeading({ chatTitle: 'Fitzy Assistant' })).toBe('Fitzy Assistant');
    expect(await drawerHeading({ title: '   ', chatTitle: 'Fitzy Assistant' })).toBe('Fitzy Assistant');
  });

  it('uses chatTitle when the panel shows only a logo (no title)', async () => {
    expect(await drawerHeading({ titleIcon: { url: 'https://example.com/logo.png' }, chatTitle: 'Fitzy Assistant' })).toBe('Fitzy Assistant');
  });

  it('falls back to the default text when both title and chatTitle are empty or blank', async () => {
    expect(await drawerHeading({})).toBe(texts['aiPromptBoxTitle']);
    expect(await drawerHeading({ chatTitle: '   ' })).toBe(texts['aiPromptBoxTitle']);
  });

  it('does not change the panel title row', async () => {
    const result = setup({ suggestedQuestions: QUESTIONS, title: '', chatTitle: 'Fitzy Assistant' });
    expect(result.queryByText('Fitzy Assistant')).toBeNull();
  });
});

describe('ai-prompt-box (restoring the saved conversation)', () => {
  const KEY = 'visenze_shopping_assistant_chat_id_1234__pid-1';
  const originalFetch = global.fetch;
  const HISTORY = [
    { reqid: 'req-1', type: 'human', message: 'earlier question' },
    { reqid: 'req-1', type: 'ai', message: 'earlier answer' },
  ];

  const seedSavedChat = (): void => {
    localStorage.setItem(KEY, JSON.stringify({ chatId: 'old-chat', timestamp: Date.now() }));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: (): Promise<unknown> => Promise.resolve({ result: { messages: HISTORY } }),
    } as unknown as Response);
  };
  const flush = async (): Promise<void> => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('saves the conversation by default, so a reload can restore it', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    expect(localStorage.getItem(KEY)).toBeTruthy();
  });

  it('does not save it when chatbot.persistChatEnabled is false', async () => {
    const widgetConfig = createWidgetConfig({
      ...DEFAULT_CUSTOMIZATIONS,
      aiPromptBox: { ...DEFAULT_CUSTOMIZATIONS.aiPromptBox, suggestedQuestions: QUESTIONS },
      chatbot: { ...DEFAULT_CUSTOMIZATIONS.chatbot, persistChatEnabled: false },
    }, { searchSettings: { attrs_to_get: ['product_url', 'title', 'price'] } });
    const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_prompt_box', {
      getUid: jest.fn((cb: (uid: string) => void) => cb('uid')),
      getSid: jest.fn((cb: (sid: string) => void) => cb('sid')),
      generateUuid: jest.fn((cb: (uuid: string) => void) => cb('chat-id')),
    });
    const result = renderWidget(<AiPromptBox productId='pid-1' renderWithoutPortal />, { widgetConfig, widgetClient, messages: texts });
    await clickChip(result, QUESTIONS[0]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('keeps the panel as it is after a reload, with the old chat one click away in the drawer', async () => {
    seedSavedChat();
    const result = setup();
    await flush();
    expect(result.getByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeTruthy();
    expect(result.queryByText('earlier question')).toBeNull();
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yMaximizeChat']));
    });
    const dialog = result.getByRole('dialog', { hidden: true });
    expect(within(dialog).getByText('earlier question')).toBeTruthy();
    expect(within(dialog).getAllByText('earlier answer').length).toBeGreaterThan(0);
  });

  it('shows the whole conversation, old messages included, in the drawer once something is asked', async () => {
    seedSavedChat();
    const result = setup();
    await flush();
    await clickChip(result, QUESTIONS[0]);
    const dialog = result.getByRole('dialog', { hidden: true });
    expect(within(dialog).getByText('earlier question')).toBeTruthy();
    expect(within(dialog).getByText(QUESTIONS[0])).toBeTruthy();
    expect(lastRequestParams().get('chat_id')).toBe('old-chat');
  });

  it('goes back to a fresh panel after a new chat', async () => {
    const result = setup();
    await clickChip(result, QUESTIONS[0]);
    await closeDrawer(result);
    await act(async () => {
      fireEvent.click(result.getByLabelText(texts['a11yStartNewChat']));
    });
    expect(result.getByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeTruthy();
    expect(result.queryByLabelText(texts['a11yMaximizeChat'])).toBeNull();
  });

  it('does not restore anything when customizations.aiPromptBox.restoreChat is false', async () => {
    seedSavedChat();
    const result = setup({ suggestedQuestions: QUESTIONS, restoreChat: false });
    await flush();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.queryByLabelText(texts['a11yMaximizeChat'])).toBeNull();
    await clickChip(result, QUESTIONS[0]);
    expect(within(result.getByRole('dialog', { hidden: true })).queryByText('earlier question')).toBeNull();
    expect(lastRequestParams().get('chat_id')).not.toBe('old-chat');
  });

  it('continues the restored conversation with the same chat id when a new question is asked', async () => {
    seedSavedChat();
    const result = setup();
    await flush();
    const input = result.getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await act(async () => {
      fireEvent.change(input, { target: { value: 'follow-up' } });
    });
    await act(async () => {
      fireEvent.submit(input.closest('form') as HTMLFormElement);
    });
    expect(lastRequestParams().get('chat_id')).toBe('old-chat');
    expect(within(result.getByRole('dialog', { hidden: true })).getByText('earlier question')).toBeTruthy();
  });

  it('does not restore another product\'s conversation', async () => {
    localStorage.setItem('visenze_shopping_assistant_chat_id_1234__other-pid', JSON.stringify({ chatId: 'other-chat', timestamp: Date.now() }));
    global.fetch = jest.fn();
    const result = setup();
    await flush();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.queryByLabelText(texts['a11yMaximizeChat'])).toBeNull();
  });
});
