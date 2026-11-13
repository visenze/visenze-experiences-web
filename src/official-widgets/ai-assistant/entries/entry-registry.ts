import type { FC } from 'react';
import BasicEntry from './BasicEntry';
import type { EntryProps } from './entry-props';
import LauncherEntry from './LauncherEntry';
import PromptBoxEntry from './PromptBoxEntry';
import type { AssistantEntry } from '../../../common/client/entry';

export type { EntryProps } from './entry-props';

// `embedded` is not hosted by EntryHost: it has its own session per element (see embedded-host.tsx).
export const ENTRY_COMPONENTS: Record<Exclude<AssistantEntry, 'embedded'>, FC<EntryProps>> = {
  basic: BasicEntry,
  'prompt-box': PromptBoxEntry,
  launcher: LauncherEntry,
};
