# AI Prompt Box

Compact inline "Ask AI" panel for product pages: a title, tappable suggested questions and an input.
The panel itself never shows the conversation: tapping a suggestion, sending a message or clicking Find
Similar opens the chat in a side-mounted drawer (like the shopping-assistant widget). Once there is a
conversation, icons appear at the top right: "new chat" (reset) and "maximize", which reopens the drawer.

## Placement

```html
<div class="ps-widget-<PLACEMENT_ID>" data-pid="<PRODUCT_ID>"></div>
```

`data-pid` is optional. When set, it is sent to the chat endpoint as `pid` (product context for the
assistant), each product gets its own stored conversation, and the optional "Find Similar" button is
available. When it is missing, empty, or left as `undefined` / `null` / `NaN` or an unfilled template
placeholder (`{{ product.id }}`, `<product-id>`, `${id}`, `%ID%`, ...), the widget still works as a
general assistant: no `pid` is sent, the conversation is stored per placement, and the Find Similar
button is hidden.

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `customizations.aiPromptBox.title` | text key `aiPromptBoxTitle` | Optional title in the panel and the chat drawer header, e.g. `Ask Fitzy`. With a `titleIcon` logo and no title, the title row shows just the logo (the text stays for screen readers). |
| `customizations.aiPromptBox.chatTitle` | none | Text for the chat drawer's header, used when `title` is empty (e.g. a logo-only panel). A set `title` wins; with neither, the default `aiPromptBoxTitle` text is shown. |
| `customizations.aiPromptBox.message` | none | Optional short line (e.g. `Need a hand?`, shown small, gray and medium weight) between the title row and the chips. |
| `customizations.aiPromptBox.inputIcon` | none | Optional icon inside the text input, at its start: `url` (required to show it), `height` (default 20), `width`, `color`/`colorDark`. |
| `customizations.aiPromptBox.suggestedQuestions` | `[]` | Chips shown side by side (wrapping to the next row when narrow) before the first message. |
| `customizations.aiPromptBox.maxSuggestedQuestions` | `5` | Max chips shown (the first N); lower it to save vertical space when chips wrap. |
| `customizations.aiPromptBox.findSimilar` | disabled | "Find Similar" button beside the input: `enabled` (default `false`), `label` (default text key `aiPromptBoxFindSimilar`), `message` (default `find similar products`, sent as the shopper's message). |
| `customizations.aiPromptBox.chatPosition` | `right` | Side the chat drawer slides in from: `left` or `right` (full screen on tablet/mobile). |
| `customizations.aiPromptBox.buttonColors` | accent (`generalLayout` colors, inverted) | Colors shared by the send button (inside the text input) and the Find Similar button: `backgroundColor`, `fontColor`, `backgroundColorDark`, `fontColorDark`. Any color left unset uses the default accent. |
| `customizations.aiPromptBox.restoreChat` | `true` | Restore an earlier conversation after a reload; it is behind the maximize icon. `false`: nothing is restored, each page load starts fresh. |
| `customizations.aiPromptBox.titleIcon` | none (sparkle icon) | Brand logo in the title row: `url`, `layout` (`ICON_TEXT` default when a title is set, `ICON` when not / `TEXT` / `TEXT_ICON`), `height` (default 24), `width`, `color`/`colorDark`. |
| `customizations.localization.text` keys: `aiPromptBoxTitle`, `aiPromptBoxPlaceholder`, `a11yMaximizeChat`, `a11yCloseChat` | see `default-config.ts` | Title (e.g. "Ask Fitzy"), input placeholder, maximize button label. |

Colors, fonts and dark mode use the standard `generalLayout` customizations. In particular
`generalLayout.backgroundColor` / `backgroundColorDark` set the background of the panel and the chat drawer
(the text input and suggestion chips stay white on top of it), and `generalLayout.fontColor` /
`fontColorDark` set the text and icon color and, by default, the button color (see `buttonColors`).

## Local development

Set `appKey`/`placementId` in `dev-configs.ts` and a real product id in `index.html`'s `data-pid`, then
`npm run start:ai-prompt-box`.

## How it behaves

The panel stays collapsed (title, message, chips, input). Any question opens the chat in a side-mounted
drawer, like the shopping-assistant widget, on the same conversation.

## Changing the product

`data-pid` is watched: when the host changes it (for example a single-page app moving to another product),
the prompt box picks up the new id and sends it with the following messages. An ongoing conversation continues
rather than restarting.

## Chat history

The conversation is saved by default (`customizations.chatbot.persistChatEnabled`, default `true`) and brought
back after a reload when `customizations.aiPromptBox.restoreChat` is `true` (default). It is stored per placement
and product (30 minutes of inactivity by default, `persistChatTtlMinutes`); the messages are fetched again from
the backend. Set `restoreChat: false` to start every page load with a fresh conversation.

A restored chat is behind the maximize icon, which opens the drawer with the old conversation. "New chat"
resets it.
