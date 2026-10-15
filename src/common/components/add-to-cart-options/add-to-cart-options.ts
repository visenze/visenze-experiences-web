import type { ProcessedProduct } from '../../types/product';
import { getOptionValues } from '../../utils';
import type { AddToCartOptionField, AddToCartOptions } from '../../wigmix-core';

const MAX_RADIO_VALUES = 3;

type RenderedOptionLayout = Exclude<AddToCartOptionField['layout'], 'NONE'>;

export interface ResolvedOptionField {
  // Key of this field's value in the onAddToCartToggle selectedOptions argument.
  key: string;
  label: string;
  layout: RenderedOptionLayout;
  values: string[];
}

const warnedRadioFallbacks = new Set<string>();

export const getActiveOptionFields = (options: AddToCartOptions | undefined): AddToCartOptionField[] => {
  if (!options?.enable || !Array.isArray(options.fields)) {
    return [];
  }
  return options.fields.filter((field) => field?.field && field.layout && field.layout !== 'NONE');
};

export const getOptionCatalogField = (field: AddToCartOptionField, productDetails: Record<string, string>): string => (
  productDetails[field.field] || field.field
);

const isNumeric = (value: string): boolean => value.trim() !== '' && !Number.isNaN(Number(value));

const resolveLayout = (field: AddToCartOptionField, values: string[]): RenderedOptionLayout => {
  const layout = field.layout as RenderedOptionLayout;
  if (layout === 'RADIO' && values.length > MAX_RADIO_VALUES) {
    if (!warnedRadioFallbacks.has(field.field)) {
      warnedRadioFallbacks.add(field.field);
      console.warn(`Add to cart option "${field.field}" has more than ${MAX_RADIO_VALUES} values; rendering it as a drop-down instead of radio buttons.`);
    }
    return 'DROPDOWN';
  }
  return layout;
};

// Resolves the configured option fields against one product. Fields with no values for the product
// are dropped (they are neither shown nor mandatory); an empty result means "add to cart directly".
export const resolveOptionFields = (
  product: ProcessedProduct,
  productDetails: Record<string, string>,
  options: AddToCartOptions | undefined,
): ResolvedOptionField[] => getActiveOptionFields(options).reduce<ResolvedOptionField[]>((resolved, field) => {
  const values = getOptionValues(product[getOptionCatalogField(field, productDetails)]);
  if (values.length === 0) {
    return resolved;
  }
  const layout = resolveLayout(field, values);
  const sortedValues = layout === 'CAROUSEL' && values.every(isNumeric)
    ? [...values].sort((a, b) => Number(a) - Number(b))
    : values;
  resolved.push({
    key: field.callbackKey || field.field,
    label: field.label || field.field,
    layout,
    values: sortedValues,
  });
  return resolved;
}, []);

// Fields with a single value are pre-selected, since the shopper has nothing to choose.
export const getInitialSelection = (fields: ResolvedOptionField[]): Record<string, string> => fields.reduce<Record<string, string>>((selection, field) => {
  if (field.values.length === 1) {
    selection[field.key] = field.values[0];
  }
  return selection;
}, {});

export const isSelectionComplete = (fields: ResolvedOptionField[], selection: Record<string, string>): boolean => (
  fields.every((field) => Boolean(selection[field.key]))
);

export const getOptionsProductTitle = (product: ProcessedProduct, productDetails: Record<string, string>): string => {
  const title = product[productDetails['title'] || 'title'];
  return typeof title === 'string' ? title : '';
};

const MIN_CODE_LENGTH = 6;

// Looks like a catalog code: only uppercase letters, digits, '-' or '_', with both letters and
// digits, at least MIN_CODE_LENGTH characters (e.g. "CA091919BW"). Short model names such as "90",
// "S24" or "XL" don't qualify.
const looksLikeProductCode = (word: string): boolean => (
  word.length >= MIN_CODE_LENGTH && /^[A-Z0-9_-]+$/.test(word) && /[A-Z]/.test(word) && /\d/.test(word)
);

// Catalog titles often end with the product code (e.g. "Casual Shirt CA091919BW"), which reads
// badly in the prompt. The trailing word is dropped when it looks like a code, or when it equals
// the product id or another of the product's own field values (e.g. a SKU field). At least two
// words of the name must remain, so a title is never cut down to a single word.
export const stripTrailingProductCode = (title: string, product?: ProcessedProduct): string => {
  const trimmed = title.trim();
  const match = trimmed.match(/^(.*\S)\s+(\S+)$/);
  if (!match || match[1].split(/\s+/).length < 2) {
    return trimmed;
  }
  const word = match[2];
  const isProductFieldValue = !!product && Object.values(product).some((value) => (
    (typeof value === 'string' || typeof value === 'number') && String(value).trim().toLowerCase() === word.toLowerCase()
  ));
  return looksLikeProductCode(word) || isProductFieldValue ? match[1] : trimmed;
};
