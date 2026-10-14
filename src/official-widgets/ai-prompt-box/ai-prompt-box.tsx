import { type FC, useContext, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import AiPromptBoxHeader from './components/AiPromptBoxHeader';
import AiPromptBoxInput from './components/AiPromptBoxInput';
import ChatDrawerScreen from './components/ChatDrawerScreen';
import SuggestedQuestions from './components/SuggestedQuestions';
import useChat from '../../common/components/chat/use-chat';
import useBreakpoint from '../../common/components/hooks/use-breakpoint';
import ViSenzeModal from '../../common/components/modal/visenze-modal';
import { RootContext } from '../../common/components/shadow-wrapper';
import { WidgetDataContext } from '../../common/types/contexts';

const DEFAULT_MAX_SUGGESTIONS = 5;
const DEFAULT_FIND_SIMILAR_MESSAGE = 'find similar products';

export interface AiPromptBoxProps {
  // Optional: without it, chat requests carry no product context, the conversation is stored per
  // placement instead of per product, and the Find Similar button is hidden.
  productId?: string;
  // Test-only escape hatch, threaded to FullScreenChatContainer (Portal + Shadow DOM is hard to
  // query in RTL/jsdom); never set in production.
  renderWithoutPortal?: boolean;
}

const AiPromptBox: FC<AiPromptBoxProps> = ({ productId, renderWithoutPortal }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { appSettings, customizations } = widgetConfig;
  const root = useContext(RootContext);
  const intl = useIntl();
  const breakpoint = useBreakpoint();
  const dialogTitleId = `wigmix-ai-prompt-box-title-${appSettings.placementId}`;

  // One session for the panel and the chat drawer. pid → the backend gets product
  // context; sessionScopeKey → one stored conversation per product.
  const chat = useChat({
    pid: productId || undefined,
    sessionScopeKey: productId || undefined,
    persistChatEnabled: customizations.aiPromptBox?.restoreChat !== false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  // A restored conversation is one click away behind the maximize icon.
  const hasConversation = chat.chats.length > 0;

  // Same open/reopen-on-mount handshake as embedded-shopping-assistant: resume a persisted
  // session if one was restored, otherwise start a fresh one. Needed so allowUserInput turns on.
  useEffect(() => {
    if (chat.getChatId()) {
      chat.reopen();
    } else {
      chat.open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!root) return <></>;

  const suggestedQuestions = customizations.aiPromptBox?.suggestedQuestions ?? [];

  // Every way of asking something (chip, typed message, Find Similar) goes through here: the message is
  // sent and the chat drawer opens on the same conversation.
  const send = (message: string): void => {
    chat.sendMessage(message);
    setIsMaximized(true);
  };
  const titleIcon = customizations.aiPromptBox?.titleIcon;
  const findSimilarConfig = customizations.aiPromptBox?.findSimilar;
  const findSimilarMessage = findSimilarConfig?.message?.trim() || DEFAULT_FIND_SIMILAR_MESSAGE;
  const configuredTitle = customizations.aiPromptBox?.title?.trim();
  const title = configuredTitle || intl.formatMessage({ id: 'aiPromptBoxTitle' });
  // The drawer header: the title if there is one, otherwise its own configurable text.
  const drawerTitle = configuredTitle || customizations.aiPromptBox?.chatTitle?.trim() || title;
  const message = customizations.aiPromptBox?.message?.trim();
  const inputIcon = customizations.aiPromptBox?.inputIcon;
  const iconColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) || undefined;
  const backgroundColor = (darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor) || undefined;
  // Inverted accent (dark button, light text in the default theme) unless aiPromptBox.buttonColors
  // says otherwise; shared by the send and Find Similar buttons so they always match.
  const buttonColors = customizations.aiPromptBox?.buttonColors;
  const accentButtonStyle = {
    backgroundColor: (darkMode ? buttonColors?.backgroundColorDark : buttonColors?.backgroundColor) || iconColor,
    color: (darkMode ? buttonColors?.fontColorDark : buttonColors?.fontColor) || backgroundColor,
  };
  const borderColor = (darkMode ? customizations.generalLayout?.border?.colorDark : customizations.generalLayout?.border?.color) || undefined;

  return (
    <section
      aria-label={title}
      className='flex w-full flex-col rounded-md border-2'
      style={{ backgroundColor, borderColor, color: iconColor, fontFamily: customizations.generalLayout?.fontFamily || undefined }}
    >
      <AiPromptBoxHeader
        title={title}
        maximizeLabel={intl.formatMessage({ id: 'a11yMaximizeChat' })}
        onMaximize={() => setIsMaximized(true)}
        showMaximize={hasConversation}
        showNewChat={hasConversation}
        newChatLabel={intl.formatMessage({ id: 'a11yStartNewChat' })}
        onNewChat={chat.newChat}
        iconColor={iconColor}
        logoUrl={titleIcon?.url}
        logoColor={darkMode ? titleIcon?.colorDark : titleIcon?.color}
        logoHeight={titleIcon?.height}
        logoWidth={titleIcon?.width}
        // A logo with no configured title stands on its own; with a title, the two sit side by side.
        layout={titleIcon?.layout || (titleIcon?.url && !configuredTitle ? 'ICON' : undefined)}
      />

      {message && (
        <p data-testid='ai-prompt-box-message' className='m-0 px-3 pt-3 text-xs font-medium text-neutral-500 dark:text-neutral-400'>{message}</p>
      )}

      <SuggestedQuestions
        questions={suggestedQuestions}
        maxVisible={customizations.aiPromptBox?.maxSuggestedQuestions ?? DEFAULT_MAX_SUGGESTIONS}
        accentColor={iconColor}
        disabled={!chat.allowUserInput}
        onSelect={send}
        ariaLabel={intl.formatMessage({ id: 'a11ySuggestedReplies' })}
      />

      <AiPromptBoxInput
        value={chat.message}
        onChange={chat.setMessage}
        onSend={() => send(chat.message)}
        disabled={!chat.allowUserInput}
        placeholder={intl.formatMessage({ id: 'aiPromptBoxPlaceholder' })}
        ariaLabel={intl.formatMessage({ id: 'a11yChatInput' })}
        sendLabel={intl.formatMessage({ id: 'a11ySendMessage' })}
        inputRef={inputRef}
        buttonStyle={accentButtonStyle}
        icon={inputIcon && { ...inputIcon, color: darkMode ? inputIcon.colorDark : inputIcon.color }}
        findSimilar={findSimilarConfig?.enabled && productId ? {
          label: findSimilarConfig.label?.trim() || intl.formatMessage({ id: 'aiPromptBoxFindSimilar' }),
          onClick: () => send(findSimilarMessage),
          style: accentButtonStyle,
        } : undefined}
      />

      <ViSenzeModal
        open={isMaximized}
        layout={breakpoint}
        // Deliberately NOT chat.close(): that aborts the in-flight stream, and reopening the drawer
        // continues the very same conversation.
        onClose={() => setIsMaximized(false)}
        position={customizations.aiPromptBox?.chatPosition || 'right'}
        darkMode={darkMode}
        fontFamily={customizations.generalLayout?.fontFamily}
        placementId={`${appSettings.placementId}`}
        idSuffix='ai-prompt-box'
        ariaLabelledBy={dialogTitleId}
        renderWithoutPortal={!!renderWithoutPortal}
      >
        <ChatDrawerScreen
          chat={chat}
          chatInputRef={chatInputRef}
          title={drawerTitle}
          titleId={dialogTitleId}
          onClose={() => setIsMaximized(false)}
          iconColor={iconColor}
          backgroundColor={backgroundColor}
        />
      </ViSenzeModal>
    </section>
  );
};

export default AiPromptBox;
