import { act, fireEvent, render } from '@testing-library/react';
import { useHidePageBehindModal, useReturnFocusOnClose } from './use-modal-a11y';

// Mimics the widget's DOM: a dialog inside a shadow root hosted directly under <body>, next to host-page content.
const Harness = ({ open, labelId }: { open: boolean; labelId: string }): null => {
  useHidePageBehindModal(open, labelId);
  useReturnFocusOnClose(open);
  return null;
};

const mountPage = (): { pageContent: HTMLElement; trigger: HTMLButtonElement; widgetHost: HTMLElement; closeAll: () => void } => {
  const pageContent = document.createElement('main');
  const trigger = document.createElement('button');
  trigger.textContent = 'open';
  pageContent.appendChild(trigger);
  const widgetHost = document.createElement('div');
  const shadow = widgetHost.attachShadow({ mode: 'open' });
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'title-id');
  const inside = document.createElement('button');
  dialog.appendChild(inside);
  shadow.appendChild(dialog);
  document.body.append(pageContent, widgetHost);
  return { pageContent, trigger, widgetHost, closeAll: (): void => { pageContent.remove(); widgetHost.remove(); } };
};

describe('useHidePageBehindModal', () => {
  it('hides the other children of <body> while open, never the dialog\'s own host, and restores them on close', () => {
    const { pageContent, widgetHost, closeAll } = mountPage();
    const alreadyHidden = document.createElement('aside');
    alreadyHidden.setAttribute('aria-hidden', 'true');
    document.body.appendChild(alreadyHidden);

    const view = render(<Harness open labelId='title-id' />);
    expect(pageContent.getAttribute('aria-hidden')).toBe('true');
    expect(widgetHost.hasAttribute('aria-hidden')).toBe(false);

    view.rerender(<Harness open={false} labelId='title-id' />);
    expect(pageContent.hasAttribute('aria-hidden')).toBe(false);
    expect(alreadyHidden.getAttribute('aria-hidden')).toBe('true');
    alreadyHidden.remove();
    closeAll();
  });

  it('hides nothing while closed', () => {
    const { pageContent, closeAll } = mountPage();
    render(<Harness open={false} labelId='title-id' />);
    expect(pageContent.hasAttribute('aria-hidden')).toBe(false);
    closeAll();
  });
});

describe('useReturnFocusOnClose', () => {
  it('focuses the element last used outside the dialog when it closes', () => {
    const { trigger, closeAll } = mountPage();
    const view = render(<Harness open={false} labelId='title-id' />);
    fireEvent.click(trigger);
    view.rerender(<Harness open labelId='title-id' />);
    expect(document.activeElement).not.toBe(trigger);

    act(() => view.rerender(<Harness open={false} labelId='title-id' />));
    expect(document.activeElement).toBe(trigger);
    closeAll();
  });
});
