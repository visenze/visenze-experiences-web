import { fireEvent, type RenderResult } from '@testing-library/react';
import PromptBoxPanel, { type PromptBoxPanelProps } from './PromptBoxPanel';
import { createMockWidgetClient, createWidgetConfig, renderWidget } from '../../../common/test-utils';
import type { WidgetConfig } from '../../../common/wigmix-core';
import { DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS } from '../default-config';

const QUESTIONS = ['How cushioned?', 'Compare similar shoes', 'Is it waterproof?'];
const texts = DEFAULT_TEXTS['en'];

type AiAssistantCustomizations = NonNullable<WidgetConfig['customizations']['aiAssistant']>;

const setup = (
  props: Partial<PromptBoxPanelProps> = {},
  promptBox: AiAssistantCustomizations['promptBox'] = {},
  darkMode = false,
  aiAssistant: Omit<AiAssistantCustomizations, 'promptBox'> = {},
): { result: RenderResult; onSend: jest.Mock; onNewChat: jest.Mock; setMessage: jest.Mock } => {
  const widgetConfig = createWidgetConfig(
    {
      ...DEFAULT_CUSTOMIZATIONS,
      aiAssistant: {
        ...DEFAULT_CUSTOMIZATIONS.aiAssistant,
        ...aiAssistant,
        promptBox: { ...DEFAULT_CUSTOMIZATIONS.aiAssistant?.promptBox, suggestedQuestions: QUESTIONS, ...promptBox },
      },
    },
    {},
  );
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_assistant');
  const onSend = jest.fn();
  const onNewChat = jest.fn();
  const setMessage = jest.fn();
  const result = renderWidget(
    <PromptBoxPanel
      productId='pid-1'
      message=''
      setMessage={setMessage}
      allowUserInput
      hasConversation={false}
      onSend={onSend}
      onNewChat={onNewChat}
      {...props}
    />,
    { widgetConfig, widgetClient, darkMode, messages: texts },
  );
  return { result, onSend, onNewChat, setMessage };
};

describe('PromptBoxPanel', () => {
  it('renders the title', () => {
    const { result } = setup();
    expect(result.getByText(texts['promptBoxTitle'])).toBeTruthy();
  });

  it('limits chips by maxSuggestedQuestions', () => {
    const { result } = setup({}, { maxSuggestedQuestions: 2 });
    expect(result.queryByText(QUESTIONS[0])).toBeTruthy();
    expect(result.queryByText(QUESTIONS[1])).toBeTruthy();
    expect(result.queryByText(QUESTIONS[2])).toBeNull();
  });

  it('disables chips and input when user input is not allowed', () => {
    const { result } = setup({ allowUserInput: false });
    expect((result.getByText(QUESTIONS[0]) as HTMLButtonElement).disabled).toBe(true);
    expect((result.getByLabelText(texts['a11yChatInput']) as HTMLInputElement).disabled).toBe(true);
  });

  it('calls onSend with the chip text', () => {
    const { result, onSend } = setup();
    fireEvent.click(result.getByText(QUESTIONS[1]));
    expect(onSend).toHaveBeenCalledWith(QUESTIONS[1]);
  });

  it('calls onSend with the typed message on submit and forwards typing to setMessage', () => {
    const { result, onSend, setMessage } = setup({ message: 'hello there' });
    const input = result.getByLabelText(texts['a11yChatInput']) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello there!' } });
    expect(setMessage).toHaveBeenCalledWith('hello there!');
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSend).toHaveBeenCalledWith('hello there');
  });

  it('calls onSend with the Find Similar message', () => {
    const { result, onSend } = setup({}, { findSimilar: { enabled: true, message: 'More like this' } });
    fireEvent.click(result.getByText(texts['promptBoxFindSimilar']).closest('button') as HTMLButtonElement);
    expect(onSend).toHaveBeenCalledWith('More like this');
  });

  it('hides Find Similar without a productId', () => {
    const { result } = setup({ productId: undefined }, { findSimilar: { enabled: true } });
    expect(result.queryByText(texts['promptBoxFindSimilar'])).toBeNull();
  });

  it('shows new-chat only when there is a conversation, and no maximize icon either way', () => {
    const without = setup();
    expect(without.result.queryByLabelText(texts['a11yStartNewChat'])).toBeNull();
    expect(without.result.queryByLabelText('Open chat panel')).toBeNull();
    without.result.unmount();

    const { result, onNewChat } = setup({ hasConversation: true });
    expect(result.queryByLabelText('Open chat panel')).toBeNull();
    fireEvent.click(result.getByLabelText(texts['a11yStartNewChat']));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('renders the title, suggested questions and input in dark mode too', () => {
    [false, true].forEach((darkMode) => {
      const { result } = setup({}, {}, darkMode);
      expect(result.getAllByText(texts['promptBoxTitle']).length).toBeGreaterThan(0);
      QUESTIONS.forEach((q) => expect(result.getByText(q)).toBeTruthy());
      expect(result.getByLabelText(texts['a11yChatInput'])).toBeTruthy();
      result.unmount();
    });
  });

  it('does not allow sending whitespace-only text', () => {
    const { result, onSend } = setup({ message: '   ' });
    const form = (result.getByLabelText(texts['a11yChatInput']) as HTMLInputElement).closest('form') as HTMLFormElement;
    expect((form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(form);
    expect(onSend).not.toHaveBeenCalled();
  });

  describe('suggested questions', () => {
    const chipGroup = (result: RenderResult): HTMLElement => result.getByRole('group', { name: texts['a11ySuggestedReplies'] });

    it.each([[[]], [undefined]])('renders no chip row when suggestedQuestions is %j', (suggestedQuestions) => {
      const { result } = setup({}, { suggestedQuestions });
      expect(result.queryByRole('group', { name: texts['a11ySuggestedReplies'] })).toBeNull();
    });

    it('lays chips out side by side, wrapping onto the next row when space runs out', () => {
      const { className } = chipGroup(setup().result);
      expect(className).toContain('flex-wrap');
      expect(className).not.toContain('flex-col');
      expect(className).not.toContain('overflow-x-auto');
    });

    it('shows at most 5 chips by default', () => {
      const { result } = setup({}, { suggestedQuestions: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] });
      expect(chipGroup(result).querySelectorAll('button')).toHaveLength(5);
    });

    it('caps the chips at maxSuggestedQuestions, keeping the first ones', () => {
      const { result } = setup({}, { suggestedQuestions: ['q1', 'q2', 'q3', 'q4', 'q5'], maxSuggestedQuestions: 3 });
      expect(chipGroup(result).querySelectorAll('button')).toHaveLength(3);
      expect(result.queryByText('q3')).toBeTruthy();
      expect(result.queryByText('q4')).toBeNull();
    });

    it('renders chips with a transparent background, so the panel color shows through', () => {
      const chip = setup().result.getByText(QUESTIONS[0]);
      expect(chip.className).toContain('bg-transparent');
      expect(chip.className).not.toContain('bg-white');
      expect(chip.className).not.toContain('dark:bg-neutral-800');
    });

    it('renders chips in a medium weight with a thin accent border', () => {
      const chip = setup().result.getByText(QUESTIONS[0]);
      expect(chip.className).toContain('font-medium');
      expect(chip.className).not.toContain('font-semibold');
      // generalLayout.fontColor defaults to #000000
      expect(chip.style.borderColor).toMatch(/^(#000000|rgb\(0, 0, 0\))$/);
      expect(chip.style.color).toBe('rgb(0, 0, 0)');
    });
  });

  describe('title logo', () => {
    const LOGO = 'https://example.com/fitzy.gif';
    const logoImg = (result: RenderResult): HTMLImageElement | null => result.container.querySelector(`img[src="${LOGO}"]`);
    const visibleTitle = (result: RenderResult, title = texts['promptBoxTitle']): HTMLElement | undefined => result.getAllByText(title).find((el) => el.tagName === 'H2');

    it('shows the default sparkle and the title text when no logo is configured', () => {
      const { result } = setup();
      expect(logoImg(result)).toBeNull();
      expect(result.container.querySelector('svg')).toBeTruthy();
      expect(visibleTitle(result)?.className).not.toContain('sr-only');
    });

    it('shows the logo and the configured title text by default when a url is set', () => {
      const { result } = setup({}, { title: 'Ask Fitzy', titleIcon: { url: LOGO } });
      expect(logoImg(result)).toBeTruthy();
      expect(visibleTitle(result, 'Ask Fitzy')?.className).not.toContain('sr-only');
    });

    it('shows only the logo when a url is set but no title is configured, keeping a heading for screen readers', () => {
      const { result } = setup({}, { titleIcon: { url: LOGO } });
      expect(logoImg(result)).toBeTruthy();
      expect(visibleTitle(result)?.className).toContain('sr-only');
    });

    it('lets an explicit layout win over that default', () => {
      const { result } = setup({}, { titleIcon: { url: LOGO, layout: 'ICON_TEXT' } });
      expect(visibleTitle(result)?.className).not.toContain('sr-only');
    });

    it('shows only the logo for layout ICON, keeping the title for screen readers', () => {
      const { result } = setup({}, { titleIcon: { url: LOGO, layout: 'ICON' } });
      expect(logoImg(result)).toBeTruthy();
      expect(visibleTitle(result)?.className).toContain('sr-only');
    });

    it('shows the logo and the title text for layout ICON_TEXT', () => {
      const { result } = setup({}, { titleIcon: { url: LOGO, layout: 'ICON_TEXT' } });
      expect(logoImg(result)).toBeTruthy();
      expect(visibleTitle(result)?.className).not.toContain('sr-only');
    });

    it('shows only the title text for layout TEXT even if a url is set', () => {
      const { result } = setup({}, { titleIcon: { url: LOGO, layout: 'TEXT' } });
      expect(logoImg(result)).toBeNull();
      expect(visibleTitle(result)?.className).not.toContain('sr-only');
    });

    it('applies the configured logo height', () => {
      const { result } = setup({}, { titleIcon: { url: LOGO, height: 40 } });
      expect(logoImg(result)?.style.height).toBe('40px');
    });
  });

  describe('title text', () => {
    it('uses promptBox.title when set, over the localized default, also as the panel\'s accessible name', () => {
      const { result } = setup({}, { title: 'Ask Fitzy' });
      expect(result.getAllByText('Ask Fitzy').some((el) => el.tagName === 'H2')).toBe(true);
      expect(result.queryByText(texts['promptBoxTitle'])).toBeNull();
      expect(result.getByLabelText('Ask Fitzy')).toBeTruthy();
    });

    it('falls back to the localized promptBoxTitle text when no title is configured, or it is blank', () => {
      [undefined, '   '].forEach((title) => {
        const { result } = setup({}, { title });
        expect(result.getAllByText(texts['promptBoxTitle']).some((el) => el.tagName === 'H2')).toBe(true);
        result.unmount();
      });
    });

    it('does not show the drawer-level chatTitle in the panel title row', () => {
      const { result } = setup({}, { title: '' }, false, { chatTitle: 'Fitzy Assistant' });
      expect(result.queryByText('Fitzy Assistant')).toBeNull();
    });
  });

  describe('find similar', () => {
    const findSimilarButton = (result: RenderResult, label = texts['promptBoxFindSimilar']): HTMLButtonElement => result.getByText(label).closest('button') as HTMLButtonElement;

    it('is not shown unless enabled', () => {
      expect(setup().result.queryByText(texts['promptBoxFindSimilar'])).toBeNull();
    });

    it('is shown when enabled and a product id is given', () => {
      expect(setup({}, { findSimilar: { enabled: true } }).result.getByText(texts['promptBoxFindSimilar'])).toBeTruthy();
    });

    it('sits beside the text input, in the same row', () => {
      const { result } = setup({}, { findSimilar: { enabled: true } });
      expect(findSimilarButton(result).closest('form')).toBe(result.getByLabelText(texts['a11yChatInput']).closest('form'));
    });

    it('sends "find similar products" by default', () => {
      const { result, onSend } = setup({}, { findSimilar: { enabled: true } });
      fireEvent.click(findSimilarButton(result));
      expect(onSend).toHaveBeenCalledWith('find similar products');
    });

    it('uses the configured label and message', () => {
      const { result, onSend } = setup({}, { findSimilar: { enabled: true, label: 'More like this', message: 'show me alternatives' } });
      fireEvent.click(findSimilarButton(result, 'More like this'));
      expect(onSend).toHaveBeenCalledWith('show me alternatives');
    });

    it('falls back to the defaults when the configured label and message are blank', () => {
      const { result, onSend } = setup({}, { findSimilar: { enabled: true, label: '  ', message: '' } });
      fireEvent.click(findSimilarButton(result));
      expect(onSend).toHaveBeenCalledWith('find similar products');
    });

    it('is disabled while user input is not allowed (e.g. a reply is in flight), so it cannot be double-sent', () => {
      const { result, onSend } = setup({ allowUserInput: false }, { findSimilar: { enabled: true } });
      expect(findSimilarButton(result).disabled).toBe(true);
      fireEvent.click(findSimilarButton(result));
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('send button', () => {
    const FS = { findSimilar: { enabled: true } };
    const sendButton = (result: RenderResult): HTMLElement => result.getByLabelText(texts['a11ySendMessage']);
    const findSimilarButton = (result: RenderResult): HTMLElement => result.getByText(texts['promptBoxFindSimilar']).closest('button') as HTMLElement;

    it('sits inside the text input field, with the arrow icon', () => {
      const { result } = setup();
      const field = result.getByTestId('prompt-box-input-field');
      expect(field.contains(sendButton(result))).toBe(true);
      expect(field.contains(result.getByLabelText(texts['a11yChatInput']))).toBe(true);
      // SubmitChatIcon's arrow path
      expect(sendButton(result).querySelector('path')?.getAttribute('d')).toContain('M2.25 12');
    });

    it('has the same shape as the Find Similar button', () => {
      const { result } = setup({}, FS);
      expect(sendButton(result).className).toContain('rounded-md');
      expect(findSimilarButton(result).className).toContain('rounded-md');
      expect(sendButton(result).className).not.toContain('rounded-full');
    });

    it('is colored like the Find Similar button by default (accent background, light text)', () => {
      const { result } = setup({}, FS);
      expect(sendButton(result).style.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(sendButton(result).style.color).toBe('rgb(255, 255, 255)');
      expect(sendButton(result).style.backgroundColor).toBe(findSimilarButton(result).style.backgroundColor);
      expect(sendButton(result).style.color).toBe(findSimilarButton(result).style.color);
    });

    it('follows the dark-mode accent colors like Find Similar', () => {
      const { result } = setup({}, FS, true);
      expect(sendButton(result).style.backgroundColor).toBe(findSimilarButton(result).style.backgroundColor);
      expect(sendButton(result).style.color).toBe(findSimilarButton(result).style.color);
      expect(sendButton(result).style.backgroundColor).not.toBe('rgb(0, 0, 0)');
    });

    describe('promptBox.buttonColors', () => {
      const colors = { backgroundColor: '#112233', fontColor: '#ffeedd', backgroundColorDark: '#445566', fontColorDark: '#aabbcc' };

      it('colors both buttons', () => {
        const { result } = setup({}, { ...FS, buttonColors: colors });
        [sendButton(result), findSimilarButton(result)].forEach((button) => {
          expect(button.style.backgroundColor).toBe('rgb(17, 34, 51)');
          expect(button.style.color).toBe('rgb(255, 238, 221)');
        });
      });

      it('uses the dark-mode colors in dark mode', () => {
        const { result } = setup({}, { ...FS, buttonColors: colors }, true);
        [sendButton(result), findSimilarButton(result)].forEach((button) => {
          expect(button.style.backgroundColor).toBe('rgb(68, 85, 102)');
          expect(button.style.color).toBe('rgb(170, 187, 204)');
        });
      });

      it('falls back to the default accent for any color left unset', () => {
        const { result } = setup({}, { ...FS, buttonColors: { backgroundColor: '#112233' } });
        expect(sendButton(result).style.backgroundColor).toBe('rgb(17, 34, 51)');
        expect(sendButton(result).style.color).toBe('rgb(255, 255, 255)');
      });
    });
  });

  describe('message above the chips', () => {
    const MESSAGE = 'Need a hand?';

    it('is not shown unless configured, or when configured blank', () => {
      expect(setup().result.queryByText(MESSAGE)).toBeNull();
      expect(setup({}, { message: '   ' }).result.container.querySelector('[data-testid="prompt-box-message"]')).toBeNull();
    });

    it('is shown between the title row and the suggestion chips', () => {
      const { result } = setup({}, { message: MESSAGE });
      const message = result.getByText(MESSAGE);
      const heading = result.getAllByText(texts['promptBoxTitle']).find((el) => el.tagName === 'H2') as HTMLElement;
      const chips = result.getByRole('group', { name: texts['a11ySuggestedReplies'] });
      const order = Array.from(result.container.querySelectorAll('*'));
      expect(order.indexOf(heading)).toBeLessThan(order.indexOf(message));
      expect(order.indexOf(message)).toBeLessThan(order.indexOf(chips));
    });

    it('is small, gray and medium weight', () => {
      const { className } = setup({}, { message: MESSAGE }).result.getByText(MESSAGE);
      expect(className).toContain('text-xs');
      expect(className).toContain('font-medium');
      expect(className).toContain('text-neutral-600');
    });

    it('is shown even when there are no suggested questions', () => {
      expect(setup({}, { suggestedQuestions: [], message: MESSAGE }).result.getByText(MESSAGE)).toBeTruthy();
    });

    it('stays once a conversation has started, since the panel never turns into a chat', () => {
      expect(setup({ hasConversation: true }, { message: MESSAGE }).result.getByText(MESSAGE)).toBeTruthy();
    });
  });

  describe('input icon', () => {
    const ICON = 'https://example.com/face.png';
    const iconImg = (result: RenderResult): HTMLImageElement | null => result.container.querySelector(`img[src="${ICON}"]`);

    it('is not shown unless configured', () => {
      const { result } = setup();
      expect(iconImg(result)).toBeNull();
      expect(result.container.querySelector('[data-testid="prompt-box-input-field"] img')).toBeNull();
    });

    it('is shown inside the input field, before the text', () => {
      const { result } = setup({}, { inputIcon: { url: ICON } });
      const input = result.getByLabelText(texts['a11yChatInput']);
      const field = result.getByTestId('prompt-box-input-field');
      expect(iconImg(result)).toBeTruthy();
      expect(field.contains(iconImg(result))).toBe(true);
      expect(iconImg(result)?.parentElement?.parentElement).toBe(input.parentElement);
      const order = Array.from(field.querySelectorAll('*'));
      expect(order.indexOf(iconImg(result) as HTMLElement)).toBeLessThan(order.indexOf(input));
    });

    it('is decorative and does not take clicks away from the input', () => {
      const { result } = setup({}, { inputIcon: { url: ICON } });
      expect(iconImg(result)?.getAttribute('aria-hidden')).toBe('true');
      expect(iconImg(result)?.closest('.pointer-events-none')).toBeTruthy();
    });

    it('applies the configured icon height', () => {
      const { result } = setup({}, { inputIcon: { url: ICON, height: 28 } });
      expect(iconImg(result)?.style.height).toBe('28px');
    });
  });
});
