## Overview

A collection of Rezolve-powered product-search/recommendation **widgets** for e-commerce websites. Each widget is built and distributed as a **standalone bundle**, but they share a large body of common code (client, components, types, customization/localization machinery). Stack: React 18, HeroUI (formerly NextUI), Tailwind CSS, TypeScript, Webpack.

## Commands

Everything is keyed by widget. The build/dev scripts set `widget_dir` then invoke Webpack. Replace `<widget>` with a folder name from `src/official-widgets/` (e.g. `similar-search`, `camera-search`, `recommend-me`).

```sh
npm run start:<widget>     # webpack-dev-server at http://localhost:8080 (uses index-dev.tsx + index.html)
npm run build:<widget>     # production bundle -> dist/<widget_name>/
npm run build              # build ALL widgets
npm run build:staging      # build all with build=staging

npm test                   # jest (sets unit_test=true); runs all *.spec.ts(x)
npm run test:watch         # jest --watch
npx jest path/to/file.spec.tsx              # run a single test file
npx jest -t "test name substring"           # run tests matching a name

npm run lint               # eslint ./src
npm run lint:fix           # eslint --fix ./src
npm run type-check         # tsc -p tsconfig.json (no emit check)
npm run prettier:fix       # prettier --write ./src
```

Pre-commit: Husky runs `lint-staged` → eslint on staged `.{js,jsx,ts,tsx}`. The production webpack build also runs ESLint as a plugin with `failOnError: true`, so lint errors break the build.

## Local development of a widget

1. Put your app key + placement ID into `src/official-widgets/<widget>/dev-configs.ts` (`devConfigs.appSettings`).
2. Set widget-specific `data-*` attributes on the selector in `src/official-widgets/<widget>/index.html` (e.g. `data-url` / `data-pid`).
3. `npm run start:<widget>`. Dev server hot-reloads changes under `src/official-widgets/<widget>`.

`shouldRetrieveFieldsMapping = true` in `dev-configs.ts` fetches catalog field mappings from the backend at startup; otherwise `devFieldMappings` is used.

## Architecture

### Widget entry & initialization flow
Each widget folder has a parallel pair of entry points sharing one `App`:
- **`index.tsx`** (production): registers the widget on `window.visenzewigmixwidget[wigmix_<type>][version]` exposing `initWidget` (built by `initWidgetFactory`) and `deepMerge`. The hosting page calls `initWidget(config, fieldMappings)`.
- **`index-dev.tsx`** (dev): calls `devInitWidget(...)` directly with local `devConfigs`, and exposes the client as `window.widget`.

Both live in `src/common/client/initialization.ts`. Key steps in `init()`:
1. `isPlacementSkippable()` — bail if `?visenzeSkipPlacements=` matches.
2. `deepMerge(initConfig, { ...DEFAULT_CONFIGS, customizations })` — config layering (overrides win; arrays replace, objects merge).
3. `setCssVariables()` — translates `config.customizations` (fonts, colors, borders, dark mode) into `--wigmix-*` CSS custom properties on `:root`.
4. `populateProductDetailsAndAttrsToGet()` — merges backend field mappings into `displaySettings.productDetails` and derives `searchSettings.attrs_to_get`.
5. `getWidgetClient()` — builds the `WidgetClient` (wraps `visearch-javascript-sdk`) and fires a `SESSION_INIT` tracking event.

`render()` mounts React via `createRoot` into the element(s) matched by `displaySettings.cssSelector` (default `.ps-widget-<placementId>`). `isMultiRender` decides single vs. all matching elements. The client exposes `rerender(selector?)` and `renderMissing()` for re-mounting.

### Endpoint resolution (cloud vs legacy)
Which Rezolve domain a widget talks to is decided by precedence **manual endpoint (`window.visenzeConfigs[placementId].appSettings.endpoint`) > `appSettings.cloud` (`'aws'`/`'azure'`) > API-provided `appSettings.endpoint` > `LEGACY_ENDPOINT`**. SDK-routed calls get this by passing `cloud` to `visearch.setKeys` in `widget-client.ts` (omitting `endpoint` so the SDK resolves the cloud domain + paths). Direct `fetch()` sites that bypass the SDK (shoppable-gallery browse, dev field-mapping fetch) use the `src/common/client/endpoint.ts` helpers (`resolveBaseEndpoint`, `usesCloudPaths`, `getManualEndpoint`) which mirror the same precedence and the SDK's cloud→domain map. Setting `cloud` is additive and backwards-compatible — see `docs/adr/0001-dynamic-cloud-endpoints.md`.

### Multisearch API routing (`msApiId`)
Multisearch-based widgets can route to the regular multisearch, complementary, or outfit-recommendations SDK method through `WidgetClient.multisearch()`. The route is resolved once in `src/common/client/widget-client.ts` using `resolveMsApiType()` from `src/common/client/ms-api.ts`. Precedence is **manual `msApiId` (`window.visenzeConfigs[placementId].appSettings.msApiId`) > API-provided `appSettings.msApiId` > regular multisearch**. Blank manual values are treated as unset so the API-provided value can still apply. Current widget usage: `in-page-carousel-v3` routes recommendation multisearch through `WidgetClient.multisearch()`, and `similar-search` opts in via `useImageMultisearch({ routeByMsApiId: true })`; camera-search and slide-out-drawer intentionally keep their existing direct routing.

### Rendering wrapper chain
`App` (per widget) → `AppWrapper` (`src/common/components/app-wrapper.tsx`) → `ShadowWrapper` → `IntlProvider` → widget screen components.
- `AppWrapper` holds the live config in React state and registers callbacks on the client: `registerConfigUpdater`, `registerDarkModeToggler`, `registerLocaleUpdater`. It provides everything via `WidgetDataContext` (`widgetConfig`, `widgetClient`, `darkMode`, `locale`). A module-level `configInternalExt` is a deliberate workaround so dark-mode/locale togglers see the latest config.
- `ShadowWrapper` renders the widget inside a **Shadow DOM** for style isolation.

### Style isolation (important)
Styles are injected into a per-widget Shadow DOM, not the page. `webpack.util.js` defines a custom `style-loader` insert function that creates `<div id="vi_template__<widget>">` with an open shadow root and appends styles as `vi_style__<widget>__<version>`. CSS Modules use the `vi_[name]__[local]` / `vi_[name]__[local]` naming. When touching styling/build, preserve this isolation scheme.

### Shared code (`src/common/`)
- `wigmix-core.ts` — the canonical type module. `WidgetType` enum (source of truth for all widget types), `WidgetConfig` (heavily JSDoc'd config schema), `WidgetClient`, `RecursivePartial<T>`, color/font/border types.
- `client/` — `initialization.ts`, `widget-client.ts` (ViSearch SDK wrapper, events, search/recommendation calls), `endpoint.ts` (resolves the API base domain + cloud-vs-legacy paths; see endpoint resolution below).
- `components/` — shared UI: `app-wrapper`, `shadow-wrapper`, `product-card/ProductCard.tsx`, `crop/`, `hotspots/`, `modal/`, `popup-trigger-button/`, providers, hooks (`hooks/use-*` for multisearch/autocomplete/recommendations/breakpoints).
- `locales/` — i18n language packs (used with `react-intl`).
- `types/` — contexts, tracking constants, function types.
- `default-configs.ts`, `constants.ts` — shared defaults and `LEGACY_ENDPOINT`.

### Per-widget structure
`src/official-widgets/<widget>/`: `index.tsx`, `index-dev.tsx`, `app.tsx`, `default-config.ts` (`DEFAULT_CUSTOMIZATIONS`, `DEFAULT_TEXTS`), `dev-configs.ts`, `index.html`, `<widget>.tsx` (main component), `components/`, `screens/`, plus `*.spec.tsx` + `__snapshots__/`.

## Versioning
`src/version.js` is the single source of truth for the widget version; it flows into bundle filenames (`<env>.wigmix_<name>.<version>.js`), the `window.visenzewigmixwidget` registry key, and shadow-style IDs. Bumping the version changes the published artifact namespace. See `docs/versioning.md`.

## Conventions enforced by lint/tsconfig
- TS is `strict` with extras: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` (use bracket access for index signatures, e.g. `element.dataset['url']`), `noImplicitOverride`.
- ESLint: Airbnb base + `@typescript-eslint` strict. Required: single quotes, semicolons, trailing commas (multiline), explicit function return types (`@typescript-eslint/explicit-function-return-type`), `import/order` alphabetized with no blank lines between groups, `consistent-type-imports` (`import type`). Max line length 180. `no-console` allows only `warn`/`error`.
- Tailwind lint rules active (`enforces-shorthand`, `no-contradicting-classname`).

## Testing notes
- Jest + jsdom + Testing Library. `jest.config.js` mocks `.css`/`.scss` via `mocks/empty-mock.ts`; setup in `jest-setup.ts`.
- Widget specs use snapshots (`*.spec.tsx.snap`) — update intentionally with `npx jest <file> -u` when output legitimately changes.
- Coverage is collected by default and excludes `app.tsx`, `index.tsx`, `index-dev.tsx`, `dev-configs.ts`.

## Further docs
`docs/integration.md` (how host pages embed widgets via `.ps-widget-<id>` + snippet, incl. the `cloud` option), `docs/customization.md` (the `customizations` config), `docs/versioning.md`, `docs/widget-init-flow.md` (boot flow + when the endpoint is read), `docs/adr/` (architecture decision records). `README.md` has the quick-start.
