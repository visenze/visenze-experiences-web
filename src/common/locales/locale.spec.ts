import { getCurrencyFormatter, getLocaleTexts, type LanguagePack } from './locale';

describe('locale', () => {
  const presetTexts: LanguagePack = {
    en: {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    },
    fr: {
      key1: 'valeur1',
      key2: 'valeur2',
      key3: 'valeur3',
    },
    en_GB: {
      key3: 'value3_7',
    },
  };
  const customTexts: LanguagePack = {
    en: {
      key2: 'value2_1',
    },
    en_GB: {
      key1: 'value1_3',
    },
    'fr-CA': {
      key2: 'valeur2_8',
    },
  };

  it('should ignore regional variant if not specified', () => {
    const texts = getLocaleTexts('en', presetTexts, customTexts);
    expect(texts['key1']).toBe('value1');
    expect(texts['key2']).toBe('value2_1');
    expect(texts['key3']).toBe('value3');
  });

  it('should use regional variant if specified', () => {
    let texts = getLocaleTexts('en_GB', presetTexts, customTexts);
    expect(texts['key1']).toBe('value1_3');
    expect(texts['key2']).toBe('value2_1');
    expect(texts['key3']).toBe('value3_7');

    texts = getLocaleTexts('fr-CA', presetTexts, customTexts);
    expect(texts['key1']).toBe('valeur1');
    expect(texts['key2']).toBe('valeur2_8');
    expect(texts['key3']).toBe('valeur3');
  });

  it('should fall back to default locale (English) when no other options are available', () => {
    const texts = getLocaleTexts('it', presetTexts, customTexts);
    expect(texts['key1']).toBe('value1');
    expect(texts['key2']).toBe('value2');
    expect(texts['key3']).toBe('value3');
  });

  it('should format currency according to formatter settings', () => {
    const getNbspSanitizedFormattedCurrency = (locale: string, currency: string, value: number): string => {
      return getCurrencyFormatter(locale, currency).format(value).replaceAll(/[\u00a0|\u202f]/g, ' ');
    };

    // This test is very locale-specific in that different computers can produce different values.
    // As such, the comparison is done against a list of possible outputs.

    expect(['$1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en', 'USD', 1000.45));
    expect(['US$1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en_GB', 'USD', 1000.45));

    expect(['£1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en', 'GBP', 1000.45));
    expect(['£1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en_GB', 'GBP', 1000.45));

    expect(['€1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en', 'EUR', 1000.45));
    expect(['1000,45 €']).toContain(getNbspSanitizedFormattedCurrency('es', 'EUR', 1000.45));
    expect(['1 000,45 €']).toContain(getNbspSanitizedFormattedCurrency('fr', 'EUR', 1000.45));
    expect(['1000,45 €', '1.000,45 €']).toContain(getNbspSanitizedFormattedCurrency('it', 'EUR', 1000.45));
    expect(['€ 1.000,45']).toContain(getNbspSanitizedFormattedCurrency('pt', 'EUR', 1000.45));
    expect(['1.000,45 €']).toContain(getNbspSanitizedFormattedCurrency('de', 'EUR', 1000.45));
    expect(['€ 1.000,45']).toContain(getNbspSanitizedFormattedCurrency('nl', 'EUR', 1000.45));

    expect(['₩1,000']).toContain(getNbspSanitizedFormattedCurrency('en', 'KRW', 1000.45));
    expect(['₩1,000']).toContain(getNbspSanitizedFormattedCurrency('ko', 'KRW', 1000.45));

    expect(['¥1,000']).toContain(getNbspSanitizedFormattedCurrency('en', 'JPY', 1000.45));
    expect(['￥1,000']).toContain(getNbspSanitizedFormattedCurrency('ja', 'JPY', 1000.45));

    expect(['THB 1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en', 'THB', 1000.45));
    expect(['฿1,000.45']).toContain(getNbspSanitizedFormattedCurrency('th', 'THB', 1000.45));

    expect(['IDR 1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en', 'IDR', 1000.45));
    expect(['Rp 1.000,45']).toContain(getNbspSanitizedFormattedCurrency('id', 'IDR', 1000.45));

    expect(['₹1,000.45']).toContain(getNbspSanitizedFormattedCurrency('en', 'INR', 1000.45));
    expect(['₹1,000.45']).toContain(getNbspSanitizedFormattedCurrency('hi', 'INR', 1000.45));
  });
});
