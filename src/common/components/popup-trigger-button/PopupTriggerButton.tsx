import { cn } from '@heroui/theme';
import type { ReactElement, Ref } from 'react';
import { forwardRef } from 'react';
import CustomizableIcon from '../../icons/CustomizableIcon';
import type { WidgetConfig } from '../../wigmix-core';
import EntryLogo from '../entry-logo/EntryLogo';

interface PopupTriggerButtonProps {
  config: WidgetConfig['customizations']['popup'];
  text: string;
  darkMode: boolean;
  onClick: (event: any) => void;
  defaultIcon: ReactElement;
  // Renders a configured `triggerIcon.url` as a brand logo at its natural aspect ratio (honouring
  // `height`/`width`/`padding`) instead of a fixed 24x24 icon.
  brandLogo?: boolean;
}

const PopupTriggerButton = forwardRef<HTMLButtonElement, PopupTriggerButtonProps>(({ config, text, darkMode, onClick, defaultIcon, brandLogo }, ref: Ref<HTMLButtonElement>) => {
  let fontColor = config?.triggerIcon?.color;
  if (!fontColor || fontColor === 'DEFAULT_ICON_COLOR') {
    fontColor = config?.triggerIcon?.fontColor || 'inherit';
  }
  let fontColorDark = config?.triggerIcon?.colorDark;
  if (!fontColorDark || fontColorDark === 'DEFAULT_ICON_COLOR') {
    fontColorDark = config?.triggerIcon?.fontColorDark || 'inherit';
  }
  const iconColor = darkMode ? config?.triggerIcon?.colorDark || '' : config?.triggerIcon?.color || '';
  // Configured padding overrides the button's default inset, only when a logo is shown.
  const isLogoShown = brandLogo && !!config?.triggerIcon?.url && config.triggerIcon.layout !== 'TEXT';
  const logoPadding = isLogoShown ? config?.triggerIcon?.padding : undefined;
  return (<>
    {!config?.triggerIcon?.hide && (
      <button
        ref={ref}
        type='button'
        className={cn(
            'wigmix-popup-trigger-button flex items-center gap-2 py-1 rounded-md',
            config?.triggerIcon?.layout === 'ICON' ? 'px-1' : 'px-2',
        )}
        style={{
          backgroundColor: darkMode
              ? config?.triggerIcon?.backgroundColorDark || 'transparent'
              : config?.triggerIcon?.backgroundColor || 'transparent',
          paddingLeft: logoPadding?.x,
          paddingRight: logoPadding?.x,
          paddingTop: logoPadding?.y,
          paddingBottom: logoPadding?.y,
        }}
        aria-label={text}
        data-testid='wigmix-popup-trigger-button'
        onClick={onClick}
      >
        {config?.triggerIcon?.layout === 'TEXT_ICON' && (
          <span className='wigmix-popup-trigger-text'
                style={{ color: darkMode ? fontColorDark : fontColor }}>{text}</span>
        )}
        {config?.triggerIcon?.layout !== 'TEXT' && (
          <>
            {isLogoShown && config?.triggerIcon?.url && (
              <EntryLogo
                url={config.triggerIcon.url}
                color={iconColor}
                height={config.triggerIcon.height || 24}
                width={config.triggerIcon.width}
                className={cn('wigmix-popup-trigger-icon custom object-contain', !config.triggerIcon.width && 'w-auto max-w-[240px]')}
              />
            )}
            {!brandLogo && config?.triggerIcon?.url && (
              <CustomizableIcon
                height={24}
                width={24}
                url={config.triggerIcon.url}
                color={iconColor}
                className='wigmix-popup-trigger-icon custom'
              />
            )}
            {!config?.triggerIcon?.url && defaultIcon}
          </>
        )}
        {(config?.triggerIcon?.layout === 'TEXT' || config?.triggerIcon?.layout === 'ICON_TEXT') && (
          <span className='wigmix-popup-trigger-text'
                style={{ color: darkMode ? fontColorDark : fontColor }}>{text}</span>
        )}
      </button>
    )}
  </>);
});

export default PopupTriggerButton;
