// Returns a JSON containing the default config of a specific widget type.
// Usage: npx ts-node -P tsconfig-script.json customization-reader <CONTEXT_ID>

import type { WidgetConfig } from './src/common/wigmix-core';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_7 } from './src/official-widgets/camera-search/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_8 } from './src/official-widgets/similar-search/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_10 } from './src/official-widgets/shopping-assistant/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_11 } from './src/official-widgets/recommend-me/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_12 } from './src/official-widgets/more-like-this/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_13 } from './src/official-widgets/shop-the-look/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_14 } from './src/official-widgets/embedded-grid/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_15 } from './src/official-widgets/shoppable-lookbook/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_16 } from './src/official-widgets/shoppable-gallery/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_17 } from './src/official-widgets/icon-triggered-grid/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_18 } from './src/official-widgets/search-bar/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_19 } from './src/official-widgets/embedded-search-results/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_20 } from './src/official-widgets/merchandise-search-bar/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_21 } from './src/official-widgets/in-page-carousel/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_22 } from './src/official-widgets/slide-out-drawer/default-config';
import { DEFAULT_CUSTOMIZATIONS as DEFAULT_CUSTOMIZATIONS_23 } from './src/official-widgets/buy-the-look/default-config';

const configs: Record<string, WidgetConfig['customizations']> = {
  7: DEFAULT_CUSTOMIZATIONS_7,
  8: DEFAULT_CUSTOMIZATIONS_8,
  10: DEFAULT_CUSTOMIZATIONS_10,
  11: DEFAULT_CUSTOMIZATIONS_11,
  12: DEFAULT_CUSTOMIZATIONS_12,
  13: DEFAULT_CUSTOMIZATIONS_13,
  14: DEFAULT_CUSTOMIZATIONS_14,
  15: DEFAULT_CUSTOMIZATIONS_15,
  16: DEFAULT_CUSTOMIZATIONS_16,
  17: DEFAULT_CUSTOMIZATIONS_17,
  18: DEFAULT_CUSTOMIZATIONS_18,
  19: DEFAULT_CUSTOMIZATIONS_19,
  20: DEFAULT_CUSTOMIZATIONS_20,
  21: DEFAULT_CUSTOMIZATIONS_21,
  22: DEFAULT_CUSTOMIZATIONS_22,
  23: DEFAULT_CUSTOMIZATIONS_23,
};

const args = process.argv.slice(2);

if (args.length) {
  console.log(
      args.includes('--pretty-print')
      ? JSON.stringify(configs[args[0]], null, 2)
      : JSON.stringify(configs[args[0]]),
  );
}
