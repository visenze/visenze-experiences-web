import { fireEvent } from '@testing-library/react';

// jsdom in this project's test environment has no native PointerEvent constructor, so
// fireEvent.pointerDown/Move/Up (which fall back to a bare `Event`) silently drop clientX/
// clientY/pointerId from their init options. Dispatching a manually-tagged Event keeps those
// coordinates intact so drag math under test actually receives real numbers.
export const firePointerEvent = (
  element: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  { clientX, clientY, pointerId = 1 }: { clientX: number; clientY: number; pointerId?: number },
): void => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX, clientY, pointerId });
  fireEvent(element, event);
};
