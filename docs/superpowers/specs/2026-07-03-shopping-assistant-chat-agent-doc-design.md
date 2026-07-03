# Shopping Assistant Chat-Agent Documentation Design

## Goal

Update `docs/shopping-assistant-disable-cache.md` to show how placement `6643` can explicitly select a shopping-assistant chat agent alongside the existing cache setting.

## Change

Extend the existing `window.visenzeConfigs[6643]` example with:

```js
customizations: {
  chatbot: {
    chatAgent: 'shopping_assistant_v2',
  },
},
```

Keep `customizations` next to `searchSettings` in the same placement configuration object. Add one concise sentence explaining that `customizations.chatbot.chatAgent` controls the `chat_agent` parameter sent to the shopping-assistant API.

## Scope

Only `docs/shopping-assistant-disable-cache.md` will change. No new section, source-code change, or test change is required.

The example uses `shopping_assistant_v2`, which is also the widget's current fallback. Setting it explicitly pins the configuration to that agent.

## Verification

- Compare the documented property path with `src/official-widgets/shopping-assistant/shopping-assistant.tsx`.
- Run Prettier against the updated Markdown file.
- Run `git diff --check` and inspect the final diff.
