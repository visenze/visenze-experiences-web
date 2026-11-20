import { twMergeConfig } from '@heroui/theme';
import { extendTailwindMerge, twMerge } from './tailwind-merge-v1-compat';

describe('tailwind-merge v1 compat adapter', () => {
  it('extends the defaults with a v1-shaped config (as tailwind-variants@0.1 passes it)', () => {
    const merge = extendTailwindMerge(twMergeConfig);

    // HeroUI's custom classes only conflict when HeroUI's config was applied.
    expect(merge('text-tiny text-small')).toBe('text-small');
    expect(merge('rounded-medium rounded-large')).toBe('rounded-large');
    expect(merge('shadow-small shadow-large')).toBe('shadow-large');
    expect(merge('opacity-disabled opacity-50')).toBe('opacity-50');
    // Default groups still work.
    expect(merge('px-2 px-3 py-1')).toBe('px-3 py-1');
  });

  it('accepts a v2-shaped config without nesting it under extend.extend', () => {
    const merge = extendTailwindMerge({ extend: twMergeConfig });

    expect(merge('text-tiny text-small')).toBe('text-small');
    expect(merge('rounded-medium rounded-large')).toBe('rounded-large');
  });

  it('passes top-level options (prefix) through instead of nesting them', () => {
    const merge = extendTailwindMerge({ prefix: 'tw-' });

    expect(merge('tw-p-2 tw-p-4')).toBe('tw-p-4');
  });

  it('re-exports the default twMerge', () => {
    expect(twMerge('p-2 p-4')).toBe('p-4');
  });
});
