# ADR 0001: Dynamic cloud endpoints (AWS / Azure) in widgets

- **Status:** Accepted
- **Date:** 2026-06-22
- **Related:** `visearch-sdk-javascript` PR #94 (new cloud domains), SDK `>= 5.2.0`;
  `widget-init-flow.md` (boot flow + when the endpoint is read)

## Context

ViSenze introduced cloud-specific deployment domains with updated API paths, replacing the legacy
shared domains:

| Cloud | Legacy domain | New cloud domain |
|:---|:---|:---|
| AWS | `https://search.visenze.com` | `https://multisearch-aw.rezolve.com` |
| Azure | `https://multimodal.search.rezolve.com` | `https://multisearch-az.rezolve.com` |

Paths also change on the cloud domains (e.g. `/v1/product/...` → `/v1/visearch/...` or `/v1/search/...`,
and `/v2/widget-configs` → `/v2/widget/configs`).

Widgets previously pinned every request to a single endpoint: `widget-client.ts` always sent
`endpoint: endpoint || LEGACY_ENDPOINT` to the SDK. Because an explicit `endpoint` is the
highest-priority signal in the SDK, a `cloud` field alone would have been silently ignored. We needed
a way to route a widget to its cloud domain **without breaking the large base of already-deployed
widget bundles** that rely on the server-provided endpoint.

## Decision

Add an optional `appSettings.cloud` (`'aws' | 'azure'`) and have the widget arbitrate the endpoint
with a fixed precedence:

**manual endpoint (JS) > `cloud` > API-provided endpoint > `LEGACY_ENDPOINT`**

1. **Type** — `cloud?: 'aws' | 'azure'` on `WidgetConfig.appSettings`.
2. **SDK-routed calls** — `widget-client.ts` forwards `cloud` to `visearch.setKeys` and, when `cloud`
   is set with no manual endpoint, omits `endpoint` so the SDK resolves the cloud domain + paths.
3. **Direct-fetch calls** — a new `src/common/client/endpoint.ts` resolver (`CLOUD_DOMAINS`,
   `resolveBaseEndpoint`, `usesCloudPaths`, `getManualEndpoint`) mirrors the SDK's resolution for the
   two call sites that bypass the SDK: the shoppable-gallery browse fetch and the dev-only
   field-mapping fetch.
4. **Provenance** — the manual endpoint and the API endpoint both collapse into `appSettings.endpoint`
   (the host init script merges `window.visenzeConfigs` before `initWidget`). The widget recovers the
   manual one by reading `window.visenzeConfigs[placementId].appSettings.endpoint` directly.

The API side stays minimal: it adds `cloud` and keeps injecting the legacy `endpoint` unchanged. It
never needs to know the cloud domain map — the widget/SDK owns it.

### Alternatives considered

- **Server blanks the endpoint when `cloud` is set** — rejected: would break already-deployed bundles
  that don't understand `cloud` and depend on the endpoint.
- **Server-side rollout gate/flag** — rejected as unnecessary; backwards-compatibility is achieved by
  construction (see below).
- **Init-script field separation** (`appSettings.apiEndpoint`) to distinguish manual vs API endpoint —
  rejected: needs an out-of-repo init-script change. We read `window.visenzeConfigs` directly instead.

## Consequences

**Positive**
- Backwards-compatible by construction: the API keeps sending the legacy `endpoint`; old bundles
  ignore the unknown `cloud` field and behave byte-for-byte as today. Rollout is gated only by *when
  the API populates `cloud`* and *which bundle is deployed* — no destructive swap.
- A developer's manual endpoint always wins, preserving existing overrides.
- Direct-fetch sites are hardened to share one resolver with the SDK precedence.

**Negative / trade-offs**
- `endpoint.ts` deliberately duplicates the SDK's cloud→domain map (direct-fetch calls can't go
  through the SDK). Kept in sync via a cross-reference comment; revisit if drift becomes a problem.
- Reading `window.visenzeConfigs` couples the widget to that global. Verification item carried into
  implementation: confirm the init script does not delete it before the widget initializes.

## Implementation

Shipped under widget version `1.0.21`. Files: `wigmix-core.ts`, `widget-client.ts`,
`endpoint.ts` (new) + `endpoint.spec.ts`, `initialization.ts`, `shoppable-gallery.tsx`, per-widget
`dev-configs.ts`, `docs/integration.md`. Covered by unit tests for the resolver and the `setKeys`
wiring.
