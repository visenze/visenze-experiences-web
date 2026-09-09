import { cn } from '@heroui/theme';
import type { ReactElement, Ref } from 'react';
import { forwardRef } from 'react';
import useDraggableCorner, { type FloatingCorner } from '../../../common/components/hooks/use-draggable-corner';
import CustomizableIcon from '../../../common/icons/CustomizableIcon';
import type { WidgetConfig } from '../../../common/wigmix-core';

const BUTTON_SIZE = { width: 56, height: 56 };

export interface FloatingLauncherButtonProps {
  config: WidgetConfig['customizations']['popup'];
  text: string;
  darkMode: boolean;
  onClick: () => void;
  defaultIcon: ReactElement;
  corner: FloatingCorner;
  onCornerChange: (corner: FloatingCorner) => void;
}

const FloatingLauncherButton = forwardRef<HTMLButtonElement, FloatingLauncherButtonProps>(
  ({ config, text, darkMode, onClick, defaultIcon, corner, onCornerChange }, ref: Ref<HTMLButtonElement>): ReactElement | null => {
    const drag = useDraggableCorner({ corner, onCornerChange, size: BUTTON_SIZE });

    if (config?.triggerIcon?.hide) {
      return null;
    }
    return (
      <button
        ref={ref}
        type='button'
        className={cn('wigmix-floating-launcher-button z-[9999] flex size-14 items-center justify-center rounded-full shadow-lg')}
        style={{
          ...drag.style,
          backgroundColor: darkMode
            ? config?.triggerIcon?.backgroundColorDark || '#000000'
            : config?.triggerIcon?.backgroundColor || '#000000',
        }}
        aria-label={text}
        data-testid='wigmix-floating-launcher-button'
        onClick={() => {
          if (drag.consumeDragFlag()) {
            return;
          }
          onClick();
        }}
        {...drag.dragHandlers}
      >
        {config?.triggerIcon?.url ? (
          <CustomizableIcon
            height={28}
            width={28}
            url={config.triggerIcon.url}
            color={darkMode ? config.triggerIcon.colorDark || '' : config.triggerIcon.color || ''}
            className='wigmix-popup-trigger-icon custom'
          />
        ) : defaultIcon}
      </button>
    );
  },
);

export default FloatingLauncherButton;
