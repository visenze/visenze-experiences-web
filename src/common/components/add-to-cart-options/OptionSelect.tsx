import { cn } from '@heroui/theme';
import {
  type CSSProperties, type FC, type KeyboardEvent, useContext, useEffect, useId, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import ChevronDownIcon from '../../icons/ChevronDownIcon';
import { RootContext } from '../shadow-wrapper';

interface OptionSelectProps {
  label: string;
  values: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  // Shown on the trigger while nothing is selected.
  placeholder: string;
}

const LIST_MAX_HEIGHT = 192;
const LIST_GAP = 4;
// HeroUI listbox-item look, written out here (instead of @heroui/theme's listboxItem()) so Tailwind
// generates these classes for every widget, not only those that bundle HeroUI's listbox styles.
const ITEM_CLASSES = 'flex w-full cursor-pointer items-center justify-between gap-2 rounded-small px-2 py-1.5 text-sm outline-none '
  + 'hover:bg-default/40 focus:bg-default/40';

// Drop-down with HeroUI's list styling. Interaction is handled here rather than by HeroUI's
// Listbox: its React Aria press handling listens on the document, which can't see clicks inside the
// widget's Shadow DOM, so options couldn't be selected. The list floats above the content (portalled
// into the widget modal or the shadow root, so widget styles still apply) instead of pushing the
// layout, which also keeps it from being hidden behind neighbouring product cards.
const OptionSelect: FC<OptionSelectProps> = ({ label, values, value, onChange, placeholder }) => {
  const shadowRoot = useContext(RootContext);
  const [isOpen, setIsOpen] = useState(false);
  const [listStyle, setListStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const listId = useId();

  const widgetModal = triggerRef.current?.closest('.wigmix-modal') as HTMLElement | null | undefined;
  const portalTarget = widgetModal || shadowRoot;

  const close = (refocus = true): void => {
    setIsOpen(false);
    if (refocus) {
      triggerRef.current?.focus();
    }
  };

  // Position the floating list under the trigger (or above it when there is no room below).
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!isOpen || !trigger || !portalTarget) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const listHeight = Math.min(values.length * 36 + 8, LIST_MAX_HEIGHT);
    const bounds = widgetModal ? widgetModal.getBoundingClientRect() : { top: 0, left: 0, bottom: window.innerHeight };
    const opensUp = rect.bottom + LIST_GAP + listHeight > bounds.bottom && rect.top - LIST_GAP - listHeight > bounds.top;
    const top = opensUp ? rect.top - LIST_GAP - listHeight : rect.bottom + LIST_GAP;
    setListStyle({
      position: widgetModal ? 'absolute' : 'fixed',
      top: widgetModal ? top - bounds.top + widgetModal.scrollTop : top,
      left: widgetModal ? rect.left - bounds.left + widgetModal.scrollLeft : rect.left,
      width: rect.width,
      zIndex: 10000,
    });
  }, [isOpen]);

  // Focus the selected (or first) option when opening.
  useEffect(() => {
    if (isOpen) {
      const index = value ? values.indexOf(value) : 0;
      optionRefs.current[Math.max(index, 0)]?.focus();
    }
  }, [isOpen]);

  // Close on a click outside, and on scroll/resize (the floating list would otherwise drift away
  // from its trigger). Listens on the root node so it works inside the Shadow DOM.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const root = (rootRef.current?.getRootNode() || document) as Document | ShadowRoot;
    const onPointerDown = (event: Event): void => {
      const path = event.composedPath();
      if (!path.some((node) => node === rootRef.current || node === listRef.current)) {
        close(false);
      }
    };
    const onScroll = (event: Event): void => {
      if (!listRef.current?.contains(event.target as Node)) {
        close(false);
      }
    };
    const onResize = (): void => close(false);
    root.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return (): void => {
      root.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  const select = (optionValue: string): void => {
    onChange(optionValue);
    close();
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = optionRefs.current.findIndex((el) => el === (event.target as HTMLElement));
    if (event.key === 'Escape' || event.key === 'Tab') {
      // Close only the list, not the pop-up around it.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      optionRefs.current[(current + step + values.length) % values.length]?.focus();
    } else if ((event.key === 'Enter' || event.key === ' ') && current >= 0) {
      event.preventDefault();
      select(values[current]);
    }
  };

  const list = (
    <div
      ref={listRef}
      id={listId}
      role='listbox'
      aria-label={label}
      className={cn(
        'wigmix-option-select-list overflow-y-auto border border-gray-200 bg-white p-1 text-black shadow-medium',
        'dark:border-neutral-700 dark:bg-neutral-900 dark:text-white rounded-xl',
      )}
      style={{ ...listStyle, maxHeight: LIST_MAX_HEIGHT }}
      onKeyDown={onListKeyDown}
      // Keep clicks inside the list from reaching the pop-up's backdrop (it closes on mousedown).
      onMouseDown={(event) => event.stopPropagation()}
    >
      {values.map((optionValue, index) => {
        const isSelected = optionValue === value;
        return (
          <div
            key={optionValue}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            role='option'
            aria-selected={isSelected}
            tabIndex={-1}
            className={cn(ITEM_CLASSES, isSelected && 'font-medium')}
            onClick={() => select(optionValue)}
          >
            <span className='truncate'>{optionValue}</span>
            {isSelected && <span aria-hidden='true'>✓</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className='wigmix-option-select relative'>
      <button
        ref={triggerRef}
        type='button'
        role='combobox'
        aria-label={label}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        className={cn(
          'wigmix-option-select-trigger flex w-full cursor-pointer items-center justify-between gap-2 text-left text-sm text-inherit transition-colors',
          'rounded-full border-0 bg-black/5 px-4 py-3 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20',
          FOCUS_VISIBLE_CLASSES,
        )}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={cn('truncate', !value && 'opacity-60')}>{value || placeholder}</span>
        <ChevronDownIcon className={cn('size-3 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {/* Without a widget modal or shadow root (e.g. in unit tests) the list is rendered in place. */}
      {isOpen && (portalTarget ? createPortal(list, portalTarget) : <div className='absolute inset-x-0 top-full z-50 mt-1'>{list}</div>)}
    </div>
  );
};

export default OptionSelect;
