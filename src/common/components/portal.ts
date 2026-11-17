import { createPortal } from 'react-dom';
import type { FC, ReactElement } from 'react';
import { useState, useEffect } from 'react';

interface PortalProps {
  children: ReactElement | ReactElement[];
  className?: string;
  idName?: string;
  element?: string;
  // Stacking order of the portal container; defaults to 13000, which every existing caller relies on.
  zIndex?: number;
}

const Portal: FC<PortalProps> = ({ children, className, idName, element = 'div', zIndex = 13000 }) => {
  const [container] = useState(() => {
    const el = document.createElement(element);
    if (className) {
      el.classList.add(className);
    }
    if (idName) {
      el.id = idName;
    }
    el.style.zIndex = `${zIndex}`;
    el.style.position = 'absolute';
    document.body.appendChild(el);
    return el;
  });

  useEffect(() => {
    container.style.zIndex = `${zIndex}`;
  }, [zIndex]);

  useEffect(() => {
    document.body.appendChild(container);
    return (): void => {
      document.body.removeChild(container);
    };
  }, []);

  return createPortal(children, container);
};

export default Portal;
