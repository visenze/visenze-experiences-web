import { fireEvent, render, screen } from '@testing-library/react';
import { type FC, useState } from 'react';
import AddToCartOptionsModal from './AddToCartOptionsModal';

const Harness: FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>Add to cart</button>
      {open && (
        <AddToCartOptionsModal anchor={null} onClose={() => setOpen(false)}>
          <div>
            <button type='button'>First</button>
            <button type='button' disabled>Disabled</button>
            <button type='button'>Last</button>
          </div>
        </AddToCartOptionsModal>
      )}
    </>
  );
};

describe('AddToCartOptionsModal', () => {
  const openModal = (): HTMLElement => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Add to cart' });
    trigger.focus();
    fireEvent.click(trigger);
    return trigger;
  };

  it('moves focus into the dialog when it opens', () => {
    openModal();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('keeps Tab and Shift+Tab inside the dialog', () => {
    openModal();
    const dialog = screen.getByRole('dialog');
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('closes on Escape and gives focus back to the button that opened it', () => {
    const trigger = openModal();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
