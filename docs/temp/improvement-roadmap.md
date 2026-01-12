# Codebase Improvement Roadmap

**Document Type:** Technical Debt & Improvement Roadmap  
**Created:** January 12, 2026  
**Target Audience:** Engineering Team

---

## Overview

This document outlines concrete improvements to address technical debt identified in the architecture review. Items are organized by effort and impact.

---

## Phase 1: Quick Wins (1-2 Weeks)

### 1.1 Parallel Build System

**Current Problem:** Sequential builds take too long
```json
"build": "npm run build:camera-search && npm run build:similar-search && ..."
```

**Solution:** Use npm-run-all for parallel builds
```bash
npm install --save-dev npm-run-all
```

Update `package.json`:
```json
{
  "scripts": {
    "build:all": "run-p build:*",
    "build:camera-search": "...",
    "build:similar-search": "..."
  }
}
```

**Effort:** Low (2 hours)  
**Impact:** High - faster CI/CD

---

### 1.2 Safe Storage Utility

**Current Problem:** JSON.parse crashes on corrupted data

**Solution:** Create `src/common/utils/safe-storage.ts`
```typescript
export const safeGetJson = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    console.error(`Failed to parse ${key} from localStorage`);
    return fallback;
  }
};

export const safeSetJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
    return false;
  }
};
```

Then replace all direct `JSON.parse(localStorage.getItem(...))` calls.

**Effort:** Low (4 hours)  
**Impact:** Medium - prevents crashes

---

### 1.3 Add Wishlist Hook

**Current Problem:** Wishlist logic copy-pasted in 6+ files

**Solution:** Create `src/common/components/hooks/use-wishlist.ts`
```typescript
import { useState, useCallback } from 'react';

interface UseWishlistReturn {
  wishlistPids: string[];
  isInWishlist: (pid: string) => boolean;
  toggleWishlist: (pid: string) => void;
  setIsInWishlist: (pid: string, inWishlist: boolean) => void;
}

export const useWishlist = (initialPids: string[] = []): UseWishlistReturn => {
  const [wishlistPids, setWishlistPids] = useState<string[]>(initialPids);

  const isInWishlist = useCallback(
    (pid: string) => wishlistPids.includes(pid),
    [wishlistPids]
  );

  const setIsInWishlist = useCallback((pid: string, inWishlist: boolean) => {
    setWishlistPids((prev) => {
      if (inWishlist && !prev.includes(pid)) {
        return [...prev, pid];
      }
      if (!inWishlist && prev.includes(pid)) {
        return prev.filter((p) => p !== pid);
      }
      return prev;
    });
  }, []);

  const toggleWishlist = useCallback((pid: string) => {
    setIsInWishlist(pid, !isInWishlist(pid));
  }, [isInWishlist, setIsInWishlist]);

  return { wishlistPids, isInWishlist, toggleWishlist, setIsInWishlist };
};
```

**Effort:** Low (3 hours)  
**Impact:** Medium - reduces code duplication

---

## Phase 2: Core Refactoring (2-4 Weeks)

### 2.1 Split wigmix-core.ts

**Current Problem:** 1,562-line god file

**Solution:** Split into focused modules:

```
src/common/types/
├── widget-types.ts          # WidgetType enum, error enums
├── widget-client.ts         # WidgetClient interface
├── widget-config.ts         # WidgetConfig interface (still large)
├── ui-types.ts              # Icon, Font, Border, Color types
├── customization-types.ts   # DisplayConfigs, CustomizationConfigs
└── index.ts                 # Re-exports everything
```

**Migration Steps:**
1. Create new folder structure
2. Extract types one section at a time
3. Update imports using codemod or IDE refactoring
4. Run full test suite after each extraction
5. Delete original file when empty

**Effort:** Medium (1 week)  
**Impact:** High - maintainability

---

### 2.2 Create Base Default Config

**Current Problem:** 270+ lines duplicated across 17 widgets

**Solution:** Create `src/common/base-default-config.ts`

```typescript
import { LanguagePack, CustomizationConfigs } from './types';

export const BASE_TEXTS: LanguagePack = {
  en: {
    price: '{price}',
    originalPrice: '{originalPrice}',
    discount: '{discount} off',
    addToCart: 'Add to Cart',
    // ... all common texts
  },
  'zh-Hans': { /* ... */ },
  // ... all languages
};

export const BASE_CUSTOMIZATIONS: CustomizationConfigs = {
  // Common defaults
};

// Helper to merge widget-specific overrides
export const createWidgetConfig = (
  widgetTexts: Partial<LanguagePack>,
  widgetCustomizations: Partial<CustomizationConfigs>
) => ({
  texts: deepMerge(BASE_TEXTS, widgetTexts),
  customizations: deepMerge(BASE_CUSTOMIZATIONS, widgetCustomizations),
});
```

Then in each widget:
```typescript
// more-like-this/default-config.ts
import { createWidgetConfig } from '../../common/base-default-config';

export const { texts: DEFAULT_TEXTS, customizations: DEFAULT_CUSTOMIZATIONS } = createWidgetConfig(
  {
    en: { widgetTitle: 'You may also like' },
  },
  {
    // Widget-specific customization overrides
  }
);
```

**Effort:** Medium (1 week)  
**Impact:** High - ~4,000 lines removed

---

### 2.3 Create Base Search Hook

**Current Problem:** 85% code duplication between search hooks

**Solution:** Create `src/common/components/hooks/use-base-search.ts`

```typescript
interface UseBaseSearchOptions<TParams, TResponse> {
  searchFn: (params: TParams, signal: AbortSignal) => Promise<TResponse>;
  onSuccess?: (response: TResponse) => void;
  onError?: (error: Error) => void;
}

export function useBaseSearch<TParams, TResponse>({
  searchFn,
  onSuccess,
  onError,
}: UseBaseSearchOptions<TParams, TResponse>) {
  const [response, setResponse] = useState<TResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const search = useCallback(async (params: TParams) => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    
    try {
      const result = await searchFn(params, controller.signal);
      setResponse(result);
      onSuccess?.(result);
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        onError?.(e);
      }
    } finally {
      setLoading(false);
    }
    
    return controller;
  }, [searchFn, onSuccess, onError]);

  return { response, error, loading, search };
}
```

**Effort:** Medium (3 days)  
**Impact:** Medium - reduces hook duplication

---

## Phase 3: Component Decomposition (4-6 Weeks)

### 3.1 Split ProductCard Component

**Current Problem:** 550 lines, 10+ responsibilities

**Solution:** Decompose into:

```
src/common/components/product-card/
├── index.tsx                    # Main ProductCard (composition)
├── ProductCardImage.tsx         # Image handling, hover effects
├── ProductCardPrice.tsx         # Price, original price, discount
├── ProductCardActions.tsx       # Wishlist, find similar, cart buttons
├── ProductCardSkeleton.tsx      # Loading state
├── useProductTracking.ts        # Intersection observer, events
├── useProductStyles.ts          # Dark mode, styling calculations
└── utils.ts                     # formatPrice, getProductUrl, etc.
```

**Main ProductCard becomes:**
```tsx
export const ProductCard: FC<ProductCardProps> = (props) => {
  const tracking = useProductTracking(props);
  const styles = useProductStyles(props);
  
  return (
    <div ref={tracking.ref} className={styles.container}>
      <ProductCardImage {...props} />
      <ProductCardPrice {...props} />
      <ProductCardActions {...props} />
    </div>
  );
};
```

**Effort:** High (2 weeks)  
**Impact:** High - maintainability, testability

---

### 3.2 Split ResultScreen Components

**Current Problem:** 440-560 lines per ResultScreen

**Solution:** Extract reusable pieces:

```
screens/ResultScreen/
├── index.tsx                    # Main composition
├── SearchControls.tsx           # Search bar, autocomplete
├── ProductGrid.tsx              # Grid layout, pagination
├── FilterPanel.tsx              # Filters, sorting
├── SwipeHandler.tsx             # Mobile swipe gestures
└── useResultScreenState.ts      # Consolidated state management
```

**Effort:** High (2 weeks)  
**Impact:** Medium - improves navigation

---

## Phase 4: Testing Improvements (Ongoing)

### 4.1 Add Unit Tests for Utilities

**Target:** `src/common/utils.ts`

```typescript
// utils.spec.ts
describe('getProductDetails', () => {
  it('should extract title from configured field', () => {});
  it('should handle missing fields gracefully', () => {});
  it('should use fallback when primary field is empty', () => {});
});

describe('parseCoords', () => {
  it('should parse comma-separated coordinates', () => {});
  it('should return empty array for invalid input', () => {});
});
```

**Effort:** Low (1 week)  
**Impact:** High - covers critical logic

---

### 4.2 Add Hook Tests

**Target:** All 8 custom hooks

```typescript
// use-image-search.spec.ts
import { renderHook, act } from '@testing-library/react-hooks';

describe('useImageSearch', () => {
  it('should initialize with empty state', () => {});
  it('should call API with correct parameters', () => {});
  it('should handle errors gracefully', () => {});
  it('should cancel pending requests on new search', () => {});
});
```

**Effort:** Medium (2 weeks)  
**Impact:** High - covers core functionality

---

### 4.3 Convert Snapshot Tests to Behavioral Tests

**Target:** Existing widget specs

**Before:**
```typescript
it('should render the widget', () => {
  render(<CameraSearch {...props} />);
  expect(screen.asFragment()).toMatchSnapshot();
});
```

**After:**
```typescript
it('should render the widget with title', () => {
  render(<CameraSearch {...props} />);
  expect(screen.getByRole('heading')).toHaveTextContent('Search by image');
});

it('should open camera when button clicked', async () => {
  render(<CameraSearch {...props} />);
  await userEvent.click(screen.getByRole('button', { name: /camera/i }));
  expect(screen.getByTestId('camera-view')).toBeInTheDocument();
});
```

**Effort:** Medium (ongoing)  
**Impact:** High - meaningful test coverage

---

## Phase 5: Developer Experience (4 Weeks)

### 5.1 Create Widget Generator CLI

```bash
# Usage
npx create-widget shopping-grid

# Creates:
# src/official-widgets/shopping-grid/
# ├── index.tsx
# ├── index-dev.tsx
# ├── index.html
# ├── app.tsx
# ├── app.css
# ├── shopping-grid.tsx
# ├── shopping-grid.spec.tsx
# ├── default-config.ts
# ├── dev-configs.ts
# └── README.md
```

**Implementation:** Use Plop.js or Yeoman

**Effort:** Medium (1 week)  
**Impact:** High - faster widget creation

---

### 5.2 Add Developer Onboarding Guide

Create: `docs/developer-guide.md`

Contents:
1. Project architecture overview
2. Widget structure explained
3. Development workflow
4. Adding a new widget
5. Testing guidelines
6. Code review checklist
7. Common pitfalls

**Effort:** Low (3 days)  
**Impact:** High - faster onboarding

---

## Progress Tracking

| Phase | Item | Status | Owner | Due Date |
|-------|------|--------|-------|----------|
| 1 | Parallel builds | ⬜ Todo | | |
| 1 | Safe storage utility | ⬜ Todo | | |
| 1 | Wishlist hook | ⬜ Todo | | |
| 2 | Split wigmix-core.ts | ⬜ Todo | | |
| 2 | Base default config | ⬜ Todo | | |
| 2 | Base search hook | ⬜ Todo | | |
| 3 | Split ProductCard | ⬜ Todo | | |
| 3 | Split ResultScreen | ⬜ Todo | | |
| 4 | Utility tests | ⬜ Todo | | |
| 4 | Hook tests | ⬜ Todo | | |
| 4 | Behavioral tests | ⬜ Todo | | |
| 5 | Widget generator | ⬜ Todo | | |
| 5 | Developer guide | ⬜ Todo | | |

---

## Metrics to Track

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Build time (all widgets) | TBD | < 2 min | CI logs |
| Largest file (lines) | 1,562 | < 500 | `wc -l` |
| Test coverage | ~20% | > 60% | Jest coverage |
| Duplicated code | ~4,500 lines | < 500 lines | jscpd |
| Time to add new widget | ~2 hours | < 10 min | Manual |
