import { MsApiType, resolveMsApiType } from './ms-api';

describe('resolveMsApiType', () => {
  it('maps "1"/"2"/"3" strings to the matching API type', () => {
    expect(resolveMsApiType('1')).toBe(MsApiType.MULTISEARCH);
    expect(resolveMsApiType('2')).toBe(MsApiType.COMPLEMENTARY);
    expect(resolveMsApiType('3')).toBe(MsApiType.OUTFIT);
  });

  it('maps numeric values to the matching API type', () => {
    expect(resolveMsApiType(2)).toBe(MsApiType.COMPLEMENTARY);
    expect(resolveMsApiType(3)).toBe(MsApiType.OUTFIT);
  });

  it('falls back to multisearch silently for blank/unset values', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveMsApiType('')).toBe(MsApiType.MULTISEARCH);
    expect(resolveMsApiType('   ')).toBe(MsApiType.MULTISEARCH);
    expect(resolveMsApiType(undefined)).toBe(MsApiType.MULTISEARCH);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('falls back to multisearch and warns once for unrecognized non-blank values', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveMsApiType('456')).toBe(MsApiType.MULTISEARCH);
    expect(resolveMsApiType('abc')).toBe(MsApiType.MULTISEARCH);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
