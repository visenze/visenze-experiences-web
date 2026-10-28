let lockCount = 0;
let overflowBeforeLock = '';

// Reference-counted: only the first lock records the page's inline overflow and only the last release
// restores it, so overlapping surfaces (drawer, full screen, embedded) can't leave the page stuck on 'hidden'.
export const lockBodyScroll = (): (() => void) => {
  if (lockCount === 0) {
    overflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
  let released = false;
  return (): void => {
    if (released) {
      return;
    }
    released = true;
    lockCount -= 1;
    if (lockCount === 0) {
      document.body.style.overflow = overflowBeforeLock;
    }
  };
};
