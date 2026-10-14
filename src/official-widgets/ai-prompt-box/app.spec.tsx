import { act, render, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import App from './app';
import { DEFAULT_CUSTOMIZATIONS } from './default-config';
import { createMockWidgetClient, createWidgetConfig } from '../../common/test-utils';

// AppWrapper (config state, ShadowWrapper, IntlProvider) is not the point here — only that App
// gates on data-pid and hands the id down.
jest.mock('../../common/components/app-wrapper', () => ({
  __esModule: true,
  AppWrapper: ({ children }: { children: ReactNode }): ReactElement => <div data-testid='app-wrapper'>{children}</div>,
}));
jest.mock('./ai-prompt-box', () => ({
  __esModule: true,
  default: ({ productId }: { productId: string }): ReactElement => <div data-testid='ai-prompt-box' data-pid={productId} />,
}));

const renderApp = (dataPid?: string): ReturnType<typeof render> => {
  const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
  const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_prompt_box');
  const element = document.createElement('div');
  if (dataPid !== undefined) {
    element.dataset['pid'] = dataPid;
  }
  return render(<App widgetConfig={widgetConfig} widgetClient={widgetClient} element={element} />);
};

describe('ai-prompt-box App', () => {
  it('passes data-pid down as productId', () => {
    const { getByTestId } = renderApp('pid-123');
    expect(getByTestId('ai-prompt-box').getAttribute('data-pid')).toBe('pid-123');
  });

  it.each([undefined, '', '   ', 'undefined', 'null', '{{ product.id }}', '<product-id>'])('still renders, with an empty productId, when data-pid is %j', (pid) => {
    const { getByTestId } = renderApp(pid);
    expect(getByTestId('app-wrapper')).toBeTruthy();
    expect(getByTestId('ai-prompt-box').getAttribute('data-pid')).toBe('');
  });

  describe('when data-pid changes after the widget is shown (e.g. a single-page app moves to another product)', () => {
    const renderWithElement = (dataPid: string): { element: HTMLElement; getPid: () => string | null } => {
      const widgetConfig = createWidgetConfig(DEFAULT_CUSTOMIZATIONS);
      const { widgetClient } = createMockWidgetClient(widgetConfig, 'wigmix_ai_prompt_box');
      const element = document.createElement('div');
      element.setAttribute('data-pid', dataPid);
      const { getByTestId } = render(<App widgetConfig={widgetConfig} widgetClient={widgetClient} element={element} />);
      return { element, getPid: () => getByTestId('ai-prompt-box').getAttribute('data-pid') };
    };

    it('passes the new product id down', async () => {
      const { element, getPid } = renderWithElement('p1');
      expect(getPid()).toBe('p1');
      act(() => {
        element.setAttribute('data-pid', 'p2');
      });
      await waitFor(() => expect(getPid()).toBe('p2'));
    });

    it.each(['', '   ', 'undefined', '{{ product.id }}'])('treats a change to %j as no product', async (value) => {
      const { element, getPid } = renderWithElement('p1');
      act(() => {
        element.setAttribute('data-pid', value);
      });
      await waitFor(() => expect(getPid()).toBe(''));
    });

    it('picks up a product id that appears after starting without one', async () => {
      const { element, getPid } = renderWithElement('');
      expect(getPid()).toBe('');
      act(() => {
        element.setAttribute('data-pid', 'p9');
      });
      await waitFor(() => expect(getPid()).toBe('p9'));
    });
  });
});
