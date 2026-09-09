import { fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import FloatingLauncherButton, { type FloatingLauncherButtonProps } from './FloatingLauncherButton';
import { firePointerEvent } from '../../../common/test-utils';

describe('FloatingLauncherButton', () => {
  const config = {
    position: 'left' as const,
    triggerIcon: { layout: 'ICON' as const, hide: false, color: '', colorDark: '', backgroundColor: '#111111', backgroundColorDark: '#222222' },
  };

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  const renderButton = (overrides: Partial<FloatingLauncherButtonProps> = {}): ReturnType<typeof render> => render(
    <FloatingLauncherButton
      config={config}
      text='Open assistant'
      darkMode={false}
      onClick={jest.fn()}
      defaultIcon={<svg />}
      corner='bottom-right'
      onCornerChange={jest.fn()}
      {...overrides}
    />,
  );

  it('renders and calls onClick', () => {
    const onClick = jest.fn();
    const { getByTestId } = renderButton({ onClick });
    const button = getByTestId('wigmix-floating-launcher-button');
    expect(button.getAttribute('aria-label')).toBe('Open assistant');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when triggerIcon.hide is true', () => {
    const { queryByTestId } = renderButton({
      config: { ...config, triggerIcon: { ...config.triggerIcon, hide: true } },
    });
    expect(queryByTestId('wigmix-floating-launcher-button')).toBeNull();
  });

  it('forwards the ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <FloatingLauncherButton
        ref={ref}
        config={config}
        text='Open assistant'
        darkMode={false}
        onClick={jest.fn()}
        defaultIcon={<svg />}
        corner='bottom-right'
        onCornerChange={jest.fn()}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('drags the button to the opposite corner and calls onCornerChange, suppressing the resulting click', () => {
    const onClick = jest.fn();
    const onCornerChange = jest.fn();
    const { getByTestId } = renderButton({ onClick, onCornerChange });
    const button = getByTestId('wigmix-floating-launcher-button');

    firePointerEvent(button, 'pointerdown', { clientX: 976, clientY: 720 });
    firePointerEvent(button, 'pointermove', { clientX: 100, clientY: 100 });
    firePointerEvent(button, 'pointerup', { clientX: 100, clientY: 100 });
    fireEvent.click(button);

    expect(onCornerChange).toHaveBeenCalledWith('top-left');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('still opens on a plain click that never crosses the drag threshold', () => {
    const onClick = jest.fn();
    const onCornerChange = jest.fn();
    const { getByTestId } = renderButton({ onClick, onCornerChange });
    const button = getByTestId('wigmix-floating-launcher-button');

    firePointerEvent(button, 'pointerdown', { clientX: 976, clientY: 720 });
    firePointerEvent(button, 'pointerup', { clientX: 976, clientY: 720 });
    fireEvent.click(button);

    expect(onCornerChange).not.toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
