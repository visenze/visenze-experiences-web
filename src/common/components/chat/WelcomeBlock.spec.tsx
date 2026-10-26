import { fireEvent, render, screen } from '@testing-library/react';
import WelcomeBlock, { getWelcomeSpokenGreeting, isWelcomeEnabled } from './WelcomeBlock';

describe('isWelcomeEnabled', () => {
  it('is false when unset, disabled, or enabled with no content', () => {
    expect(isWelcomeEnabled(undefined)).toBe(false);
    expect(isWelcomeEnabled({ enabled: false, title: 'Hi' })).toBe(false);
    expect(isWelcomeEnabled({ enabled: true })).toBe(false);
  });

  it('is true when enabled with any content', () => {
    expect(isWelcomeEnabled({ enabled: true, title: 'Hi' })).toBe(true);
    expect(isWelcomeEnabled({ enabled: true, suggestions: ['a'] })).toBe(true);
  });
});

describe('getWelcomeSpokenGreeting', () => {
  it('returns the message only when the welcome and message are enabled', () => {
    expect(getWelcomeSpokenGreeting({ enabled: true, title: 'Hi', spokenGreeting: 'Hello' })).toBe('Hello');
    expect(getWelcomeSpokenGreeting({ enabled: true, title: 'Hi', spokenGreeting: 'Hello', spokenGreetingEnabled: false })).toBe('');
    expect(getWelcomeSpokenGreeting({ enabled: true, title: 'Hi' })).toBe('');
    expect(getWelcomeSpokenGreeting({ enabled: false, title: 'Hi', spokenGreeting: 'Hello' })).toBe('');
  });
});

describe('WelcomeBlock', () => {
  it('renders title, intro, label and chips, and sends the chip text on click', () => {
    const onSelect = jest.fn();
    render(
      <WelcomeBlock
        welcome={{ enabled: true, title: 'Hi, I\'m Fitzy', intro: 'Intro text', suggestionsLabel: 'Start here', suggestions: ['One', 'Two', 'Three'] }}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Hi, I\'m Fitzy' })).toBeTruthy();
    expect(screen.getByText('Intro text')).toBeTruthy();
    expect(screen.getByText('Start here')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Two' }));
    expect(onSelect).toHaveBeenCalledWith('Two');
    // An odd final chip spans the full row.
    expect(screen.getByRole('button', { name: 'Three' }).className).toContain('col-span-2');
    expect(screen.getByRole('button', { name: 'One' }).className).not.toContain('col-span-2');
  });

  it('hides the label when there are no suggestions', () => {
    render(<WelcomeBlock welcome={{ enabled: true, title: 'Hi', suggestionsLabel: 'Start here' }} onSelect={jest.fn()} />);
    expect(screen.queryByText('Start here')).toBeNull();
  });
});
