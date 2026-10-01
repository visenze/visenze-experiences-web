import { type FC, type ReactElement, useContext } from 'react';
import CustomizableIcon from '../../icons/CustomizableIcon';
import SparklesIcon from '../../icons/SparklesIcon';
import { WidgetDataContext } from '../../types/contexts';

// The assistant's avatar beside each chat answer: the configured `chatbot.botIcon` logo when set,
// otherwise the default sparkle icon.
const BotIcon: FC = (): ReactElement => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const botIcon = widgetConfig.customizations.chatbot?.botIcon;

  return (
    <div className='size-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden
      bg-gray-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'>
      {botIcon?.url ? (
        <CustomizableIcon
          url={botIcon.url}
          color={darkMode ? botIcon.colorDark : botIcon.color}
          className='size-5'
        />
      ) : (
        <SparklesIcon className='size-5' />
      )}
    </div>
  );
};

export default BotIcon;
