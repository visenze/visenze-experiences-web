import { cn } from '@heroui/theme';
import type { FC } from 'react';
import type { TitleLayout } from './PromptBoxHeader';
import EntryLogo from '../../../common/components/entry-logo/EntryLogo';

interface ChatTitleProps {
  text: string;
  // `aiAssistant.chatTitleIcon`: without a url this is just the text.
  logoUrl?: string;
  logoColor?: string;
  logoHeight?: number;
  logoWidth?: number;
  layout?: TitleLayout;
  // `aiAssistant.chatTitleFontSize`, in px; unset keeps the container's own size.
  fontSize?: number;
}

const DEFAULT_LOGO_HEIGHT = 24;

// The content of the chat header's <h2>, for both the drawer and the full screen: the title text with the
// configured logo before/after it. The text stays in the DOM (visually hidden for a logo-only layout) so the
// dialog keeps its accessible name.
const ChatTitle: FC<ChatTitleProps> = ({ text, logoUrl, logoColor, logoHeight, logoWidth, layout, fontSize }) => {
  const textStyle = fontSize ? { fontSize: `${fontSize}px` } : undefined;
  if (!logoUrl) {
    return textStyle ? <span style={textStyle}>{text}</span> : <>{text}</>;
  }
  const resolvedLayout: TitleLayout = layout || 'ICON_TEXT';
  const showIcon = resolvedLayout !== 'TEXT';
  const showText = resolvedLayout !== 'ICON';
  const icon = showIcon && (
    <EntryLogo
      url={logoUrl}
      color={logoColor}
      height={logoHeight || DEFAULT_LOGO_HEIGHT}
      width={logoWidth}
      className={cn('object-contain', !logoWidth && 'w-auto max-w-[240px]')}
    />
  );
  const label = <span className={cn(!showText && 'sr-only')} style={textStyle}>{text}</span>;
  const iconFirst = resolvedLayout !== 'TEXT_ICON';
  return (
    <>
      {iconFirst && icon}
      {label}
      {!iconFirst && icon}
    </>
  );
};

export default ChatTitle;
