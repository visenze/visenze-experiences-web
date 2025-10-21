// Returns a JSON containing the default texts of a specific widget type.
// Usage: npx ts-node -P tsconfig-script.json text-reader <CONTEXT_ID>

import type { LanguagePack } from './src/common/locales/locale';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_7 } from './src/official-widgets/camera-search/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_8 } from './src/official-widgets/similar-search/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_10 } from './src/official-widgets/shopping-assistant/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_11 } from './src/official-widgets/recommend-me/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_12 } from './src/official-widgets/more-like-this/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_13 } from './src/official-widgets/shop-the-look/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_14 } from './src/official-widgets/embedded-grid/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_15 } from './src/official-widgets/shoppable-lookbook/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_16 } from './src/official-widgets/shoppable-gallery/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_17 } from './src/official-widgets/icon-triggered-grid/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_18 } from './src/official-widgets/search-bar/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_19 } from './src/official-widgets/embedded-search-results/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_20 } from './src/official-widgets/merchandise-search-bar/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_21 } from './src/official-widgets/in-page-carousel/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_22 } from './src/official-widgets/slide-out-drawer/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_23 } from './src/official-widgets/buy-the-look/default-config';
import { DEFAULT_TEXTS as DEFAULT_TEXTS_24 } from './src/official-widgets/in-page-carousel-v3/default-config';

const configs: Record<string, LanguagePack> = {
  7: DEFAULT_TEXTS_7,
  8: DEFAULT_TEXTS_8,
  10: DEFAULT_TEXTS_10,
  11: DEFAULT_TEXTS_11,
  12: DEFAULT_TEXTS_12,
  13: DEFAULT_TEXTS_13,
  14: DEFAULT_TEXTS_14,
  15: DEFAULT_TEXTS_15,
  16: DEFAULT_TEXTS_16,
  17: DEFAULT_TEXTS_17,
  18: DEFAULT_TEXTS_18,
  19: DEFAULT_TEXTS_19,
  20: DEFAULT_TEXTS_20,
  21: DEFAULT_TEXTS_21,
  22: DEFAULT_TEXTS_22,
  23: DEFAULT_TEXTS_23,
  24: DEFAULT_TEXTS_24,
};

const args = process.argv.slice(2);

if (args.length) {
  console.log(
      args.includes('--pretty-print')
      ? JSON.stringify(configs[args[0]], null, 2)
      : JSON.stringify(configs[args[0]]),
  );
}
