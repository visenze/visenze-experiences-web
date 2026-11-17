import { useEffect, useState } from 'react';

/** The current `window.innerWidth`, kept up to date on resize (at most once per animation frame). */
const useViewportWidth = (): number => {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    let frame = 0;
    const update = (): void => setWidth(window.innerWidth);
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
