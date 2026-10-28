import type { FC } from 'react';
import type { EntryProps } from './entry-props';
import LauncherEntry from './LauncherEntry';
import PromptBoxEntry from './PromptBoxEntry';
import SearchBarEntry from './SearchBarEntry';
import type { AssistantEntry } from '../../../common/client/entry';

export type { EntryProps } from './entry-props';

// `embedded` is not hosted by EntryHost: it has its own session per element (see embedded-host.tsx).
export const ENTRY_COMPONENTS: Record<Exclude<AssistantEntry, 'embedded'>, FC<EntryProps>> = {
  launcher: LauncherEntry,
  'prompt-box': PromptBoxEntry,
  'search-bar': SearchBarEntry,
};
