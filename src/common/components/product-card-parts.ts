import { getCurrencyFormatter } from '../locales/locale';
import type { WidgetConfig } from '../visenze-core';
import type { ProcessedProduct } from '../types/product';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../default-configs';

const currencyFormatterFactory = (
    languageSettings: WidgetConfig['languageSettings'],
    customizations: WidgetConfig['customizations'],
): Intl.NumberFormat => getCurrencyFormatter(
    languageSettings?.locale || customizations.languageSettings?.defaultLocale || DEFAULT_LOCALE,
    languageSettings?.currency || customizations.languageSettings?.defaultCurrency || DEFAULT_CURRENCY,
);

export const getProductTitle = (
    customizations: WidgetConfig['customizations'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCards?.productTitle || !customizations.productCards.productTitle.show) {
    return '';
  }
  const titleField = productDetails[customizations.productCards.productTitle.fieldSource || 'title'];
  return result[titleField] || '';
};

export const getProductSecondaryTitle = (
    customizations: WidgetConfig['customizations'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations.productCards?.productSecondaryTitle || !customizations.productCards.productSecondaryTitle.show) {
    return '';
  }
  const secondaryTitleField = productDetails[customizations.productCards.productSecondaryTitle.fieldSource || 'brand'];
  return result[secondaryTitleField] || '';
};

export const getPrice = (
    customizations: WidgetConfig['customizations'],
    languageSettings: WidgetConfig['languageSettings'],
    productDetails: WidgetConfig['displaySettings']['productDetails'],
    result: ProcessedProduct,
): string => {
  if (!customizations?.productCards?.productPrice?.show) {
    return '';
  }
  if (result[productDetails.price]) {
    const priceNumber = +result[productDetails.price].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations);
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
  if (!customizations.productCards?.productOriginalPrice?.show || !customizations?.productCards?.productPrice?.show) {
    return '';
  }
  if (result[productDetails.originalPrice]) {
    const priceNumber = +result[productDetails.originalPrice].value;
    const currencyFormatter = currencyFormatterFactory(languageSettings, customizations);
    return currencyFormatter.format(priceNumber);
  }
  return '';
};
