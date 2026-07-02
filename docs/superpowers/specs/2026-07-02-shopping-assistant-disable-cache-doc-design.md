# Shopping Assistant `disable_cache` Documentation Design

## Goal

Add a dedicated integration guide showing how to configure shopping-assistant placement `6643` so each shopping-assistant API request includes `disable_cache=true`.

## Document

Create `docs/shopping-assistant-disable-cache.md` as a concise, copy-paste-oriented guide.

The guide will:

1. Explain that shopping-assistant forwards values from `searchSettings` as API query parameters.
2. Show a complete HTML example using the supplied `.ps-widget-6643` container and widget-init snippet.
3. Initialize `window.visenzeConfigs` safely before assigning placement configuration.
4. Set `window.visenzeConfigs[6643].searchSettings.disable_cache` to `true`.
5. Place the configuration script before the widget-init script and explain why ordering matters.
6. Explain how to verify `disable_cache=true` in the shopping-assistant request URL using browser developer tools.
7. Clarify that the configuration is scoped to placement `6643`.

## Scope

Only documentation will change. The widget implementation already forwards `searchSettings` values, so no source-code or test changes are required.

The guide will not document unrelated shopping-assistant options, endpoint overrides, or general widget integration.

## Verification

Review the rendered Markdown structure and compare the example against:

- `docs/integration.md` for the established `window.visenzeConfigs` integration pattern.
- `src/official-widgets/shopping-assistant/shopping-assistant.tsx` for query-parameter forwarding.

Confirm that the final example defines the configuration before loading the widget-init script and produces the query parameter `disable_cache=true`.
