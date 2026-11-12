# Multiple chatbot placements on one page

When a page has more than one `shopping-assistant` placement (for example, one on the home banner and one on a
product section), each placement is an independent widget with its own trigger button and its own chat popup.
They do not know about each other, so by default opening one does **not** close another: the shopper can end up
with two chat popups stacked on top of each other.

This guide shows how the host page can keep **only one chat popup open at a time**.

## The APIs involved

Every rendered widget is reachable from `window` by its placement ID
(see [Programmatic Access](integration.md#programmatic-access)):

```js
const widget = window.visenzeWidgets['<PLACEMENT_ID>'];
// or: window['visenzeWidget<PLACEMENT_ID>']
```

| API                                   | Since  | What it does                                                                                                          |
|---------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------|
| `widget.closeWidget()`                | 1.0.18 | Closes that placement's chat popup, the same as its ✕ button. The conversation is kept and resumes when it reopens. Safe to call on a popup that is already closed: nothing visible happens, and focus is not moved. |
| `widget.openWidget()`                 | 1.0.0  | Opens that placement's chat popup, the same as clicking its trigger button.                                          |
| `callbacks.onWidgetOpen(placementId)` | 1.0.42 | Optional. Fires each time that placement's popup opens, from its trigger button, `openWidget()`, `sendChatMessage()` or `openWithMessage()`. Does not fire again while the popup is already open. `shopping-assistant` only. |

## Close the others before opening one

When the page opens a chatbot (from its own button, link or banner), close the other chatbots first:

```js
// The chatbot placement IDs on this page.
var CHATBOT_PLACEMENTS = ['1001', '1002'];

function openOnlyChatbot(placementId) {
  CHATBOT_PLACEMENTS.forEach(function (id) {
    var widget = window.visenzeWidgets && window.visenzeWidgets[id];
    if (!widget) {
      return;
    }
    if (id === String(placementId)) {
      widget.openWidget();
    } else {
      widget.closeWidget();
    }
  });
}

// e.g. <button onclick="openOnlyChatbot('1002')">Ask our stylist</button>
```

List only chat placements in `CHATBOT_PLACEMENTS`. Calling `closeWidget()` on other popup widgets
(e.g. camera search) also closes them, which may or may not be what you want.

### When the shopper uses a chatbot's own trigger button

The page is not involved when the shopper clicks a widget's built-in trigger button, so `openOnlyChatbot` does not
run and the other popups stay open. Either hide the built-in trigger buttons and open the chatbots only from your own
buttons, or use the `onWidgetOpen` callback below.

## Optional: the `onWidgetOpen` callback

`onWidgetOpen` tells the page whenever a chatbot opens, however it was opened. Use it to:

- close the other chatbots even when the shopper used a built-in trigger button;
- record which chatbot the shopper opened, for your own analytics.

Set it for every chatbot placement, **before** the widget snippets so the configs are in place when the widgets initialize:

```html
<script type="text/javascript">
  var CHATBOT_PLACEMENTS = ['1001', '1002'];

  function onChatbotOpen(openedPlacementId) {
    // Close the other chatbots.
    CHATBOT_PLACEMENTS.forEach(function (id) {
      if (id !== String(openedPlacementId)) {
        var widget = window.visenzeWidgets && window.visenzeWidgets[id];
        if (widget) {
          widget.closeWidget();
        }
      }
    });
    // Optional: your own analytics, e.g.
    // window.dataLayer && window.dataLayer.push({ event: 'chatbot_open', placementId: String(openedPlacementId) });
  }

  window.visenzeConfigs = window.visenzeConfigs || {};
  CHATBOT_PLACEMENTS.forEach(function (id) {
    window.visenzeConfigs[id] = window.visenzeConfigs[id] || {};
    window.visenzeConfigs[id].callbacks = Object.assign({}, window.visenzeConfigs[id].callbacks, {
      onWidgetOpen: onChatbotOpen,
    });
  });
</script>
```

The placement ID passed to the callback may be a number or a string, so compare with `String(...)` as above.

## Closing every chatbot

For example, when the shopper navigates to another view in a single-page app:

```js
CHATBOT_PLACEMENTS.forEach(function (id) {
  window.visenzeWidgets && window.visenzeWidgets[id] && window.visenzeWidgets[id].closeWidget();
});
```

## Troubleshooting

| Symptom                                       | Check                                                                                                                       |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `window.visenzeWidgets[id]` is `undefined`    | The widget has not finished loading yet, or the ID is wrong. Call the APIs after the widgets have rendered, or guard as in the examples. |
| Both popups still open together               | The shopper used a built-in trigger button: hide those buttons, or set `onWidgetOpen` on **every** chatbot placement.      |
| `onWidgetOpen` never fires                    | The widget bundle is older than 1.0.42, or the config was set after the widget initialized. Set `window.visenzeConfigs` before the widget snippets. |
