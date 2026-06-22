# Widget initialization flow (and when the endpoint is read)

Status: **Reference — for review**
Purpose: trace how a widget boots and **exactly when/where it reads `endpoint`**, which settled
API-plan **Q2**. Agreed design: the API **adds `cloud` and keeps the legacy `endpoint` unchanged**;
the widget arbitrates with **manual endpoint > `cloud` > API endpoint > default**. Companion docs:
`cloud-endpoints-plan.md` (widget), `cloud-endpoints-api-plan.md` (API).

## TL;DR — when is the endpoint read?

The endpoint is **baked in once by the server at bootstrap**, mapped to `appSettings.endpoint`, and
**read exactly once at widget init** when the SDK client is constructed
(`widget-client.ts:65`, `visearch.setKeys({ endpoint })`). After that the **SDK stores it** and reuses
the stored value on **every** search/recommendation/multisearch call for the widget's lifetime. There
is no per-request re-read. (One extra reader: `shoppable-gallery` reads `appSettings.endpoint`
directly at fetch time — see step 6.)

So `endpoint` is effectively **immutable per widget instance, decided at bootstrap by the server**.

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
   │  runs snippet (docs/integration.md:23)
   ▼
 GET https://search.visenze.com/v2/widget-init?app_key=…&placement_id=…
   │
   ▼  WidgetInitService.getInitConfigScript()  (visenze-product-search)
   │    fetches init template from CDN, then string-replaces:
   │      $APP_KEY, $PLACEMENT_ID,
   │      $ENDPOINT  ← endpointConfig.getEndpoint()  (productsearch.api.endpoint)
   │      $CONFIG, $FIELDS_MAPPINGS, $VERSION, $WIDGET_TYPE, $LOCALE, …
   │    template shape (from WidgetInitServiceTest):
   │      {app_key:"$APP_KEY", placement_id:"$PLACEMENT_ID", endpoint:"$ENDPOINT",
   │       mappings:"$FIELDS_MAPPINGS", version:"$VERSION", widget:"$WIDGET_TYPE", config:"$CONFIG"}
   │    returns gzipped JS
   ▼
 INIT SCRIPT runs in the browser
   │    assembles a WidgetConfig where appSettings.endpoint = the injected $ENDPOINT value,
   │    then calls window.visenzewigmixwidget[type][version].initWidget(config, fieldMappings)
   ▼  initWidgetFactory → init()   (initialization.ts:196)
   │    1. isPlacementSkippable() bail-out
   │    2. deepMerge(initConfig, { ...DEFAULT_CONFIGS, customizations })   ← endpoint preserved
   │    3. setCssVariables()
   │    4. populateProductDetailsAndAttrsToGet()
   │    5. getWidgetClient(widgetConfig, …)
   ▼  getWidgetClient()   (widget-client.ts:46-68)
   │    const { … endpoint … } = appSettings;
   │    visearch.setKeys({ …, endpoint: endpoint || DEFAULT_ENDPOINT, … })   ◄── ENDPOINT READ (once)
   ▼  SDK stores endpoint
   │
   ▼  RUNTIME — every search call reuses the stored endpoint:
        widgetClient.multisearchByImage / multisearchComplementary / productSearchById / …
        (similar-search, camera-search, recommend-me all go through here)
        shoppable-gallery: separate direct fetch(`${appSettings.endpoint}/…`)  ◄── reads endpoint again
```

## Key code references

- **Server injection** — `WidgetInitService.getInitConfigScript()`:
  `initCode.replace("$ENDPOINT", endpointConfig.getEndpoint())` (~line 143), template fetched from
  `versionConfig.getWidgetInitCdnLink()`.
- **`$ENDPOINT` source** — `ProductSearchEndpointConfig` (`@ConfigurationProperties("productsearch.api")`),
  property `productsearch.api.endpoint`. Current values:
  | Env | `productsearch.api.endpoint` |
  |:---|:---|
  | AWS prod (`application.properties`) | `https://search.visenze.com` |
  | Azure zones (`application-az_*.properties`) | `https://multimodal.search.rezolve.com` |
  | staging / dev | `https://search-dev.visenze.com` |
  > Note: today the server **always injects a legacy domain** — never a `multisearch-aw/az` cloud
  > domain.
- **Bootstrap → config** — `init()` at `initialization.ts:196`; config flows in as
  `initConfig.appSettings` (incl. `endpoint`) and is merged with defaults at line 207.
- **The single read** — `getWidgetClient()` at `widget-client.ts:48` (destructure) and `:65`
  (`endpoint: endpoint || DEFAULT_ENDPOINT` → `visearch.setKeys`). This is the only place the SDK's
  endpoint is set; it happens **once per widget init**.
- **Direct reader** — `shoppable-gallery/shoppable-gallery.tsx:57`
  (`${appSettings.endpoint}/v1/product/linked/gallery/browse`).

## How Q2 was settled (agreed design)

The endpoint is **read once at bootstrap and frozen** — whatever `/v2/widget-init` injects is the
whole story for that widget instance. The agreed design keeps the server side minimal and pushes
arbitration to the widget:

- **API: add `cloud`, keep injecting the legacy `$ENDPOINT` exactly as today.** No blanking, no
  server-side rollout gate.
- **Widget: new precedence** — **manual endpoint (JS) > `cloud` > API endpoint > default.** When
  `cloud` is present the widget **ignores the API-provided endpoint** and resolves the cloud domain
  from its own `CLOUD_DOMAINS` map; a developer's manual endpoint (via `window.visenzeConfigs`) still
  wins over everything.

| manual (JS) | `cloud` (API) | API `endpoint` | Widget uses |
|:--|:--|:--|:--|
| set | any | any | **manual endpoint** (highest) |
| — | set | (ignored) | **cloud domain** + cloud paths |
| — | — | set | API endpoint (today's behavior) |
| — | — | — | `DEFAULT_ENDPOINT` |

### Why this is safe for existing widgets (no gate, no blanking)
The earlier worry was that switching the domain server-side could break live widgets. This design
removes that risk structurally:

- The API keeps sending the legacy `endpoint`, so nothing about today's responses changes for the
  endpoint field.
- **Already-deployed widget bundles don't understand `cloud` — they ignore the unknown field and keep
  using `endpoint`.** So even after the API starts emitting `cloud`, live widgets are unaffected until
  their bundle is upgraded to one that honors `cloud`.
- A switch to cloud domains therefore requires **both** (a) the API populating `cloud` for the app and
  (b) a new widget bundle deployed. Each is an independent, controllable lever — no all-at-once swap.
- Bonus: the API never needs to know the `multisearch-aw/az` domains (the widget/SDK owns the map),
  so there's no domain duplication to keep in sync.

### Provenance detail
Manual and API endpoints both arrive in `appSettings.endpoint` (the init script merges
`window.visenzeConfigs` over the API config). The widget recovers the manual one by reading
`window.visenzeConfigs[placementId].appSettings.endpoint` directly — see widget plan §3 + open question #7
(and the alternative: have the init script keep the API endpoint in a separate field). The
`shoppable-gallery` direct fetch uses the same resolver, so it follows the same precedence.

## Net

`endpoint` is a **bootstrap-time, write-once** value, but **which domain a widget talks to is now
decided by the widget**, not solely by what the server injects: `cloud` (when the bundle understands
it) overrides the API endpoint, and a manual JS endpoint overrides everything. The server change is
purely additive (`cloud` alongside the unchanged legacy `endpoint`), which is what makes the rollout
safe by construction.
