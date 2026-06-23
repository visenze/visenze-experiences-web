/**
 * Multi-search family API selector, injected by the widget-init backend as `appSettings.msApiId`.
 *
 * @since 1.0.21
 */
export enum MsApiType {
  MULTISEARCH = 1,
  COMPLEMENTARY = 2,
  OUTFIT = 3,
}

/**
 * Normalizes the backend-injected `msApiId` (a string such as "", "1", "2", "3", or any stringified
 * integer) into a {@link MsApiType}. Blank/unset is the expected non-MSQ case and maps to
 * MULTISEARCH silently; any other unrecognized value maps to MULTISEARCH and logs a warning.
 */
export const resolveMsApiType = (raw: string | number | undefined): MsApiType => {
  if (raw === undefined || raw === null || `${raw}`.trim() === '') {
    return MsApiType.MULTISEARCH;
  }

  const value = Number(raw);
  if (value === MsApiType.MULTISEARCH || value === MsApiType.COMPLEMENTARY || value === MsApiType.OUTFIT) {
    return value;
  }

  console.warn(`[wigmix] Unrecognized msApiId "${raw}"; falling back to multisearch.`);
  return MsApiType.MULTISEARCH;
};

export const getManualMsApiId = (placementId: string | number): string | number | undefined => {
  const manualMsApiId = (window as unknown as { visenzeConfigs?: Record<string, { appSettings?: { msApiId?: string | number } }> })
    .visenzeConfigs?.[placementId]?.appSettings?.msApiId;

  if (typeof manualMsApiId === 'string' && manualMsApiId.trim() === '') {
    return undefined;
  }
  return manualMsApiId;
};
