/** Smallest window, in px, the docked panel is used in by default; narrower windows get the modal. */
export const DEFAULT_DOCKED_MIN_WINDOW_WIDTH = 700;

/** Docking is refused when the panel would leave the page less than this, whatever the window: a guard against absurd widths. */
export const MIN_ROOM_FOR_PAGE = 320;

/** Extra px an already docked panel may lose below the minimum window width before the modal is used, so zoom steps or a window edge on the threshold don't flip it. */
export const DOCK_HYSTERESIS_PX = 40;

/**
 * Whether to dock in this window: the panel width itself if so, or null (use the modal) when the window is narrower than
 * `minWindowWidth` or the panel would leave the page almost nothing. The panel keeps the width it was configured with; the
 * room left for the page is simply the window minus the panel.
 */
export const resolveDockedWidth = (viewportWidth: number, panelWidth: number, minWindowWidth: number, wasDocked = false): number | null => {
  const threshold = wasDocked ? Math.max(0, minWindowWidth - DOCK_HYSTERESIS_PX) : minWindowWidth;
  if (viewportWidth < threshold || viewportWidth - panelWidth < MIN_ROOM_FOR_PAGE) {
    return null;
  }
  return panelWidth;
};

type PerDevice<T> = Partial<Record<'mobile' | 'tablet' | 'desktop', T>>;

/** The value for the current device from a plain value or a per-device object; a device left out uses `desktop`. */
export const pickForDevice = <T>(config: T | PerDevice<T> | undefined, device: string): T | undefined => {
  if (config !== null && typeof config === 'object') {
    const byDevice = config as PerDevice<T>;
    return byDevice[device as keyof PerDevice<T>] ?? byDevice.desktop;
  }
  return config;
};

/**
 * One width setting in pixels: a number is pixels, `'20%'` is that share of the window, `'320px'` is pixels. Anything
 * else (zero, negative, garbage, over 100%) is null, so the caller keeps its default.
 */
export const parseDockedWidth = (value: unknown, viewportWidth: number): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^\s*(\d+(?:\.\d+)?)\s*(%|px)?\s*$/.exec(value);
  const amount = match ? parseFloat(match[1] as string) : NaN;
  if (!(amount > 0)) {
    return null;
  }
  if (match?.[2] === '%') {
    return amount <= 100 ? Math.round((viewportWidth * amount) / 100) : null;
  }
  return amount;
};

/** The preferred panel width in pixels for this device and window: the setting if valid, else `fallback`. */
export const resolvePreferredDockedWidth = (config: unknown, device: string, viewportWidth: number, fallback: number): number => (
  parseDockedWidth(pickForDevice(config as number | string, device), viewportWidth) ?? fallback
);
