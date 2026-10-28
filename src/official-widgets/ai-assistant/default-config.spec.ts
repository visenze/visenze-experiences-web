import { addTextsFrom, DEFAULT_CUSTOMIZATIONS, DEFAULT_TEXTS, withEnglishFallback } from './default-config';
import { DEFAULT_CUSTOMIZATIONS as AI_SEARCH_LAUNCHER_CUSTOMIZATIONS } from '../ai-search-launcher/default-config';
import { DEFAULT_CUSTOMIZATIONS as ESA_CUSTOMIZATIONS, DEFAULT_TEXTS as ESA_TEXTS } from '../embedded-shopping-assistant/default-config';
import { DEFAULT_TEXTS as SHOPPING_ASSISTANT_TEXTS } from '../shopping-assistant/default-config';

describe('withEnglishFallback', () => {
  it('gives every locale the English value of each key it lacks, without overwriting its own', () => {
    const packs = { en: { a: 'A', b: 'B' }, de: { a: 'Ä' }, ja: {} };
    expect(withEnglishFallback(packs)).toEqual({ en: { a: 'A', b: 'B' }, de: { a: 'Ä', b: 'B' }, ja: { a: 'A', b: 'B' } });
  });

  it('does not mutate the source packs', () => {
    const packs = { en: { a: 'A', b: 'B' }, de: { a: 'Ä' } };
    withEnglishFallback(packs);
    expect(packs).toEqual({ en: { a: 'A', b: 'B' }, de: { a: 'Ä' } });
  });

  it('returns the packs unchanged without an English pack', () => {
    expect(withEnglishFallback({ de: { a: 'Ä' } })).toEqual({ de: { a: 'Ä' } });
  });
});

describe('ai-assistant DEFAULT_TEXTS', () => {
  it('every locale has every English key, and keeps its own translations', () => {
    const englishKeys = Object.keys(DEFAULT_TEXTS['en']);
    Object.keys(DEFAULT_TEXTS).forEach((locale) => {
      expect(Object.keys(DEFAULT_TEXTS[locale]).sort()).toEqual(expect.arrayContaining(englishKeys.sort()));
    });
    expect(DEFAULT_TEXTS['de']['widgetTitle']).toBe(SHOPPING_ASSISTANT_TEXTS['de']['widgetTitle']);
  });

  it('leaves shopping-assistant\'s own packs untouched', () => {
    expect(SHOPPING_ASSISTANT_TEXTS['de']['triggerAskAi']).toBeUndefined();
  });
});

describe('ai-assistant DEFAULT_TEXTS: the embedded entry\'s texts', () => {
  it('adds the ids only embedded-shopping-assistant defines, with that widget\'s translation in every locale', () => {
    Object.keys(ESA_TEXTS).forEach((locale) => {
      Object.keys(ESA_TEXTS[locale]).forEach((id) => expect(DEFAULT_TEXTS[locale][id]).toBeDefined());
      ['seeResults', 'noQueryProvided', 'aiOverviewLabel'].forEach((id) => expect(DEFAULT_TEXTS[locale][id]).toBe(ESA_TEXTS[locale][id]));
    });
    expect(DEFAULT_TEXTS['es']['seeResults']).toBe('Ver resultados');
  });

  // Defined by the widget in English only, with the same English text as embedded-shopping-assistant's.
  const SAME_SOURCE_IDS = ['a11yCloseFullScreen', 'a11yEnableMute', 'a11yToggleMute', 'gettingOverview', 'findingProducts'];

  it('uses embedded-shopping-assistant\'s translation of an id the widget defines with the same English text', () => {
    SAME_SOURCE_IDS.forEach((id) => {
      expect(ESA_TEXTS['en'][id]).toBe(DEFAULT_TEXTS['en'][id]);
      ['de', 'es', 'ja'].forEach((locale) => {
        expect(DEFAULT_TEXTS[locale][id]).toBe(ESA_TEXTS[locale][id]);
        expect(DEFAULT_TEXTS[locale][id]).not.toBe(DEFAULT_TEXTS['en'][id]);
      });
    });
  });

  it('keeps the widget\'s English fallback for an id whose English text differs from embedded-shopping-assistant\'s', () => {
    const widget = { en: { same: 'Same', diverges: 'Ours', kept: 'Kept' }, de: { kept: 'Behalten' } };
    const other = { en: { same: 'Same', diverges: 'Theirs', kept: 'Kept', added: 'Added' }, de: { same: 'Gleich', diverges: 'Ihres', kept: 'Anders', added: 'Neu' } };
    expect(withEnglishFallback(addTextsFrom(widget, other))['de']).toEqual({ same: 'Gleich', diverges: 'Ours', kept: 'Behalten', added: 'Neu' });
    expect(widget).toEqual({ en: { same: 'Same', diverges: 'Ours', kept: 'Kept' }, de: { kept: 'Behalten' } });
    // A real divergent id (a11yChatInput) keeps the widget's English in en, and shopping-assistant's own German in de.
    expect(ESA_TEXTS['en']['a11yChatInput']).not.toBe(DEFAULT_TEXTS['en']['a11yChatInput']);
    expect(DEFAULT_TEXTS['de']['a11yChatInput']).toBe(SHOPPING_ASSISTANT_TEXTS['de']['a11yChatInput']);
  });

  it('never overwrites an id a locale already defines in the widget\'s packs', () => {
    Object.keys(SHOPPING_ASSISTANT_TEXTS).forEach((locale) => {
      Object.entries(SHOPPING_ASSISTANT_TEXTS[locale]).forEach(([id, text]) => {
        if (locale !== 'en' || !(id in ESA_TEXTS['en'])) {
          expect(DEFAULT_TEXTS[locale][id]).toBe(text);
        }
      });
    });
    expect(DEFAULT_TEXTS['de']['widgetTitle']).toBe(SHOPPING_ASSISTANT_TEXTS['de']['widgetTitle']);
  });

  it('leaves the other widgets\' text objects untouched', () => {
    expect(ESA_TEXTS['de']['triggerAskAi']).toBeUndefined();
    expect(ESA_TEXTS['en']['triggerCTA']).toBeUndefined();
    expect(SHOPPING_ASSISTANT_TEXTS['de']['seeResults']).toBeUndefined();
    expect(SHOPPING_ASSISTANT_TEXTS['de']['a11yCloseFullScreen']).toBeUndefined();
    expect(ESA_TEXTS['de']).not.toBe(DEFAULT_TEXTS['de']);
  });
});

describe('ai-assistant DEFAULT_CUSTOMIZATIONS: the search-bar buttons', () => {
  // The entry bar's buttons and the image-entry screen's buttons paint `bg-buttonSecondary` and draw their icons
  // in generalLayout.fontColor, so a secondary background equal to that icon color makes the buttons look solid.
  it('gives buttons.secondary the standalone search launcher\'s background, not embedded\'s black one', () => {
    const secondary = DEFAULT_CUSTOMIZATIONS.buttons?.secondary;
    expect(secondary?.backgroundColor).toBe(AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.buttons?.secondary?.backgroundColor);
    expect(secondary?.backgroundColorDark).toBe(AI_SEARCH_LAUNCHER_CUSTOMIZATIONS.buttons?.secondary?.backgroundColorDark);
    expect(secondary?.backgroundColor).not.toBe(ESA_CUSTOMIZATIONS.buttons?.secondary?.backgroundColor);
  });

  it('never matches the icon color, so the icons stay visible in light mode', () => {
    expect(DEFAULT_CUSTOMIZATIONS.buttons?.secondary?.backgroundColor?.toLowerCase())
      .not.toBe(DEFAULT_CUSTOMIZATIONS.generalLayout?.fontColor?.toLowerCase());
  });

  it('changes only the background: embedded\'s "See Results" button still reads the same secondary text color', () => {
    expect(DEFAULT_CUSTOMIZATIONS.buttons?.secondary?.fontColor).toBe(ESA_CUSTOMIZATIONS.buttons?.secondary?.fontColor);
    expect(DEFAULT_CUSTOMIZATIONS.buttons?.secondary?.fontColorDark).toBe(ESA_CUSTOMIZATIONS.buttons?.secondary?.fontColorDark);
    expect(DEFAULT_CUSTOMIZATIONS.buttons?.primary).toEqual(ESA_CUSTOMIZATIONS.buttons?.primary);
  });

  it('does not change embedded-shopping-assistant\'s own defaults', () => {
    expect(ESA_CUSTOMIZATIONS.buttons?.secondary?.backgroundColor).toBe('#000000');
  });
});
