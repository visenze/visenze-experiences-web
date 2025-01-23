import { DEFAULT_LOCALE } from '../default-configs';
import { deepMerge } from '../client/initialization';

// Hierarchy: locale > text key > text value
export type LanguagePack = Record<string, Record<string, string>>;

export const getLocaleTexts = (localeParam: string,
                               presetTexts: LanguagePack,
                               customTexts: LanguagePack = {}): Record<string, string> => {
  const locale = localeParam || DEFAULT_LOCALE;
  const lang = locale.indexOf('-') >= 0 || locale.indexOf('_') >= 0 ? locale.split(/[-_]/)[0] : '';
  const finalTexts = ((): Record<string, string> => {
    if (!lang) {
      // If locale code is just language, return directly
      return presetTexts[locale] || presetTexts[DEFAULT_LOCALE];
    }
    const textsWithRegionVariants = presetTexts[lang] || presetTexts[DEFAULT_LOCALE];
    Object.keys(presetTexts[locale] || {}).forEach((key) => {
      if (presetTexts[locale][key]) {
        // Replace all available keys with regional variant
        textsWithRegionVariants[key] = presetTexts[locale][key];
      }
    });
    return textsWithRegionVariants;
  })();
  if (customTexts[locale]) {
    return deepMerge(customTexts[locale], finalTexts);
  }
  return finalTexts;
};

export const getCurrencyFormatter = (locale: string, currency: string): Intl.NumberFormat => {
  return Intl.NumberFormat(locale.replace('_', '-'), { style: 'currency', currency });
};
