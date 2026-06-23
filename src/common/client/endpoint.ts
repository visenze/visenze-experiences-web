import type { Cloud } from '../types/cloud';
import { DEFAULT_ENDPOINT } from '../constants';

type AppSettingsLike = { endpoint?: string; cloud?: Cloud };

/**
 * Cloud-specific API domains. This deliberately mirrors the cloud→domain map inside
 * `visearch-javascript-sdk` (see its `getEndpoint`), because the direct-`fetch` call sites in this
 * repo (gallery browse, dev field-mapping fetch) bypass the SDK and must resolve the domain
 * themselves. Keep in sync with the SDK constants.
 */
export const CLOUD_DOMAINS: Partial<Record<Cloud, string>> = {
  aws: 'https://multisearch-aw.rezolve.com',
  azure: 'https://multisearch-az.rezolve.com',
};

const CLOUD_ORIGINS = new Set(Object.values(CLOUD_DOMAINS).map((d) => new URL(d).origin));

const getCloudDomain = (cloud?: Cloud): string | undefined => (cloud ? CLOUD_DOMAINS[cloud] : undefined);

const normalizeEndpoint = (endpoint?: string): string | undefined => {
  const trimmed = endpoint?.trim();
  return trimmed || undefined;
};

/**
 * Resolve the base API domain, following precedence: manual endpoint > cloud > API endpoint > default.
 */
export const resolveBaseEndpoint = (settings: AppSettingsLike, manualEndpoint?: string): string => {
  const normalizedManualEndpoint = normalizeEndpoint(manualEndpoint);
  if (normalizedManualEndpoint) {
    return normalizedManualEndpoint;
  }
  const cloudDomain = getCloudDomain(settings.cloud);
  if (cloudDomain) {
    return cloudDomain;
  }
  if (settings.cloud) {
    return DEFAULT_ENDPOINT;
  }
  const normalizedEndpoint = normalizeEndpoint(settings.endpoint);
  if (normalizedEndpoint) {
    return normalizedEndpoint;
  }
  return DEFAULT_ENDPOINT;
};

/**
 * Whether to use the new cloud API paths. Mirrors the SDK's `isCloudDomain`: an explicit endpoint
 * (manual, or the API endpoint when no cloud is set) only triggers cloud paths if its origin is a
 * known cloud domain; otherwise `cloud` drives it.
 */
export const usesCloudPaths = (settings: AppSettingsLike, manualEndpoint?: string): boolean => {
  const explicit = normalizeEndpoint(manualEndpoint) ?? (settings.cloud ? undefined : normalizeEndpoint(settings.endpoint));
  if (explicit) {
    try {
      return CLOUD_ORIGINS.has(new URL(explicit).origin);
    } catch {
      return false;
    }
  }
  return Boolean(getCloudDomain(settings.cloud));
};

/**
 * Read a developer-supplied manual endpoint (highest precedence) from the host page's
 * `window.visenzeConfigs[placementId].appSettings.endpoint` channel.
 */
export const getManualEndpoint = (placementId: string | number): string | undefined =>
  normalizeEndpoint((window as unknown as { visenzeConfigs?: Record<string, { appSettings?: { endpoint?: string } }> })
    .visenzeConfigs?.[placementId]?.appSettings?.endpoint);
