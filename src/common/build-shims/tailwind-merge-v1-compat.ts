/**
 * Build-only adapter (wired in webpack.util.js): lets HeroUI's `tailwind-variants@0.1` use the same `tailwind-merge@2`
 * copy that `@heroui/theme` already bundles, instead of bundling its own `tailwind-merge@1` as a second copy.
 *
 * tailwind-variants@0.1 calls the v1 API `extendTailwindMerge({ theme, classGroups })`, which extends the default config.
 * v2 expects those keys under `extend`. The adapter accepts both shapes, so a caller that already passes the v2 shape
 * (`extend` / `override`) keeps working instead of having its config silently nested under `extend.extend`.
 *
 * TODO: Written for tailwind-variants 0.1.20 (tailwind-merge 1.14) -> tailwind-merge 2.6. Remove this file and the rule in
 * webpack.util.js once @heroui/theme depends on a tailwind-variants built for tailwind-merge >= 2 (the webpack rule
 * already switches itself off in that case).
 */
import type { ConfigExtension } from 'tailwind-merge';
import { extendTailwindMerge as extendTailwindMergeV2, twMerge } from 'tailwind-merge';

type MergeFn = ReturnType<typeof extendTailwindMergeV2>;
type V2Config = ConfigExtension<string, string>;
// v1 put `theme` / `classGroups` / `conflictingClassGroups` / ... at the top level; v2 puts them under `extend`.
type V1OrV2Config = V2Config & NonNullable<V2Config['extend']>;

export const extendTailwindMerge = (config: V1OrV2Config = {}): MergeFn => {
  const { cacheSize, prefix, separator, experimentalParseClassName, override, extend, ...v1Extension } = config;
  return extendTailwindMergeV2({
    cacheSize,
    prefix,
    separator,
    experimentalParseClassName,
    override,
    extend: { ...v1Extension, ...extend },
  });
};

export { twMerge };
