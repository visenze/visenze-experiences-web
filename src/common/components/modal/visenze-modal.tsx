import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import ReactModal from 'react-modal';
import { cn } from '@heroui/theme';
import { RootContext } from '../shadow-wrapper';
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
      onRequestClose={onClose}
      appElement={document.body}>
      {children}
    </ReactModal>
  );
};

export default Modal;
