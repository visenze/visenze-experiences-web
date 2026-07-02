# Shopping Assistant `disable_cache` Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated guide showing how placement `6643` can send `disable_cache=true` to the shopping-assistant API.

**Architecture:** Add one focused Markdown document under `docs/`. The guide uses the existing `window.visenzeConfigs` configuration mechanism and places it before the supplied widget-init snippet so initialization merges the extra search parameter into the widget configuration.

**Tech Stack:** Markdown, browser JavaScript, Rezolve widget-init integration

---

### Task 1: Add the dedicated integration guide

**Files:**
- Create: `docs/shopping-assistant-disable-cache.md`
- Reference: `docs/integration.md`
- Reference: `src/official-widgets/shopping-assistant/shopping-assistant.tsx:115`

- [ ] **Step 1: Create the guide**

Create `docs/shopping-assistant-disable-cache.md` with this content:

````markdown
# Disable Shopping Assistant API Caching

The shopping-assistant widget sends entries from `searchSettings` as query parameters to the shopping-assistant API. To bypass cached responses, set `disable_cache` to `true` for the widget's placement.

The configuration must be defined before the widget-init script runs. The following example configures placement `6643`:

```html
<div class="ps-widget-6643"></div>

<script type="text/javascript">
  window.visenzeConfigs = window.visenzeConfigs || {};
  window.visenzeConfigs[6643] = {
    searchSettings: {
      disable_cache: true,
    },
  };
</script>

<script type="text/javascript">
!function(x,e,t,n,r,i,a){var o=localStorage.getItem("va-uid")||function x(){let e=new Date().getTime(),t="xxxxxxxx.xxxx.4xxx.yxxx.xxxxxxxxxxxx".replace(/[xy]/g,x=>{let t=(e+16*Math.random())%16|0;return e=Math.floor(e/16),("x"===x?t:3&t|8).toString(16)});return t}(),c=x.getElementsByTagName(e)[0],d=x.createElement(e),g=new URL(`https://search-dev.visenze.com/v2/widget-init?app_key=${t}&placement_id=${n}&container=${r}&uid=${o}`);i&&(g+=`&contexts=${i}`),d.async=!0,d.src=g,d.onload=function(){a&&a()},c.parentNode.insertBefore(d,c)}(document,"script","8b7ebae3c13848c9bbfe946f3aa42735","6643",".ps-widget-6643");
</script>
```

Configuration is keyed by placement ID, so `window.visenzeConfigs[6643]` applies only to placement `6643`. Use the relevant placement ID in both the configuration and widget-init snippet when adapting this example.

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
````

- [ ] **Step 2: Check Markdown formatting**

Run:

```bash
npx prettier --check docs/shopping-assistant-disable-cache.md
```

Expected: Prettier reports that `docs/shopping-assistant-disable-cache.md` uses the expected formatting.

- [ ] **Step 3: Check for whitespace errors and inspect the final diff**

Run:

```bash
git diff --check
git diff -- docs/shopping-assistant-disable-cache.md
```

Expected: `git diff --check` produces no output, and the diff contains only the new dedicated guide.

- [ ] **Step 4: Commit the guide**

```bash
git add docs/shopping-assistant-disable-cache.md
git commit -m "docs: explain shopping assistant cache bypass"
```
