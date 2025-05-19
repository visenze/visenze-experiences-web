import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';
import CustomizableIcon from '../../icons/CustomizableIcon';
import type { WidgetConfig } from '../../wigmix-core';

interface PopupTriggerButtonProps {
  config: WidgetConfig['customizations']['popup'];
  text: string;
  darkMode: boolean;
  onClick: (event: any) => void;
  defaultIcon: ReactElement;
}

const PopupTriggerButton: FC<PopupTriggerButtonProps> = ({ config, text, darkMode, onClick, defaultIcon }) => {
  let fontColor = config?.triggerIcon?.color;
  if (!fontColor || fontColor === 'DEFAULT_ICON_COLOR') {
    fontColor = config?.triggerIcon?.fontColor || 'inherit';
  }
  let fontColorDark = config?.triggerIcon?.colorDark;
  if (!fontColorDark || fontColorDark === 'DEFAULT_ICON_COLOR') {
    fontColorDark = config?.triggerIcon?.fontColorDark || 'inherit';
  }
  return (<>
    {!config?.triggerIcon?.hide && (
      <button
        className={cn(
            'wigmix-popup-trigger-button flex items-center gap-2 py-1 rounded-md',
            config?.triggerIcon?.layout === 'ICON' ? 'px-1' : 'px-2',
        )}
        style={{
          backgroundColor: darkMode
              ? config?.triggerIcon?.backgroundColorDark || 'transparent'
              : config?.triggerIcon?.backgroundColor || 'transparent',
        }}
        data-testid='wigmix-popup-trigger-button'
        onClick={onClick}
      >
        {config?.triggerIcon?.layout === 'TEXT_ICON' && (
          <span className='wigmix-popup-trigger-text'
                style={{ color: darkMode ? fontColorDark : fontColor }}>{text}</span>
        )}
        {config?.triggerIcon?.layout !== 'TEXT' && (
          <>
            {config?.triggerIcon?.url ? (
              <CustomizableIcon
                height={24}
                width={24}
                url={config.triggerIcon.url}
                color={darkMode
                    ? config.triggerIcon.colorDark || ''
                    : config.triggerIcon.color || ''}
                className='wigmix-popup-trigger-icon custom'
              />
            ) : defaultIcon}
          </>
        )}
        {(config?.triggerIcon?.layout === 'TEXT' || config?.triggerIcon?.layout === 'ICON_TEXT') && (
          <span className='wigmix-popup-trigger-text'
                style={{ color: darkMode ? fontColorDark : fontColor }}>{text}</span>
        )}
      </button>
    )}
  </>);
};

export default PopupTriggerButton;
