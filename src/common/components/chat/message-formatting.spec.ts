import { DEFAULT_LINK_OPTIONS, type LinkOptions, processMessageForDisplay, resolveLinkOptions } from './message-formatting';
import type { WidgetConfig } from '../../wigmix-core';

const withLinks = (links: NonNullable<NonNullable<WidgetConfig['customizations']['chatbot']>['links']>): WidgetConfig['customizations'] => (
  { chatbot: { links } } as unknown as WidgetConfig['customizations']
);

describe('processMessageForDisplay', () => {
  it('escapes html, keeps bold and line breaks', () => {
    expect(processMessageForDisplay('<b>x</b> **bold**\nnext')).toBe('&lt;b&gt;x&lt;/b&gt; <b>bold</b><br>next');
  });

  it('turns an https link into an anchor that opens in a new tab, underlined', () => {
    expect(processMessageForDisplay('See [Track order](https://example.com/orders)')).toBe(
      'See <a href="https://example.com/orders" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">Track order</a>',
    );
  });

  it.each(['http://example.com', 'mailto:help@example.com', '/cart'])('allows %s by default', (url) => {
    expect(processMessageForDisplay(`[go](${url})`)).toContain(`<a href="${url}"`);
  });

  it.each(['javascript:alert(1)', 'data:text/html,hi', 'vbscript:x', 'tel:123', 'cart'])('leaves %s as plain text by default', (url) => {
    expect(processMessageForDisplay(`[go](${url})`)).toBe(`[go](${url})`);
  });

  it('never allows javascript links, even when configured', () => {
    const options: LinkOptions = { ...DEFAULT_LINK_OPTIONS, allowedProtocols: ['javascript', 'https'] };
    expect(processMessageForDisplay('[go](javascript:alert(1))', options)).toBe('[go](javascript:alert(1))');
  });

  it('escapes a double quote in the url so it cannot break out of the href', () => {
    expect(processMessageForDisplay('[go](https://example.com/"onclick=x)')).toContain('href="https://example.com/&quot;onclick=x"');
  });

  it('leaves links as plain text when disabled', () => {
    expect(processMessageForDisplay('[go](https://example.com)', { ...DEFAULT_LINK_OPTIONS, enabled: false })).toBe('[go](https://example.com)');
  });

  it('applies the configured tab, underline and color options', () => {
    const options: LinkOptions = { ...DEFAULT_LINK_OPTIONS, openInNewTab: false, underline: false, color: '#FF0000' };
    expect(processMessageForDisplay('[go](https://example.com)', options)).toBe(
      '<a href="https://example.com" style="text-decoration:none;color:#FF0000">go</a>',
    );
  });

  it('strips characters from the color that could break out of the style attribute', () => {
    const options: LinkOptions = { ...DEFAULT_LINK_OPTIONS, color: 'red;" onmouseover="x' };
    expect(processMessageForDisplay('[go](https://example.com)', options)).toContain('style="text-decoration:underline;color:red onmouseover=x"');
  });
});

describe('resolveLinkOptions', () => {
  it('uses the defaults when nothing is configured', () => {
    expect(resolveLinkOptions({} as WidgetConfig['customizations'], false)).toEqual({ ...DEFAULT_LINK_OPTIONS, color: undefined });
  });

  it('reads every configured option, normalizing protocols and picking the dark-mode color', () => {
    const customizations = withLinks({
      enabled: false,
      openInNewTab: false,
      allowedProtocols: ['HTTPS:', 'tel'],
      allowRelative: false,
      underline: false,
      fontColor: '#111111',
      fontColorDark: '#EEEEEE',
    });
    expect(resolveLinkOptions(customizations, true)).toEqual({
      enabled: false,
      openInNewTab: false,
      allowedProtocols: ['https', 'tel'],
      allowRelative: false,
      underline: false,
      color: '#EEEEEE',
    });
    expect(resolveLinkOptions(customizations, false).color).toBe('#111111');
  });

  it('makes relative links plain text when allowRelative is off', () => {
    const options = resolveLinkOptions(withLinks({ allowRelative: false }), false);
    expect(processMessageForDisplay('[cart](/cart)', options)).toBe('[cart](/cart)');
  });
});
