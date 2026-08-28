export const QUERY_MAX_CHARACTER_LENGTH = 500;
export const LEGACY_ENDPOINT = 'https://multimodal.search.rezolve.com';

export const FOCUS_VISIBLE_CLASSES =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300';

// For controls auto-focused on mount: `:focus-visible` doesn't reliably ring after a
// script-driven `.focus()` call, so this uses plain `:focus` instead.
export const AUTO_FOCUS_CLASSES =
  'focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 dark:focus:outline-blue-300';
