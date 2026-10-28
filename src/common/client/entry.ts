export type AssistantEntry = 'launcher' | 'prompt-box' | 'search-bar' | 'embedded';

const ENTRIES: readonly AssistantEntry[] = ['launcher', 'prompt-box', 'search-bar', 'embedded'];

export const DEFAULT_ENTRY: AssistantEntry = 'launcher';

const normalize = (raw: unknown): string => (typeof raw === 'string' ? raw.trim().toLowerCase() : '');

const isEntry = (value: string): value is AssistantEntry => (ENTRIES as readonly string[]).includes(value);

/**
 * Normalizes an `entry` value. Blank/unset silently maps to the default; an unrecognized value maps to
 * the default and logs a warning (same contract as `resolveMsApiType`).
 */
export const resolveEntry = (raw: unknown): AssistantEntry => {
  const value = normalize(raw);
  if (value === '') {
    return DEFAULT_ENTRY;
  }
  if (isEntry(value)) {
    return value;
  }
  console.warn(`[wigmix] Unrecognized entry "${String(raw)}"; falling back to ${DEFAULT_ENTRY}.`);
  return DEFAULT_ENTRY;
};

export const getManualEntry = (placementId: string | number): string | undefined => {
  const manual = window.visenzeConfigs?.[placementId]?.appSettings?.entry;
  if (typeof manual !== 'string' || manual.trim() === '') {
    return undefined;
  }
  return manual;
};

// Precedence: data-entry > window.visenzeConfigs[pid].appSettings.entry > API appSettings.entry > default.
// A blank or unrecognized higher-precedence value is skipped (not treated as "set"), so a typo in
// data-entry degrades to the next source instead of silently forcing the default.
export const resolveElementEntry = (
  element: HTMLElement,
  placementId: string | number,
  apiEntry: string | undefined,
): AssistantEntry => {
  const candidates = [element.dataset['entry'], getManualEntry(placementId), apiEntry];
  for (const candidate of candidates) {
    const value = normalize(candidate);
    if (value === '') {
      continue;
    }
    if (isEntry(value)) {
      return value;
    }
    console.warn(`[wigmix] Unrecognized entry "${String(candidate)}"; ignoring.`);
  }
  return DEFAULT_ENTRY;
};
