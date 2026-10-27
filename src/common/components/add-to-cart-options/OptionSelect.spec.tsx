import { fireEvent, render, screen } from '@testing-library/react';
import OptionSelect from './OptionSelect';

describe('OptionSelect', () => {
  const renderSelect = (value?: string, onChange = jest.fn(), onParentKeyDown = jest.fn()): void => {
    render(
      <div onKeyDown={onParentKeyDown}>
        <OptionSelect label='Colour' values={['Black', 'White']} value={value} onChange={onChange} placeholder='Select Colour' />
        <button type='button'>Outside</button>
      </div>,
    );
  };

  it('shows the placeholder, opens the list and selects a value', () => {
    const onChange = jest.fn();
    renderSelect(undefined, onChange);
    const trigger = screen.getByRole('combobox', { name: 'Colour' });
    expect(trigger.textContent).toBe('Select Colour');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('option', { name: 'White' }));

    expect(onChange).toHaveBeenCalledWith('White');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows the selected value on the trigger', () => {
    renderSelect('Black');
    expect(screen.getByRole('combobox', { name: 'Colour' }).textContent).toBe('Black');
  });

  it('opens with the arrow key and closes with Escape without letting Escape reach the pop-up', () => {
    const onParentKeyDown = jest.fn();
    renderSelect(undefined, jest.fn(), onParentKeyDown);
    const trigger = screen.getByRole('combobox', { name: 'Colour' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onParentKeyDown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
  });

  it('closes when clicking outside', () => {
    renderSelect();
    fireEvent.click(screen.getByRole('combobox', { name: 'Colour' }));
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
