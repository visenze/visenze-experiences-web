import { cn } from '@heroui/theme';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import type { BreadcrumbTurn } from '../../../common/components/chat/use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';

interface BreadcrumbTrailProps {
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  onSelect: (requestId: string) => void;
}

const BreadcrumbTrail: FC<BreadcrumbTrailProps> = ({ breadcrumbs, activeBreadcrumbId, onSelect }) => {
  const intl = useIntl();
  if (!breadcrumbs.length) {
    return <></>;
  }
  return (
    <nav aria-label={intl.formatMessage({ id: 'a11yBreadcrumbTrail' })} className='flex flex-wrap items-center gap-1 px-4 py-2 text-sm'>
      {breadcrumbs.map((crumb, idx) => (
        <span key={crumb.requestId} className='flex items-center gap-1'>
          {idx > 0 && <span className='text-neutral-400 dark:text-neutral-600' aria-hidden='true'>&gt;</span>}
          <button
            type='button'
            aria-current={crumb.requestId === activeBreadcrumbId ? 'true' : undefined}
            aria-label={intl.formatMessage({ id: 'a11ySelectResultSet' }, { label: crumb.label })}
            className={cn(
                'min-h-[38px] rounded-md px-2 cursor-pointer bg-transparent border-0',
                crumb.requestId === activeBreadcrumbId
                  ? 'font-semibold text-blue-900 dark:text-blue-50'
                  : 'text-neutral-600 dark:text-neutral-400',
                FOCUS_VISIBLE_CLASSES,
            )}
            onClick={() => onSelect(crumb.requestId)}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </nav>
  );
};

export default BreadcrumbTrail;
