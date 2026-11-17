import { cn } from '@heroui/theme';
import type { CSSProperties, FC, KeyboardEvent, ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type DockSide, getDockTransitionMs } from '../hooks/use-docked-page-push';
import Portal from '../portal';
import ShadowWrapper from '../shadow-wrapper';

interface DockedPanelProps {
  open: boolean;
  onClose: () => void;
  side: DockSide;
  /** Panel width in px. The page offset (useDockedPagePush) must use the same value. */
  width: number;
  children: ReactElement;
  placementId: string;
  darkMode: boolean;
  fontFamily: string;
  renderWithoutPortal: boolean;
  /** Id of the element (the panel's title) that labels it. */
  ariaLabelledBy?: string;
  idSuffix?: string;
  className?: string;
  /** True when the page could not be pushed aside and the panel sits over its edge (see useDockedPagePush). */
  overlay?: boolean;
  /** Stacking order of the panel. Defaults to 13000, the same as the modal. */
  zIndex?: number;
}

interface PanelProps extends Pick<DockedPanelProps, 'open' | 'onClose' | 'side' | 'width' | 'children' | 'ariaLabelledBy' | 'className' | 'overlay' | 'zIndex'> {}

const Panel: FC<PanelProps> = ({ open, onClose, side, width, children, ariaLabelledBy, className, overlay, zIndex }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // `mounted` outlives `open` by the animation length so the panel can slide out; `shown` is the slid-in state.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), getDockTransitionMs());
    return (): void => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open && mounted) {
      // Flush the off-screen starting position before switching to the final one, or the browser would skip
      // the transition and show the panel already in place.
      panelRef.current?.getBoundingClientRect();
      setShown(true);
    }
  }, [open, mounted]);

  // Capture phase: the chat input is a react-aria text field, which stops propagation of the keys it handles, so
  // a bubbling listener on the panel would never see Escape typed while the input (the auto-focused element) has focus.
  const handleKeyDownCapture = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape') {
      return;
    }
    // Nested layers keep their own Escape: a dialog inside the panel (the camera drawer) or the composer's
    // "Add image" menu (aria-expanded) closes first; only an Escape nothing inside is using closes the panel.
    const panel = event.currentTarget;
    const insideNestedDialog = event.nativeEvent.composedPath().some((node) => node !== panel && node instanceof HTMLElement && node.getAttribute('role') === 'dialog');
    if (insideNestedDialog || panel.querySelector('[aria-expanded="true"]')) {
      return;
    }
    onClose();
  }, [onClose]);

  if (!mounted) {
    return <></>;
  }

  const duration = getDockTransitionMs();

  const style: CSSProperties = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: `${width}px`,
    maxWidth: '100vw',
    boxSizing: 'border-box',
    overflow: 'hidden',
    transform: shown ? 'translateX(0)' : `translateX(${side === 'left' ? '-100%' : '100%'})`,
    transition: `transform ${duration}ms ease`,
    // While sliding out the panel is on its way off screen and must not catch clicks meant for the page.
    pointerEvents: open ? undefined : 'none',
    zIndex,
    // Over the page (overlay fallback) it needs a clearer edge than when it sits beside it.
    boxShadow: `${side === 'left' ? '' : '-'}${overlay ? '4px 0 24px rgba(0, 0, 0, 0.24)' : '2px 0 12px rgba(0, 0, 0, 0.12)'}`,
  };

  // A non-modal dialog: no `aria-modal`, no focus trap, and the rest of the page stays exposed to assistive
  // technology and keyboard users. Closed by Escape (while focus is inside) or its own close button, never by
  // an outside click, since the page beside it is meant to be used.
  return (
    <div
      ref={panelRef}
      role='dialog'
      data-wigmix-dock-ignore=''
      aria-labelledby={ariaLabelledBy}
      className={cn(`wigmix-docked-panel bg-primary text-primary wigmix-docked-panel-${side}`, overlay && 'wigmix-docked-panel-overlay', className)}
      style={style}
      onKeyDownCapture={handleKeyDownCapture}
    >
      {children}
    </div>
  );
};

/**
 * A side-by-side alternative to the modal: pins the chat to the left or right edge of the viewport, without a
 * backdrop, scroll lock, focus trap or aria-hidden on the page. It renders inside the widget's Shadow DOM like
 * the modal does, so styling, dark mode and fonts follow the same path. Making room for it is the job of
 * `useDockedPagePush`, which the caller runs with the same `side` and `width`.
 */
const DockedPanel: FC<DockedPanelProps> = (props) => {
  // Same escape hatch as ViSenzeModal, so the panel can be rendered inline in tests.
  if (props.renderWithoutPortal) {
    return <Panel {...props} />;
  }
  return (
    <Portal zIndex={props.zIndex} idName={`visenze-widget-docked-portal-${props.placementId}${props.idSuffix ? `-${props.idSuffix}` : ''}`}>
      <ShadowWrapper darkMode={props.darkMode} fontFamily={props.fontFamily}>
        <Panel {...props} />
      </ShadowWrapper>
    </Portal>
  );
};

export default DockedPanel;
