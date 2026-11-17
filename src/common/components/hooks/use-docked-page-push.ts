import { useEffect, useRef, useState } from 'react';

export type DockSide = 'left' | 'right';

/**
 * How the docked panel ended up next to the page:
 * - `pushed`: the page was offset and checked to have made room.
 * - `overlay`: pushing did not work cleanly on this page (or the configured `pushSelector` matched nothing), so
 *   the page was left untouched and the panel sits over its edge instead.
 */
export type DockLayout = 'pushed' | 'overlay';

export interface DockedPagePushOptions {
  /** Whether the docked panel is currently open (and docked, i.e. not in the modal fallback). */
  open: boolean;
  /** Which edge of the viewport the panel is pinned to. The page is offset from that same edge. */
  side: DockSide;
  /** Panel width in px: the size of the offset. */
  width: number;
  /** CSS selector of the page container to offset. When unset, <body> is tried first, then a common app wrapper. */
  selector?: string;
  /** Included in the `wigmix:dock` event so a page with several widgets can tell them apart. */
  placementId?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// Signal to the host page. Media queries, `vw` and `window.innerWidth` keep reporting the full window while the page
// is pushed, so the host can't detect the narrower space by itself; these let its own CSS/JS adapt.
// ---------------------------------------------------------------------------------------------------------------

/** Event fired on `window` when the docked panel opens, closes, or changes how it sits next to the page. */
export const DOCK_EVENT = 'wigmix:dock';

export interface DockEventDetail {
  open: boolean;
  side: DockSide;
  /** Panel width in px. */
  width: number;
  /** `pushed`: the page was made narrower by `width`. `overlay`: the page was left as is and the panel covers its edge. */
  layout: DockLayout;
  placementId?: string;
}

/** Class on <html> while the page is pushed, plus `wigmix-docked-left` / `wigmix-docked-right`. */
export const DOCKED_CLASS = 'wigmix-docked';
/** CSS custom property on <html> while the page is pushed: the panel width, e.g. `380px`. */
export const DOCKED_WIDTH_VAR = '--wigmix-docked-width';

const DOCKED_CLASSES = [DOCKED_CLASS, `${DOCKED_CLASS}-left`, `${DOCKED_CLASS}-right`];

type PageMark = { hadClass: boolean; hadStyle: boolean };

const markPage = (side: DockSide, width: number): PageMark => {
  const html = document.documentElement;
  const mark = { hadClass: html.hasAttribute('class'), hadStyle: html.hasAttribute('style') };
  html.classList.remove(...DOCKED_CLASSES);
  html.classList.add(DOCKED_CLASS, `${DOCKED_CLASS}-${side}`);
  html.style.setProperty(DOCKED_WIDTH_VAR, `${width}px`);
  return mark;
};

const unmarkPage = ({ hadClass, hadStyle }: PageMark): void => {
  const html = document.documentElement;
  html.classList.remove(...DOCKED_CLASSES);
  html.style.removeProperty(DOCKED_WIDTH_VAR);
  // Leave no empty attributes behind on a page that had none.
  if (!hadClass && html.getAttribute('class') === '') {
    html.removeAttribute('class');
  }
  if (!hadStyle && html.getAttribute('style') === '') {
    html.removeAttribute('style');
  }
};

// Only one docked panel at a time may push the page: a second one would save the first one's offsets as the page's "original"
// styles and restore them wrongly. The first to open owns the page; others sit over it as an overlay.
let pageOwner: symbol | null = null;
// Panels waiting (as overlays) for the current page owner to close.
const ownerWaiters = new Set<() => void>();

const DOCK_TRANSITION_MS = 250;

/**
 * Duration of the dock open/close animation, shared by the panel's slide and the page offset so they stay in
 * step. 0 (no animation) for shoppers who ask for reduced motion.
 */
export const getDockTransitionMs = (): number => (
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DOCK_TRANSITION_MS
);

// ---------------------------------------------------------------------------------------------------------------
// Inline style bookkeeping: everything we set is saved first and put back exactly.
// ---------------------------------------------------------------------------------------------------------------

type SavedValue = { value: string; priority: string };

// One element we touched: the inline values to put back (`saved`, '' meaning "was not set" and restored with
// removeProperty) and the values we apply (`offsets`), re-applied as-is on resize and after host resets.
type Tracked = {
  el: HTMLElement;
  saved: Map<string, SavedValue>;
  offsets: Map<string, string>;
  hadStyleAttribute: boolean;
};

const newTracked = (el: HTMLElement): Tracked => ({ el, saved: new Map(), offsets: new Map(), hadStyleAttribute: el.hasAttribute('style') });

const save = (tracked: Tracked, property: string): void => {
  if (!tracked.saved.has(property)) {
    tracked.saved.set(property, {
      value: tracked.el.style.getPropertyValue(property),
      priority: tracked.el.style.getPropertyPriority(property),
    });
  }
};

// `important` so a host stylesheet rule like `.page { margin: 0 auto !important }` cannot cancel the offset.
const setOffset = (tracked: Tracked, property: string, value: string): void => {
  save(tracked, property);
  tracked.offsets.set(property, value);
  tracked.el.style.setProperty(property, value, 'important');
};

const reapplyOffsets = (tracked: Tracked): void => {
  tracked.offsets.forEach((value, property) => tracked.el.style.setProperty(property, value, 'important'));
};

// Adds our transition to whatever inline transition the element already had (not to a stylesheet one: an inline
// `transition` replaces it while the push is active, which is a known, cosmetic-only limit).
const setTransition = (tracked: Tracked, properties: string[]): void => {
  save(tracked, 'transition');
  const previous = tracked.saved.get('transition')?.value ?? '';
  const ours = properties.map((property) => `${property} ${getDockTransitionMs()}ms ease`).join(', ');
  tracked.el.style.setProperty('transition', previous ? `${previous}, ${ours}` : ours);
};

// Properties that stay in place while a close animation runs, so the page can transition back.
const KEPT_WHILE_CLOSING = new Set(['transition', 'box-sizing']);

const restore = (tracked: Tracked, onlyOffsets = false): void => {
  tracked.saved.forEach(({ value, priority }, property) => {
    if (onlyOffsets && KEPT_WHILE_CLOSING.has(property)) {
      return;
    }
    if (value) {
      tracked.el.style.setProperty(property, value, priority);
    } else {
      tracked.el.style.removeProperty(property);
    }
  });
  // Removing the last property leaves an empty `style=""` behind; drop it if the element had none to begin with.
  if (!onlyOffsets && !tracked.hadStyleAttribute && tracked.el.getAttribute('style') === '') {
    tracked.el.removeAttribute('style');
  }
};

// Elements whose close animation is still running, with the timer that finishes the restore. Kept at module level
// because the effect that started it is already gone (closed or unmounted). A new push finishes them first, so it
// measures and saves the page's real original state, never a mid-animation one.
const closing = new Map<HTMLElement, { tracked: Tracked; timer: number }>();

const finishClosing = (el: HTMLElement): void => {
  const entry = closing.get(el);
  if (entry) {
    window.clearTimeout(entry.timer);
    closing.delete(el);
    restore(entry.tracked);
  }
};

const finishAllClosing = (): void => {
  Array.from(closing.keys()).forEach(finishClosing);
};

// ---------------------------------------------------------------------------------------------------------------
// Page geometry
// ---------------------------------------------------------------------------------------------------------------

// Our own UI (the panel's portal, other ViSenze widget portals) is never treated as page content.
const OWN_UI_SELECTOR = '[id^="visenze-widget-"], [data-wigmix-dock-ignore]';
const isOwnUi = (el: Element): boolean => !!el.closest(OWN_UI_SELECTOR);

const viewportWidth = (): number => document.documentElement.clientWidth || window.innerWidth;
const viewportHeight = (): number => document.documentElement.clientHeight || window.innerHeight;

// How far the page already scrolls sideways, in px (0 when it doesn't).
const horizontalOverflow = (): number => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Hit testing is how we see what is actually on screen. Not available in every environment (e.g. jsdom).
const canHitTest = (): boolean => typeof document.elementsFromPoint === 'function';

// A grid of points covering the strip of the viewport the panel occupies.
const stripPoints = (side: DockSide, width: number, step: number): Array<[number, number]> => {
  const vw = viewportWidth();
  const vh = viewportHeight();
  const points: Array<[number, number]> = [];
  for (let x = 4; x < width; x += step) {
    for (let y = 4; y < vh; y += step) {
      points.push([side === 'left' ? x : vw - x, y]);
    }
  }
  return points;
};

const isFixed = (el: Element, cache: Map<Element, boolean>): boolean => {
  let fixed = cache.get(el);
  if (fixed === undefined) {
    fixed = window.getComputedStyle(el).position === 'fixed';
    cache.set(el, fixed);
  }
  return fixed;
};

// The outermost `position: fixed` element containing `el` (moving it moves everything inside), or null.
const outermostFixed = (el: Element, cache: Map<Element, boolean>): HTMLElement | null => {
  let found: HTMLElement | null = null;
  let current: Element | null = el;
  while (current && current !== document.body && current !== document.documentElement) {
    if (current instanceof HTMLElement && isFixed(current, cache)) {
      found = current;
    }
    current = current.parentElement;
  }
  return found;
};

const intersectsStrip = (rect: DOMRect, side: DockSide, width: number): boolean => {
  if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight()) {
    return false;
  }
  return side === 'left' ? rect.left < width && rect.right > 0 : rect.right > viewportWidth() - width && rect.left < viewportWidth();
};

// Fixed elements inside the open shadow root of `host` at a point, through nested shadow roots. Closed roots can't be entered.
const collectFromShadow = (host: Element, x: number, y: number, cache: Map<Element, boolean>, consider: (el: Element | null) => void, depth = 0): void => {
  const root = host.shadowRoot;
  if (!root || depth > 5 || typeof root.elementsFromPoint !== 'function') {
    return;
  }
  root.elementsFromPoint(x, y).forEach((inner) => {
    if (inner === host) {
      return;
    }
    consider(outermostFixed(inner, cache));
    collectFromShadow(inner, x, y, cache, consider, depth + 1);
  });
};

/**
 * Fixed elements that sit (at least partly) where the panel goes and would not move with the pushed page:
 * full-width headers and app shells, and floating widgets such as chat bubbles or cookie banners.
 *
 * Two sources, combined: hit testing a grid of points across the panel's strip (finds whatever is really on
 * screen there, at any nesting depth), and a cheap list of likely candidates (header/nav/banner landmarks, direct
 * children of <body> and of the pushed element), which also catches elements with `pointer-events: none` that hit
 * testing skips. Sticky and in-flow elements are left out: they move with the pushed container.
 */
const findIntruders = (target: HTMLElement, side: DockSide, width: number, ignore: Set<Element>): HTMLElement[] => {
  const cache = new Map<Element, boolean>();
  const candidates = new Set<HTMLElement>();
  const consider = (el: Element | null): void => {
    if (el instanceof HTMLElement) {
      candidates.add(el);
    }
  };

  if (canHitTest()) {
    stripPoints(side, width, 48).forEach(([x, y]) => {
      const stack = document.elementsFromPoint(x, y);
      for (let i = 0; i < stack.length; i += 1) {
        const el = stack[i];
        if (el === target || el === document.body || el === document.documentElement) {
          break;
        }
        if (!isOwnUi(el)) {
          consider(outermostFixed(el, cache));
          // Hit testing from the document only reports a web component's host; look inside its (open) shadow root too.
          collectFromShadow(el, x, y, cache, consider);
        }
      }
    });
  }
  document.querySelectorAll('header, nav, [role="banner"]').forEach(consider);
  Array.from(document.body.children).forEach(consider);
  Array.from(target.children).forEach(consider);

  return Array.from(candidates).filter((el) => el !== target
    && !ignore.has(el)
    && !el.contains(target)
    && !isOwnUi(el)
    && isFixed(el, cache)
    && intersectsStrip(el.getBoundingClientRect(), side, width));
};

/** Set on the pushed element to keep it from being re-centred in the room beside the panel (it is then simply offset). */
export const CENTERING_OPT_OUT_ATTRIBUTE = 'data-wigmix-dock-centering';

/**
 * Width of `el` when it is centred in the viewport by equal, non-zero side margins (`max-width` plus `margin: auto`),
 * else null. Measured before the push: afterwards our own margin has changed what the browser reports.
 * An element that fills the window (default body margins) is not "centred" in any useful sense and gives null.
 */
const measureCenteredWidth = (el: HTMLElement): number | null => {
  if (el.getAttribute(CENTERING_OPT_OUT_ATTRIBUTE) === 'off') {
    return null;
  }
  const style = window.getComputedStyle(el);
  const left = parseFloat(style.marginLeft);
  const right = parseFloat(style.marginRight);
  const { width } = el.getBoundingClientRect();
  if (!(left > 0) || Math.abs(left - right) > 1 || width <= 0 || width >= viewportWidth() - 2) {
    return null;
  }
  return width;
};

/**
 * The inline margin on the docked side. Normally just the panel width. A centred element (see measureCenteredWidth)
 * would otherwise lose its `margin: auto` to our fixed margin and end up flush against the panel, so it gets the panel
 * width plus half of the room left over, which leaves it centred in the area beside the panel. When it no longer fits
 * with room to spare it is simply offset, as any other page.
 */
const dockedMargin = (width: number, centeredWidth: number | null): string => {
  if (centeredWidth === null) {
    return `${width}px`;
  }
  const spare = viewportWidth() - width - centeredWidth;
  return `${width + (spare > 0 ? Math.round(spare / 2) : 0)}px`;
};

const supportsTranslateProperty = (): boolean => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('translate', '1px 0px');

/**
 * Moves one fixed element out of the panel's way. Returns false when it can't be moved safely (it is then left
 * alone and simply sits under the panel).
 *
 * - Wide elements (more than half the viewport: headers, app shells, full-width banners) are SHRUNK: their edge
 *   on the docked side moves in by the panel width, keeping the other edge where it was, so nothing ends up off
 *   screen. Pinned with explicit `left`/`right` and `width: auto`.
 * - Narrow elements (chat bubbles, badges) and elements centered with a transform are SHIFTED sideways by the
 *   panel width with the CSS `translate` property, which composes with any transform they already have (or with
 *   a prepended `translateX()` where `translate` is not supported).
 */
const planMoveAside = (el: HTMLElement, side: DockSide, width: number): Array<[string, string]> | null => {
  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const vw = viewportWidth();
  const transformed = !!style.transform && style.transform !== 'none';

  if (rect.width > vw / 2 && !transformed) {
    const left = side === 'left' ? rect.left + width : rect.left;
    const right = side === 'left' ? vw - rect.right : vw - rect.right + width;
    return [['left', `${Math.round(left)}px`], ['right', `${Math.round(Math.max(right, 0))}px`], ['width', 'auto']];
  }

  const dx = side === 'left' ? width : -width;
  if (supportsTranslateProperty()) {
    const current = style.getPropertyValue('translate');
    if (!current || current === 'none') {
      return [['translate', `${dx}px 0px`]];
    }
    if (current.includes('(')) {
      // An existing translate we can't safely add to.
      return null;
    }
    const [x, y = '0px'] = current.split(' ');
    return [['translate', `calc(${x} + ${dx}px) ${y}`]];
  }
  return [['transform', transformed ? `translateX(${dx}px) ${style.transform}` : `translateX(${dx}px)`]];
};

/**
 * Did pushing actually make room? Fails when the push added horizontal scrolling the page didn't have (min-width
 * layouts, `100vw` / full-bleed sections), or when page content still covers a real share of the panel's strip
 * (content positioned outside the pushed element, fixed elements we couldn't move). A small badge left under the
 * panel is tolerated: covering it is better than giving up the push for the whole page.
 */
const BLOCKED_SHARE_LIMIT = 0.2;

const isHealthy = (target: HTMLElement, side: DockSide, width: number, baselineOverflow: number): boolean => {
  // Compared with the page's own overflow before the push, so a page that already scrolled sideways a little (a `100vw`
  // section plus a vertical scrollbar) is still checked: only overflow the push added counts.
  if (horizontalOverflow() > baselineOverflow + 1) {
    return false;
  }
  if (!canHitTest()) {
    return true;
  }
  const points = stripPoints(side, width, 64);
  let blocked = 0;
  points.forEach(([x, y]) => {
    const top = document.elementsFromPoint(x, y).find((el) => !isOwnUi(el));
    if (top && top !== target && top !== document.body && top !== document.documentElement) {
      blocked += 1;
    }
  });
  return points.length === 0 || blocked / points.length <= BLOCKED_SHARE_LIMIT;
};

// Common app/page wrappers to push when pushing <body> did not work and no `pushSelector` was configured.
const AUTO_WRAPPER_SELECTORS = ['#__next', '#root', '#app', '#__nuxt', '#__layout', '#page', '#main', '#wrapper', 'main', '.page', '.site', '.wrapper'];

const findWrapper = (): HTMLElement | null => {
  const vw = viewportWidth();
  for (let i = 0; i < AUTO_WRAPPER_SELECTORS.length; i += 1) {
    const el = document.querySelector<HTMLElement>(AUTO_WRAPPER_SELECTORS[i]);
    // Only a wrapper that actually spans the page is worth pushing.
    if (el && el !== document.body && !isOwnUi(el) && el.getBoundingClientRect().width >= vw * 0.8) {
      return el;
    }
  }
  return null;
};

const resolveSelector = (selector: string): HTMLElement | null => {
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    // An invalid selector is a configuration mistake; treat it like a missing target instead of throwing into React.
    return null;
  }
};

// A host page re-setting the pushed element's style more than this many times is fighting us: we step back.
const MAX_HOST_RESETS = 3;

/**
 * While a docked panel is open, makes room for it by pushing the host page aside, so the page is resized rather
 * than covered, and falls back to an overlay when that does not work cleanly. In order:
 *
 * 1. Push the configured `selector`, or <body>: a `margin-left`/`margin-right` equal to the panel width.
 * 2. Move fixed elements in the panel's strip out of the way (see findIntruders/planMoveAside).
 * 3. Once the animation has settled, check the result (isHealthy). If it failed and no `selector` was configured,
 *    undo and try a common app wrapper (findWrapper) instead of <body>.
 * 4. If that fails too (or the configured selector matches nothing), undo everything and report `overlay`: the
 *    panel then sits over the page's edge without touching the page.
 *
 * While pushed it re-applies on window resize and when <body>'s children change (late-loading headers/banners),
 * and re-applies if the host resets the pushed element's style, stepping back to `overlay` if it keeps doing so.
 *
 * Previous inline values are saved and restored exactly on close, unmount, or when the inputs change. On close the
 * page animates back (offsets removed at once, the saved transition/box-sizing restored when it ends). A single
 * `resize` event is fired once the page has settled after opening, and once after closing, so host layouts that
 * measure their container recalculate.
 *
 * Known limit: media queries, `vw` units and `window.innerWidth` keep reporting the full window width; only the
 * browser can change those. Choosing to dock only when enough width remains (the caller's job) keeps that from
 * showing on most sites, and the host can adapt its own layout with the signal below.
 *
 * Signal to the host: while the page is pushed, <html> has the classes `wigmix-docked` and `wigmix-docked-<side>`
 * and the `--wigmix-docked-width` property. They are set before the push, so host CSS keyed on them animates with
 * the page and is already in place when the result is checked; they are removed on close and when falling back to
 * the overlay. A `wigmix:dock` event (DockEventDetail) is fired on `window` on open (`layout: 'pushed'`, or
 * `'overlay'` straight away), again if the push later falls back to the overlay, and on close (`open: false`).
 */
const useDockedPagePush = ({ open, side, width, selector, placementId }: DockedPagePushOptions): DockLayout => {
  const [layout, setLayout] = useState<DockLayout>('pushed');
  // Bumped when the panel that owned the page closes, so a panel that had to fall back to overlay tries to push again.
  const [retry, setRetry] = useState(0);
  // The panel width changes while open (it narrows with the window). The effect below must not re-run for that, or
  // the page would be torn down and rebuilt on every resize step: it reads the width from here instead, and the
  // effect further down hands a new width to it through `retarget`.
  const widthRef = useRef(width);
  widthRef.current = width;
  const retarget = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const token = Symbol('dock');
    if (pageOwner) {
      // Another panel owns the page: this one is an overlay, announced like any other, and tries again once the owner closes.
      const waiter = (): void => setRetry((count) => count + 1);
      ownerWaiters.add(waiter);
      setLayout('overlay');
      const overlayDetail: DockEventDetail = { open: true, side, width: widthRef.current, layout: 'overlay', placementId };
      window.dispatchEvent(new CustomEvent<DockEventDetail>(DOCK_EVENT, { detail: overlayDetail }));
      return (): void => {
        ownerWaiters.delete(waiter);
        setLayout('pushed');
        window.dispatchEvent(new CustomEvent<DockEventDetail>(DOCK_EVENT, { detail: { ...overlayDetail, open: false } }));
      };
    }
    pageOwner = token;
    setLayout('pushed');
    // Measure and save the real page, never one still animating back from a previous close.
    finishAllClosing();

    const tracked = new Map<HTMLElement, Tracked>();
    const margin = side === 'left' ? 'margin-left' : 'margin-right';
    let width = widthRef.current;
    let offset = `${width}px`;
    const explicitSelector = selector?.trim() || '';
    const baselineOverflow = horizontalOverflow();
    let target: HTMLElement | null = explicitSelector ? resolveSelector(explicitSelector) : document.body;
    let triedWrapper = !!explicitSelector;
    let gaveUp = false;
    // Whether the page was ever offset during this open, so giving up knows to tell the host it changed back.
    let applied = false;
    let settled = false;
    let hostResets = 0;
    // Width of the pushed element when it is centred by auto margins; undefined until measured (once per pushed element).
    let centeredWidth: number | null | undefined;
    let targetMargin = offset;
    let dispatching = false;
    let frame = 0;
    let settleTimer = 0;
    let mutationTimer = 0;
    let pageMark: PageMark | null = null;
    let announced: DockLayout | null = null;

    const announce = (isOpen: boolean, current: DockLayout): void => {
      if (isOpen && announced === current) {
        return;
      }
      announced = isOpen ? current : null;
      const detail: DockEventDetail = { open: isOpen, side, width, layout: current, placementId };
      window.dispatchEvent(new CustomEvent<DockEventDetail>(DOCK_EVENT, { detail }));
    };

    const clearPageMark = (): void => {
      if (pageMark) {
        unmarkPage(pageMark);
        pageMark = null;
      }
    };

    // Our own synthetic resize must not re-enter onResize, or it would loop.
    const notifyHostLayout = (): void => {
      dispatching = true;
      try {
        window.dispatchEvent(new Event('resize'));
      } finally {
        dispatching = false;
      }
    };

    const track = (el: HTMLElement): Tracked => {
      let entry = tracked.get(el);
      if (!entry) {
        entry = newTracked(el);
        tracked.set(el, entry);
      }
      return entry;
    };

    // Idempotent: originals are saved once per element; later passes re-apply the same offsets and pick up
    // fixed elements that appeared since.
    const apply = (): void => {
      if (!target) {
        return;
      }
      applied = true;
      const main = track(target);
      if (centeredWidth === undefined) {
        centeredWidth = measureCenteredWidth(target);
      }
      targetMargin = dockedMargin(width, centeredWidth ?? null);
      setOffset(main, 'box-sizing', 'border-box');
      setOffset(main, margin, targetMargin);
      setTransition(main, [margin]);

      findIntruders(target, side, width, new Set<Element>(tracked.keys())).forEach((el) => {
        const plan = planMoveAside(el, side, width);
        if (!plan) {
          return;
        }
        const entry = track(el);
        plan.forEach(([property, value]) => setOffset(entry, property, value));
        setTransition(entry, plan.map(([property]) => property).filter((property) => property !== 'width'));
      });
      tracked.forEach(reapplyOffsets);
    };

    const restoreNow = (): void => {
      tracked.forEach((entry) => restore(entry));
      tracked.clear();
    };

    // The host resetting the pushed element's inline style (frameworks re-rendering <body> attributes, scripts
    // writing margins) would silently undo the push: put it back, and step back to the overlay if it keeps happening.
    const styleObserver = new MutationObserver(() => {
      if (gaveUp || !target || target.style.getPropertyValue(margin) === targetMargin) {
        return;
      }
      hostResets += 1;
      if (hostResets > MAX_HOST_RESETS) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        giveUp();
        return;
      }
      apply();
    });

    const observeTarget = (): void => {
      styleObserver.disconnect();
      if (target) {
        styleObserver.observe(target, { attributes: true, attributeFilter: ['style'] });
      }
    };

    const giveUp = (): void => {
      gaveUp = true;
      styleObserver.disconnect();
      restoreNow();
      clearPageMark();
      setLayout('overlay');
      announce(true, 'overlay');
      if (applied) {
        notifyHostLayout();
      }
    };

    const verify = (): void => {
      if (gaveUp || !target) {
        return;
      }
      if (isHealthy(target, side, width, baselineOverflow)) {
        if (!settled) {
          settled = true;
          notifyHostLayout();
        }
        return;
      }
      // Pushing this element didn't make clean room: undo, and try a common app wrapper once before giving up.
      styleObserver.disconnect();
      restoreNow();
      target = triedWrapper ? null : findWrapper();
      triedWrapper = true;
      centeredWidth = undefined;
      if (!target) {
        giveUp();
        return;
      }
      apply();
      observeTarget();
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      scheduleVerify();
    };

    // Checked once the margin transition has finished, since layout read mid-animation is not the final one.
    const scheduleVerify = (): void => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(verify, getDockTransitionMs() + 50);
    };

    const reapplyAndVerify = (): void => {
      if (!gaveUp) {
        apply();
        scheduleVerify();
      }
    };

    const onResize = (): void => {
      if (dispatching) {
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(reapplyAndVerify);
    };

    // The panel width changed while open: re-offset the page in place (originals are restored and the offsets
    // re-applied in the same task, so the browser transitions straight from the old margin to the new one).
    retarget.current = (): void => {
      if (widthRef.current === width) {
        return;
      }
      width = widthRef.current;
      offset = `${width}px`;
      if (gaveUp) {
        return;
      }
      tracked.forEach((entry) => restore(entry));
      tracked.clear();
      if (pageMark) {
        document.documentElement.style.setProperty(DOCKED_WIDTH_VAR, offset);
      }
      announced = null;
      announce(true, 'pushed');
      apply();
      scheduleVerify();
    };

    // Late-loading headers, banners and chat bubbles, wherever in the page they are added. Only an added element that is
    // itself `position: fixed` is worth a re-check (cheap to test, and the common case for banners and bubbles), and the
    // re-check is throttled rather than debounced so a page that keeps mutating cannot postpone it forever.
    const addsFixedElement = (records: MutationRecord[]): boolean => {
      let checked = 0;
      return records.some((record) => Array.from(record.addedNodes).some((node) => {
        if (!(node instanceof HTMLElement) || checked >= 20 || isOwnUi(node)) {
          return false;
        }
        checked += 1;
        return window.getComputedStyle(node).position === 'fixed';
      }));
    };
    const bodyObserver = new MutationObserver((records) => {
      if (mutationTimer || !addsFixedElement(records)) {
        return;
      }
      mutationTimer = window.setTimeout(() => {
        mutationTimer = 0;
        reapplyAndVerify();
      }, 150);
    });

    if (target) {
      // Before the push, so host CSS keyed on it is part of the layout we push and check.
      pageMark = markPage(side, width);
      announce(true, 'pushed');
      apply();
      observeTarget();
      scheduleVerify();
      window.addEventListener('resize', onResize);
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      // The configured pushSelector matched nothing: leave the page alone.
      giveUp();
    }

    return (): void => {
      if (pageOwner === token) {
        pageOwner = null;
        Array.from(ownerWaiters).forEach((waiter) => waiter());
      }
      retarget.current = null;
      setLayout('pushed');
      window.removeEventListener('resize', onResize);
      styleObserver.disconnect();
      bodyObserver.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(mutationTimer);
      // Removed at once so host overrides animate back together with the page.
      clearPageMark();
      if (announced) {
        announce(false, announced);
      }
      const touched = tracked.size > 0;
      const duration = getDockTransitionMs();
      // Close animation: put the offsets back right away (the transition we left in place animates the page back),
      // then restore everything else exactly once it has finished. The timers deliberately outlive this effect, so
      // they also run after an unmount.
      tracked.forEach((entry, el) => {
        restore(entry, true);
        closing.set(el, { tracked: entry, timer: window.setTimeout(() => finishClosing(el), duration + 20) });
      });
      tracked.clear();
      if (touched) {
        window.setTimeout(notifyHostLayout, duration + 50);
      }
    };
    // `width` is read through widthRef (see above), so a width change is not a reason to rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, side, selector, placementId, retry]);

  useEffect(() => {
    retarget.current?.();
  }, [width]);

  return open ? layout : 'pushed';
};

export default useDockedPagePush;
