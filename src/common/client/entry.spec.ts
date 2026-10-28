import { DEFAULT_ENTRY, getManualEntry, resolveElementEntry, resolveEntry } from './entry';

describe('resolveEntry', () => {
  it('accepts known entries', () => {
    expect(resolveEntry('prompt-box')).toBe('prompt-box');
    expect(resolveEntry('launcher')).toBe('launcher');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveEntry('  Prompt-Box ')).toBe('prompt-box');
  });

  it('falls back silently for blank/unset', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveEntry(undefined)).toBe(DEFAULT_ENTRY);
    expect(resolveEntry('')).toBe(DEFAULT_ENTRY);
    expect(resolveEntry('   ')).toBe(DEFAULT_ENTRY);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('falls back with a warning for an unknown value', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveEntry('banner')).toBe(DEFAULT_ENTRY);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('banner'));
    warn.mockRestore();
  });

  it('falls back for non-string values', () => {
    expect(resolveEntry(42)).toBe(DEFAULT_ENTRY);
    expect(resolveEntry({})).toBe(DEFAULT_ENTRY);
  });
});

describe('getManualEntry', () => {
  afterEach(() => {
    delete window.visenzeConfigs;
  });

  it('reads window.visenzeConfigs[pid].appSettings.entry', () => {
    window.visenzeConfigs = { 7: { appSettings: { entry: 'prompt-box' } } } as any;
    expect(getManualEntry(7)).toBe('prompt-box');
  });

  it('treats a blank value as unset', () => {
    window.visenzeConfigs = { 7: { appSettings: { entry: '  ' } } } as any;
    expect(getManualEntry(7)).toBeUndefined();
  });

  it('returns undefined when nothing is configured', () => {
    expect(getManualEntry(7)).toBeUndefined();
  });
});

describe('resolveElementEntry precedence', () => {
  afterEach(() => {
    delete window.visenzeConfigs;
  });

  const el = (entry?: string): HTMLElement => {
    const div = document.createElement('div');
    if (entry !== undefined) div.dataset['entry'] = entry;
    return div;
  };

  it('data-entry beats manual config beats API beats default', () => {
    window.visenzeConfigs = { 7: { appSettings: { entry: 'launcher' } } } as any;
    expect(resolveElementEntry(el('prompt-box'), 7, 'launcher')).toBe('prompt-box');
    expect(resolveElementEntry(el(), 7, 'prompt-box')).toBe('launcher');
    delete window.visenzeConfigs;
    expect(resolveElementEntry(el(), 7, 'prompt-box')).toBe('prompt-box');
    expect(resolveElementEntry(el(), 7, undefined)).toBe(DEFAULT_ENTRY);
  });

  it('a blank or unknown data-entry does not mask a lower-precedence value', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveElementEntry(el(''), 7, 'prompt-box')).toBe('prompt-box');
    expect(resolveElementEntry(el('banner'), 7, 'prompt-box')).toBe('prompt-box');
    warn.mockRestore();
  });
});

describe('the search-bar entry', () => {
  afterEach(() => {
    delete window.visenzeConfigs;
  });

  const el = (entry?: string): HTMLElement => {
    const div = document.createElement('div');
    if (entry !== undefined) div.dataset['entry'] = entry;
    return div;
  };

  it('resolves, case- and whitespace-insensitively', () => {
    expect(resolveEntry('search-bar')).toBe('search-bar');
    expect(resolveEntry('  Search-BAR ')).toBe('search-bar');
  });

  it('keeps the precedence: data-entry > manual config > API > default', () => {
    window.visenzeConfigs = { 7: { appSettings: { entry: 'prompt-box' } } } as any;
    expect(resolveElementEntry(el(' SEARCH-bar'), 7, 'launcher')).toBe('search-bar');
    expect(resolveElementEntry(el(), 7, 'search-bar')).toBe('prompt-box');
    window.visenzeConfigs = { 7: { appSettings: { entry: 'search-bar' } } } as any;
    expect(resolveElementEntry(el(), 7, 'launcher')).toBe('search-bar');
    delete window.visenzeConfigs;
    expect(resolveElementEntry(el(), 7, 'search-bar')).toBe('search-bar');
  });

  it('an unknown value still warns and falls back', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveEntry('search_bar')).toBe(DEFAULT_ENTRY);
    expect(resolveElementEntry(el('banner'), 7, 'search-bar')).toBe('search-bar');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('the embedded entry', () => {
  afterEach(() => {
    delete window.visenzeConfigs;
  });

  const el = (entry?: string): HTMLElement => {
    const div = document.createElement('div');
    if (entry !== undefined) div.dataset['entry'] = entry;
    return div;
  };

  it('resolves, case- and whitespace-insensitively', () => {
    expect(resolveEntry('embedded')).toBe('embedded');
    expect(resolveEntry('  EmBedded ')).toBe('embedded');
  });

  it('keeps the precedence: data-entry > manual config > API > default', () => {
    window.visenzeConfigs = { 7: { appSettings: { entry: 'prompt-box' } } } as any;
    expect(resolveElementEntry(el(' EMBEDDED'), 7, 'launcher')).toBe('embedded');
    expect(resolveElementEntry(el(), 7, 'embedded')).toBe('prompt-box');
    window.visenzeConfigs = { 7: { appSettings: { entry: 'embedded' } } } as any;
    expect(resolveElementEntry(el(), 7, 'launcher')).toBe('embedded');
    delete window.visenzeConfigs;
    expect(resolveElementEntry(el(), 7, 'embedded')).toBe('embedded');
  });

  it('an unknown value still warns and falls back', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveEntry('embed')).toBe(DEFAULT_ENTRY);
    expect(resolveElementEntry(el('embeded'), 7, 'embedded')).toBe('embedded');
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
