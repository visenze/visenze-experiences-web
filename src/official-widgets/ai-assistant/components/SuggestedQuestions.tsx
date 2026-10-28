import type { FC } from 'react';

interface SuggestedQuestionsProps {
  questions: string[];
  // Only the first `maxVisible` questions are rendered.
  maxVisible: number;
  // Text/border color of the chips, so they pick up the widget's accent (generalLayout.fontColor).
  accentColor?: string;
  disabled: boolean;
  onSelect: (question: string) => void;
  ariaLabel: string;
}

const SuggestedQuestions: FC<SuggestedQuestionsProps> = ({ questions, maxVisible, accentColor, disabled, onSelect, ariaLabel }) => {
  const visibleQuestions = questions.slice(0, Math.max(0, maxVisible));
  if (!visibleQuestions.length) {
    return <></>;
  }
  return (
    <div role='group' aria-label={ariaLabel} className='flex flex-wrap items-start gap-1.5 px-3 pb-2 pt-3'>
      {visibleQuestions.map((question) => (
        <button
          key={question}
          type='button'
          disabled={disabled}
          onClick={() => onSelect(question)}
          className={[
            'max-w-full rounded-full border bg-transparent px-2.5 py-1 text-left text-[11px] font-medium leading-tight',
            'transition-opacity hover:opacity-80 disabled:opacity-50',
          ].join(' ')}
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {question}
        </button>
      ))}
    </div>
  );
};

export default SuggestedQuestions;
