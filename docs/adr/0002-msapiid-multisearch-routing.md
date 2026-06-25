# ADR 0002: `msApiId` routing for multisearch-family widgets

- **Status:** Accepted
- **Date:** 2026-06-23
- **Related:** `docs/integration.md`; `src/common/client/ms-api.ts`;
  `src/common/client/widget-client.ts`

## Context

Some widgets need to call a member of the multisearch API family other than regular multisearch:

| `msApiId` | API route |
|:---|:---|
| `1` | regular multisearch |
| `2` | complementary |
| `3` | outfit recommendations |

The backend widget initialization API can inject this selector as `appSettings.msApiId`, but widgets
also need a client-level override path for local validation and controlled rollout, similar to the
existing manual `endpoint` override in `window.visenzeConfigs`.

Before this change, callers had to choose explicit `WidgetClient` methods such as
`multisearchByImage()` or `multisearchComplementary()` at each call site. That made backend-driven
API routing awkward and would have required widget-specific branching for every supported route.

## Decision

Add one central multisearch-family dispatcher on `WidgetClient`:

```ts
widgetClient.multisearchRouter(params, handleSuccess, handleError);
```

The dispatcher resolves the target SDK method once when `getWidgetClient()` constructs the client,
using this precedence:

**manual `msApiId` (`window.visenzeConfigs[placementId].appSettings.msApiId`) >
API-provided `appSettings.msApiId` > regular multisearch**

Blank manual values are treated as unset, so an API-provided value can still apply. Unrecognized
non-blank values fall back to regular multisearch and emit a `console.warn`.

Implementation details:

1. **Type and resolver** — `appSettings.msApiId?: string | number` is part of `WidgetConfig`, with
   `MsApiType`, `resolveMsApiType()`, and `getManualMsApiId()` in `src/common/client/ms-api.ts`.
2. **Client dispatcher** — `widget-client.ts` adds `WidgetClient.multisearchRouter()` and routes to
   `productMultisearch`, `productMultisearchComplementary`, or
   `productMultisearchOutfitRecommendations`.
3. **Widget opt-in** — `in-page-carousel-v3` calls `WidgetClient.multisearchRouter()` for recommendation
   multisearch. `similar-search` opts into the same dispatcher through
   `useImageMultisearch({ routeByMsApiId: true })`.
4. **Existing routes preserved** — camera-search and slide-out-drawer keep direct routing and are not
   affected by `msApiId`.

### Alternatives considered

- **Branch in every widget/hook call site** — rejected because it spreads API routing policy across
  widgets and makes future API-family additions harder.
- **Replace existing explicit methods entirely** — rejected because some widgets intentionally keep
  fixed behavior, and existing call sites still need direct methods for clarity/backwards
  compatibility.
- **Resolve `msApiId` dynamically on each request** — rejected for now. Like endpoint/cloud routing,
  the route is init-time configuration. Runtime config updates can revisit this if a real use case
  appears.

## Consequences

**Positive**
- Centralizes multisearch-family routing in the client wrapper.
- Preserves backwards compatibility: missing or blank `msApiId` behaves as regular multisearch.
- Allows host pages to override routing manually without backend changes:
  `window.visenzeConfigs[placementId].appSettings.msApiId = '2' | '3'`.
- Keeps widget adoption explicit: only widgets that call `WidgetClient.multisearchRouter()` are affected.

**Negative / trade-offs**
- Reading `window.visenzeConfigs` creates the same coupling used by manual endpoint overrides.
- The route is resolved once at widget-client construction; changing `msApiId` after the widget loads
  does not reroute an existing widget instance.
- Tests must cover both SDK method selection and request payload shape, because endpoint selection
  alone does not prove the widget passed correct parameters.

## Implementation

Shipped under widget version `1.0.21`. Files: `wigmix-core.ts`, `ms-api.ts` (new) +
`ms-api.spec.ts`, `widget-client.ts` + `widget-client.spec.ts`,
`use-image-multisearch.ts`, `use-recommendation-multisearch.ts`,
`in-page-carousel-v3.spec.tsx`, `similar-search.tsx`, `similar-search.spec.tsx`,
`docs/integration.md`, and `AGENTS.md`.

Verification covered:

- `resolveMsApiType()` normalization and warning behavior.
- Manual `msApiId` override precedence over API-provided `appSettings.msApiId`.
- Blank manual `msApiId` falling back to the API-provided value.
- Widget-level routing to complementary and outfit-recommendations APIs with request payload
  assertions.
