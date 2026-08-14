# Disable Shopping Assistant API Caching

The shopping-assistant widget sends entries from `searchSettings` as query parameters to the shopping-assistant API. To bypass cached responses, set `disable_cache` to `true` for the widget's placement.

The configuration must be defined before the widget-init script runs. The following example configures placement `6643`:

```html

<script type="text/javascript">
  window.visenzeConfigs = window.visenzeConfigs || {};
  window.visenzeConfigs[6643] = {
    searchSettings: {
      disable_cache: true,
    },
    customizations: {
      chatbot: {
<<<<<<< HEAD
        chatAgent: 'shopping_closer_voice_v2',
=======
        chatAgent: 'shopping_assistant_v2',
        voiceEnabled: true,
        voiceId: '<voice-provider voice ID>',
        voiceModelId: '<voice-provider model ID>',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
        },
>>>>>>> 8b85a78532d2ce832325c43230afc7d59c7cc547
      },
    },
  };
</script>

// get the script from Placement's Integrate Widget page, look something like this
<div class="ps-widget-6643"></div>

<script type="text/javascript">
   !function(x,e,t,n,r,i,a){var o=localStorage.getItem("va-uid")||function x(){let e=new Date().getTime(),t="xxxxxxxx.xxxx.4xxx.yxxx.xxxxxxxxxxxx".replace(/[xy]/g,x=>{let t=(e+16*Math.random())%16|0;return e=Math.floor(e/16),("x"===x?t:3&t|8).toString(16)});return t}(),c=x.getElementsByTagName(e)[0],d=x.createElement(e),g=new URL(`https://multimodal.search.rezolve.com/v2/widget-init?app_key=${t}&placement_id=${n}&container=${r}&uid=${o}`);i&&(g+=`&contexts=${i}`),d.async=!0,d.src=g,d.onload=function(){a&&a()},c.parentNode.insertBefore(d,c)}(document,"script","<APP_KEY>","<PLACEMENT_ID>",".ps-widget-<PLACEMENT_ID>");
   </script>
```

Configuration is keyed by placement ID, so `window.visenzeConfigs[6643]` applies only to placement `6643`. Use the relevant placement ID in both the configuration and widget-init snippet when adapting this example.

The optional `customizations.chatbot.chatAgent` setting controls the `chat_agent` parameter sent to the shopping-assistant API. Setting it to `shopping_assistant_v2` explicitly pins the widget to that agent. Unset, it defaults to `shopping_closer_voice_v2`.

`customizations.chatbot` also gates and configures voice input/output for the widget:

| Field | Required | Description |
| --- | --- | --- |
| `voiceEnabled` | No | Enables voice input (browser speech recognition) and voice output (text-to-speech narration of replies). Defaults to disabled; when unset or `false`, no voice UI is shown and no voice-proxy requests are made. |
| `voiceId` | No | Voice-provider voice ID used for spoken replies. Falls back to the widget's built-in voice when unset. |
| `voiceModelId` | No | Voice-provider model ID used for spoken replies. Falls back to the widget's built-in model when unset. |
| `voiceSettings.stability` | No | Voice stability (0-1) forwarded to the voice-synthesis proxy. Falls back to the widget's built-in setting when unset. |
| `voiceSettings.similarityBoost` | No | Voice similarity boost (0-1) forwarded to the voice-synthesis proxy. Falls back to the widget's built-in setting when unset. |

See `docs/shopping-assistant-voice-proxy.md` for how the voice-synthesis proxy call itself works.

## Verify the request

1. Open the page and launch the shopping-assistant widget.
2. Open the browser's developer tools and select the **Network** panel.
3. Send a message through the shopping assistant.
4. Select the request whose URL ends with `/chat/shopping-assistant`.
5. Confirm its query string contains:

   ```text
   disable_cache=true
   ```

If the parameter is missing, confirm the `window.visenzeConfigs` script appears before the widget-init script and that both use the same placement ID.
