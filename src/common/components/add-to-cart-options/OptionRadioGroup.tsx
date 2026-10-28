import { cn } from '@heroui/theme';
import { type FC, useRef } from 'react';
import { handleRadioKeyDown, type OptionControlProps } from './option-control-props';
import { FOCUS_VISIBLE_CLASSES } from '../../constants';

const OptionRadioGroup: FC<OptionControlProps> = ({ label, values, value, onChange, selectedStyle }) => {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabbableIndex = value !== undefined && values.includes(value) ? values.indexOf(value) : 0;

  return (
    <div role='radiogroup' aria-label={label} className='wigmix-add-to-cart-option-radio flex flex-wrap gap-x-4 gap-y-2'>
      {values.map((optionValue, index) => {
        const isSelected = optionValue === value;
        return (
          <button
            key={optionValue}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            type='button'
            role='radio'
            aria-checked={isSelected}
            tabIndex={index === tabbableIndex ? 0 : -1}
            className={cn(
              'wigmix-add-to-cart-option-radio-value group flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent p-0 text-sm',
              FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => onChange(optionValue)}
            onKeyDown={(event) => handleRadioKeyDown(event, values, value, onChange, (i) => optionRefs.current[i]?.focus())}
          >
            {/* HeroUI radio look: grey ring that takes the selected colour, with an animated inner dot. */}
            <span
              aria-hidden='true'
              className={cn(
                'flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                !isSelected && 'border-gray-300 group-hover:border-gray-500 dark:border-neutral-600',
              )}
              style={isSelected ? { borderColor: selectedStyle.backgroundColor || 'currentColor' } : undefined}
            >
              <span
                className={cn('size-2.5 rounded-full transition-transform duration-200', isSelected ? 'scale-100' : 'scale-0')}
                style={{ backgroundColor: selectedStyle.backgroundColor || 'currentColor' }}
              />
            </span>
            {optionValue}
          </button>
        );
      })}
    </div>
  );
};

export default OptionRadioGroup;
