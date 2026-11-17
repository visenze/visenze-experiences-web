import { act, cleanup, renderHook } from '@testing-library/react';
import useDockedPagePush, {
  CENTERING_OPT_OUT_ATTRIBUTE, DOCK_EVENT, DOCKED_CLASS, DOCKED_WIDTH_VAR, type DockedPagePushOptions, type DockEventDetail, type DockLayout,
} from './use-docked-page-push';

type Rect = { left: number; top: number; width: number; height: number };

// jsdom has no layout: give elements a box, the way a browser would.
const setRect = (el: Element, { left, top, width, height }: Rect): void => {
  // eslint-disable-next-line no-param-reassign
  el.getBoundingClientRect = (): DOMRect => ({
    left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: (): object => ({}),
  }) as DOMRect;
};

const addFixed = (tag: string, rect: Rect, parent: HTMLElement = document.body): HTMLElement => {
  const el = document.createElement(tag);
  el.style.position = 'fixed';
  parent.appendChild(el);
  setRect(el, rect);
  return el;
};

describe('useDockedPagePush', () => {
  let page: HTMLDivElement;
  let resizeEvents: number;
  const originalCSS = (globalThis as { CSS?: unknown }).CSS;
  const countResize = (): void => {
    resizeEvents += 1;
  };

  // Lets the push settle (the health check runs then) and any close animation finish.
  const settle = (): void => {
    act(() => {
      jest.advanceTimersByTime(500);
    });
  };

  const push = (overrides: Partial<DockedPagePushOptions> = {}): ReturnType<typeof renderHook<DockLayout, DockedPagePushOptions>> => renderHook(
    (props: DockedPagePushOptions) => useDockedPagePush(props),
    { initialProps: { open: true, side: 'left', width: 360, ...overrides } },
  );

  // A page whose layout `elementsFromPoint` reports, so hit testing (and the health check) can run.
  const mockHitTest = (impl: (x: number, y: number) => Element[]): void => {
    (document as { elementsFromPoint?: unknown }).elementsFromPoint = jest.fn(impl);
  };

  const mockScrollWidth = (get: () => number): void => {
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => 1024 });
    Object.defineProperty(document.documentElement, 'scrollWidth', { configurable: true, get });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    resizeEvents = 0;
    document.body.removeAttribute('style');
    document.body.innerHTML = '';
    page = document.createElement('div');
    page.id = 'page';
    document.body.appendChild(page);
    window.addEventListener('resize', countResize);
    // Force the `transform` fallback for shifted elements: jsdom drops the CSS `translate` property.
    (globalThis as { CSS?: unknown }).CSS = { supports: (): boolean => false };
  });

  afterEach(() => {
    // Unmount, then let any close animation finish: a pending one is shared module state and would otherwise
    // leak into the next test through the (shared) document.body.
    cleanup();
    settle();
    window.removeEventListener('resize', countResize);
    jest.useRealTimers();
    delete (document as { elementsFromPoint?: unknown }).elementsFromPoint;
    delete (document.documentElement as { scrollWidth?: unknown }).scrollWidth;
    delete (document.documentElement as { clientWidth?: unknown }).clientWidth;
    (globalThis as { CSS?: unknown }).CSS = originalCSS;
    document.body.removeAttribute('style');
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('class');
    document.documentElement.removeAttribute('style');
  });

  describe('pushing the page', () => {
    it('offsets <body> by the panel width on the docked side while open, and restores it when closed', () => {
      document.body.style.marginLeft = '5px';
      document.body.style.transition = 'opacity 1s';
      const { rerender, result } = push();

      expect(result.current).toBe('pushed');
      expect(document.body.style.marginLeft).toBe('360px');
      expect(document.body.style.boxSizing).toBe('border-box');
      expect(document.body.style.transition).toContain('opacity 1s');
      expect(document.body.style.transition).toContain('margin-left 250ms');

      rerender({ open: false, side: 'left', width: 360 });
      settle();

      expect(document.body.style.marginLeft).toBe('5px');
      expect(document.body.style.boxSizing).toBe('');
      expect(document.body.style.transition).toBe('opacity 1s');
    });

    it('leaves no inline style behind when nothing was set before', () => {
      const { unmount } = push();
      unmount();
      settle();
      expect(document.body.hasAttribute('style')).toBe(false);
    });

    it('keeps an existing (even empty) style attribute rather than removing it', () => {
      document.body.setAttribute('style', '');
      const { unmount } = push();
      unmount();
      settle();
      expect(document.body.getAttribute('style')).toBe('');
    });

    it('uses margin-right for the right side', () => {
      push({ side: 'right', width: 400 });
      expect(document.body.style.marginRight).toBe('400px');
      expect(document.body.style.marginLeft).toBe('');
    });

    it('restores a previous !important priority exactly', () => {
      document.body.style.setProperty('margin-left', '2px', 'important');
      const { unmount } = push();
      expect(document.body.style.getPropertyPriority('margin-left')).toBe('important');
      unmount();
      settle();
      expect(document.body.style.getPropertyValue('margin-left')).toBe('2px');
      expect(document.body.style.getPropertyPriority('margin-left')).toBe('important');
    });

    it('does nothing while closed', () => {
      push({ open: false });
      settle();
      expect(document.body.getAttribute('style') || '').toBe('');
      expect(resizeEvents).toBe(0);
    });

    it('offsets the element matched by a custom selector instead of <body>', () => {
      const { unmount } = push({ selector: '#page' });
      expect(page.style.marginLeft).toBe('360px');
      expect(document.body.style.marginLeft).toBe('');
      unmount();
      settle();
      expect(page.getAttribute('style') || '').toBe('');
    });

    it('reports overlay, touching nothing, when the selector matches nothing or is invalid', () => {
      const missing = push({ selector: '#missing' });
      expect(missing.result.current).toBe('overlay');
      missing.unmount();
      const invalid = push({ selector: '!!not a selector' });
      expect(invalid.result.current).toBe('overlay');
      invalid.unmount();
      settle();
      expect(document.body.getAttribute('style') || '').toBe('');
      expect(resizeEvents).toBe(0);
    });

    it('applies a changed width and restores the original values at the end', () => {
      document.body.style.marginLeft = '1px';
      const { rerender, unmount } = push({ width: 300 });
      expect(document.body.style.marginLeft).toBe('300px');

      rerender({ open: true, side: 'left', width: 420 });
      expect(document.body.style.marginLeft).toBe('420px');

      unmount();
      settle();
      expect(document.body.style.marginLeft).toBe('1px');
    });
  });

  describe('centred layouts', () => {
    // jsdom reports `auto` margins as the word `auto`; a browser reports the used pixels, which is what these equal margins stand for.
    // <body> outlives each test, so the box faked on it must not leak into the next one.
    afterEach(() => {
      delete (document.body as { getBoundingClientRect?: unknown }).getBoundingClientRect;
    });

    const centre = (el: HTMLElement, width: number): void => {
      el.style.margin = '0 212px';
      setRect(el, { left: 212, top: 0, width, height: 800 });
    };

    it('keeps a centred page centred in the room beside the panel instead of flush against it', () => {
      centre(document.body, 600);
      push();
      // 1024 window - 360 panel - 600 page = 64 spare: half goes on the docked side on top of the panel width.
      expect(document.body.style.marginLeft).toBe('392px');
    });

    it('uses the plain panel width when the page does not leave room to spare', () => {
      centre(document.body, 700);
      push();
      expect(document.body.style.marginLeft).toBe('360px');
    });

    it('does not treat a page with no centring margins as centred', () => {
      document.body.style.margin = '0';
      setRect(document.body, { left: 0, top: 0, width: 600, height: 800 });
      push();
      expect(document.body.style.marginLeft).toBe('360px');
    });

    it('leaves it to the site when the pushed element opts out', () => {
      centre(document.body, 600);
      document.body.setAttribute(CENTERING_OPT_OUT_ATTRIBUTE, 'off');
      push();
      expect(document.body.style.marginLeft).toBe('360px');
      document.body.removeAttribute(CENTERING_OPT_OUT_ATTRIBUTE);
    });

    it('puts the original margins back on close', () => {
      centre(document.body, 600);
      const { unmount } = push();
      unmount();
      settle();
      expect(document.body.style.marginLeft).toBe('212px');
    });
  });

  describe('fixed elements in the panel\'s way', () => {
    it('shrinks a full-width fixed header from the docked edge, and restores it', () => {
      const header = addFixed('header', { left: 0, top: 0, width: 1024, height: 60 });
      header.style.left = '0';
      header.style.right = '0';

      const { unmount } = push();
      expect(header.style.left).toBe('360px');
      expect(header.style.right).toBe('0px');
      expect(header.style.width).toBe('auto');

      unmount();
      settle();
      expect(header.style.left).toBe('0px');
      expect(header.style.right).toBe('0px');
      expect(header.style.width).toBe('');
    });

    it('shrinks it from the right edge when docked on the right', () => {
      const header = addFixed('header', { left: 0, top: 0, width: 1024, height: 60 });
      push({ side: 'right', width: 300 });
      expect(header.style.right).toBe('300px');
      expect(header.style.left).toBe('0px');
    });

    it('shifts a floating widget (e.g. a chat bubble) out of the strip instead of shrinking it', () => {
      const bubble = addFixed('div', { left: 20, top: 700, width: 56, height: 56 });
      const { unmount } = push();
      expect(bubble.style.transform).toBe('translateX(360px)');
      expect(bubble.style.width).toBe('');
      unmount();
      settle();
      expect(bubble.hasAttribute('style') && bubble.style.transform).toBeFalsy();
    });

    it('shifts the other way when docked on the right', () => {
      const bubble = addFixed('div', { left: 950, top: 700, width: 56, height: 56 });
      push({ side: 'right', width: 300 });
      expect(bubble.style.transform).toBe('translateX(-300px)');
    });

    it('leaves fixed elements outside the strip, and sticky or in-flow elements, alone', () => {
      const farSide = addFixed('div', { left: 900, top: 10, width: 100, height: 40 });
      const offscreen = addFixed('div', { left: 0, top: 2000, width: 1024, height: 40 });
      const inFlow = document.createElement('div');
      document.body.appendChild(inFlow);
      setRect(inFlow, { left: 0, top: 0, width: 1024, height: 300 });

      push();
      expect(farSide.style.transform).toBe('');
      expect(offscreen.style.left).toBe('');
      expect(inFlow.getAttribute('style')).toBeNull();
    });

    it('finds fixed elements at any depth through hit testing, moving the outermost fixed one', () => {
      const wrapper = document.createElement('div');
      document.body.appendChild(wrapper);
      const shell = addFixed('div', { left: 0, top: 0, width: 1024, height: 768 }, wrapper);
      const inner = document.createElement('div');
      shell.appendChild(inner);
      mockHitTest(() => [inner, shell, wrapper, document.body, document.documentElement]);

      push();
      expect(shell.style.left).toBe('360px');
      expect(inner.getAttribute('style')).toBeNull();
    });

    it('never moves the widget\'s own UI', () => {
      const portal = document.createElement('div');
      portal.id = 'visenze-widget-docked-portal-1';
      document.body.appendChild(portal);
      setRect(portal, { left: 0, top: 0, width: 360, height: 768 });
      portal.style.position = 'fixed';

      push();
      expect(portal.style.left).toBe('');
      expect(portal.style.transform).toBe('');
    });

    it('moves fixed elements that are added to <body> after opening', async () => {
      push();
      const late = document.createElement('header');
      late.style.position = 'fixed';
      setRect(late, { left: 0, top: 0, width: 1024, height: 60 });

      await act(async () => {
        document.body.appendChild(late);
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(late.style.left).toBe('360px');
    });
  });

  describe('fixed elements deeper in the page and in shadow roots', () => {
    it('moves a fixed element added inside the page (not directly under <body>) after opening', async () => {
      // jsdom has no layout: hit testing reports the new element once it is in the page, as a browser would.
      const added: Element[] = [];
      mockHitTest(() => added);
      push();
      const late = document.createElement('div');
      late.style.position = 'fixed';
      setRect(late, { left: 0, top: 0, width: 1024, height: 60 });

      await act(async () => {
        page.appendChild(late);
        added.push(late);
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(late.style.left).toBe('360px');
    });

    it('ignores added elements that are not fixed', async () => {
      push();
      settle();
      const getComputed = jest.spyOn(window, 'getComputedStyle');
      const plain = document.createElement('div');
      setRect(plain, { left: 0, top: 0, width: 1024, height: 60 });
      await act(async () => {
        page.appendChild(plain);
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(plain.style.left).toBe('');
      getComputed.mockRestore();
    });

    it('finds a fixed element inside an open shadow root that hit testing only reports as its host', () => {
      const host = document.createElement('div');
      page.appendChild(host);
      setRect(host, { left: 0, top: 0, width: 1024, height: 60 });
      const shadow = host.attachShadow({ mode: 'open' });
      const inner = document.createElement('div');
      inner.style.position = 'fixed';
      shadow.appendChild(inner);
      setRect(inner, { left: 0, top: 0, width: 1024, height: 60 });
      mockHitTest(() => [host]);
      (shadow as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = (): Element[] => [inner];

      push();

      expect(inner.style.left).toBe('360px');
    });
  });

  describe('only one docked panel owns the page', () => {
    it('leaves the page alone and reports overlay for a second panel opened while another is docked', () => {
      const first = push();
      expect(document.body.style.marginLeft).toBe('360px');
      const second = push({ width: 300 });
      expect(second.result.current).toBe('overlay');
      expect(document.body.style.marginLeft).toBe('360px');

      // The owner closing frees the page for the next one.
      first.rerender({ open: false, side: 'left', width: 360 });
      settle();
      second.rerender({ open: false, side: 'left', width: 300 });
      second.rerender({ open: true, side: 'left', width: 300 });
      expect(second.result.current).toBe('pushed');
      expect(document.body.style.marginLeft).toBe('300px');
    });

    it('announces the overlay and pushes by itself once the owner closes', () => {
      const events: Array<{ open: boolean; layout: string }> = [];
      const listener = (e: Event): void => {
        const { open, layout } = (e as CustomEvent<{ open: boolean; layout: string }>).detail;
        events.push({ open, layout });
      };
      window.addEventListener(DOCK_EVENT, listener);
      const first = push();
      const second = push({ width: 300 });
      expect(second.result.current).toBe('overlay');
      expect(events).toContainEqual({ open: true, layout: 'overlay' });

      first.rerender({ open: false, side: 'left', width: 360 });
      settle();
      expect(second.result.current).toBe('pushed');
      expect(document.body.style.marginLeft).toBe('300px');
      window.removeEventListener(DOCK_EVENT, listener);
    });
  });

  describe('page ownership shared across bundles', () => {
    afterEach(() => {
      delete (window as unknown as Record<string, unknown>)['__wigmixDockOwner'];
    });

    it('treats a panel from another bundle (owner kept on window) as the owner, and pushes once it closes', () => {
      (window as unknown as Record<string, unknown>)['__wigmixDockOwner'] = Symbol('other-bundle');
      const { result } = push();
      expect(result.current).toBe('overlay');
      expect(document.body.style.marginLeft).toBe('');

      // The other bundle closes: it frees the slot and announces it through the event.
      act(() => {
        (window as unknown as Record<string, unknown>)['__wigmixDockOwner'] = null;
        window.dispatchEvent(new CustomEvent<DockEventDetail>(DOCK_EVENT, { detail: { open: false, side: 'left', width: 380, layout: 'pushed', placementId: 'x' } }));
      });
      expect(result.current).toBe('pushed');
      expect(document.body.style.marginLeft).toBe('360px');
    });

    it('does not loop when several overlays wait on an owner that stays open', () => {
      const first = push();
      const second = push({ width: 300 });
      const third = push({ width: 280 });
      const fourth = push({ width: 260 });
      const events: boolean[] = [];
      const listener = (e: Event): void => {
        events.push((e as CustomEvent<DockEventDetail>).detail.open);
      };
      window.addEventListener(DOCK_EVENT, listener);

      // One of them leaves; the owner is still open, so the other must stay put and no event storm may follow.
      second.unmount();
      settle();
      expect(third.result.current).toBe('overlay');
      expect(fourth.result.current).toBe('overlay');
      expect(events.length).toBeLessThan(10);

      window.removeEventListener(DOCK_EVENT, listener);
      first.unmount();
    });

    it('publishes its own ownership on window while docked and frees it on close', () => {
      const { rerender } = push();
      expect((window as unknown as Record<string, unknown>)['__wigmixDockOwner']).toEqual(expect.anything());
      rerender({ open: false, side: 'left', width: 360 });
      expect((window as unknown as Record<string, unknown>)['__wigmixDockOwner']).toBeNull();
    });
  });

  describe('checking the result and falling back', () => {
    it('stays pushed when the strip is clear after pushing', () => {
      mockHitTest(() => [document.body, document.documentElement]);
      const { result } = push();
      settle();
      expect(result.current).toBe('pushed');
      expect(document.body.style.marginLeft).toBe('360px');
    });

    it('tolerates a small element still under the panel', () => {
      const badge = document.createElement('div');
      document.body.appendChild(badge);
      // Only the top row of sample points hits it.
      mockHitTest((_x, y) => (y < 10 ? [badge, document.body] : [document.body]));
      const { result } = push();
      settle();
      expect(result.current).toBe('pushed');
    });

    it('tries a common app wrapper when pushing <body> leaves content under the panel', () => {
      const root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
      setRect(root, { left: 0, top: 0, width: 1024, height: 2000 });
      const content = document.createElement('div');
      root.appendChild(content);
      // Pushing <body> doesn't move the content (e.g. it is absolutely positioned); pushing #root does.
      mockHitTest(() => (root.style.marginLeft ? [root, document.body] : [content, root, document.body]));

      const { result } = push();
      settle();
      settle();

      expect(result.current).toBe('pushed');
      expect(root.style.marginLeft).toBe('360px');
      expect(document.body.getAttribute('style') || '').toBe('');
    });

    it('falls back to overlay, restoring the page, when nothing it can push makes room', () => {
      const blocker = document.createElement('div');
      document.body.appendChild(blocker);
      mockHitTest(() => [blocker, document.body]);
      const header = addFixed('header', { left: 0, top: 0, width: 1024, height: 60 });

      const { result } = push();
      settle();
      settle();

      expect(result.current).toBe('overlay');
      expect(document.body.getAttribute('style') || '').toBe('');
      expect(header.style.left).toBe('');
      // The host is told the layout changed back.
      expect(resizeEvents).toBeGreaterThan(0);
    });

    it('falls back to overlay when the push creates a horizontal scrollbar', () => {
      mockScrollWidth(() => (document.body.style.marginLeft ? 1384 : 1024));
      const { result } = push();
      settle();
      settle();
      expect(result.current).toBe('overlay');
      expect(document.body.style.marginLeft).toBe('');
    });

    it('does not blame the push for a scrollbar the page already had', () => {
      mockScrollWidth(() => 1400);
      const { result } = push();
      settle();
      expect(result.current).toBe('pushed');
    });

    it('still catches overflow the push adds to a page that already scrolled sideways', () => {
      mockScrollWidth(() => (document.body.style.marginLeft ? 1760 : 1400));
      const { result } = push();
      settle();
      settle();
      expect(result.current).toBe('overlay');
      expect(document.body.style.marginLeft).toBe('');
    });

    it('goes straight to overlay (no wrapper guessing) when an explicit selector does not work', () => {
      const root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
      setRect(root, { left: 0, top: 0, width: 1024, height: 2000 });
      mockScrollWidth(() => (page.style.marginLeft ? 1384 : 1024));

      const { result } = push({ selector: '#page' });
      settle();

      expect(result.current).toBe('overlay');
      expect(root.style.marginLeft).toBe('');
    });

    it('re-applies the offset when the host resets it, and steps back to overlay if it keeps doing so', async () => {
      const { result } = push();
      await act(async () => {
        document.body.style.marginLeft = '0px';
      });
      expect(document.body.style.marginLeft).toBe('360px');
      expect(result.current).toBe('pushed');

      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
          document.body.style.marginLeft = '0px';
        });
      }

      expect(result.current).toBe('overlay');
      expect(document.body.style.boxSizing).toBe('');
    });

    it('does not give up when the host resets the style now and then, minutes apart', async () => {
      const { result } = push();
      for (let i = 0; i < 6; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
          document.body.style.marginLeft = '0px';
        });
        expect(document.body.style.marginLeft).toBe('360px');
        // Not `settle`: that is 500ms, and the point is a gap longer than the reset window.
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }
      expect(result.current).toBe('pushed');
    });

    it('reports pushed again on the next open after an overlay', () => {
      mockScrollWidth(() => (document.body.style.marginLeft ? 1384 : 1024));
      const { result, rerender } = push();
      settle();
      settle();
      expect(result.current).toBe('overlay');

      rerender({ open: false, side: 'left', width: 360 });
      expect(result.current).toBe('pushed');
    });
  });

  describe('resize', () => {
    it('re-applies on window resize without stacking the transition', () => {
      push();
      const initialTransition = document.body.style.transition;
      document.body.style.marginLeft = '0px';

      act(() => {
        window.dispatchEvent(new Event('resize'));
        jest.advanceTimersByTime(50);
      });

      expect(document.body.style.marginLeft).toBe('360px');
      expect(document.body.style.transition).toBe(initialTransition);
    });

    it('keeps the margin current on every frame of a resize but scans the page only once it stops', () => {
      mockHitTest(() => []);
      push();
      settle();
      const hitTest = document.elementsFromPoint as jest.Mock;
      const before = hitTest.mock.calls.length;

      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        act(() => {
          document.body.style.marginLeft = '0px';
          window.dispatchEvent(new Event('resize'));
          jest.advanceTimersByTime(20);
        });
        expect(document.body.style.marginLeft).toBe('360px');
      }
      expect(hitTest.mock.calls.length).toBe(before);

      settle();
      expect(hitTest.mock.calls.length).toBeGreaterThan(before);
    });

    it('re-offsets in place when only the width changes, without tearing the page down', () => {
      const { rerender } = push();
      settle();
      const events: DockEventDetail[] = [];
      const listener = (e: Event): void => {
        events.push((e as CustomEvent<DockEventDetail>).detail);
      };
      window.addEventListener(DOCK_EVENT, listener);

      rerender({ open: true, side: 'left', width: 320 });
      // No close animation was started: the margin is already the new one, with the transition still in place.
      expect(document.body.style.marginLeft).toBe('320px');
      expect(document.body.style.transition).toContain('margin-left');
      expect(document.documentElement.style.getPropertyValue(DOCKED_WIDTH_VAR)).toBe('320px');
      expect(events).toEqual([expect.objectContaining({ open: true, width: 320, layout: 'pushed' })]);

      window.removeEventListener(DOCK_EVENT, listener);
    });

    it('fires one resize event once the page has settled after opening, and one after closing', () => {
      const { rerender } = push();
      expect(resizeEvents).toBe(0);
      settle();
      expect(resizeEvents).toBe(1);

      rerender({ open: false, side: 'left', width: 360 });
      expect(resizeEvents).toBe(1);
      settle();
      expect(resizeEvents).toBe(2);
    });

    it('stops listening to resize after unmount', () => {
      const { unmount } = push();
      unmount();
      settle();
      document.body.style.marginLeft = '9px';
      act(() => {
        window.dispatchEvent(new Event('resize'));
        jest.advanceTimersByTime(50);
      });
      expect(document.body.style.marginLeft).toBe('9px');
    });
  });

  describe('close animation', () => {
    it('gives the offset back at once but keeps the transition until it has finished, then restores everything', () => {
      document.body.style.transition = 'opacity 1s';
      const { rerender } = push();
      rerender({ open: false, side: 'left', width: 360 });

      // Mid-animation: the margin is no longer forced (so the page transitions back) and our transition stays.
      expect(document.body.style.marginLeft).toBe('');
      expect(document.body.style.transition).toContain('margin-left');
      expect(document.body.style.boxSizing).toBe('border-box');

      settle();
      expect(document.body.style.transition).toBe('opacity 1s');
      expect(document.body.style.boxSizing).toBe('');
    });

    it('reopening during the close animation keeps the original values as the ones to restore', () => {
      document.body.style.marginLeft = '5px';
      const { rerender } = push();
      rerender({ open: false, side: 'left', width: 360 });
      rerender({ open: true, side: 'left', width: 360 });
      expect(document.body.style.marginLeft).toBe('360px');

      // The stale finish of the first close must not undo the second push.
      settle();
      expect(document.body.style.marginLeft).toBe('360px');

      rerender({ open: false, side: 'left', width: 360 });
      settle();
      expect(document.body.style.marginLeft).toBe('5px');
      expect(document.body.style.transition).toBe('');
    });

    it('skips the animation (0ms) when the shopper prefers reduced motion', () => {
      const original = window.matchMedia;
      window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
      try {
        const { rerender } = push();
        expect(document.body.style.transition).toContain('margin-left 0ms');
        rerender({ open: false, side: 'left', width: 360 });
        act(() => {
          jest.advanceTimersByTime(30);
        });
        expect(document.body.hasAttribute('style')).toBe(false);
      } finally {
        window.matchMedia = original;
      }
    });
  });

  describe('signal to the host page', () => {
    const html = document.documentElement;
    let events: DockEventDetail[];
    const record = (e: Event): void => {
      events.push((e as CustomEvent<DockEventDetail>).detail);
    };

    beforeEach(() => {
      events = [];
      window.addEventListener(DOCK_EVENT, record);
    });

    afterEach(() => {
      window.removeEventListener(DOCK_EVENT, record);
    });

    it('marks <html> with the docked classes and width while pushed, and leaves nothing behind after closing', () => {
      const { rerender } = push();
      expect(html.classList.contains(DOCKED_CLASS)).toBe(true);
      expect(html.classList.contains('wigmix-docked-left')).toBe(true);
      expect(html.style.getPropertyValue(DOCKED_WIDTH_VAR)).toBe('360px');

      rerender({ open: false, side: 'left', width: 360 });
      // Removed at once, so host overrides animate back together with the page.
      expect(html.classList.contains(DOCKED_CLASS)).toBe(false);
      settle();
      expect(html.hasAttribute('class')).toBe(false);
      expect(html.hasAttribute('style')).toBe(false);
    });

    it('marks the side for a right-docked panel', () => {
      push({ side: 'right' });
      expect(html.classList.contains('wigmix-docked-right')).toBe(true);
      expect(html.classList.contains('wigmix-docked-left')).toBe(false);
    });

    it('keeps the page\'s own classes and inline styles on <html>', () => {
      html.className = 'js no-touch';
      html.style.setProperty('--brand', 'red');
      const { unmount } = push();
      unmount();
      settle();
      expect(html.className).toBe('js no-touch');
      expect(html.style.getPropertyValue('--brand')).toBe('red');
    });

    it('is in place before the result is checked, so host CSS keyed on it can prevent the fallback', () => {
      // A `100vw` section that only fits once the host's `html.wigmix-docked` override applies.
      mockScrollWidth(() => (document.body.style.marginLeft && !html.classList.contains(DOCKED_CLASS) ? 1384 : 1024));
      const { result } = push();
      settle();
      settle();
      expect(result.current).toBe('pushed');
    });

    it('fires a wigmix:dock event on open and on close', () => {
      const { rerender } = push({ placementId: '42' });
      expect(events).toEqual([{ open: true, side: 'left', width: 360, layout: 'pushed', placementId: '42' }]);
      settle();
      rerender({ open: false, side: 'left', width: 360, placementId: '42' });
      expect(events).toEqual([
        { open: true, side: 'left', width: 360, layout: 'pushed', placementId: '42' },
        { open: false, side: 'left', width: 360, layout: 'pushed', placementId: '42' },
      ]);
    });

    it('removes the mark and reports overlay when the push falls back', () => {
      mockScrollWidth(() => (document.body.style.marginLeft ? 1384 : 1024));
      const { result } = push();
      settle();
      settle();
      expect(result.current).toBe('overlay');
      expect(html.classList.contains(DOCKED_CLASS)).toBe(false);
      expect(html.style.getPropertyValue(DOCKED_WIDTH_VAR)).toBe('');
      expect(events.map((e) => e.layout)).toEqual(['pushed', 'overlay']);
    });

    it('reports overlay without marking the page when the pushSelector matches nothing', () => {
      push({ selector: '.missing' });
      expect(html.classList.contains(DOCKED_CLASS)).toBe(false);
      expect(events).toEqual([{ open: true, side: 'left', width: 360, layout: 'overlay', placementId: undefined }]);
    });

    it('fires nothing while closed', () => {
      push({ open: false });
      expect(events).toEqual([]);
      expect(html.hasAttribute('class')).toBe(false);
    });
  });
});
