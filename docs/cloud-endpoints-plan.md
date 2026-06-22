# Plan: Support dynamic cloud endpoints (AWS / Azure) in widgets

Status: **Proposal — for review**
Related: `visearch-sdk-javascript` PR #94 (`feat: new cloud domains`), SDK `>= 5.2.0`

## 1. Background

Rezolve/ViSenze introduced cloud-specific deployment domains. Apps were previously served from
`https://search.visenze.com` (AWS) or `https://multimodal.search.rezolve.com` (Azure). There are now
two new cloud-specific domains with **clearer, updated API paths**:

| Cloud | Legacy domain (current) | New cloud domain |
|:---|:---|:---|
| AWS | `https://search.visenze.com` | `https://multisearch-aw.rezolve.com` |
| Azure | `https://multimodal.search.rezolve.com` | `https://multisearch-az.rezolve.com` |

> The widgets' `DEFAULT_ENDPOINT` is `https://multimodal.search.rezolve.com` (the Azure legacy
> domain).

### API path changes (legacy → cloud)

| API | Legacy path | New cloud path | Routed via |
|:---|:---|:---|:---|
| Image search | `/v1/product/search_by_image` | `/v1/visearch/search_by_image` | SDK |
| Recommendations | `/v1/product/recommendations` | `/v1/visearch/recommendations` | SDK |
| Search by id | `/v1/product/search_by_id` | `/v1/visearch/search_by_id` | SDK |
| Multisearch | `/v1/product/multisearch` | `/v1/search` | SDK |
| Multisearch complementary | `/v1/product/multisearch/complementary` | `/v1/search/complementary` | SDK |
| Multisearch outfit rec. | `/v1/product/multisearch/outfit-recommendations` | `/v1/search/outfit-recommendations` | SDK |
| Multisearch autocomplete | `/v1/product/multisearch/autocomplete` | `/v1/autocomplete` | SDK |
| Gallery browse | `/v1/product/linked/gallery/browse` | `/v1/visearch/linked/gallery/browse` | **direct fetch (this repo)** |
| Widget config v2 | `/v2/widget-configs` | `/v2/widget/configs` | **direct fetch (this repo, dev only)** |
| Widget init v2 | `/v2/widget-init` | `/v2/widget/init` | host snippet (out of repo scope) |

**Key correction from the first draft:** the path is not constant across domains. Beyond the host
swap, the path segment changes (`v1/product/...` → `v1/visearch/...` or `v1/search/...`, and
`v2/widget-configs` → `v2/widget/configs`).

### How the SDK resolves domain + path (from `src/productsearch.ts`, v5.2.0)

```text
getEndpoint(settings):
  if settings.endpoint  -> use it            (highest priority)
  if settings.is_cn     -> CN domain
  if settings.cloud === 'aws'   -> AWS cloud domain
  if settings.cloud === 'azure' -> Azure cloud domain
  else                  -> legacy domain

isCloudDomain(settings):   // decides which API path set to use
  if settings.endpoint  -> true only if endpoint's origin is a known cloud domain
  if settings.is_cn     -> false
  else                  -> cloud === 'aws' || cloud === 'azure'
```

Consequences:

1. **An explicit `endpoint` always wins over `cloud`** for domain resolution. A cloud-matching
   `endpoint` still triggers the new paths via `isCloudDomain`.
2. The SDK owns domain + path resolution **only for SDK-routed calls**. The widget repo makes some
   API calls *directly* (see §3b) and must mirror the same resolution logic for those.

The widgets already depend on `visearch-javascript-sdk@^5.2.0`, whose installed types include
`cloud?: 'aws' | 'azure'`. **No SDK upgrade is required.**

## 2. Why widgets don't support this today (the blocker)

`src/common/client/widget-client.ts:65` always sends an explicit endpoint:

```ts
visearch.setKeys({
  ...
  endpoint: endpoint || DEFAULT_ENDPOINT,   // DEFAULT_ENDPOINT = legacy domain
  ...
});
```

Because an explicit `endpoint` is the highest-priority signal in the SDK, **even if we added a
`cloud` field it would be silently ignored** — every widget pins itself to the legacy domain via the
`|| DEFAULT_ENDPOINT` fallback.

## 3. Proposed API change

Add an optional `cloud` field to `WidgetConfig.appSettings` — the public, host-page-facing config
consumed by `initWidget(config, fieldMappings)`. Additive and backwards-compatible.

```ts
// src/common/wigmix-core.ts — inside appSettings
/**
 * (optional) Cloud deployment target. Set to 'aws' or 'azure' to route requests to the
 * cloud-specific domains with their updated API paths. When set, it overrides the API-provided
 * `endpoint` — but a manually specified endpoint (via window.visenzeConfigs) still wins.
 *
 * @internal Expected to be set automatically by ViSenze widget initialization API.
 * @since <next-version>
 */
cloud?: 'aws' | 'azure';
```

### Resolution contract (NEW — agreed design)
The API change is minimal: **add `cloud`, keep injecting the legacy `endpoint` exactly as today.** The
widget arbitrates with this precedence:

| Priority | Source | Channel | Behavior |
|:--|:--|:--|:--|
| 1 (highest) | **Manual endpoint** | developer sets `window.visenzeConfigs[placementId].appSettings.endpoint` (JS) | use it verbatim; wins even over `cloud` |
| 2 | **`cloud`** | API response (`appSettings.cloud`) | resolve the aws/azure domain + cloud paths; **ignore the API-provided `endpoint`** |
| 3 | **API `endpoint`** | API response (`appSettings.endpoint`, legacy) | use it (today's behavior) |
| 4 (fallback) | `DEFAULT_ENDPOINT` | constant | when nothing else is set |

Why this is safe for existing widgets (no server-side gate needed):
- The API keeps sending the legacy `endpoint` untouched. **Already-deployed widget bundles that don't
  understand `cloud` simply ignore the unknown field and keep using `endpoint` — byte-for-byte
  today's behavior.** Only widget bundles that ship this change honor `cloud`.
- Rollout is therefore controlled by (a) when the API starts populating `cloud` for an app and (b)
  which widget bundle version is deployed — not by a risky all-at-once endpoint swap.

### The provenance problem (key implementation detail)
The manual endpoint (priority 1) and the API endpoint (priority 3) **both end up in
`appSettings.endpoint`**, because the external init script merges `window.visenzeConfigs` over the API
config *before* calling `initWidget` (confirmed: `visenzeConfigs` is not referenced anywhere in this
repo). To tell them apart, the widget must read the manual one from its own channel:

```ts
const manualEndpoint = (window as any).visenzeConfigs?.[placementId]?.appSettings?.endpoint;
```

When `manualEndpoint` is absent, `appSettings.endpoint` is purely the API-provided value (safe to
ignore when `cloud` is set). See open question #7 for the alternative (init-script field separation)
and the reliability caveat.

## 3b. Two classes of API calls — both must be handled

This is the crux. ViSenze API calls leave the widget bundle through **two** paths:

1. **SDK-routed** (image search, recommendations, multisearch family, search-by-id). Handled
   entirely by the SDK once we pass `cloud` through `setKeys` (§4.2). Domain + path are resolved
   inside the SDK.
2. **Direct `fetch()` in this repo** — these bypass the SDK and currently hardcode `v1/product/...`
   / `v2/widget-configs` against `appSettings.endpoint`:
   - **Gallery browse** — `src/official-widgets/shoppable-gallery/shoppable-gallery.tsx:56-58`:
     ```ts
     await fetch(`${appSettings.endpoint}/v1/product/linked/gallery/browse?...`);
     ```
   - **Dev widget-configs** — `src/common/client/initialization.ts:325-327` (dev-only field-mapping
     fetch): `${endpoint || DEFAULT_ENDPOINT}/v2/widget-configs?...`.

   For these, the SDK's `cloud` handling does nothing. The widget must (a) resolve the correct base
   domain — and `appSettings.endpoint` may be **empty** if a host sends only `cloud` — and (b) pick
   the cloud vs legacy path itself.

(The other `fetch()` calls in the repo — in `camera-search`, `merchandise-search-bar`,
`shopping-assistant` — are `fetch(imageSrc)` for user-supplied image blobs, not ViSenze API calls,
so they are unaffected.)

## 4. Implementation steps

### 4.1 Type — `src/common/wigmix-core.ts`
Add `cloud?: 'aws' | 'azure'` to `appSettings` (next to `endpoint`), with the JSDoc above.

### 4.2 SDK wiring — `src/common/client/widget-client.ts`
Implement the priority table: manual endpoint > `cloud` > API endpoint > default. Pass `cloud` through
so the SDK resolves the domain + cloud paths; only forward an `endpoint` for priority 1 (manual) or
priority 3/4 (no cloud):

```ts
const { appKey, placementId, strategyId, endpoint, cloud, gtmTracking, resizeSettings, uid } = appSettings;
const manualEndpoint = (window as any).visenzeConfigs?.[placementId]?.appSettings?.endpoint;
...
visearch.setKeys({
  placement_id: placementId,
  strategy_id: strategyId,
  app_key: appKey,
  // P1 manual wins; else if cloud, omit endpoint so the SDK resolves the aws/azure domain;
  // else legacy API endpoint / default.
  ...(manualEndpoint
    ? { endpoint: manualEndpoint }
    : cloud
      ? {}                                    // omit -> SDK resolves from `cloud`
      : { endpoint: endpoint || DEFAULT_ENDPOINT }),
  ...(cloud ? { cloud } : {}),                // SDK uses endpoint for domain when present; `cloud` drives paths
  gtm_tracking: gtmTracking,
  resize_settings: resizeSettings || {},
});
```

| manual | `cloud` | API `endpoint` | Outcome |
|:--|:--|:--|:--|
| — | absent | absent | `DEFAULT_ENDPOINT` → legacy domain + paths (**identical to today**) |
| — | absent | set | API endpoint used (**identical to today**) |
| — | set | (ignored) | SDK resolves aws/azure domain + cloud paths |
| set | any | (ignored) | manual endpoint used (highest); SDK picks cloud paths only if it's a cloud domain |

### 4.3 New shared resolver — `src/common/client/endpoint.ts` (new file)
A small helper that mirrors the SDK's resolution for the **direct-fetch** call sites. Single source
of truth within the repo for the cloud domain map and path selection.

The resolver implements the **same priority table** as §4.2 (manual > cloud > API endpoint >
default), so direct-fetch calls stay consistent with SDK calls. Note the order: **`cloud` is checked
before the API `endpoint`** (the key change — `cloud` overrides the API-provided endpoint).

```ts
import { DEFAULT_ENDPOINT } from '../constants';

type AppSettingsLike = { endpoint?: string; cloud?: 'aws' | 'azure' };

export const CLOUD_DOMAINS: Record<'aws' | 'azure', string> = {
  aws: 'https://multisearch-aw.rezolve.com',
  azure: 'https://multisearch-az.rezolve.com',
};

const CLOUD_ORIGINS = new Set(Object.values(CLOUD_DOMAINS).map((d) => new URL(d).origin));

// manual endpoint > cloud domain > API endpoint > legacy default
export const resolveBaseEndpoint = (s: AppSettingsLike, manualEndpoint?: string): string => {
  if (manualEndpoint) return manualEndpoint;                       // P1
  if (s.cloud && CLOUD_DOMAINS[s.cloud]) return CLOUD_DOMAINS[s.cloud]; // P2 (overrides API endpoint)
  if (s.endpoint) return s.endpoint;                              // P3
  return DEFAULT_ENDPOINT;                                        // P4
};

// Whether to use the new cloud API paths (mirrors SDK isCloudDomain)
export const usesCloudPaths = (s: AppSettingsLike, manualEndpoint?: string): boolean => {
  const explicit = manualEndpoint ?? (s.cloud ? undefined : s.endpoint);
  if (explicit) {
    try { return CLOUD_ORIGINS.has(new URL(explicit).origin); } catch { return false; }
  }
  return s.cloud === 'aws' || s.cloud === 'azure';
};

// convenience for call sites
export const getManualEndpoint = (placementId: string | number): string | undefined =>
  (window as any).visenzeConfigs?.[placementId]?.appSettings?.endpoint;
```

> Note 1: this deliberately re-implements the cloud→domain map that also lives in the SDK. Unavoidable
> because these calls don't go through the SDK. Keep in sync; cross-reference the SDK constants.
> Note 2: `manualEndpoint` is read via `getManualEndpoint(placementId)` (the `window.visenzeConfigs`
> channel) so a developer's manual endpoint still wins over `cloud` — see §3 provenance note + Q7.

### 4.4 Gallery browse — `src/official-widgets/shoppable-gallery/shoppable-gallery.tsx`
Use the resolver for both base domain and path; this also hardens the existing raw
`appSettings.endpoint` usage:

```ts
const manualEndpoint = getManualEndpoint(appSettings.placementId);
const base = resolveBaseEndpoint(appSettings, manualEndpoint);
const path = usesCloudPaths(appSettings, manualEndpoint)
  ? '/v1/visearch/linked/gallery/browse'
  : '/v1/product/linked/gallery/browse';
const response = await fetch(`${base}${path}?placement_id=${appSettings.placementId}&app_key=${appSettings.appKey}&limit=100`);
```

### 4.5 Dev field-mapping fetch — `src/common/client/initialization.ts:325`
Apply both the host swap and the path change (`/v2/widget-configs` → `/v2/widget/configs`):

```ts
// In dev there is no window.visenzeConfigs; treat devConfigs.appSettings.endpoint as the manual
// endpoint (so an explicit dev endpoint wins, otherwise `cloud` drives resolution).
const devAppSettings = devConfigs.appSettings ?? {};
const base = resolveBaseEndpoint(devAppSettings, devAppSettings.endpoint);
const configPath = usesCloudPaths(devAppSettings, devAppSettings.endpoint) ? '/v2/widget/configs' : '/v2/widget-configs';
const widgetConfigResponse = await fetch(
  `${base}${configPath}?app_key=${devAppSettings.appKey}`
  + `&placement_id=${devAppSettings.placementId}&return_fields_mappings=true`,
);
```

(Production field mappings are passed in by the host via `initWidget(config, fieldMappings)`, so this
only affects local dev with `shouldRetrieveFieldsMapping = true`.)

### 4.6 Per-widget dev configs — `src/official-widgets/<widget>/dev-configs.ts`
Add an optional, commented `cloud` field to `devConfigs.appSettings` so developers can test AWS/Azure
locally. Prioritize `shoppable-gallery` (direct fetch) and a search widget (SDK path).

### 4.7 Docs — `docs/integration.md`
Document the new `cloud` config option for host pages.

## 4b. Backwards compatibility

The design is intentionally safe for existing widgets — **the API keeps sending the legacy
`endpoint`; `cloud` is purely additive.**

- **API unchanged for endpoint** — the server still injects the legacy `endpoint`. Apps not yet
  populated with `cloud` behave exactly as today.
- **Old deployed widget bundles** (that predate this change) ignore the unknown `cloud` field and keep
  using `endpoint`. So even after the API starts emitting `cloud`, already-live widgets are unaffected
  until their bundle is upgraded. This is what removes the need for a server-side rollout gate.
- **New widget bundle, no `cloud`** — resolver/SDK wiring fall to priority 3/4 → API `endpoint` or
  `DEFAULT_ENDPOINT`, legacy paths. Identical to today.
- **Manual endpoint** — still highest priority (read from `window.visenzeConfigs`), so any developer
  who hard-set an endpoint keeps that exact endpoint, `cloud` notwithstanding.
- **Direct-fetch hardening** — moving gallery/dev-config from raw `appSettings.endpoint` to the
  resolver is non-breaking: with no `cloud` and an API endpoint set, it returns that endpoint.
- **Type / unknown value / SDK** — `cloud?:` is optional; an unrecognized `cloud` falls through to
  legacy; widgets already ship SDK `5.2.0` (no version-mismatch window).

Net: rollout is gated by *when the API populates `cloud`* and *which widget bundle is deployed* — not
by a destructive endpoint swap. Nothing changes for an app until both align.

## 5. Open questions / decisions for review

1. ~~**`/v2/widget-configs` on cloud domains**~~ — **Resolved + corrected:** served on cloud domains
   but under a *different path* (`/v2/widget/configs`). Handled in §4.5.
2. ~~**Endpoint + cloud precedence**~~ — **Decided (revised):** new 3-tier precedence — **manual
   endpoint (JS) > `cloud` > API-provided endpoint > default.** The API keeps sending the legacy
   endpoint untouched; the widget ignores it when `cloud` is present. See §3 "Resolution contract".
3. ~~**Who sets `cloud`?**~~ — **Decided:** populated automatically by the ViSenze widget
   initialization API (server-side, via `/v2/widget/init`) based on the account's deployment region.
   Out of scope for this repo, tracked separately.
4. ~~**Version bump**~~ — **Owner: integrator.** `@since` JSDoc references the bumped version once
   chosen; the bump itself (`src/version.js`) handled separately.
5. ~~**Resolver duplication**~~ — **Decided:** accept the duplication for now (§4.3 re-implements the
   SDK's cloud→domain map for direct-fetch calls). Add a comment cross-referencing the SDK constants
   so the two are kept in sync; revisit a shared/exported helper later if drift becomes a problem.
6. ~~**Gallery browse on cloud**~~ — **Confirmed:** `/v1/visearch/linked/gallery/browse` is live on
   both cloud domains and returns the same response shape as the legacy path, so §4.4 is a safe
   host + path swap.
7. ~~**How to detect the manual endpoint (priority 1)?**~~ **Decided: option (a)** — the widget reads
   `window.visenzeConfigs[placementId].appSettings.endpoint` directly (via `getManualEndpoint`),
   fully widget-side, no cross-repo change. **Verification item (carry into implementation):** confirm
   the init script does not delete `window.visenzeConfigs` before the widget initializes; if it might,
   capture it early (e.g. read it at module load / first `init()`). The rejected alternative (b) was
   init-script field separation (`appSettings.apiEndpoint`), which needs an out-of-repo init-script
   change.

## 6. Test plan

- **Unit (`endpoint.spec.ts`):** table-test `resolveBaseEndpoint` / `usesCloudPaths` across the full
  precedence: {no cloud/no endpoint, cloud=aws, cloud=azure, API endpoint only, **manual endpoint +
  cloud (manual wins)**, **cloud + API endpoint (cloud wins, API ignored)**, manual cloud-domain
  endpoint, unknown cloud}.
- **Unit (`widget-client`):** assert `setKeys` (i) forwards `cloud` when provided, (ii) omits
  `endpoint` when `cloud` set and no manual endpoint, (iii) forwards the **manual** endpoint over
  `cloud`, (iv) forwards the **API** endpoint only when no `cloud`.
- **Manual — SDK path (e.g. `camera-search`/`similar-search`):** set `cloud: 'aws'` then `'azure'` in
  `dev-configs.ts`; verify network calls hit the cloud domain + `v1/visearch/...` / `v1/search/...`.
- **Manual — direct fetch (`shoppable-gallery`):** verify the browse call hits
  `<cloud-domain>/v1/visearch/linked/gallery/browse` and renders products.
- **Regression:** with no `cloud`/`endpoint`, confirm both SDK and direct-fetch calls still hit the
  legacy domain + `v1/product/...` / `v2/widget-configs`.
- `npm run type-check`, `npm run lint`, `npm test` (update snapshots only if intentionally changed).

## 7. Scope summary

| File | Change |
|:---|:---|
| `src/common/wigmix-core.ts` | Add `cloud?: 'aws' \| 'azure'` to `appSettings` |
| `src/common/client/widget-client.ts` | Pass `cloud`; stop forcing `DEFAULT_ENDPOINT` when `cloud` set |
| `src/common/client/endpoint.ts` (new) | `CLOUD_DOMAINS`, `resolveBaseEndpoint`, `usesCloudPaths` |
| `src/official-widgets/shoppable-gallery/shoppable-gallery.tsx` | Cloud-aware domain + browse path |
| `src/common/client/initialization.ts` | Cloud-aware dev field-mapping fetch + path |
| `src/official-widgets/*/dev-configs.ts` | Optional `cloud` example for local dev |
| `docs/integration.md` | Document the `cloud` option |

No SDK change needed (already on `5.2.0`). No breaking changes to existing integrations. `/v2/widget/init`
(host snippet) is out of repo scope.
