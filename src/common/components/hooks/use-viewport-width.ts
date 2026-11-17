import { useEffect, useState } from 'react';
import viewportWidth from './viewport-width';

/** The width the page gets (excluding the vertical scrollbar, as the docked page push measures it), kept up to date on resize (at most once per animation frame). */
const useViewportWidth = (): number => {
  const [width, setWidth] = useState(viewportWidth);

  useEffect(() => {
    let frame = 0;
    const update = (): void => setWidth(viewportWidth());
    const onResize = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    // The width may have changed between the first render and this effect.
    update();
    window.addEventListener('resize', onResize);
    return (): void => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return width;
};

export default useViewportWidth;
