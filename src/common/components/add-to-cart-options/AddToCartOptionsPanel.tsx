import { cn } from '@heroui/theme';
import { type CSSProperties, type FC, useContext, useEffect, useId, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  getInitialSelection, isSelectionComplete, type ResolvedOptionField, stripTrailingProductCode,
} from './add-to-cart-options';
import OptionCarousel from './OptionCarousel';
import OptionDropdown from './OptionDropdown';
import OptionRadioGroup from './OptionRadioGroup';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';
import CartIcon from '../../icons/CartIcon';
import CloseIcon from '../../icons/CloseIcon';
import { WidgetDataContext } from '../../types/contexts';
import type { ProcessedProduct } from '../../types/product';
import type { WidgetConfig } from '../../wigmix-core';
import AddToCartButton from '../product-card/AddToCartButton';

interface AddToCartOptionsPanelProps {
  productTitle: string;
  // Used to recognise a product code at the end of the title (see stripTrailingProductCode).
  product?: ProcessedProduct;
  fields: ResolvedOptionField[];
  onConfirm: (selectedOptions: Record<string, string>) => Promise<void>;
  // Close button and Escape.
  onClose: () => void;
}

const AddToCartOptionsPanel: FC<AddToCartOptionsPanelProps> = ({ productTitle, product, fields, onConfirm, onClose }) => {
  const intl = useIntl();
  const { widgetConfig, darkMode } = useContext(WidgetDataContext);
  const { customizations } = widgetConfig;
  const addToCartConfig = customizations.productCard?.addToCart;
  const promptId = useId();
  const [selection, setSelection] = useState<Record<string, string>>(() => getInitialSelection(fields));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelection(getInitialSelection(fields));
  }, [fields]);

  const selectedStyle: CSSProperties = {
    backgroundColor: (darkMode ? addToCartConfig?.backgroundColorDark : addToCartConfig?.backgroundColor) || '#000000',
    color: (darkMode ? addToCartConfig?.colorDark : addToCartConfig?.color) || '#FFFFFF',
  };
  const isComplete = isSelectionComplete(fields, selection);

  const handleConfirm = async (): Promise<void> => {
    if (!isComplete || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(fields.reduce<Record<string, string>>((selected, field) => {
        selected[field.key] = selection[field.key];
        return selected;
      }, {}));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderControl = (field: ResolvedOptionField): JSX.Element => {
    const controlProps = {
      label: field.label,
      values: field.values,
      value: selection[field.key],
      onChange: (value: string): void => setSelection((prev) => ({ ...prev, [field.key]: value })),
    };
    switch (field.layout) {
      case 'CAROUSEL':
        return <OptionCarousel {...controlProps} selectedStyle={selectedStyle} />;
      case 'RADIO':
        return <OptionRadioGroup {...controlProps} selectedStyle={selectedStyle} />;
      default:
        return <OptionDropdown {...controlProps} />;
    }
  };

  return (
    <div
      role='group'
      aria-labelledby={promptId}
      data-testid='wigmix-add-to-cart-options'
      className='wigmix-add-to-cart-options flex flex-col gap-3 text-sm'
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className='flex items-start gap-2'>
        <p id={promptId} className='wigmix-add-to-cart-options-prompt m-0 flex-1'>
          {intl.formatMessage({ id: 'addToCartOptionsPrompt' }, { product: stripTrailingProductCode(productTitle, product) })}
        </p>
        <button
          type='button'
          aria-label={intl.formatMessage({ id: 'addToCartOptionsClose' })}
          className={cn('wigmix-add-to-cart-options-close border-0 bg-transparent p-0 text-base leading-none cursor-pointer', FOCUS_VISIBLE_CLASSES)}
          onClick={onClose}
        >
          <CloseIcon className='size-5' />
        </button>
      </div>
      {fields.map((field) => (
        <div key={field.key} className='wigmix-add-to-cart-option flex flex-col gap-1'>
          <span className='wigmix-add-to-cart-option-label text-sm font-medium'>{field.label}</span>
          {renderControl(field)}
        </div>
      ))}
      {/* Same Add to Cart button as the product card (colours, icon, text, loading dots), on the right. */}
      <AddToCartButton
        // Always shown here, even if the product card hides its own button (e.g. AI-triggered adds).
        config={{ ...customizations.productCard, addToCart: { ...addToCartConfig, enable: true } } as WidgetConfig['customizations']['productCard']}
        text={intl.formatMessage({ id: 'addToCart' })}
        darkMode={darkMode}
        onClick={handleConfirm}
        isAddingToCart={isSubmitting}
        disabled={!isComplete || isSubmitting}
        testId='wigmix-add-to-cart-options-confirm'
        className={cn('wigmix-add-to-cart-options-confirm ml-auto w-fit px-4', FOCUS_VISIBLE_CLASSES)}
        defaultIcon={(
          <CartIcon
            color={(darkMode ? addToCartConfig?.colorDark : addToCartConfig?.color) || ''}
            className='wigmix-add-to-cart-icon default size-6'
          />
        )}
      />
    </div>
  );
};

export default AddToCartOptionsPanel;
