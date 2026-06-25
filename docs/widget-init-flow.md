# Widget initialization flow (and when the endpoint is read)

Status: **Reference**
Purpose: trace how a widget boots and **exactly when/where it reads `endpoint`**. For the endpoint
resolution design (the `manual > cloud > API endpoint > default` precedence), see
[ADR 0001](adr/0001-dynamic-cloud-endpoints.md).

## TL;DR — when is the endpoint read?

The endpoint is **baked in once by the server at bootstrap**, mapped to `appSettings.endpoint`, and
**read once at widget init** when the SDK client is constructed (`widget-client.ts`,
`visearch.setKeys(...)`). The SDK then stores it and reuses it on **every**
search/recommendation/multisearch call for the widget's lifetime — there is no per-request re-read.
(One extra reader: `shoppable-gallery` reads the endpoint directly at fetch time — see the flow
below.) So `endpoint` is effectively **immutable per widget instance, decided at bootstrap**.

## Actors

| Actor | Repo | Role |
|:---|:---|:---|
| Host page snippet | (console-generated) | loads `https://search.visenze.com/v2/widget-init?app_key=…&placement_id=…` |
| `/v2/widget-init` (`WidgetInitService`) | `visenze-product-search` | server-renders a JS bootstrap with config baked in |
| Init template (CDN JS) | widget build artifact | assembles a `WidgetConfig` and calls `initWidget(config, fieldMappings)` |
| Widget bundle (`initWidget` → `init`) | `visenze-experiences-web` | merges config, builds the SDK client, renders React |
| `visearch-javascript-sdk` | npm dep | holds `endpoint`/`cloud`, makes the actual API calls |

## End-to-end flow

```text
 HOST PAGE
   │  runs snippet (docs/integration.md)
   ▼
 GET https://multimodal.search.rezolve.com/v2/widget-init?app_key=…&placement_id=…
   │
   ▼  WidgetInitService.getInitConfigScript()  (visenze-product-search)
   │    fetches init template from CDN, then string-replaces $APP_KEY, $PLACEMENT_ID,
   │    $ENDPOINT, $CONFIG, $FIELDS_MAPPINGS, $VERSION, $WIDGET_TYPE, $LOCALE, …
   ▼
 INIT SCRIPT runs in the browser
   │    assembles a WidgetConfig where appSettings.endpoint = the injected $ENDPOINT value,
   │    then calls window.visenzewigmixwidget[type][version].initWidget(config, fieldMappings)
   ▼  initWidgetFactory → init()   (initialization.ts)
   │    isPlacementSkippable → deepMerge defaults → setCssVariables →
   │    populateProductDetailsAndAttrsToGet → getWidgetClient(widgetConfig, …)
   ▼  getWidgetClient()   (widget-client.ts)
   │    visearch.setKeys({ … endpoint / cloud … })   ◄── ENDPOINT READ (once)
   ▼  SDK stores endpoint
   │
   ▼  RUNTIME — every search call reuses the stored endpoint:
        multisearch / multisearchComplementary / productSearchById / …
        (similar-search, camera-search, recommend-me go through here)
        shoppable-gallery: separate direct fetch(`${base}/…`)  ◄── resolves endpoint again
```

## Key code references

- **Server injection** — `WidgetInitService.getInitConfigScript()` replaces `$ENDPOINT` with
  `endpointConfig.getEndpoint()` (`productsearch.api.endpoint`). Today this is always a *legacy*
  domain (`search.visenze.com` on AWS, `multimodal.search.rezolve.com` on Azure, `search-dev.visenze.com`
  on staging/dev) — never a `multisearch-aw/az` cloud domain.
- **Bootstrap → config** — `init()` in `initialization.ts`; config flows in as `initConfig.appSettings`
  (incl. `endpoint`) and is merged with defaults.
- **The single read** — `getWidgetClient()` in `widget-client.ts`: the only place the SDK's endpoint
  is set, once per widget init. Endpoint/cloud arbitration happens here (see ADR 0001).
- **Direct reader** — `shoppable-gallery/shoppable-gallery.tsx` resolves the base + browse path via
  `src/common/client/endpoint.ts` rather than reading `appSettings.endpoint` raw.
