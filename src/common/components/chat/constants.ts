// Waited between each newly-revealed product card while a reply is still streaming in, so
// cards appear one at a time instead of all popping in together. One interval per `products`
// array (not recreated per card) ticks forward and self-clears once every card is revealed —
// it can't run forever. When more products arrive, `products.length` changing tears down the
// old interval and starts a fresh one, picking up from wherever the reveal currently is. Only
// applies to the live, in-progress grid; once a reply is committed to history all of its
// products are shown at once (matches the committed message text, which also renders
// instantly rather than replaying its typewriter effect).
export const PRODUCT_REVEAL_DELAY_MS = 200;

// Waited after the user's last scroll/touch gesture before auto-scroll is allowed to resume.
export const USER_SCROLL_IDLE_MS = 1000;

// Scale applied to the product card currently being narrated aloud. Must stay small enough that
// it can't visually bleed into the row above/below, since the product grid sets a column gap but
// no row gap.
export const FOCUSED_SCALE = 0.9;
