import type { FC, ReactElement } from 'react';
import { useContext, useEffect, useState } from 'react';
import ReactModal from 'react-modal';
import ShadowWrapper, { RootContext } from '../shadow-wrapper';
import Portal from '../portal';
import './modal.scss';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  layout: 'desktop' | 'tablet' | 'mobile' | 'nested_mobile';
  children: ReactElement | ReactElement[];
}

const Modal: FC<ModalProps> = ({ open, layout, children, onClose }) => {
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
      className={`vi_modal_${layout}`}
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
  children: JSX.Element | JSX.Element[];
}

const ViSenzeModal: FC<VisenzeModalProps> = (props) => (
    <Portal idName='visenze-modal-portal'>
      <ShadowWrapper>
        <Modal {...props} />
      </ShadowWrapper>
    </Portal>
  );

export default ViSenzeModal;
