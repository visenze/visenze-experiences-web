/**
 * Build-only adapter (wired in webpack.util.js): lets HeroUI's `tailwind-variants@0.1` use the same `tailwind-merge@2`
 * copy that `@heroui/theme` already bundles, instead of bundling its own `tailwind-merge@1` as a second copy.
 *
 * tailwind-variants calls the v1 API `extendTailwindMerge({ theme, classGroups })`, which extends the default config.
 * v2 expects those keys under `extend`, so wrap them; everything else is passed through unchanged.
 */
import type { ConfigExtension } from 'tailwind-merge';
import { extendTailwindMerge as extendTailwindMergeV2, twMerge } from 'tailwind-merge';

type MergeFn = ReturnType<typeof extendTailwindMergeV2>;

export const extendTailwindMerge = (config: ConfigExtension<string, string>['extend']): MergeFn => extendTailwindMergeV2({ extend: config });

export { twMerge };
