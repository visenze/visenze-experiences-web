# Docked mode for the shopping assistant

By default the shopping assistant opens in a modal that covers your page. In **docked mode** it opens as a panel pinned to
the left or right edge of the window, and your page narrows to make room beside it. Shoppers can keep browsing your page
while they chat.

This guide explains how wide the panel is, what the widget does to your page, when it falls back to the regular modal, and
how your page can adapt. Docked mode is available in the shopping-assistant widget only. Without `displayMode: 'docked'`
the widget behaves as before.

- [Quick start](#quick-start)
- [How wide will the panel be?](#how-wide-will-the-panel-be)
- [What the widget does to your page](#what-the-widget-does-to-your-page)
- [When it can't dock](#when-it-cant-dock)
- [Adapting your page while docked](#adapting-your-page-while-docked)
- [Examples by kind of page](#examples-by-kind-of-page)
- [Configuration reference](#configuration-reference)
- [Known limits](#known-limits)
- [Checking it on your site](#checking-it-on-your-site)

## Quick start

Add these settings to the widget's `customizations.popup`:

```js
customizations: {
  popup: {
    displayMode: 'docked',
    position: 'left',        // 'left' or 'right'
    dockedPanelWidth: 380,        // px, a percentage such as '20%', or per device (see below)
  },
},
```

That is all most pages need. If your page doesn't make room properly, see
[Adapting your page](#adapting-your-page-while-docked) and the `pushSelector` option.

## How wide will the panel be?

The rule is one minimum window width and one subtraction:

1. **Window narrower than `dockedMinWindowWidth` (700px by default):** the regular modal is used.
2. **Otherwise:** the panel takes the width you configured, and your page gets the window width minus the panel width. You
   don't set the page width; it follows from the two numbers.
3. **Safety guard:** if the panel would leave your page less than 320px, the modal is used instead. This only catches extreme
   settings, such as `'60%'` in a 700px window.

There is no minimum panel width. 200px to 400px works well, but any positive value is accepted.

| Window | `dockedPanelWidth` | Panel | Your page gets | Result |
| --- | --- | --- | --- | --- |
| 1440px | `380` | 380px | 1060px | Docked |
| 1024px | `'25%'` | 256px | 768px | Docked |
| 800px | `220` | 220px | 580px | Docked |
| 700px | `220` | 220px | 480px | Docked (at the minimum) |
| 700px | `380` | 380px | 320px | Docked (your page gets exactly 320px) |
| 699px | `220` | none | none | Modal (under the minimum) |
| 700px | `400` | none | 300px | Modal (your page would get under 320px) |

Once docked, the panel stays docked until the window is 40px under the minimum (660px by default), so browser zoom or a
window edge sitting right on 700px doesn't flip it back and forth between docked and modal.

### Different widths for different devices

`dockedPanelWidth` can be a pixel value (`320` or `'320px'`), a share of the window (`'20%'`, worked out again whenever the
window is resized), or an object with a value per device:

```js
dockedPanelWidth: { desktop: '20%', tablet: 240, mobile: 220 },
```

The devices come from the widget's `breakpoints`. By default, **mobile** is up to 767px, **tablet** is 768px to 1023px and
**desktop** is 1024px and up. A device you leave out uses the `desktop` value, then the default of 380. Note that a 700px
window counts as `mobile` with the default breakpoints, so a value given only for `tablet` does not apply there.

## What the widget does to your page

Docked mode changes your page so that it fits beside the panel. After doing so, the widget checks the result and falls back
rather than leave a broken layout.

1. **Pushes your page.** The page container gets an inline `margin-left` (panel on the left) or `margin-right` (panel on
   the right) equal to the panel width. The container is `<body>` unless you set `pushSelector`; if `<body>` doesn't work
   and no `pushSelector` is set, a common app wrapper (`#__next`, `#root`, `#app`, `main`, and similar) is tried.
2. **Moves fixed elements out of the way.** Elements with `position: fixed` don't move with a margin. Wide ones (headers,
   app shells, full-width banners) are shrunk from the docked edge, and narrow ones (chat bubbles, cookie badges) are
   shifted sideways by the panel width. This includes fixed elements inside open shadow roots, and ones added later.
3. **Keeps a centred page centred.** If the pushed element is centred with equal side margins (`max-width` with
   `margin: auto`), it is offset by the panel width plus half of the leftover room, so it stays centred in the space beside
   the panel. A centred wrapper *inside* the pushed element needs nothing special. To turn this off, put
   `data-wigmix-dock-centering="off"` on the pushed element.
4. **Checks the result.** Once the animation finishes, it checks that no horizontal scrollbar appeared and that page content
   isn't left under the panel.

Everything the widget changes is saved first and put back exactly when the panel closes. The panel has no backdrop, scroll
lock or focus trap, and your page stays available to assistive technology. It closes with its close button, or with
Escape while focus is inside it. Clicking your page does not close it.

## When it can't dock

| Situation | What the shopper gets |
| --- | --- |
| Window narrower than `dockedMinWindowWidth` | The regular modal |
| The page can't make room (check fails), desktop-sized window | The panel shown **over** the edge of your page (an overlay). Your page is left untouched. |
| The page can't make room, tablet-sized window | The regular modal, because an overlay would cover most of the page |
| `pushSelector` matches nothing | Treated as "can't make room" |
| Your own scripts keep resetting the pushed element's inline style (more than 3 times within 2 seconds) | Treated as "can't make room" |

"Desktop-sized" and "tablet-sized" follow the widget's `breakpoints` (by default, 1024px and up, and under 1024px). The
worst case is always a panel over part of your page or the usual modal, never a broken layout.

## Adapting your page while docked

Your page gets narrower, but the browser window doesn't. Media queries, `vw` units and `window.innerWidth` still report the
**full** window width, and only the browser could change that. Layout built with ordinary CSS usually copes. Parts that size
themselves from the window width instead of their own container (some carousels, sliders and sticky grids) can end up too
wide for their area. This isn't specific to the chatbot: the same would happen if you added your own docked sidebar.

The widget tells your page what happened so it can adapt.

### The `wigmix:dock` event

A `wigmix:dock` event is fired on `window`:

```js
window.addEventListener('wigmix:dock', (e) => {
  const { open, side, width, layout, placementId } = e.detail;
  // open: true while docked or resizing, false when the panel closes
  // layout: 'pushed' (your page was narrowed by `width`) or 'overlay' (your page was left alone)
  if (open && layout === 'pushed') swiper.update();
});
```

| Field | Meaning |
| --- | --- |
| `open` | `true` when the panel opens or its width changes, `false` when it closes |
| `side` | `'left'` or `'right'` |
| `width` | Panel width in pixels |
| `layout` | `'pushed'` if your page was narrowed by `width`, `'overlay'` if it was left alone |
| `placementId` | Lets a page with several widgets tell them apart |

| When it fires | `layout` |
| --- | --- |
| The panel opens | `'pushed'`, or `'overlay'` straight away if the page can't be pushed |
| The push later fails and the widget steps back | `'overlay'` |
| The panel width changes while open (for example a percentage width in a resized window) | `'pushed'` |
| The panel closes | The layout it had, with `open: false` |

The event does **not** fire when the regular modal is used, because nothing was docked. To react only to docking, listen for
this event rather than checking the window width.

### CSS hooks

While your page is pushed, `<html>` has the classes `wigmix-docked` and `wigmix-docked-left` or `wigmix-docked-right`, and
the CSS property `--wigmix-docked-width` (for example `380px`). They are added when the panel starts opening, so your
overrides animate together with the page, and removed when it starts closing or if the widget falls back to the overlay.

```css
/* Fewer columns in the narrower page */
html.wigmix-docked .product-grid { grid-template-columns: repeat(3, 1fr); }

/* Things sized to the window */
html.wigmix-docked .hero { width: calc(100vw - var(--wigmix-docked-width)); }
```

The widget checks the result *after* these classes apply, so an override that removes a horizontal scrollbar (like the
`100vw` one above) keeps the page pushed instead of falling back to the overlay.

### The `resize` event

A single `resize` event is fired on `window` once your page has settled after opening, and once after closing. Many sliders
already listen for it and re-measure.

## Examples by kind of page

These assume a 1440px window, a 380px panel docked on the left, and a page that gets 1060px. The last column is what to
expect from the logic above, not a guarantee; see [Checking it on your site](#checking-it-on-your-site).

| Your page | What the widget does | Expected result |
| --- | --- | --- |
| Fluid content page (columns, no fixed bars) | Adds a 380px left margin to `<body>`; the content reflows into 1060px | Docked, nothing else needed |
| Full-width fixed header | Moves the header's left edge in by 380px so it stays visible beside the panel | Docked |
| Floating chat bubble or cookie badge, bottom-left | Shifts it right by 380px, out from under the panel | Docked |
| `max-width: 1200px; margin: 0 auto` on `<body>` | Offsets by 380px plus half the leftover room, so the page stays centred in the 1060px beside the panel | Docked, still centred |
| The same centring on a wrapper inside `<body>` | Nothing special; the wrapper centres itself inside the narrower `<body>` | Docked, still centred |
| Hero section sized `width: 100vw` | The section is wider than the 1060px your page now has, so a horizontal scrollbar appears and the check fails | Overlay on desktop-sized windows, modal on tablet-sized ones. Fix with the CSS hook above. |
| Carousel that sizes its slides from `window.innerWidth` | The window is still 1440px wide, so the carousel sizes for 1440px inside a 1060px area | Fine if it re-measures on `resize`; otherwise use the `wigmix:dock` event |
| Support chat widget in a cross-origin iframe, bottom-left | The iframe element can be moved if it is `position: fixed`, but nothing inside it can | May sit partly under the panel |
| Site menu with a higher z-index than the panel | Draws over the panel | Raise `dockedZIndex` |
| Scrolling happens in an inner container (`html`, `body` or `#root` with its own overflow) | The margin can land on the wrong element | Set `pushSelector` to the right container |

## Configuration reference

All options live under `customizations.popup` and apply only when `displayMode` is `'docked'`.

| Option | Default | Meaning |
| --- | --- | --- |
| `displayMode` | `'modal'` | `'modal'` or `'docked'`. Leaving it unset keeps the regular modal. |
| `position` | `'left'` | Side the panel docks to (the existing popup option). `'center'` and `'bottom'` dock on the right. |
| `dockedPanelWidth` | `380` | Panel width: pixels (`320`, `'320px'`), a share of the window (`'20%'`), or per device (`{ desktop: 320, tablet: 220, mobile: 220 }`). A device left out uses `desktop`. |
| `dockedMinWindowWidth` | `700` | Windows narrower than this get the modal. Your page gets the window minus the panel. |
| `pushSelector` | unset | CSS selector of the page container to offset, for example `#page` or `main.site-wrapper`. Unset: `<body>`, then a common app wrapper. Set it when your layout hangs off a wrapper those don't cover. If it matches nothing, the panel is shown over your page instead. |
| `dockedZIndex` | `13000` | Stacking order of the panel, the same as the modal. Raise it if your header or menus draw over the panel; keep it below your cookie-consent dialogs so those stay clickable. |

## Known limits

- **Your page still sees the full window.** Media queries, `vw` units and `window.innerWidth` keep reporting the whole
  window width. Container queries on your side would let the page respond to the space it really has.
- **Some fixed elements can't be moved.** Elements inside cross-origin iframes or closed shadow roots can't be reached, and
  fixed elements whose CSS `translate` uses functions such as `calc()` are left alone. Wide fixed elements that already have
  a `transform` are shifted rather than shrunk, so their far edge can leave the screen.
- **A cramped page isn't detected.** The check catches overflow and covered content, not a page that squeezes without
  overflowing but looks cramped.
- **Inline styles while open.** The pushed and moved elements carry inline styles set with `!important`, so your own rules
  cannot cancel the offset, and an inline `transition` replaces a stylesheet one while the panel is open. Everything is put
  back once the panel has closed.
- **Escape needs focus in the panel.** Escape pressed while your page has focus belongs to your page and does not close the
  panel. When the input is focused on open, that happens on devices with a mouse or trackpad only, not on touch devices.
- **One docked panel at a time.** If two docked widgets are open at once (even from different widget bundles or versions on the same page), the second is shown as an overlay, and docks by itself once the first closes.

## Checking it on your site

The behaviour above follows from how pages are usually built, but every site is different. Before you rely on docked mode,
try it on your real pages:

- **Browsers and devices:** Chrome, Safari and Firefox on desktop, and a tablet in portrait and landscape.
- **Window widths:** just under and over `dockedMinWindowWidth` (for example 660 and 700px), plus 768, 1024 and 1440px.
- **Pages:** a plain content page, one with a fixed header, one with a `100vw` hero, one with a carousel, and one with a
  third-party chat widget.

| Check | How | It works when |
| --- | --- | --- |
| Page makes room | Open the assistant on each page | No horizontal scrollbar, nothing under the panel |
| Fallback | Open it on a page that can't make room | Overlay on desktop-sized windows, modal below, never a broken layout |
| Fixed elements | Open it on pages with a fixed header or chat bubble | Header and bubble stay visible beside the panel |
| Threshold | Drag the window across the minimum width with the assistant open | Switches between docked and modal; the conversation and any unsent text are kept |
| Rotation | Rotate a tablet with the assistant open | Panel and page re-fit without a reload |
| Close | Close the assistant | The page is exactly as it was, including inline styles and scroll position |
| Keyboard | Open it, press Escape, tab around | Escape closes it and focus returns to the trigger button |
| Carousels and sliders | Open it on a page with one | It re-measures after the `resize` event, or you handle `wigmix:dock` |

To try the widget locally, run `npm run start:shopping-assistant`. The demo page is deliberately plain (a title and the
trigger button), and `src/official-widgets/shopping-assistant/dev-configs.ts` has a ready-made docked `popup` block (remove
it to see the modal). To see how docked mode treats a fixed header, a centred layout or a carousel, add them to the demo
page or try your own pages.
