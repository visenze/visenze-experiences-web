import { getCurrencyFormatter } from '../locales/locale';
import type { WidgetConfig } from '../visenze-core';
import type { ProcessedProduct } from '../types/product';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../default-configs';

const currencyFormatterFactory = (
    languageSettings: WidgetConfig['languageSettings'],
    customizations: WidgetConfig['customizations'],
    currencyFromProduct?: string,
): Intl.NumberFormat => getCurrencyFormatter(
    languageSettings?.locale || customizations.localization?.defaultLocale || DEFAULT_LOCALE,
    currencyFromProduct || languageSettings?.currency || customizations.localization?.defaultCurrency || DEFAULT_CURRENCY,
);

export const getProductTitle = (
    customizations: WidgetConfig['customizations'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCard?.title || !customizations.productCard.title.show) {
    return '';
  }
  const titleField = productDetails[customizations.productCard.title.fieldSource || 'title'];
  return result[titleField] || '';
};

export const getProductSecondaryTitle = (
    customizations: WidgetConfig['customizations'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCard?.secondaryTitle || !customizations.productCard.secondaryTitle.show) {
    return '';
  }
  const secondaryTitleField = productDetails[customizations.productCard.secondaryTitle.fieldSource || 'brand'];
  return result[secondaryTitleField] || '';
};

export const getPrice = (
    customizations: WidgetConfig['customizations'],
    languageSettings: WidgetConfig['languageSettings'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations?.productCard?.price?.show) {
    return '';
  }
  if (result[productDetails.price]) {
    const priceNumber = +result[productDetails.price].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations, result[productDetails.price].currency);
    return currencyFormatter.format(priceNumber);
  }
  return '';
};

export const getOriginalPrice = (
    customizations: WidgetConfig['customizations'],
    languageSettings: WidgetConfig['languageSettings'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCard?.originalPrice?.show || !customizations?.productCard?.price?.show) {
    return '';
  }
  if (result[productDetails.original_price]) {
    const priceNumber = +result[productDetails.original_price].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations, result[productDetails.original_price].currency);
    return currencyFormatter.format(priceNumber);
  }
  return '';
};
