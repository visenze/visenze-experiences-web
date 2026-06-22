# Plan (API side): Support dynamic cloud endpoints for widgets

Status: **Proposal — for review**
Repo: `visenze-product-search` (Spring Boot / Java 8+, Maven) — branch `feature/widget_support`
Companion doc: `cloud-endpoints-plan.md` (the `visenze-experiences-web` widget changes)

This plan covers the **backend** changes needed so widgets can run on the cloud-specific domains
(`multisearch-aw.rezolve.com` / `multisearch-az.rezolve.com`) with their updated API paths. It is the
server-side counterpart to the widget plan, whose open question #3 (“who sets `cloud`?”) is answered
here: the widget-init / widget-config responses must populate `cloud` from the app's deployment zone.

## 1. How this repo relates

`visenze-product-search` both (a) serves the widget bootstrap/config endpoints the host page calls,
and (b) serves the search APIs the widget/SDK calls. The widget gets its `appSettings` (including
`endpoint`) from this service. So two things must happen here:

- **A. Expose `cloud` to the widget** — add `cloud` (`'aws'` | `'azure'`) to the widget config /
  init responses, derived from the app's zone. This is what lets the widget opt into cloud domains
  (per the companion doc §3).
- **B. Serve the new cloud API paths** — **RESOLVED: no Spring app change needed.** The new cloud
  paths are translated to the existing legacy `/v1/product/...` routes at the **Istio ingress layer**
  via `ms-configs` helm-values, *before* requests reach this service. See §4.

## 2. Existing cloud infrastructure (already present — reuse it)

The repo already models clouds and zones; we don't need to invent any of this.

- **`common/Cloud.java`** — `enum Cloud { AWS, AZURE, GCP }`.
- **`common/MsZone.java`** — zone constants. AWS: `sg`, `eu`, `us`, `jp`. Azure: `az_sg`, `az_eu`,
  `az_us`, `az_jp`.
- **`common/service/MsZoneService.java`**:
  - `getCloudByZone(zone)` → `Cloud` (AWS for `sg/eu/us/jp`, AZURE for `az_*`).
  - `getNearestAppZone(appId)` → resolves the app's zone from the `ps_app_data_center` table.
  - `getCurrentZone()` → the running instance's zone (`server.zone` property).
- **`common/service/CloudRedirectService.java`** + **`filter/redirect/CloudRedirectFilter.java`** —
  already redirect/proxy cross-cloud requests, but **only for paths starting with `/v1/product`**
  (`CloudRedirectFilter.getCloudRedirectUrl`, ~line 304). Relevant to §4.
- **`config/SearchConfig.java`** + `application*.properties` — per-zone search endpoint properties
  (`search.sg-endpoint=https://search-sg.visenze.com`, …, `search.az-us-endpoint=https://multimodal-us.search.rezolve.com`,
  …). Note these are the **legacy** per-zone domains, not the new `multisearch-aw/az.rezolve.com`.

**Deriving `cloud` for an app:** `msZoneService.getCloudByZone(msZoneService.getNearestAppZone(appId))`,
then `.name().toLowerCase()` → `"aws"` / `"azure"`. Reuse exactly this; do not add a new mapping.

## 3. Change A — expose `cloud` in widget responses

The widget consumes `appSettings` from this service. Today `appSettings` already carries `endpoint`:

- **`common/PlacementWidgetConfig.java`**, nested `AppSettings` (~line 685) has `@JsonProperty("endpoint")`.
- **`common/service/WidgetInitService.java`** injects `$ENDPOINT` into the bootstrap script
  (~line 143, from `ProductSearchEndpointConfig.getEndpoint()`), alongside `$APP_KEY`, `$CONFIG`,
  `$VERSION`, etc.

### 3.1 Inject `cloud` via the V2 widget-init script (confirmed bootstrap path)
The production bootstrap calls **`/v2/widget-init`** (the host snippet in the widget repo's
`docs/integration.md` loads `https://search.visenze.com/v2/widget-init?app_key=…&placement_id=…`).
The widget bundle itself calls no init API — it only exposes `initWidget(config, fieldMappings)`, and
the init script assembles `config` and calls it. So **`appSettings.cloud` must be injected by
`WidgetInitService`**, where `$ENDPOINT` / `$CONFIG` / `$APP_KEY` are already string-replaced
(~line 143).

- Add a `$CLOUD` placeholder to the init-script template and inject it next to `$ENDPOINT`. **Keep
  injecting `$ENDPOINT` (the legacy endpoint) exactly as today** — do NOT blank it:
  ```java
  initCode = initCode.replace("$CLOUD", cloudValue == null ? "" : cloudValue);   // "aws" | "azure" | ""
  ```
  …and have the template put it into `appSettings.cloud` (blank/omit when not a cloud app).
- **`/v1/widget-configs` / `PlacementWidgetConfig.AppSettings` is NOT the bootstrap path** — don't
  rely on it for the production flow. Only add `cloud` to that model if a separate consumer (console,
  preview, legacy integration) reads `appSettings` from it; otherwise skip it.

### 3.2 Populate it in the service layer
Compute the cloud from the zone and inject it; **leave `$ENDPOINT` untouched**:
```java
String zone  = msZoneService.getNearestAppZone(app.getAppId());
Cloud  cloud = msZoneService.getCloudByZone(zone);           // AWS for sg/eu/us/jp, AZURE for az_*
String cloudValue = (cloud == null ? null : cloud.name().toLowerCase());  // "aws" | "azure"
// $ENDPOINT still = endpointConfig.getEndpoint() (legacy), as today
// $CLOUD = cloudValue
```
Optionally gate *which apps* get `cloud` populated (config flag) for a controlled rollout — but this
is **no longer required for safety** (see §3.3); an empty `cloudValue` simply means today's behavior.

### 3.3 `endpoint` + `cloud` interplay (agreed design — no endpoint blanking, no gate needed)
**Decision:** the API **adds `cloud` and keeps emitting the legacy `endpoint` as-is.** The widget owns
precedence (companion doc §3): **manual endpoint (JS) > `cloud` > API endpoint > default.** So when
`cloud` is present, the *widget* ignores the API-provided endpoint and resolves the cloud domain
itself; a developer's manual endpoint still wins.

Why this is safe without a server-side rollout gate or domain blanking:

- **Existing/old widget bundles ignore the unknown `cloud` field** and keep using the legacy
  `endpoint` — byte-for-byte today's behavior. The dangerous "switch every widget at once" scenario
  cannot happen, because switching requires a *new* widget bundle that understands `cloud`.
- Rollout is therefore controlled by two independent levers — *when the API populates `cloud`* for an
  app, and *which widget bundle version is deployed*. Nothing changes until both align.
- This drops the earlier `widgetCloudConfig` rollout-gate requirement and the endpoint-blanking
  approach. (You may still gate `cloud` population per cohort if you want to stage which *new-bundle*
  widgets flip — optional, not required.)
- It also means the API does **not** need to learn the new `multisearch-aw/az` domains (no new
  `SearchConfig` properties) — the widget/SDK owns the domain map.

> See `widget-init-flow.md` for the read-once-at-bootstrap analysis and the full precedence table.

## 4. Change B — serve the new cloud API paths (NO Spring app change)

**Resolved.** The new cloud paths are translated to the existing legacy routes at the **Istio
ingress / Gateway API layer**, configured in the `ms-configs` repo — not in this Spring app. The app
keeps serving only `/v1/product/...` (and the already-dual-mapped `/v2/widget/...`); the gateway
rewrites the cloud paths to those before the request arrives.

### 4.1 Where the translation lives
`ms-configs/helm-values/realtime/production/product-search/<zone>/values.overrides.yaml` (one per
Azure zone: `az-us`, `az-eu`, `az-jp`, `az-sg`). Each binds the new cloud domains to an
`additional_httproute` with `urlRedirect` rules. E.g. `az-us`:

```yaml
additional_httproute:
- gateway: { name: public-application-gateway, namespace: istio-ingress, port: 443 }
  hostnames:
  - multisearch-usw2az.rezolve.com
  - multisearch-az.rezolve.com
  rules:
    urlRedirect:                       # most specific first
    - { pathPrefix: /v1/visearch,      redirectPathPrefix: /v1/product }
    - { pathPrefix: /v1/search/parse,  redirectPathPrefix: /v1/parse }
    - { pathPrefix: /v1/search/config, redirectPathPrefix: /v1/config }
    - { pathPrefix: /v1/search,        redirectPathPrefix: /v1/product/multisearch }
    - { pathPrefix: /v1/autocomplete,  redirectPathPrefix: /v1/product/multisearch/autocomplete }
    - { pathPrefix: /v1/chat,          redirectPathPrefix: /v1/product/multisearch/chat }
    - { pathPrefix: /v1/widget,        redirectPathPrefix: /v1/widget }
    - { pathPrefix: /v2/widget,        redirectPathPrefix: /v2/widget }
```

This covers every path the widget/SDK uses:

| New cloud path | Ingress rule | Lands on (legacy, served by app) |
|:---|:---|:---|
| `/v1/visearch/search_by_image` | `/v1/visearch` → `/v1/product` | `/v1/product/search_by_image` |
| `/v1/visearch/recommendations` | `/v1/visearch` → `/v1/product` | `/v1/product/recommendations` |
| `/v1/visearch/search_by_id` | `/v1/visearch` → `/v1/product` | `/v1/product/search_by_id` |
| `/v1/visearch/linked/gallery/browse` | `/v1/visearch` → `/v1/product` | `/v1/product/linked/gallery/browse` |
| `/v1/search` | `/v1/search` → `/v1/product/multisearch` | `/v1/product/multisearch` |
| `/v1/search/complementary` | `/v1/search` → `/v1/product/multisearch` | `/v1/product/multisearch/complementary` |
| `/v1/search/outfit-recommendations` | `/v1/search` → `/v1/product/multisearch` | `/v1/product/multisearch/outfit-recommendations` |
| `/v1/autocomplete` | `/v1/autocomplete` → `/v1/product/multisearch/autocomplete` | `/v1/product/multisearch/autocomplete` |
| `/v2/widget/configs` | `/v2/widget` → `/v2/widget` (identity) | served directly by app (`V2_WIDGET_CONFIGS_NEW`) |

The AWS cloud domain (`multisearch-aw.rezolve.com`) has equivalent rules maintained **separately**
(outside this `ms-configs` path), per the same pattern.

### 4.2 Implications
- **No new path constants or `@RequestMapping` changes** in `visenze-product-search`. The earlier
  worry about adding `/v1/visearch`, `/v1/search`, etc. routes is moot.
- **`CloudRedirectFilter` needs no change.** Its predicate matches `/v1/product`, and the gateway has
  already rewritten the cloud path to `/v1/product/...` by the time the app's filter runs.
- **Ordering matters in the YAML** (most specific first) — already the case. Any *new* cloud sub-path
  the widget might use in future must be added to these ingress rules, not the app.
- This is an **infra/ops change living in `ms-configs`**, owned outside this repo. The only thing the
  widget rollout depends on is that these rules are deployed for all target zones (Azure zones present;
  AWS maintained separately — confirm both are live before enabling `cloud` for an account).

## 5. Backwards compatibility

- **Legacy paths stay.** All changes are additive: legacy `/v1/product/...` and `/v2/widget-configs`
  keep working (dual-mapping, not replacement). Existing widgets and integrations are unaffected.
- **`cloud` is additive & optional.** Apps that aren't cloud apps (or where zone→cloud is AWS-legacy)
  get no `cloud` field; widgets behave exactly as today.
- **No data migration.** `cloud` is derived at request time from the existing
  `ps_app_data_center` → zone → cloud mapping; nothing is persisted.

## 6. Open questions / decisions

1. ~~**Q1 — Who serves the new cloud domains?**~~ **Resolved:** the Istio ingress (`ms-configs`
   helm-values `urlRedirect` rules) rewrites cloud paths → legacy `/v1/product/...` before the Spring
   app. **Change B needs no code in this repo.** (See §4.)
2. ~~**Q2 — `endpoint` vs `cloud` emission.**~~ **Decided:** API **adds `cloud`, keeps the legacy
   `endpoint` as-is** (no blanking, no server rollout gate). The widget owns precedence (manual >
   `cloud` > API endpoint > default) and ignores the API endpoint when `cloud` is set. Old widget
   bundles ignore `cloud` → safe by construction. (§3.3.) Optional sub-decision: whether to stage
   *which apps* get `cloud` populated (not required for safety).
3. ~~**Q3 — Which response feeds widget `appSettings`?**~~ **Resolved:** the production bootstrap is
   the **`/v2/widget-init` script** (host snippet → `WidgetInitService`, which assembles `config` and
   calls `initWidget`). `cloud` is injected there (§3.1). The V1 `/v1/widget-configs` path is **not**
   the bootstrap and can be skipped unless a separate consumer needs it. The widget bundle itself
   calls no init API (only a dev-only `/v2/widget-configs` fetch for field mappings).
4. ~~**Q4 — Per-app override vs zone-derived.**~~ **Decided:** `cloud` is **zone-derived only**
   (`MsZoneService.getCloudByZone(getNearestAppZone(appId))`) — single source of truth, no
   per-placement override.
5. ~~**Q5 — New domains in config.**~~ **Moot:** with the agreed design the API never resolves the
   cloud domain (the widget/SDK owns the map), so no new `SearchConfig`/properties are needed.

## 7. Scope summary

Change B is **out of this repo** (ingress config in `ms-configs`, already in place). The only work
in `visenze-product-search` is **Change A** — exposing `cloud`:

| File | Change |
|:---|:---|
| `common/service/WidgetInitService.java` | Populate `cloud` via `MsZoneService`, inject `$CLOUD`. **Keep `$ENDPOINT` as-is.** Empty `cloud` = unchanged behavior |
| init script template (`/v2/widget-init`) | Add `$CLOUD` placeholder → `appSettings.cloud` (keep `endpoint`) |
| `common/PlacementWidgetConfig.java` (`AppSettings`) | Add `cloud` **only if** a non-bootstrap consumer reads `/v1/widget-configs` (otherwise skip) |
| (optional) cohort flag for `cloud` population | Only if you want to stage which apps emit `cloud`; not required for safety |
| tests | `MsZoneService` cloud derivation; `/v2/widget-init` script output includes `cloud` + unchanged `endpoint` |

**Out of repo (no code change here):**
- `ms-configs` ingress `urlRedirect` rules — already deployed for Azure zones; AWS maintained
  separately. Confirm both are live before enabling `cloud` for an account.
- `CloudRedirectFilter`, `SearchApi.Path`, search/gallery controllers — **unchanged** (gateway
  rewrites to `/v1/product/...` upstream).

**Reality check:** Change A is small and self-contained, reusing the existing `Cloud` /
`MsZoneService` machinery. There is no longer any large routing change — the path translation is
solved at the ingress.
