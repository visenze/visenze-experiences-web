import type { WidgetConfig } from '../../wigmix-core';

// How markdown-style [label](url) links in a chat message are rendered. Resolved once per chat
// surface from `customizations.chatbot.links` (see resolveLinkOptions) and passed down.
export interface LinkOptions {
  enabled: boolean;
  openInNewTab: boolean;
  // Lower-case schemes without the colon, e.g. ['http', 'https', 'mailto'].
  allowedProtocols: string[];
  allowRelative: boolean;
  underline: boolean;
  // Unset = inherit the bubble's text color.
  color?: string;
}

// Never allowed, even when configured: these turn the anchor into script execution.
const BLOCKED_LINK_PROTOCOLS = ['javascript', 'data', 'vbscript'];

export const DEFAULT_LINK_OPTIONS: LinkOptions = {
  enabled: true,
  openInNewTab: true,
  allowedProtocols: ['http', 'https', 'mailto'],
  allowRelative: true,
  underline: true,
};

const normalizeProtocol = (protocol: string): string => protocol.trim().toLowerCase().replace(/:$/, '');

export const resolveLinkOptions = (customizations: WidgetConfig['customizations'], darkMode: boolean): LinkOptions => {
  const links = customizations.chatbot?.links;
  return {
    enabled: links?.enabled ?? DEFAULT_LINK_OPTIONS.enabled,
    openInNewTab: links?.openInNewTab ?? DEFAULT_LINK_OPTIONS.openInNewTab,
    allowedProtocols: (links?.allowedProtocols ?? DEFAULT_LINK_OPTIONS.allowedProtocols).map(normalizeProtocol),
    allowRelative: links?.allowRelative ?? DEFAULT_LINK_OPTIONS.allowRelative,
    underline: links?.underline ?? DEFAULT_LINK_OPTIONS.underline,
    color: (darkMode ? links?.fontColorDark : links?.fontColor) || undefined,
  };
};

// This runs on raw model output, so a url only becomes a live anchor when its scheme is allowed
// (or it is a relative path and those are allowed) — a javascript:/data: url, hallucinated or
// injected, must never become clickable script execution through dangerouslySetInnerHTML.
const isAllowedUrl = (url: string, options: LinkOptions): boolean => {
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme) {
    return options.allowRelative && url.startsWith('/');
  }
  return !BLOCKED_LINK_PROTOCOLS.includes(scheme) && options.allowedProtocols.includes(scheme);
};

// Strips characters that could break out of the quoted attribute or the CSS declaration.
const sanitizeCssValue = (value: string): string => value.replace(/["'<>;{}]/g, '');

const renderLink = (label: string, url: string, options: LinkOptions): string => {
  const styles = [`text-decoration:${options.underline ? 'underline' : 'none'}`];
  if (options.color) {
    styles.push(`color:${sanitizeCssValue(options.color)}`);
  }
  const target = options.openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
  // Any double quote is escaped so the url can't break out of the href attribute.
  return `<a href="${url.replaceAll('"', '&quot;')}"${target} style="${styles.join(';')}">${label}</a>`;
};

export const processMessageForDisplay = (message: string, linkOptions: LinkOptions = DEFAULT_LINK_OPTIONS): string => {
  const formatted = message
    // quick sanitization
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    // bold texts wrapped **like this**
    .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replaceAll(/\n/g, '<br>');
  if (!linkOptions.enabled) {
    return formatted;
  }
  // markdown-style links [label](url); a url that isn't allowed stays as inert literal text.
  return formatted.replaceAll(/\[([^\]]+)]\(([^)\s]+)\)/g, (match, label: string, url: string): string => (
    isAllowedUrl(url, linkOptions) ? renderLink(label, url, linkOptions) : match
  ));
};
