import { type FC, useContext } from 'react';
import { useIntl } from 'react-intl';
import { ensureOpen, useAssistantSession } from './assistant-session';
import type { EntryProps } from './entry-props';
import PopupTriggerButton from '../../../common/components/popup-trigger-button/PopupTriggerButton';
import { WidgetDataContext } from '../../../common/types/contexts';
import NewChatIcon from '../../shopping-assistant/icons/NewChatIcon';

// A trigger button (styled by customizations.popup, as in shopping-assistant) that shows the shared drawer.
const LauncherEntry: FC<EntryProps> = ({ productId }) => {
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const intl = useIntl();
  const { store } = useAssistantSession();

  // The default icon is tinted by popup.triggerIcon.color/colorDark; while those are unset (or DEFAULT_ICON_COLOR, which is
  // what keeps a logo untinted) it takes the chat's font colour.
  const tint = darkMode ? customizations.popup?.triggerIcon?.colorDark : customizations.popup?.triggerIcon?.color;
  const generalFontColor = darkMode ? customizations.generalLayout?.fontColorDark : customizations.generalLayout?.fontColor;
  const defaultIconColor = (tint && tint !== 'DEFAULT_ICON_COLOR' ? tint : generalFontColor) || undefined;

  const onClick = (): void => {
    // The element's own product id (none when data-pid is unset): a launcher ask replaces any product
    // context another entry left behind.
    store.setActiveEntry('launcher', productId);
    ensureOpen(store);
  };

  return (
    <PopupTriggerButton config={customizations.popup}
                        text={intl.formatMessage({ id: 'triggerCTA' })}
                        darkMode={darkMode}
                        onClick={onClick}
                        brandLogo
                        defaultIcon={
                          <NewChatIcon
                              color={defaultIconColor}
                              className='wigmix-popup-trigger-icon default size-6'
                          />
                        } />
  );
};

export default LauncherEntry;
