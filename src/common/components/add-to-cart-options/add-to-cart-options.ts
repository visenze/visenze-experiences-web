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
