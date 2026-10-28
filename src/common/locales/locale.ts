import { DEFAULT_LOCALE } from '../default-configs';
import { deepMerge } from '../client/initialization';

// Hierarchy: locale > text key > text value
export type LanguagePack = Record<string, Record<string, string>>;

export const COMMON_TEXTS: LanguagePack = {
  en: {
    a11yAddToWishlist: 'Add to wishlist',
    a11yRemoveFromWishlist: 'Remove from wishlist',
    a11yFindSimilarProducts: 'Find similar products',
    addToCartOptionsPrompt: 'We\'re here to help! Please choose from the available options for {product}.',
    addToCartOptionsSelect: 'Select {label}',
    addToCartOptionsClose: 'Close',
    a11yAddToCartOptionsPrev: 'Previous options',
    a11yAddToCartOptionsNext: 'Next options',
  },
  es: {
    a11yAddToWishlist: 'Agregar a la lista de deseos',
    a11yRemoveFromWishlist: 'Eliminar de la lista de deseos',
    a11yFindSimilarProducts: 'Encontrar productos similares',
    addToCartOptionsPrompt: '¡Estamos aquí para ayudarte! Elige entre las opciones disponibles para {product}.',
    addToCartOptionsSelect: 'Seleccionar {label}',
    addToCartOptionsClose: 'Cerrar',
    a11yAddToCartOptionsPrev: 'Opciones anteriores',
    a11yAddToCartOptionsNext: 'Opciones siguientes',
  },
  fr: {
    a11yAddToWishlist: 'Ajouter à la liste de souhaits',
    a11yRemoveFromWishlist: 'Retirer de la liste de souhaits',
    a11yFindSimilarProducts: 'Trouver des produits similaires',
    addToCartOptionsPrompt: 'Nous sommes là pour vous aider ! Veuillez choisir parmi les options disponibles pour {product}.',
    addToCartOptionsSelect: 'Sélectionner {label}',
    addToCartOptionsClose: 'Fermer',
    a11yAddToCartOptionsPrev: 'Options précédentes',
    a11yAddToCartOptionsNext: 'Options suivantes',
  },
  pt: {
    a11yAddToWishlist: 'Adicionar à lista de desejos',
    a11yRemoveFromWishlist: 'Remover da lista de desejos',
    a11yFindSimilarProducts: 'Encontrar produtos similares',
    addToCartOptionsPrompt: 'Estamos aqui para ajudar! Escolha entre as opções disponíveis para {product}.',
    addToCartOptionsSelect: 'Selecionar {label}',
    addToCartOptionsClose: 'Fechar',
    a11yAddToCartOptionsPrev: 'Opções anteriores',
    a11yAddToCartOptionsNext: 'Próximas opções',
  },
  de: {
    a11yAddToWishlist: 'Zur Wunschliste hinzufügen',
    a11yRemoveFromWishlist: 'Von der Wunschliste entfernen',
    a11yFindSimilarProducts: 'Ähnliche Produkte finden',
    addToCartOptionsPrompt: 'Wir helfen gerne! Bitte wählen Sie aus den verfügbaren Optionen für {product}.',
    addToCartOptionsSelect: '{label} auswählen',
    addToCartOptionsClose: 'Schließen',
    a11yAddToCartOptionsPrev: 'Vorherige Optionen',
    a11yAddToCartOptionsNext: 'Nächste Optionen',
  },
  it: {
    a11yAddToWishlist: 'Aggiungi alla lista dei desideri',
    a11yRemoveFromWishlist: 'Rimuovi dalla lista dei desideri',
    a11yFindSimilarProducts: 'Trova prodotti simili',
    addToCartOptionsPrompt: 'Siamo qui per aiutarti! Scegli tra le opzioni disponibili per {product}.',
    addToCartOptionsSelect: 'Seleziona {label}',
    addToCartOptionsClose: 'Chiudi',
    a11yAddToCartOptionsPrev: 'Opzioni precedenti',
    a11yAddToCartOptionsNext: 'Opzioni successive',
  },
  pl: {
    a11yAddToWishlist: 'Dodaj do listy życzeń',
    a11yRemoveFromWishlist: 'Usuń z listy życzeń',
    a11yFindSimilarProducts: 'Znajdź podobne produkty',
    addToCartOptionsPrompt: 'Chętnie pomożemy! Wybierz spośród dostępnych opcji dla {product}.',
    addToCartOptionsSelect: 'Wybierz {label}',
    addToCartOptionsClose: 'Zamknij',
    a11yAddToCartOptionsPrev: 'Poprzednie opcje',
    a11yAddToCartOptionsNext: 'Następne opcje',
  },
  ko: {
    a11yAddToWishlist: '위시리스트에 추가',
    a11yRemoveFromWishlist: '위시리스트에서 제거',
    a11yFindSimilarProducts: '비슷한 상품 찾기',
    addToCartOptionsPrompt: '도와드릴게요! {product}의 옵션을 선택해 주세요.',
    addToCartOptionsSelect: '{label} 선택',
    addToCartOptionsClose: '닫기',
    a11yAddToCartOptionsPrev: '이전 옵션',
    a11yAddToCartOptionsNext: '다음 옵션',
  },
  ja: {
    a11yAddToWishlist: 'ほしい物リストに追加',
    a11yRemoveFromWishlist: 'ほしい物リストから削除',
    a11yFindSimilarProducts: '類似商品を探す',
    addToCartOptionsPrompt: 'お手伝いします！{product}のオプションをお選びください。',
    addToCartOptionsSelect: '{label}を選択',
    addToCartOptionsClose: '閉じる',
    a11yAddToCartOptionsPrev: '前のオプション',
    a11yAddToCartOptionsNext: '次のオプション',
  },
  th: {
    a11yAddToWishlist: 'เพิ่มในรายการโปรด',
    a11yRemoveFromWishlist: 'ลบออกจากรายการโปรด',
    a11yFindSimilarProducts: 'ค้นหาสินค้าที่คล้ายกัน',
    addToCartOptionsPrompt: 'เรายินดีช่วยเหลือ! โปรดเลือกตัวเลือกที่มีสำหรับ {product}',
    addToCartOptionsSelect: 'เลือก{label}',
    addToCartOptionsClose: 'ปิด',
    a11yAddToCartOptionsPrev: 'ตัวเลือกก่อนหน้า',
    a11yAddToCartOptionsNext: 'ตัวเลือกถัดไป',
  },
  zh: {
    a11yAddToWishlist: '加入心愿单',
    a11yRemoveFromWishlist: '从心愿单移除',
    a11yFindSimilarProducts: '查找相似商品',
    addToCartOptionsPrompt: '我们随时为您提供帮助！请为 {product} 选择可用选项。',
    addToCartOptionsSelect: '选择{label}',
    addToCartOptionsClose: '关闭',
    a11yAddToCartOptionsPrev: '上一组选项',
    a11yAddToCartOptionsNext: '下一组选项',
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
