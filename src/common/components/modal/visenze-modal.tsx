import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import ReactModal from 'react-modal';
import { cn } from '@nextui-org/theme';
import ShadowWrapper, { RootContext } from '../shadow-wrapper';
import Portal from '../portal';
import './modal.scss';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  layout: 'desktop' | 'tablet' | 'mobile' | 'nested_mobile';
  children: ReactElement | ReactElement[];
  className?: string;
}

const Modal: FC<ModalProps> = ({ open, layout, children, onClose, className }) => {
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
      className={cn(`vi_modal_${layout}`, className)}
      overlayClassName='vi_modal_overlay'
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
  children: ReactElement | ReactElement[];
  className?: string;
  placementId: string;
  idSuffix?: string;
}

const ViSenzeModal: FC<VisenzeModalProps> = (props) => (
    <Portal idName={`visenze-widget-modal-portal-${props.placementId}${props.idSuffix ? `-${props.idSuffix}` : ''}`}>
      <ShadowWrapper>
        <Modal {...props} />
      </ShadowWrapper>
    </Portal>
  );

export default ViSenzeModal;
