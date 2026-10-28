import { useEffect, useRef } from 'react';

const NON_CONTENT_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE']);

const isModalDialog = (node: EventTarget): boolean => node instanceof HTMLElement && node.getAttribute('role') === 'dialog' && node.getAttribute('aria-modal') === 'true';

// document.querySelector does not pierce the shadow roots the widget renders in.
const deepFind = (root: Document | ShadowRoot, predicate: (el: Element) => boolean): Element | null => {
  const elements = Array.from(root.querySelectorAll('*'));
  for (let i = 0; i < elements.length; i += 1) {
    const el = elements[i];
    if (predicate(el)) {
      return el;
    }
    if (el.shadowRoot) {
      const found = deepFind(el.shadowRoot, predicate);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

// The direct child of <body> that holds `node`, climbing out of any shadow roots on the way.
const bodyChildOf = (node: Node): HTMLElement | null => {
  let current: Node | null = node;
  while (current) {
    if (current.parentNode === document.body) {
      return current as HTMLElement;
    }
    const parent: Node | null = current.parentNode;
    current = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return null;
};

/**
 * Hides the host page from assistive technology while a modal dialog is open (aria-hidden on every other
 * child of <body>), the way react-modal does for its `appElement`. react-modal cannot do it here: the
 * widget's dialogs live inside shadow roots under <body>, so hiding <body> would hide the dialog too.
 *
 * `dialogLabelId` is the id the dialog is labelled by (its `aria-labelledby`), which finds the dialog
 * through the shadow roots. Only elements this hook hid are restored, and an element that was already
 * aria-hidden is left alone.
 */
export const useHidePageBehindModal = (open: boolean, dialogLabelId: string): void => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const hidden: HTMLElement[] = [];
    let frame = 0;
    let attempts = 0;
    let keep: HTMLElement | null = null;
    const hideOthers = (): void => {
      if (!keep) {
        return;
      }
      Array.from(document.body.children).forEach((child) => {
        if (child === keep || !(child instanceof HTMLElement) || NON_CONTENT_TAGS.has(child.tagName) || child.hasAttribute('aria-hidden')) {
          return;
        }
        child.setAttribute('aria-hidden', 'true');
        hidden.push(child);
      });
    };
    const findDialog = (): void => {
      const dialog = deepFind(document, (el) => isModalDialog(el) && el.getAttribute('aria-labelledby') === dialogLabelId);
      keep = dialog && bodyChildOf(dialog);
      if (keep) {
        hideOthers();
        return;
      }
      // The dialog is portaled in a render after `open` flips: look again for a few frames (a full-document
      // scan each time, so only briefly). A host added to <body> later retries through the observer below.
      attempts += 1;
      if (attempts < 60) {
        frame = requestAnimationFrame(findDialog);
      }
    };
    // Also hides anything the host page (or another widget) adds to <body> while the dialog is open, and
    // finds a dialog whose portal host arrives after the retry frames ran out (e.g. a throttled tab).
    const observer = new MutationObserver(() => (keep ? hideOthers() : findDialog()));
    observer.observe(document.body, { childList: true });
    findDialog();
    return (): void => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      hidden.forEach((el) => el.removeAttribute('aria-hidden'));
    };
  }, [open, dialogLabelId]);
};

/**
 * Puts focus back on what the shopper used to open a modal, when it closes. react-modal's own return of focus
 * stores document.activeElement, which inside a shadow root is only the shadow host, so a dialog opened from a
 * widget button would otherwise drop focus on <body>. This remembers the last element focused or clicked outside
 * any modal dialog (clicks too, since Safari does not focus a button on click) and focuses it on close.
 */
export const useReturnFocusOnClose = (open: boolean): void => {
  const lastOutside = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const record = (event: Event): void => {
      const path = event.composedPath();
      const target = path[0];
      if (target instanceof HTMLElement && !path.some(isModalDialog)) {
        lastOutside.current = target;
      }
    };
    document.addEventListener('focusin', record, true);
    document.addEventListener('click', record, true);
    return (): void => {
      document.removeEventListener('focusin', record, true);
      document.removeEventListener('click', record, true);
    };
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open && lastOutside.current?.isConnected) {
      lastOutside.current.focus();
    }
    wasOpen.current = open;
  }, [open]);
};
