import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import ReactModal from 'react-modal';
import { cn } from '@heroui/theme';
import Portal from '../portal';
import ShadowWrapper, { RootContext } from '../shadow-wrapper';
import './modal.scss';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  layout: 'desktop' | 'tablet' | 'mobile' | 'nested_mobile';
  children: ReactElement | ReactElement[];
  className?: string;
  position: 'left' | 'center' | 'right';
}

const Modal: FC<ModalProps> = ({ open, layout, children, onClose, className, position }) => {
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

  return (
    <ReactModal
      closeTimeoutMS={timeout}
      parentSelector={(): HTMLElement => root}
      isOpen={open}
      className={cn(`wigmix-modal bg-primary text-primary wigmix-modal-${layout} wigmix-modal-position-${position}`, className)}
      overlayClassName={`wigmix-modal-overlay wigmix-modal-position-${position}`}
      testId='wigmix-modal'
      onRequestClose={onClose}
      appElement={document.body}>
      {children}
    </ReactModal>
  );
};

interface VisenzeModalProps {
  open: boolean;
  onClose: () => void;
  layout: 'desktop' | 'tablet' | 'mobile' | 'nested_mobile';
  position: 'left' | 'center' | 'right';
  children: ReactElement | ReactElement[];
  className?: string;
  placementId: string;
  idSuffix?: string;
  darkMode: boolean;
  fontFamily: string;
  renderWithoutPortal: boolean;
}

const ViSenzeModal: FC<VisenzeModalProps> = (props) => {
  // At the moment, testing elements with ShadowWrapper is troublesome.
  // At least for the time being, add this property so that the modal can be rendered directly within the component
  // and therefore allowing it to be tested normally.
  if (props.renderWithoutPortal) {
    return <Modal {...props} />;
  }
  return (
    <Portal idName={`visenze-widget-modal-portal-${props.placementId}${props.idSuffix ? `-${props.idSuffix}` : ''}`}>
      <ShadowWrapper darkMode={props.darkMode} fontFamily={props.fontFamily}>
        <Modal {...props} />
      </ShadowWrapper>
    </Portal>
  );
};

export default ViSenzeModal;
