import { cn } from '@heroui/theme';
import type { CSSProperties, FC, MutableRefObject, ReactElement } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import ReactModal from 'react-modal';
import Portal from '../portal';
import ShadowWrapper, { RootContext } from '../shadow-wrapper';
import './modal.scss';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  layout: 'desktop' | 'tablet' | 'mobile' | 'nested_mobile';
  children: ReactElement | ReactElement[];
  className?: string;
  position: 'left' | 'center' | 'right' | 'bottom';
  variant?: 'panel' | 'floating-card';
  floatingSize?: { width: number; height: number };
  // When set, overrides the floating-card variant's static bottom/right CSS anchor with an
  // explicit pixel position — used to make the card draggable (see useDraggableCorner). Left
  // undefined wherever dragging isn't enabled (e.g. on mobile) so the existing CSS anchor applies.
  floatingPosition?: { top: number; left: number };
  isDraggingFloating?: boolean;
  portalRef?: MutableRefObject<HTMLDivElement | null>;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

const Modal: FC<ModalProps> = ({
  open, layout, children, onClose, className, position, variant = 'panel', floatingSize, floatingPosition, isDraggingFloating, portalRef,
  ariaLabel, ariaLabelledBy,
}) => {
  const root = useContext(RootContext);
  let timeout;
  switch (layout) {
    case 'desktop':
      timeout = 400;
      break;
    case 'mobile':
      timeout = 300;
      break;
    default:
      timeout = 0;
  }
  const [overflow, setOverflow] = useState<string>('');

  useEffect(() => {
    if (open) {
      setOverflow(document.body.style.overflow);
      document.body.style.overflow = 'hidden';
    } else if (layout !== 'nested_mobile') {
      document.body.style.overflow = overflow;
      setOverflow('');
    }
  }, [open]);

  if (!root) {
    return <></>;
  }

  const contentStyle: CSSProperties | undefined = variant === 'floating-card' && floatingSize
    ? {
      '--wigmix-floating-width': `${floatingSize.width}px`,
      '--wigmix-floating-height': `${floatingSize.height}px`,
      ...(floatingPosition ? {
        top: `${floatingPosition.top}px`,
        left: `${floatingPosition.left}px`,
        bottom: 'auto',
        right: 'auto',
        transition: isDraggingFloating ? 'none' : 'top 250ms ease-out, left 250ms ease-out',
      } : {}),
    } as CSSProperties
    : undefined;

  return (
    <ReactModal
      closeTimeoutMS={timeout}
      parentSelector={(): HTMLElement => root}
      isOpen={open}
      className={cn(`wigmix-modal bg-primary text-primary wigmix-modal-${layout} wigmix-modal-position-${position} wigmix-modal-variant-${variant}`, className)}
      overlayClassName={`wigmix-modal-overlay wigmix-modal-position-${position} wigmix-modal-variant-${variant}`}
      style={{ content: contentStyle }}
      testId='wigmix-modal'
      onRequestClose={onClose}
      contentLabel={ariaLabel}
      aria={ariaLabelledBy ? { labelledby: ariaLabelledBy } : undefined}
      appElement={portalRef?.current || document.body}>
      {children}
    </ReactModal>
  );
};

interface VisenzeModalProps {
  open: boolean;
  onClose: () => void;
  layout: 'desktop' | 'tablet' | 'mobile' | 'nested_mobile';
  position: 'left' | 'center' | 'right' | 'bottom';
  variant?: 'panel' | 'floating-card';
  floatingSize?: { width: number; height: number };
  floatingPosition?: { top: number; left: number };
  isDraggingFloating?: boolean;
  children: ReactElement | ReactElement[];
  className?: string;
  placementId: string;
  idSuffix?: string;
  darkMode: boolean;
  fontFamily: string;
  renderWithoutPortal: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

const ViSenzeModal: FC<VisenzeModalProps> = (props) => {
  const portalRef = useRef(null);
  // At the moment, testing elements with ShadowWrapper is troublesome.
  // At least for the time being, add this property so that the modal can be rendered directly within the component
  // and therefore allowing it to be tested normally.
  if (props.renderWithoutPortal) {
    return <Modal {...props} />;
  }
  return (
    <Portal idName={`visenze-widget-modal-portal-${props.placementId}${props.idSuffix ? `-${props.idSuffix}` : ''}`}>
      <ShadowWrapper darkMode={props.darkMode} fontFamily={props.fontFamily}>
        <div ref={portalRef}>
          <Modal portalRef={portalRef} {...props} />
        </div>
      </ShadowWrapper>
    </Portal>
  );
};

export default ViSenzeModal;
