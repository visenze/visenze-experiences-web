import { cn } from '@heroui/theme';
import type { FC, ReactElement } from 'react';
import CustomizableIcon from '../../icons/CustomizableIcon';
import type { WidgetConfig } from '../../wigmix-core';

interface AddToCartButtonProps {
  config: WidgetConfig['customizations']['productCard'];
  text: string;
  darkMode: boolean;
  onClick: (event: any) => void;
  defaultIcon: ReactElement;
  isAddingToCart: boolean;
}

const AddToCartButton: FC<AddToCartButtonProps> = ({ config, text, darkMode, onClick, defaultIcon, isAddingToCart }) => {
  let fontColor = config?.addToCart?.color;
  if (!fontColor || fontColor === 'DEFAULT_ICON_COLOR') {
    fontColor = config?.addToCart?.fontColor || 'inherit';
  }
  let fontColorDark = config?.addToCart?.colorDark;
  if (!fontColorDark || fontColorDark === 'DEFAULT_ICON_COLOR') {
    fontColorDark = config?.addToCart?.fontColorDark || 'inherit';
  }
  return (<>
    {config?.addToCart?.enable && (
      <button
        className={cn(
            'wigmix-add-to-cart-button flex w-full justify-center items-center cursor-pointer gap-2 mt-2 p-1 min-h-8',
        )}
        style={{
          backgroundColor: darkMode
              ? config?.addToCart?.backgroundColorDark || 'transparent'
              : config?.addToCart?.backgroundColor || 'transparent',
        }}
        data-testid='wigmix-add-to-cart-button'
        onClick={onClick}
      >
        {isAddingToCart ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={`loading-dot-${i}`}
                   style={{
                     backgroundColor: darkMode
                         ? config?.addToCart?.colorDark || 'transparent'
                         : config?.addToCart?.color || 'transparent',
                   }}
                   className='loading-dot rounded-full' />
            ))}
          </>
        ) : (
          <>
            {config?.addToCart?.layout === 'TEXT_ICON' && (
                <span className='wigmix-add-to-cart-text'
                      style={{ color: darkMode ? fontColorDark : fontColor }}>{text}</span>
            )}
            {config?.addToCart?.layout !== 'TEXT' && (
                <>
                  {config?.addToCart?.url ? (
                      <CustomizableIcon
                          height={24}
                          width={24}
                          url={config.addToCart.url}
                          color={darkMode
                              ? config.addToCart.colorDark || ''
                              : config.addToCart.color || ''}
                          className='wigmix-add-to-cart-icon custom'
                      />
                  ) : defaultIcon}
                </>
            )}
            {(config?.addToCart?.layout === 'TEXT' || config?.addToCart?.layout === 'ICON_TEXT') && (
                <span className='wigmix-add-to-cart-text'
                      style={{ color: darkMode ? fontColorDark : fontColor }}>{text}</span>
            )}
          </>
        )}
      </button>
    )}
  </>);
};

export default AddToCartButton;
