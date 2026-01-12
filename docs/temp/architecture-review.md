# ViSenze Experiences Web - Architecture Review

**Review Date:** January 12, 2026  
**Reviewer:** Software Architect  
**Version Analyzed:** 1.0.21-snapshot.0

---

## Executive Summary

This document provides a comprehensive architectural review of the ViSenze Experiences Web codebase - a React-based widget library for e-commerce product search and recommendations. The codebase contains **17 widgets** with shared common infrastructure.

### Overall Assessment

| Category | Grade | Summary |
|----------|-------|---------|
| **Documentation** | C+ | Incomplete for onboarding; missing critical guides |
| **Testing** | C- | Foundation exists but heavy snapshot reliance, gaps in coverage |
| **Modularity** | B+ | Good widget isolation, but "god file" issues |
| **Code Quality** | B- | Solid patterns, significant DRY violations |
| **Security** | C | Critical XSS risks, missing sanitization |
| **Architecture** | B+ | Clean separation, good reuse patterns |

**Overall Grade: B-**

---

## Table of Contents

1. [Documentation Assessment](#1-documentation-assessment)
2. [Testing Assessment](#2-testing-assessment)
3. [Modularity & Architecture](#3-modularity--architecture)
4. [Code Quality - DRY & SRP](#4-code-quality---dry--srp)
5. [Security & Risk Assessment](#5-security--risk-assessment)
6. [Key Recommendations](#6-key-recommendations)

---

## 1. Documentation Assessment

### What Exists

| Document | Quality | Notes |
|----------|---------|-------|
| [README.md](../../../README.md) | ⚠️ Basic | Only covers local dev basics |
| [docs/integration.md](../integration.md) | ✅ Good | Comprehensive integration guide with callbacks |
| [docs/customization.md](../customization.md) | ✅ Good | CSS class names, custom code guidance |
| [docs/versioning.md](../versioning.md) | ✅ Good | Clear EOL policy, semantic versioning |
| CHANGELOG.md | ✅ Good | Well-maintained, follows Keep a Changelog |

### Critical Documentation Gaps

#### 1.1 Missing: Developer Onboarding Guide
**Impact: HIGH**

New developers have no guide covering:
- Project architecture overview
- How widgets relate to each other
- Development workflow beyond basic npm scripts
- Code review guidelines
- Testing expectations

#### 1.2 Missing: Widget Creation Guide
**Impact: MEDIUM**

No documentation for adding new widgets. Currently requires:
- Copying 6+ files from existing widget
- Adding WidgetType enum value to `wigmix-core.ts`
- Adding 2 npm scripts to `package.json`
- Updating the `build` script

#### 1.3 Missing: API Documentation
**Impact: MEDIUM**

While `wigmix-core.ts` has JSDoc comments, there's no generated API reference. The 1,562-line file is difficult to navigate.

#### 1.4 Incomplete: Individual Widget READMEs
**Impact: LOW**

Some widget folders have README files but they're minimal. Missing:
- Props documentation
- Configuration options
- Usage examples
- Screenshots

### Documentation Grade: C+

---

## 2. Testing Assessment

### Test Files Found

```
src/
├── common/
│   ├── client/initialization.spec.ts (84 lines)
│   └── locales/locale.spec.ts (116 lines)
└── official-widgets/
    ├── camera-search/camera-search.spec.tsx (930 lines)
    ├── similar-search/similar-search.spec.tsx (599 lines)
    ├── more-like-this/more-like-this.spec.tsx (659 lines)
    └── ... (and others)
```

### Testing Types Present

| Type | Present | Quality |
|------|---------|---------|
| Unit Tests | ✅ | Limited to locales, initialization |
| Snapshot Tests | ✅ | **Overused** - 70%+ of assertions |
| Integration Tests | ✅ | Widget rendering with mocked APIs |
| E2E Tests | ❌ | None |
| Hook Tests | ❌ | Custom hooks untested |
| Accessibility Tests | ❌ | None |

### Critical Testing Gaps

#### 2.1 Widgets Without Tests (24%)
- `buy-the-look/`
- `recommend-me/`
- `shoppable-gallery/`
- `shopping-assistant/`

#### 2.2 Core Utilities Untested
[src/common/utils.ts](../../src/common/utils.ts) contains 10+ functions with **zero tests**:
- `getProductDetails()`
- `getAlternatives()`
- `parseCoords()`
- `getBooleanValue()`
- `getFacetValues()`

#### 2.3 Custom Hooks Untested
All 8 hooks in `src/common/components/hooks/` have no test coverage:
- `use-image-search.ts` - Critical search logic
- `use-recommendation-search.ts`
- `use-autocomplete.ts`
- `use-search-as-you-type.tsx`

#### 2.4 Example: Weak Snapshot-Only Test
```typescript
// From camera-search.spec.tsx
it('should render the standard icon', () => {
  testComponent = render(<CameraSearch ... />);
  expect(testComponent.asFragment()).toMatchSnapshot();
});
```
**Problem:** Only verifies markup hasn't changed, not that the icon functions correctly.

#### 2.5 Example: Good Behavioral Test
```typescript
// From more-like-this.spec.tsx
it('should send tracking events when clicking on product card', () => {
  const productCardAnchor = testComponent.getByTestId('wigmix-product-card-anchor');
  productCardAnchor.click();
  expect(sendEventSpy).toHaveBeenNthCalledWith(1, 'product_click', {
    pid: 'test_pid',
    pos: 1,
    queryId: 'test-query-id',
  });
});
```

### Testing Grade: C-

---

## 3. Modularity & Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WIDGET LAYER (17 widgets)                       │
│  src/official-widgets/{camera-search, search-bar, buy-the-look...}  │
│  Each widget: index.tsx → app.tsx → {widget-name}.tsx + screens/    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ uses
┌───────────────────────────────▼─────────────────────────────────────┐
│                      COMMON LAYER                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   components/    │  │     client/      │  │     types/       │  │
│  │  - AppWrapper    │  │  - widget-client │  │  - contexts.ts   │  │
│  │  - ShadowWrapper │  │  - initialization│  │  - product.ts    │  │
│  │  - ProductCard   │  │  - result-logic  │  │  - image.ts      │  │
│  │  - ViSenzeModal  │  └──────────────────┘  └──────────────────┘  │
│  │  - hooks/        │                                               │
│  │  - providers/    │  ┌──────────────────┐                        │
│  └──────────────────┘  │   wigmix-core.ts │ ← 1,562 lines!         │
│                        │   (GOD FILE)     │                        │
│                        └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Strengths ✅

| Aspect | Details |
|--------|---------|
| **Widget Isolation** | Each widget is self-contained with own screens, components, configs |
| **Consistent Structure** | All widgets follow 5-file pattern: index, app, config, main, dev |
| **Shadow DOM** | Proper style isolation via `ShadowWrapper` for embedded widgets |
| **Shared Hooks** | 8 reusable hooks covering common data fetching patterns |
| **Context Pattern** | Clean `WidgetDataContext` provides widgetConfig, productSearch, etc. |
| **No Circular Deps** | Clean unidirectional dependency flow |

### Concerns ⚠️

#### 3.1 God File: wigmix-core.ts (1,562 lines)
Contains too many responsibilities:
- Widget type enums
- Error state enums
- WidgetClient interface
- 20+ type interfaces
- WidgetConfig interface (900+ lines)
- Utility types

**Should split into:**
- `widget-types.ts`
- `widget-client.interface.ts`
- `widget-config.interface.ts`
- `ui-types.ts`
- `utility-types.ts`

#### 3.2 Build System Complexity

```json
// package.json has 34 npm scripts for 17 widgets
"build": "npm run build:camera-search && npm run build:similar-search && ..." // Sequential!
```

**Issues:**
- Sequential builds are slow
- Adding a widget requires editing 3 places
- No parallel build support

#### 3.3 ProductCard Complexity (550 lines)
Single component handles:
- Price formatting
- Image selection
- Wishlist toggling
- Find similar
- Add to cart
- Tracking
- 10+ helper functions

### Modularity Grade: B+

---

## 4. Code Quality - DRY & SRP

### 4.1 DRY Violations

#### CRITICAL: Default Config Duplication
Nearly identical 270-line configuration objects duplicated across 17 widgets:

| File | Lines |
|------|-------|
| more-like-this/default-config.ts | 272 |
| shop-the-look/default-config.ts | 272 |
| embedded-grid/default-config.ts | 272 |
| camera-search/default-config.ts | 434 |
| ... | ... |

**Fix:** Create base config in `src/common/default-configs.ts` and have widgets extend only differences.

#### CRITICAL: Hook Logic Duplication
`use-image-search.ts` (202 lines) and `use-multisearch.ts` (201 lines) share **85% identical code**:
- State initialization
- Error handling
- Response processing
- Pagination logic

**Fix:** Extract `useBaseSearch` hook that both can compose.

#### HIGH: Wishlist State Management
Same 15-line pattern copy-pasted across 6+ widget files:

```typescript
setIsInWishlist={(pid, isInWishlist) => {
  setWishlistPids((prev) => {
    const newPids = [...prev];
    if (isInWishlist && !newPids.includes(pid)) {
      newPids.push(pid);
    }
    // ... same logic everywhere
  });
}}
```

**Fix:** Create `useWishlist` hook.

### 4.2 SRP Violations

#### ProductCard.tsx (550 lines) - 10+ Responsibilities
1. Price formatting
2. Currency conversion
3. Title extraction
4. Discount calculation
5. URL tracking
6. Image source selection
7. Wishlist toggling
8. Find similar functionality
9. Intersection Observer tracking
10. Add to cart
11. Dark mode styling

**Fix:** Split into:
- `ProductCardImage.tsx`
- `ProductCardPrice.tsx`
- `ProductCardActions.tsx`
- `useProductCardTracking.ts`

#### CameraSearch.tsx (330 lines) - Mixed Concerns
Manages dialog, uploads, search history, errors, 4 screens, box data, modal handling.

**Fix:** Extract `useCameraSearch` hook.

### Code Quality Grade: B-

---

## 5. Security & Risk Assessment

### 🔴 CRITICAL Vulnerabilities

#### 5.1 XSS via dangerouslySetInnerHTML
**Location:** `shopping-assistant/components/BotMessage.tsx`

```tsx
const processMessageForDisplay = (message: string): string => message
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')  // After encoding!
    .replaceAll(/\n/g, '<br>');
```

**Problem:** Custom sanitization is bypassable. Bold text transformation occurs after HTML encoding.

**Fix:** Use DOMPurify library.

#### 5.2 CSS Injection via Custom CSS
**Location:** `src/common/client/initialization.ts`

```typescript
customCss.innerHTML = customizations.customCss;
```

**Problem:** Unsanitized CSS can:
- Exfiltrate data via url() in background images
- Track users via external resources
- Execute JS in older browsers via `expression()`

**Fix:** Validate CSS with css-tree, block dangerous properties.

### 🟠 HIGH Severity Issues

| Issue | Location | Risk |
|-------|----------|------|
| API keys in URLs | Multiple files | Keys logged in access logs, browser history |
| Unsafe JSON.parse | use-search-as-you-type.tsx | Crashes on corrupted localStorage |
| URL parameter injection | result-logic.ts | Tracking manipulation, potential XSS |

### 🟡 MEDIUM Severity Issues

| Issue | Location | Risk |
|-------|----------|------|
| Missing fetch error handling | shoppable-lookbook.tsx | Unhandled promise rejections |
| Function() constructor | webpack.util.js | CSP violations, eval-like behavior |
| Weak image URL validation | utils.ts | SVG can contain JavaScript |
| Race conditions in useEffect | camera-search.tsx | Stale state, multiple API calls |

### 🔵 LOW Severity Issues

| Issue | Location |
|-------|----------|
| Missing useEffect cleanup | use-chat-search.ts |
| localStorage quota not handled | ProductCard.tsx |
| Potential null references | Multiple files |

### Security Grade: C

---

## 6. Key Recommendations

### Priority 1: Critical (Do Immediately)

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 1 | XSS in BotMessage | Replace custom sanitization with DOMPurify | Low |
| 2 | CSS Injection | Add CSS validation/sanitization | Medium |
| 3 | Missing tests | Add tests for 4 untested widgets | Medium |

### Priority 2: High (Within 30 days)

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 4 | wigmix-core.ts god file | Split into 5+ focused modules | Medium |
| 5 | Default config duplication | Create base config, widgets extend | Medium |
| 6 | Hook duplication | Create useBaseSearch hook | Medium |
| 7 | JSON.parse crashes | Wrap all JSON.parse in try-catch | Low |

### Priority 3: Medium (Within 90 days)

| # | Issue | Action | Effort |
|---|-------|--------|--------|
| 8 | ProductCard complexity | Split into sub-components | High |
| 9 | Parallel builds | Use npm-run-all or Turborepo | Low |
| 10 | Developer docs | Create onboarding guide | Medium |
| 11 | Widget generator | Create CLI to scaffold new widgets | Medium |
| 12 | Hook testing | Add @testing-library/react-hooks tests | Medium |

### Priority 4: Low (Backlog)

| # | Issue | Action |
|---|-------|--------|
| 13 | Utility function tests | Add tests for utils.ts |
| 14 | API key exposure | Move API keys to headers |
| 15 | Missing cleanup | Add AbortController to streaming |
| 16 | localStorage quota | Wrap setItem in try-catch |

---

## Appendix A: Test Coverage Summary

| Area | Coverage | Priority |
|------|----------|----------|
| Widget Components | 76% have tests | Medium |
| Common Hooks | 0% | **Critical** |
| Common Utils | 0% | **High** |
| Client Logic | ~30% | High |
| Localization | ✅ Good | - |

## Appendix B: DRY Violation Inventory

| Pattern | Occurrences | Est. Duplicate Lines |
|---------|-------------|---------------------|
| Default configs | 17 widgets | ~4,000 lines |
| Wishlist logic | 6+ widgets | ~90 lines |
| Index.tsx boilerplate | 17 widgets | ~400 lines |
| Hook base logic | 2 hooks | ~300 lines |
| Swipe config | 2 screens | ~20 lines |

## Appendix C: Files Exceeding Complexity Thresholds

| File | Lines | Recommendation |
|------|-------|----------------|
| wigmix-core.ts | 1,562 | Split into 5+ files |
| ProductCard.tsx | 550 | Split into components |
| camera-search.tsx | 330 | Extract hook |
| ResultScreen.tsx (camera) | 561 | Decompose |
| ResultScreen.tsx (similar) | 440 | Decompose |

---

*This document should be revisited quarterly and updated as improvements are made.*
