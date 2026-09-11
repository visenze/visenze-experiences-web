import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { IntlProvider } from 'react-intl';
import TurnSection from './TurnSection';
import type { ConversationTurn } from '../embedded-shopping-assistant';

const messages = {
  aiOverviewLabel: 'AI Overview',
  gettingOverview: 'Getting overview...',
  findingProducts: 'Finding products...',
  seeResults: 'See Results',
};

const createTurn = (overrides: Partial<ConversationTurn> = {}): ConversationTurn => ({
  id: '0',
  title: 'running shoes',
  aiText: 'Here are some options.',
  products: [],
  isLoading: false,
  isInitial: true,
  productsExpanded: false,
  ...overrides,
});

type TurnSectionProps = ComponentProps<typeof TurnSection>;

const renderTurn = (props: Partial<TurnSectionProps> = {}): ReturnType<typeof render> => render(
  <IntlProvider messages={messages} locale='en' defaultLocale='en'>
    <TurnSection
      turn={createTurn()}
      onShowProducts={jest.fn()}
      {...props}
    />
  </IntlProvider>,
);

describe('TurnSection', () => {
  it('fades the clamped AI-text preview into the configured backgroundColor, not a hardcoded white/neutral-900', () => {
    const { container } = renderTurn({ backgroundColor: '#123456' });

    const fade = container.querySelector('.pointer-events-none.absolute.inset-x-0.bottom-0') as HTMLElement;
    expect(fade).toBeTruthy();
    // Previously a static Tailwind bg-gradient-to-t from-white/dark:from-neutral-900 class pair —
    // disconnected from customizations.generalLayout.backgroundColor, so any non-default host
    // background showed a mismatched strip at the bottom of the summary. The fade must instead
    // resolve from the same backgroundColor the surrounding surface actually uses.
    // Asserted via data-fade-color, not the inline style itself: jsdom's CSSOM can't parse
    // linear-gradient() at all (confirmed directly — even React fails to write any style
    // attribute for it in jsdom, though it renders correctly in real browsers), so the actual
    // style is untestable here; data-fade-color exists purely so this contract stays verifiable.
    expect(fade.getAttribute('data-fade-color')).toBe('#123456');
  });

  it('colors the pre-expansion "AI Overview" title with the configured iconColor, not a hardcoded gray', () => {
    const { getByText } = renderTurn({ iconColor: '#654321' });

    const title = getByText('AI Overview');
    expect(title.style.color).toBe('rgb(101, 67, 33)');
  });

  it('colors the "See Results" button\'s text and border with the configured seeResultsButtonColor, not a hardcoded gray', () => {
    const { getByRole } = renderTurn({ seeResultsButtonColor: '#123abc' });

    const button = getByRole('button', { name: /See Results/ });
    expect(button.style.color).toBe('rgb(18, 58, 188)');
    // jsdom's CSSOM doesn't normalize a bare border-color (no border-style/width set alongside
    // it) into rgb() the way it does for `color` — it round-trips the literal value instead.
    expect(button.style.borderColor).toBe('#123abc');
  });
});
