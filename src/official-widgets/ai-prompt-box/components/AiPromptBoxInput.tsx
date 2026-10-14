import { cn } from '@heroui/theme';
import type { CSSProperties, FC, RefObject } from 'react';
import EntryLogo from '../../../common/components/EntryLogo';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import SubmitChatIcon from '../../../common/icons/SubmitChatIcon';

const DEFAULT_ICON_HEIGHT = 20;

interface AiPromptBoxInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  ariaLabel: string;
  sendLabel: string;
  inputRef: RefObject<HTMLInputElement>;
  // Colors of the send button (shared with the Find Similar button).
  buttonStyle?: CSSProperties;
  // Optional icon shown inside the input, at its start.
  icon?: { url?: string; color?: string; height?: number; width?: number };
  // Optional action button beside the input (e.g. "Find Similar") that sends a canned message.
  findSimilar?: {
    label: string;
    onClick: () => void;
    style?: CSSProperties;
  };
}

const AiPromptBoxInput: FC<AiPromptBoxInputProps> = ({ value, onChange, onSend, disabled, placeholder, ariaLabel, sendLabel, inputRef, buttonStyle, icon, findSimilar }) => (
  <form
    className='flex items-center gap-2 p-3'
    onSubmit={(e) => {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend();
      }
    }}
  >
    {findSimilar && (
      <button
        type='button'
        disabled={disabled}
        onClick={findSimilar.onClick}
        className='flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border-0 px-3 text-xs font-medium disabled:opacity-50'
        style={findSimilar.style}
      >
        <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <rect x='8' y='8' width='13' height='13' rx='2' />
          <path d='M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3' />
        </svg>
        <span>{findSimilar.label}</span>
      </button>
    )}
    <div
      data-testid='ai-prompt-box-input-field'
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 rounded-md border border-neutral-300 bg-white py-1 pl-3 pr-1',
        'focus-within:ring-1 focus-within:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-800',
      )}
    >
      {icon?.url && (
        <span className='pointer-events-none flex shrink-0 items-center'>
          <EntryLogo url={icon.url} color={icon.color} height={icon.height || DEFAULT_ICON_HEIGHT} width={icon.width} className='object-contain' />
        </span>
      )}
      <input
        ref={inputRef}
        type='text'
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-neutral-900 outline-none',
          'placeholder:italic disabled:opacity-60 dark:text-neutral-100',
        )}
      />
      <button
        type='submit'
        aria-label={sendLabel}
        title={sendLabel}
        disabled={disabled || !value.trim()}
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-md border-0 p-1.5',
          'disabled:opacity-50 place-items-center',
          FOCUS_VISIBLE_CLASSES,
        )}
        style={buttonStyle}
      >
        <SubmitChatIcon className='size-4' color='currentColor' />
      </button>
    </div>
  </form>
);

export default AiPromptBoxInput;
