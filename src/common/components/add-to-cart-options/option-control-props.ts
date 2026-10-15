import type { CSSProperties, KeyboardEvent } from 'react';

export interface OptionControlProps {
  label: string;
  values: string[];
  value: string | undefined;
  onChange: (value: string) => void;
  // Colours for the selected value (taken from the add-to-cart button colours).
  selectedStyle: CSSProperties;
}

// Radio-group keyboard pattern shared by the carousel and radio layouts: arrow keys move the
// selection to the previous/next value and focus it.
export const handleRadioKeyDown = (
  event: KeyboardEvent<HTMLElement>,
  values: string[],
  value: string | undefined,
  onChange: (value: string) => void,
  focusValue: (index: number) => void,
): void => {
  const isNext = event.key === 'ArrowRight' || event.key === 'ArrowDown';
  const isPrev = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
  if (!isNext && !isPrev) {
    return;
  }
  event.preventDefault();
  const currentIndex = value === undefined ? -1 : values.indexOf(value);
  const nextIndex = isNext
    ? (currentIndex + 1) % values.length
    : (currentIndex - 1 + values.length) % values.length;
  onChange(values[nextIndex]);
  focusValue(nextIndex);
};
