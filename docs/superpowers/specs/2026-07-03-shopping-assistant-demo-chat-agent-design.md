# Shopping Assistant Demo Chat-Agent Input Design

## Goal

Update `docs/test_shop_assistant.html` so users can choose the shopping-assistant chat agent from the demo page before loading the widget.

## User Interface

Add a `Chat Agent` text input to the existing configuration panel. Its initial value will be `shopping_assistant_v2`, matching the widget's built-in fallback.

The new input will use the existing `.config-row` layout and text-input styling. No new visual components or CSS rules are required.

## Configuration Flow

When `loadWidget()` runs:

1. Read and trim the chat-agent input.
2. Preserve the existing app-key, placement, environment, and cache configuration behavior.
3. Add `customizations.chatbot.chatAgent` to `window.visenzeConfigs[widgetId]` when the input is non-empty.
4. Omit the chatbot customization when the input is empty, allowing the widget's built-in fallback to apply.

The widget configuration will have this shape for the default input:

```js
{
  searchSettings: {
    disable_cache: disableCache,
  },
  customizations: {
    chatbot: {
      chatAgent: 'shopping_assistant_v2',
    },
  },
}
```

## Scope

Only `docs/test_shop_assistant.html` will change. Existing user changes, including the deletion of the earlier chat-agent documentation spec, will remain untouched.

## Verification

- Check the HTML and inline JavaScript with Prettier.
- Check the inline JavaScript syntax after extracting the script contents.
- Inspect the diff to confirm the input and `customizations.chatbot.chatAgent` mapping are present and unrelated demo behavior is unchanged.
