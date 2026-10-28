import { cn } from '@heroui/theme';
import { type FC, type KeyboardEvent, type ReactElement, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RootContext } from '../shadow-wrapper';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface AddToCartOptionsModalProps {
  // Any element inside the product card; used to find the widget modal (if any) the card lives in.
  anchor: HTMLElement | null;
  onClose: () => void;
  children: ReactElement;
}

// Modal for the add-to-cart options, same approach as the vogacloset size modal: when the card sits
// inside a widget modal (e.g. the shopping assistant), the backdrop covers just that modal;
// otherwise it covers the viewport from the widget's shadow root. Rendered in place when neither
// is available (e.g. in unit tests).
const AddToCartOptionsModal: FC<AddToCartOptionsModalProps> = ({ anchor, onClose, children }) => {
  const shadowRoot = useContext(RootContext);
  const dialogRef = useRef<HTMLDivElement>(null);
  const widgetModal = anchor?.closest('.wigmix-modal') as HTMLElement | null;
  const portalTarget = widgetModal || shadowRoot;

  // Moves focus into the dialog on open and gives it back to whatever opened it (the add-to-cart
  // button) on close. activeElement is read off the root node, since inside the widget's shadow
  // root document.activeElement is only the shadow host.
  useEffect(() => {
    const root = (dialogRef.current?.getRootNode() || document) as Document | ShadowRoot;
    const previouslyFocused = root.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return (): void => {
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  // Keeps Tab / Shift+Tab inside the dialog (aria-modal), wrapping at either end.
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>): void => {
    const dialog = dialogRef.current;
    if (event.key !== 'Tab' || !dialog) {
      return;
    }
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((el) => !el.closest('.invisible'));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = (dialog.getRootNode() as Document | ShadowRoot).activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const modal = (
    <div
      className={cn(
        widgetModal || !portalTarget ? 'absolute inset-0' : 'fixed inset-0',
        'wigmix-add-to-cart-options-modal z-[9999] flex items-center justify-center px-4',
      )}
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      data-testid='wigmix-add-to-cart-options-modal'
      onMouseDown={onClose}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        tabIndex={-1}
        className='wigmix-add-to-cart-options-dialog flex max-h-[90%] w-full max-w-md flex-col overflow-y-auto rounded-2xl bg-primary p-4 text-primary shadow-2xl outline-none'
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
            return;
          }
          trapFocus(event);
        }}
      >
        {children}
      </div>
    </div>
  );

  return portalTarget ? createPortal(modal, portalTarget) : modal;
};

export default AddToCartOptionsModal;
