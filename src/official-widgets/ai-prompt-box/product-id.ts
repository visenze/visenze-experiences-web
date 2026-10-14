// Values a host page's templating commonly leaves behind when it has no product id to put in
// `data-pid`: the stringified empty values, and a placeholder that was never filled in.
const EMPTY_LITERALS = new Set(['undefined', 'null', 'nan']);
const UNFILLED_PLACEHOLDERS = [
  /^\{\{.*\}\}$/, // {{ product.id }}  (Handlebars / Liquid / Vue)
  /^\{%.*%\}$/, // {% product.id %}  (Jinja / Twig)
  /^\$\{.*\}$/, // ${productId}      (template literals / JSP)
  /^<.*>$/, // <product-id>          (documentation-style placeholder)
  /^\[\[.*\]\]$/, // [[pid]]
  /^%.*%$/, // %PRODUCT_ID%
];

// Cleans the raw `data-pid` attribute: returns the trimmed product id, or an empty string when the
// host supplied none (missing, blank, "undefined"/"null"/"NaN", or an unfilled template placeholder),
// in which case the widget runs without product context.
const normalizeProductId = (raw: string | undefined): string => {
  const value = (raw ?? '').trim();
  if (!value || EMPTY_LITERALS.has(value.toLowerCase())) {
    return '';
  }
  return UNFILLED_PLACEHOLDERS.some((pattern) => pattern.test(value)) ? '' : value;
};

export default normalizeProductId;
