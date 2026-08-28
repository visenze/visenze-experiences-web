import { cn } from '@heroui/theme';
import { type FC, type ReactElement, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { BreadcrumbTurn } from '../../../common/components/chat/use-chat';
import { FOCUS_VISIBLE_CLASSES } from '../../../common/constants';
import MagnifyingGlassIcon from '../../../common/icons/MagnifyingGlassIcon';

interface BreadcrumbTrailProps {
  breadcrumbs: BreadcrumbTurn[];
  activeBreadcrumbId: string | null;
  onSelect: (requestId: string) => void;
}

// Above KEEP_FIRST + KEEP_LAST turns, the middle range collapses behind a "more" chip rather than
// growing the trail unboundedly — keeps the first couple of searches (session context) and the
// most recent ones (what the user is actually navigating) always in view.
const KEEP_FIRST = 2;
const KEEP_LAST = 2;

// Pill tags rather than breadcrumb links: chevron-separated text reads as hierarchical navigation
// ("Home > Category > Product"), which misrepresents this trail — every entry is an independent
// past search, not a drill-down step. A pill per search plus a leading search icon signals "these
// are queries you've run" at a glance, and the active one gets a solid fill instead of relying on
// text color alone to show which result set is on screen.
// `truncate` (overflow-hidden + text-ellipsis + whitespace-nowrap) is applied on an inner block
// child, not on this flex container itself — text-overflow doesn't reliably clip text sitting
// directly inside a flex box, and the child additionally needs its own `min-w-0` to be allowed to
// shrink below the label's natural content width (flex items default to `min-width: auto`, which
// otherwise blows the pill past `max-w-40` for a long label instead of clipping it).
// Colors come from customizations.breadcrumbTrail.inactive (bg-/text-breadcrumbInactive, wired to
// --wigmix-background-breadcrumbInactive/--wigmix-text-breadcrumbInactive in initialization.ts) —
// the CSS variable's own value already swaps for dark mode, so no `dark:text-*`/`dark:bg-*`
// variant is needed here. Border and hover affordance stay a plain hardcoded neutral.
const CHIP_CLASSES = cn(
  'inline-flex min-h-[32px] max-w-40 min-w-0 shrink-0 items-center justify-center rounded-full border px-3 text-sm cursor-pointer',
  'border-neutral-300 bg-breadcrumbInactive text-breadcrumbInactive hover:bg-neutral-100 hover:text-neutral-800',
  'dark:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-100',
  FOCUS_VISIBLE_CLASSES,
);

// Colors come from customizations.breadcrumbTrail.active (bg-/text-breadcrumbActive, wired to
// --wigmix-background-breadcrumbActive/--wigmix-text-breadcrumbActive in initialization.ts) — the
// CSS variable's own value already swaps for dark mode, so no `dark:` variant is needed here.
const ACTIVE_CHIP_CLASSES = cn(
  'inline-flex min-h-[32px] max-w-40 min-w-0 shrink-0 items-center justify-center rounded-full border border-transparent px-3 text-sm font-semibold',
  'bg-breadcrumbActive text-breadcrumbActive',
);

const BreadcrumbChip: FC<{ crumb: BreadcrumbTurn; isActive: boolean; onSelect: (requestId: string) => void }> = ({
  crumb, isActive, onSelect,
}) => {
  const intl = useIntl();
  if (isActive) {
    return (
      <span title={crumb.label} className={ACTIVE_CHIP_CLASSES}>
        <span aria-current='true' className='block min-w-0 truncate'>{crumb.label}</span>
      </span>
    );
  }
  return (
    <button
      type='button'
      title={crumb.label}
      aria-label={intl.formatMessage({ id: 'a11ySelectResultSet' }, { label: crumb.label })}
      className={CHIP_CLASSES}
      onClick={() => onSelect(crumb.requestId)}
    >
      <span className='block min-w-0 truncate'>{crumb.label}</span>
    </button>
  );
};

const OverflowChip: FC<{ hidden: BreadcrumbTurn[]; onSelect: (requestId: string) => void }> = ({ hidden, onSelect }) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const closeMenu = (): void => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Standard ARIA-menu keyboard model (matches the role='menu'/'menuitem' this popover already
  // commits to): opening moves focus onto the first item, Up/Down/Home/End move between items,
  // and closing (however it happens) always returns focus to the trigger rather than dropping it
  // to <body> once the menuitem buttons unmount.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    itemRefs.current[0]?.focus();
    const handlePointerDown = (event: MouseEvent): void => {
      // This popover can render inside a Shadow DOM (FullScreenChatContainer), and this listener
      // lives on `document`, outside it — so `event.target` gets retargeted to the shadow host for
      // every click inside, including clicks on the menu's own items, closing the menu before its
      // onClick could fire. `composedPath()` isn't retargeted, so it still lists the real elements
      // the click passed through (mirrors ChatComposer.tsx's own image-menu outside-click check).
      const path = event.composedPath();
      if (containerRef.current && !path.includes(containerRef.current)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }
      const items = itemRefs.current.filter((item): item is HTMLButtonElement => !!item);
      if (!items.length) {
        return;
      }
      // document.activeElement doesn't pierce the Shadow DOM this widget renders in (it only
      // reports the shadow host) — reading it off the container's own root node (mirrors
      // FullScreenChatContainer.tsx/WebcamCapture.tsx) works in both contexts.
      const activeRoot = containerRef.current?.getRootNode() as Document | ShadowRoot | undefined;
      const currentIndex = items.indexOf(activeRoot?.activeElement as HTMLButtonElement);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[currentIndex < items.length - 1 ? currentIndex + 1 : 0].focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[currentIndex > 0 ? currentIndex - 1 : items.length - 1].focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0].focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1].focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div ref={containerRef} className='relative shrink-0'>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='menu'
        aria-expanded={isOpen}
        aria-label={intl.formatMessage({ id: 'a11yShowMoreBreadcrumbs' }, { count: hidden.length })}
        className={CHIP_CLASSES}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        •••
      </button>
      {isOpen && (
        <div
          role='menu'
          aria-label={intl.formatMessage({ id: 'a11yHiddenBreadcrumbs' })}
          className={cn(
            'absolute left-0 top-full z-10 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border py-1 shadow-lg',
            'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
          )}
        >
          {hidden.map((crumb, index) => (
            <button
              key={crumb.requestId}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type='button'
              role='menuitem'
              title={crumb.label}
              className={cn(
                'block w-full truncate border-0 bg-transparent px-3 py-2 text-left text-sm text-neutral-600 cursor-pointer',
                'hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100',
                FOCUS_VISIBLE_CLASSES,
              )}
              onClick={() => {
                closeMenu();
                onSelect(crumb.requestId);
              }}
            >
              {crumb.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BreadcrumbTrail: FC<BreadcrumbTrailProps> = ({ breadcrumbs, activeBreadcrumbId, onSelect }) => {
  const intl = useIntl();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateFades = (): void => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return undefined;
    }
    // Auto-scroll to the most recent search whenever the trail changes.
    el.scrollLeft = el.scrollWidth;
    updateFades();
    window.addEventListener('resize', updateFades);
    return (): void => window.removeEventListener('resize', updateFades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumbs]);

  if (!breadcrumbs.length) {
    return <></>;
  }

  // An image-only turn (no typed text) reaches here with an empty `label` — use-chat.ts derives
  // it straight from the message text, and there isn't one. Substituting a placeholder here,
  // once, keeps BreadcrumbChip/OverflowChip simple and covers both the visible-pill text and the
  // a11ySelectResultSet/title strings that read off `crumb.label`.
  const namedBreadcrumbs = breadcrumbs.map((crumb) => (
    crumb.label ? crumb : { ...crumb, label: intl.formatMessage({ id: 'imageSearchLabel' }) }
  ));

  const showOverflow = namedBreadcrumbs.length > KEEP_FIRST + KEEP_LAST;
  const visibleFirst = showOverflow ? namedBreadcrumbs.slice(0, KEEP_FIRST) : namedBreadcrumbs;
  const hiddenMiddle = showOverflow ? namedBreadcrumbs.slice(KEEP_FIRST, namedBreadcrumbs.length - KEEP_LAST) : [];
  const visibleLast = showOverflow ? namedBreadcrumbs.slice(namedBreadcrumbs.length - KEEP_LAST) : [];

  const items: { key: string; node: ReactElement }[] = [
    ...visibleFirst.map((crumb) => ({
      key: crumb.requestId,
      node: <BreadcrumbChip crumb={crumb} isActive={crumb.requestId === activeBreadcrumbId} onSelect={onSelect} />,
    })),
    ...(hiddenMiddle.length ? [{ key: 'overflow', node: <OverflowChip hidden={hiddenMiddle} onSelect={onSelect} /> }] : []),
    ...visibleLast.map((crumb) => ({
      key: crumb.requestId,
      node: <BreadcrumbChip crumb={crumb} isActive={crumb.requestId === activeBreadcrumbId} onSelect={onSelect} />,
    })),
  ];

  return (
    <nav aria-label={intl.formatMessage({ id: 'a11yBreadcrumbTrail' })} className='relative flex items-center gap-2 px-4 py-2'>
      <span aria-hidden='true' className='shrink-0'>
        <MagnifyingGlassIcon className='size-3.5 text-neutral-400 dark:text-neutral-500' />
      </span>
      <div className='relative min-w-0 flex-1'>
        {canScrollLeft && (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent dark:from-neutral-900'
          />
        )}
        <div ref={scrollRef} onScroll={updateFades} className='flex items-center gap-2 overflow-x-auto scroll-smooth'>
          {items.map((item) => (
            <span key={item.key} className='flex shrink-0 items-center'>
              {item.node}
            </span>
          ))}
        </div>
        {canScrollRight && (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-neutral-900'
          />
        )}
      </div>
    </nav>
  );
};

export default BreadcrumbTrail;
