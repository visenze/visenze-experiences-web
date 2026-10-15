import type { FC } from 'react';
import { useIntl } from 'react-intl';
import type { OptionControlProps } from './option-control-props';
import OptionSelect from './OptionSelect';

// Drop-down layout used in the pop-up (see OptionSelect for why it isn't a HeroUI Select).
const OptionDropdown: FC<Omit<OptionControlProps, 'selectedStyle'>> = ({ label, values, value, onChange }) => {
  const intl = useIntl();

  // Nothing to choose: show the only value (already selected) without the drop-down arrow.
  if (values.length === 1) {
    return (
      <div
        className='wigmix-add-to-cart-option-dropdown wigmix-add-to-cart-option-single rounded-full bg-black/5 px-4 py-3 text-sm dark:bg-white/10'
        data-testid='wigmix-add-to-cart-option-single'
      >
        <span className='sr-only'>{`${label}: `}</span>
        {values[0]}
      </div>
    );
  }

  return (
    <div className='wigmix-add-to-cart-option-dropdown'>
      <OptionSelect
        label={label}
        values={values}
        value={value}
        onChange={onChange}
        placeholder={intl.formatMessage({ id: 'addToCartOptionsSelect' }, { label })}
      />
    </div>
  );
};

export default OptionDropdown;
