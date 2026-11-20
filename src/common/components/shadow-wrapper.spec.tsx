import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { ShadowRootHost } from './shadow-wrapper';

describe('ShadowRootHost', () => {
  it('attaches an open shadow root to the host and portals the children into it', () => {
    const { container } = render(
      <ShadowRootHost style={{ display: 'block' }}>
        <span data-testid='child'>hello</span>
      </ShadowRootHost>,
    );

    const host = container.firstElementChild as HTMLDivElement;
    expect(host.tagName).toBe('DIV');
    expect(host.style.display).toBe('block');
    expect(host.shadowRoot).not.toBeNull();
    expect(host.shadowRoot?.mode).toBe('open');
    // The child lives in the shadow root, not in the host's light DOM.
    expect(host.shadowRoot?.querySelector('[data-testid="child"]')?.textContent).toBe('hello');
    expect(host.querySelector('[data-testid="child"]')).toBeNull();
  });

  it('reuses the existing shadow root when effects run twice (StrictMode)', () => {
    const attachShadow = jest.spyOn(HTMLElement.prototype, 'attachShadow');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { container } = render(
      <StrictMode>
        <ShadowRootHost style={{}}>
          <span data-testid='child'>hello</span>
        </ShadowRootHost>
      </StrictMode>,
    );

    const host = container.firstElementChild as HTMLDivElement;
    expect(attachShadow).toHaveBeenCalledTimes(1);
    expect(host.shadowRoot?.querySelectorAll('[data-testid="child"]')).toHaveLength(1);
    expect(errorSpy).not.toHaveBeenCalled();

    attachShadow.mockRestore();
    errorSpy.mockRestore();
  });

  it('renders nothing and logs an error when the shadow root cannot be attached', () => {
    const attachShadow = jest.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(() => {
      throw new Error('NotSupportedError');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { container } = render(
      <ShadowRootHost style={{}}>
        <span data-testid='child'>hello</span>
      </ShadowRootHost>,
    );

    // Children are not rendered into the light DOM, so the widget's CSS can't leak into the host page.
    expect(container.querySelector('[data-testid="child"]')).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Rezolve widget: unable to attach shadow root', expect.any(Error));

    attachShadow.mockRestore();
    errorSpy.mockRestore();
  });
});
