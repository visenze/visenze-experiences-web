import { fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import FloatingLauncherButton from './FloatingLauncherButton';

describe('FloatingLauncherButton', () => {
  const config = {
    position: 'left' as const,
    triggerIcon: { layout: 'ICON' as const, hide: false, color: '', colorDark: '', backgroundColor: '#111111', backgroundColorDark: '#222222' },
  };

  it('renders and calls onClick', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(
      <FloatingLauncherButton config={config} text='Open assistant' darkMode={false} onClick={onClick} defaultIcon={<svg />} />,
    );
    const button = getByTestId('wigmix-floating-launcher-button');
    expect(button.getAttribute('aria-label')).toBe('Open assistant');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when triggerIcon.hide is true', () => {
    const { queryByTestId } = render(
      <FloatingLauncherButton
        config={{ ...config, triggerIcon: { ...config.triggerIcon, hide: true } }}
        text='Open assistant'
        darkMode={false}
        onClick={jest.fn()}
        defaultIcon={<svg />}
      />,
    );
    expect(queryByTestId('wigmix-floating-launcher-button')).toBeNull();
  });

  it('forwards the ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<FloatingLauncherButton ref={ref} config={config} text='Open assistant' darkMode={false} onClick={jest.fn()} defaultIcon={<svg />} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
