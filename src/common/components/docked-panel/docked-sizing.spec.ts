import { parseDockedWidth, pickForDevice, resolveDockedWidth, resolvePreferredDockedWidth } from './docked-sizing';

describe('resolveDockedWidth', () => {
  it('docks at the configured width from the minimum window width up', () => {
    expect(resolveDockedWidth(1440, 380, 700)).toBe(380);
    expect(resolveDockedWidth(700, 220, 700)).toBe(220);
  });

  it('uses the modal (null) in windows narrower than the minimum', () => {
    expect(resolveDockedWidth(699, 220, 700)).toBeNull();
    expect(resolveDockedWidth(500, 220, 700)).toBeNull();
  });

  it('never narrows the panel to make room: the page gets the rest of the window', () => {
    expect(resolveDockedWidth(800, 380, 700)).toBe(380);
  });

  it('refuses a panel that would leave the page almost nothing', () => {
    expect(resolveDockedWidth(700, 400, 700)).toBeNull();
    expect(resolveDockedWidth(700, 380, 700)).toBe(380);
  });

  it('keeps an already docked panel docked a little below the minimum, so it does not flicker', () => {
    expect(resolveDockedWidth(670, 220, 700)).toBeNull();
    expect(resolveDockedWidth(670, 220, 700, true)).toBe(220);
    expect(resolveDockedWidth(655, 220, 700, true)).toBeNull();
  });
});

describe('parseDockedWidth', () => {
  it('reads numbers and px strings as pixels, and percentages as a share of the window', () => {
    expect(parseDockedWidth(320, 1400)).toBe(320);
    expect(parseDockedWidth('320px', 1400)).toBe(320);
    expect(parseDockedWidth(' 320 ', 1400)).toBe(320);
    expect(parseDockedWidth('20%', 1400)).toBe(280);
    expect(parseDockedWidth('15.5%', 1000)).toBe(155);
  });

  it('follows the window as it changes', () => {
    expect(parseDockedWidth('20%', 1000)).toBe(200);
    expect(parseDockedWidth('20%', 1600)).toBe(320);
  });

  it.each([0, -5, NaN, Infinity, '0%', '-10%', '120%', 'abc', '20em', '', undefined, null, {}, true])('rejects %p', (value) => {
    expect(parseDockedWidth(value, 1400)).toBeNull();
  });
});

describe('pickForDevice', () => {
  it('passes a plain value through', () => {
    expect(pickForDevice(380, 'tablet')).toBe(380);
    expect(pickForDevice(undefined, 'tablet')).toBeUndefined();
  });

  it('picks the device value, falling back to desktop for a device left out', () => {
    const config = { desktop: 380, tablet: 220 };
    expect(pickForDevice(config, 'tablet')).toBe(220);
    expect(pickForDevice(config, 'desktop')).toBe(380);
    expect(pickForDevice(config, 'mobile')).toBe(380);
    expect(pickForDevice({ tablet: 220 }, 'desktop')).toBeUndefined();
  });
});

describe('resolvePreferredDockedWidth', () => {
  it('combines device choice, percentages and the fallback', () => {
    const config = { desktop: 320, tablet: '30%' };
    expect(resolvePreferredDockedWidth(config, 'desktop', 1400, 380)).toBe(320);
    expect(resolvePreferredDockedWidth(config, 'tablet', 800, 380)).toBe(240);
    expect(resolvePreferredDockedWidth(undefined, 'desktop', 1400, 380)).toBe(380);
    expect(resolvePreferredDockedWidth({ tablet: 220 }, 'desktop', 1400, 380)).toBe(380);
    expect(resolvePreferredDockedWidth('garbage', 'desktop', 1400, 380)).toBe(380);
  });

  it('docks a configured per-device panel at the minimum window width', () => {
    // 220px tablet panel on a 700px window: leaves 480 for the page.
    expect(resolveDockedWidth(700, resolvePreferredDockedWidth({ tablet: 220 }, 'tablet', 700, 380), 700)).toBe(220);
  });
});
