import { type FC, useContext, useRef } from 'react';
import { useIntl } from 'react-intl';
import PromptBoxHeader from './PromptBoxHeader';
import PromptBoxInput from './PromptBoxInput';
import SuggestedQuestions from './SuggestedQuestions';
import { WidgetDataContext } from '../../../common/types/contexts';

const DEFAULT_MAX_SUGGESTIONS = 5;
const DEFAULT_FIND_SIMILAR_MESSAGE = 'find similar products';

export interface PromptBoxPanelProps {
  productId?: string;
  message: string;
  setMessage: (m: string) => void;
  allowUserInput: boolean;
  hasConversation: boolean;
  onSend: (message: string) => void;
  onNewChat: () => void;
}

// Presentational prompt-box UI: title row, optional message, suggested-question chips and the input.
// It owns no chat session; the parent supplies state and handlers.
const PromptBoxPanel: FC<PromptBoxPanelProps> = ({
  productId, message, setMessage, allowUserInput, hasConversation, onSend, onNewChat,
}) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const inputRef = useRef<HTMLInputElement>(null);

  const promptBox = customizations.aiAssistant?.promptBox;
  const suggestedQuestions = promptBox?.suggestedQuestions ?? [];
  const titleIcon = promptBox?.titleIcon;
  const findSimilarConfig = promptBox?.findSimilar;
  const findSimilarMessage = findSimilarConfig?.message?.trim() || DEFAULT_FIND_SIMILAR_MESSAGE;
  const configuredTitle = promptBox?.title?.trim();
  const title = configuredTitle || intl.formatMessage({ id: 'promptBoxTitle' });
  const infoMessage = promptBox?.message?.trim();
  const inputIcon = promptBox?.inputIcon;
  const iconColor = (darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor) || undefined;
  const backgroundColor = (darkMode ? customizations.generalLayout?.backgroundColorDark : customizations.generalLayout?.backgroundColor) || undefined;
  // Inverted accent (dark button, light text in the default theme) unless aiAssistant.promptBox.buttonColors
  // says otherwise; shared by the send and Find Similar buttons so they always match.
  const buttonColors = promptBox?.buttonColors;
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
      <PromptBoxHeader
        title={title}
        showNewChat={hasConversation}
        newChatLabel={intl.formatMessage({ id: 'a11yStartNewChat' })}
        onNewChat={onNewChat}
        iconColor={iconColor}
        logoUrl={titleIcon?.url}
        logoColor={darkMode ? titleIcon?.colorDark : titleIcon?.color}
        logoHeight={titleIcon?.height}
        logoWidth={titleIcon?.width}
        // A logo with no configured title stands on its own; with a title, the two sit side by side.
        layout={titleIcon?.layout || (titleIcon?.url && !configuredTitle ? 'ICON' : undefined)}
      />

      {infoMessage && (
        <p data-testid='prompt-box-message' className='m-0 px-3 pt-3 text-xs font-medium text-neutral-600 dark:text-neutral-400'>{infoMessage}</p>
      )}

      <SuggestedQuestions
        questions={suggestedQuestions}
        maxVisible={promptBox?.maxSuggestedQuestions ?? DEFAULT_MAX_SUGGESTIONS}
        accentColor={iconColor}
        disabled={!allowUserInput}
        onSelect={onSend}
        ariaLabel={intl.formatMessage({ id: 'a11ySuggestedReplies' })}
      />

      <PromptBoxInput
        value={message}
        onChange={setMessage}
        onSend={() => onSend(message)}
        disabled={!allowUserInput}
        placeholder={intl.formatMessage({ id: 'promptBoxPlaceholder' })}
        ariaLabel={intl.formatMessage({ id: 'a11yChatInput' })}
        sendLabel={intl.formatMessage({ id: 'a11ySendMessage' })}
        inputRef={inputRef}
        buttonStyle={accentButtonStyle}
        icon={inputIcon && { ...inputIcon, color: darkMode ? inputIcon.colorDark : inputIcon.color }}
        findSimilar={findSimilarConfig?.enabled && productId ? {
          label: findSimilarConfig.label?.trim() || intl.formatMessage({ id: 'promptBoxFindSimilar' }),
          onClick: () => onSend(findSimilarMessage),
          style: accentButtonStyle,
        } : undefined}
      />
    </section>
  );
};

export default PromptBoxPanel;
