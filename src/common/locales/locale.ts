import { DEFAULT_LOCALE } from '../default-configs';
import { deepMerge } from '../client/initialization';

// Hierarchy: locale > text key > text value
export type LanguagePack = Record<string, Record<string, string>>;

export const COMMON_TEXTS: LanguagePack = {
  en: {
    a11yAddToWishlist: 'Add to wishlist',
    a11yRemoveFromWishlist: 'Remove from wishlist',
    a11yFindSimilarProducts: 'Find similar products',
  },
  es: {
    a11yAddToWishlist: 'Agregar a la lista de deseos',
    a11yRemoveFromWishlist: 'Eliminar de la lista de deseos',
    a11yFindSimilarProducts: 'Encontrar productos similares',
  },
  fr: {
    a11yAddToWishlist: 'Ajouter à la liste de souhaits',
    a11yRemoveFromWishlist: 'Retirer de la liste de souhaits',
    a11yFindSimilarProducts: 'Trouver des produits similaires',
  },
  pt: {
    a11yAddToWishlist: 'Adicionar à lista de desejos',
    a11yRemoveFromWishlist: 'Remover da lista de desejos',
    a11yFindSimilarProducts: 'Encontrar produtos similares',
  },
  de: {
    a11yAddToWishlist: 'Zur Wunschliste hinzufügen',
    a11yRemoveFromWishlist: 'Von der Wunschliste entfernen',
    a11yFindSimilarProducts: 'Ähnliche Produkte finden',
  },
  it: {
    a11yAddToWishlist: 'Aggiungi alla lista dei desideri',
    a11yRemoveFromWishlist: 'Rimuovi dalla lista dei desideri',
    a11yFindSimilarProducts: 'Trova prodotti simili',
  },
  pl: {
    a11yAddToWishlist: 'Dodaj do listy życzeń',
    a11yRemoveFromWishlist: 'Usuń z listy życzeń',
    a11yFindSimilarProducts: 'Znajdź podobne produkty',
  },
  ko: {
    a11yAddToWishlist: '위시리스트에 추가',
    a11yRemoveFromWishlist: '위시리스트에서 제거',
    a11yFindSimilarProducts: '비슷한 상품 찾기',
  },
  ja: {
    a11yAddToWishlist: 'ほしい物リストに追加',
    a11yRemoveFromWishlist: 'ほしい物リストから削除',
    a11yFindSimilarProducts: '類似商品を探す',
  },
  th: {
    a11yAddToWishlist: 'เพิ่มในรายการโปรด',
    a11yRemoveFromWishlist: 'ลบออกจากรายการโปรด',
    a11yFindSimilarProducts: 'ค้นหาสินค้าที่คล้ายกัน',
  },
  zh: {
    a11yAddToWishlist: '加入心愿单',
    a11yRemoveFromWishlist: '从心愿单移除',
    a11yFindSimilarProducts: '查找相似商品',
  },
};

export const getLocaleTexts = (localeParam: string,
                               presetTexts: LanguagePack,
                               customTexts: LanguagePack = {}): Record<string, string> => {
  const locale = localeParam || DEFAULT_LOCALE;
  const hasRegion = locale.indexOf('-') >= 0 || locale.indexOf('_') >= 0;
  const lang = hasRegion ? locale.split(/[-_]/)[0] : '';
  let finalTexts = ((): Record<string, string> => {
    if (!hasRegion) {
      // If locale code is just language, return directly
      return presetTexts[locale] || presetTexts[DEFAULT_LOCALE];
    }
    const textsWithRegionVariants = { ...(presetTexts[lang] || presetTexts[DEFAULT_LOCALE]) };
    Object.keys(presetTexts[locale] || {}).forEach((key) => {
      if (presetTexts[locale][key]) {
        // Replace all available keys with regional variant
        textsWithRegionVariants[key] = presetTexts[locale][key];
      }
    });
    return textsWithRegionVariants;
  })();
  const commonTexts = hasRegion
    ? deepMerge(COMMON_TEXTS[locale] || {}, COMMON_TEXTS[lang] || COMMON_TEXTS[DEFAULT_LOCALE])
    : COMMON_TEXTS[locale] || COMMON_TEXTS[DEFAULT_LOCALE];
  finalTexts = deepMerge(finalTexts, commonTexts);
  if (hasRegion && customTexts[lang]) {
    finalTexts = deepMerge(customTexts[lang], finalTexts);
  }
  if (customTexts[locale]) {
    finalTexts = deepMerge(customTexts[locale], finalTexts);
  }
  return finalTexts;
};

export const getCurrencyFormatter = (locale: string, currency: string, hideDecimal: boolean): Intl.NumberFormat => {
  if (hideDecimal) {
    return Intl.NumberFormat(locale.replace('_', '-'), { style: 'currency', currency, maximumFractionDigits: 0 });
  }
  return Intl.NumberFormat(locale.replace('_', '-'), { style: 'currency', currency });
};
