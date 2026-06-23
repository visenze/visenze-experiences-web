import { CLOUD_DOMAINS, getManualEndpoint, resolveBaseEndpoint, usesCloudPaths } from './endpoint';
import { DEFAULT_ENDPOINT } from '../constants';
import type { Cloud } from '../types/cloud';

describe('endpoint resolver', () => {
  describe('resolveBaseEndpoint (precedence: manual > cloud > API endpoint > default)', () => {
    it('returns DEFAULT_ENDPOINT when nothing is set', () => {
      expect(resolveBaseEndpoint({})).toBe(DEFAULT_ENDPOINT);
    });

    it('returns the API endpoint when set and no cloud', () => {
      expect(resolveBaseEndpoint({ endpoint: 'https://api.example.com' })).toBe('https://api.example.com');
    });

    it('trims the API endpoint when set and no cloud', () => {
      expect(resolveBaseEndpoint({ endpoint: ' https://api.example.com ' })).toBe('https://api.example.com');
    });

    it('treats a blank API endpoint as unset', () => {
      expect(resolveBaseEndpoint({ endpoint: ' ' })).toBe(DEFAULT_ENDPOINT);
    });

    it('returns the aws cloud domain when cloud=aws', () => {
      expect(resolveBaseEndpoint({ cloud: 'aws' })).toBe(CLOUD_DOMAINS.aws);
    });

    it('returns the azure cloud domain when cloud=azure', () => {
      expect(resolveBaseEndpoint({ cloud: 'azure' })).toBe(CLOUD_DOMAINS.azure);
    });

    it('ignores the API endpoint when cloud is set (cloud wins)', () => {
      expect(resolveBaseEndpoint({ cloud: 'aws', endpoint: 'https://api.example.com' })).toBe(CLOUD_DOMAINS.aws);
    });

    it('returns the manual endpoint over cloud (manual wins)', () => {
      expect(resolveBaseEndpoint({ cloud: 'aws', endpoint: 'https://api.example.com' }, 'https://manual.example.com')).toBe('https://manual.example.com');
    });

    it('trims the manual endpoint when present', () => {
      expect(resolveBaseEndpoint({ cloud: 'aws' }, ' https://manual.example.com ')).toBe('https://manual.example.com');
    });

    it('treats a blank manual endpoint as unset so cloud can win', () => {
      expect(resolveBaseEndpoint({ cloud: 'aws', endpoint: 'https://api.example.com' }, '')).toBe(CLOUD_DOMAINS.aws);
      expect(resolveBaseEndpoint({ cloud: 'azure' }, ' ')).toBe(CLOUD_DOMAINS.azure);
    });

    it('falls back to DEFAULT_ENDPOINT when a cloud has no configured domain', () => {
      expect(resolveBaseEndpoint({ cloud: 'gcp' as Cloud, endpoint: 'https://api.example.com' })).toBe(DEFAULT_ENDPOINT);
    });
  });

  describe('usesCloudPaths (mirrors SDK isCloudDomain)', () => {
    it('is false when nothing is set', () => {
      expect(usesCloudPaths({})).toBe(false);
    });

     it('treats an empty manual endpoint as unset (so cloud still enables cloud paths)', () => {
       expect(usesCloudPaths({ cloud: 'aws' }, '')).toBe(true);
     });

    it('is false for a legacy API endpoint', () => {
      expect(usesCloudPaths({ endpoint: 'https://search.visenze.com' })).toBe(false);
    });

    it('is true when cloud=aws', () => {
      expect(usesCloudPaths({ cloud: 'aws' })).toBe(true);
    });

    it('is true when cloud=azure', () => {
      expect(usesCloudPaths({ cloud: 'azure' })).toBe(true);
    });

    it('is true when cloud set even if a legacy API endpoint is also present (endpoint ignored)', () => {
      expect(usesCloudPaths({ cloud: 'aws', endpoint: 'https://search.visenze.com' })).toBe(true);
    });

    it('is true when a manual endpoint points at a known cloud domain', () => {
      expect(usesCloudPaths({}, CLOUD_DOMAINS.azure)).toBe(true);
    });

    it('trims explicit endpoints before detecting cloud domains', () => {
      expect(usesCloudPaths({}, ` ${CLOUD_DOMAINS.azure} `)).toBe(true);
      expect(usesCloudPaths({ endpoint: ` ${CLOUD_DOMAINS.aws} ` })).toBe(true);
    });

    it('is false when a manual endpoint points at a non-cloud domain, overriding cloud', () => {
      expect(usesCloudPaths({ cloud: 'aws' }, 'https://search.visenze.com')).toBe(false);
    });

    it('is false for a malformed explicit endpoint', () => {
      expect(usesCloudPaths({ endpoint: 'not a url' })).toBe(false);
    });

    it('treats a blank manual endpoint as unset so cloud can drive path selection', () => {
      expect(usesCloudPaths({ cloud: 'aws' }, '')).toBe(true);
      expect(usesCloudPaths({ cloud: 'azure' }, ' ')).toBe(true);
    });

    it('does not use cloud paths when a cloud has no configured domain', () => {
      expect(usesCloudPaths({ cloud: 'gcp' as Cloud })).toBe(false);
    });
  });

  describe('getManualEndpoint', () => {
    afterEach(() => {
      delete (window as any).visenzeConfigs;
    });

    it('returns undefined when window.visenzeConfigs is absent', () => {
      expect(getManualEndpoint('5000')).toBeUndefined();
    });

    it('reads the manual endpoint for the given placement id', () => {
      (window as any).visenzeConfigs = { 5000: { appSettings: { endpoint: 'https://manual.example.com' } } };
      expect(getManualEndpoint('5000')).toBe('https://manual.example.com');
      expect(getManualEndpoint(5000)).toBe('https://manual.example.com');
    });

    it('trims manual endpoints and treats blank values as unset', () => {
      (window as any).visenzeConfigs = {
        5000: { appSettings: { endpoint: ' https://manual.example.com ' } },
        6000: { appSettings: { endpoint: ' ' } },
      };
      expect(getManualEndpoint('5000')).toBe('https://manual.example.com');
      expect(getManualEndpoint('6000')).toBeUndefined();
    });

    it('returns undefined for a placement id with no manual endpoint', () => {
      (window as any).visenzeConfigs = { 5000: { appSettings: {} } };
      expect(getManualEndpoint('9999')).toBeUndefined();
    });
  });
});
