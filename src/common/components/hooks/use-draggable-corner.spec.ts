import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import useDraggableCorner, { computeBasePosition, computeNearestCorner } from './use-draggable-corner';

const asPointerEvent = (clientX: number, clientY: number): ReactPointerEvent => ({
  clientX,
  clientY,
  pointerId: 1,
  currentTarget: {},
  preventDefault: () => {},
} as unknown as ReactPointerEvent);

describe('computeBasePosition', () => {
  const size = { width: 56, height: 56 };
  const margin = 24;
  const viewport = { width: 1000, height: 800 };

  it('anchors to the top-left corner', () => {
    expect(computeBasePosition('top-left', size, margin, viewport)).toEqual({ top: 24, left: 24 });
  });

  it('anchors to the top-right corner', () => {
    expect(computeBasePosition('top-right', size, margin, viewport)).toEqual({ top: 24, left: 1000 - 56 - 24 });
  });

  it('anchors to the bottom-left corner', () => {
    expect(computeBasePosition('bottom-left', size, margin, viewport)).toEqual({ top: 800 - 56 - 24, left: 24 });
  });

  it('anchors to the bottom-right corner', () => {
    expect(computeBasePosition('bottom-right', size, margin, viewport)).toEqual({ top: 800 - 56 - 24, left: 1000 - 56 - 24 });
  });
});

describe('computeNearestCorner', () => {
  const viewport = { width: 1000, height: 800 };

  it('resolves to top-left when the center is in the top-left quadrant', () => {
    expect(computeNearestCorner({ x: 100, y: 100 }, viewport)).toBe('top-left');
  });

  it('resolves to top-right when the center is in the top-right quadrant', () => {
    expect(computeNearestCorner({ x: 900, y: 100 }, viewport)).toBe('top-right');
  });

  it('resolves to bottom-left when the center is in the bottom-left quadrant', () => {
    expect(computeNearestCorner({ x: 100, y: 700 }, viewport)).toBe('bottom-left');
  });

  it('resolves to bottom-right when the center is in the bottom-right quadrant', () => {
    expect(computeNearestCorner({ x: 900, y: 700 }, viewport)).toBe('bottom-right');
  });

  it('breaks a dead-center drop toward bottom-right deterministically', () => {
    expect(computeNearestCorner({ x: 500, y: 400 }, viewport)).toBe('bottom-right');
  });
});

describe('useDraggableCorner', () => {
  const size = { width: 56, height: 56 };

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('positions the element at the base position for the given corner when idle', () => {
    const { result } = renderHook(() => useDraggableCorner({ corner: 'bottom-right', onCornerChange: jest.fn(), size }));
    expect(result.current.position).toEqual({ top: 800 - 56 - 24, left: 1000 - 56 - 24 });
    expect(result.current.isDragging).toBe(false);
  });

  it('treats a release without meaningful movement as a plain click, not a drag', () => {
    const onCornerChange = jest.fn();
    const { result } = renderHook(() => useDraggableCorner({ corner: 'bottom-right', onCornerChange, size }));

    act(() => {
      result.current.dragHandlers.onPointerDown(asPointerEvent(976, 720));
      result.current.dragHandlers.onPointerMove(asPointerEvent(978, 721));
      result.current.dragHandlers.onPointerUp(asPointerEvent(978, 721));
    });

    expect(result.current.isDragging).toBe(false);
    expect(onCornerChange).not.toHaveBeenCalled();
    expect(result.current.consumeDragFlag()).toBe(false);
  });

  it('drags to the top-left quadrant and snaps to the top-left corner on release', () => {
    const onCornerChange = jest.fn();
    const { result } = renderHook(() => useDraggableCorner({ corner: 'bottom-right', onCornerChange, size }));

    act(() => {
      result.current.dragHandlers.onPointerDown(asPointerEvent(976, 720));
      result.current.dragHandlers.onPointerMove(asPointerEvent(100, 100));
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      result.current.dragHandlers.onPointerUp(asPointerEvent(100, 100));
    });

    expect(onCornerChange).toHaveBeenCalledWith('top-left');
    expect(result.current.isDragging).toBe(false);
    expect(result.current.consumeDragFlag()).toBe(true);
    expect(result.current.consumeDragFlag()).toBe(false);
  });

  it('does nothing when disabled', () => {
    const onCornerChange = jest.fn();
    const { result } = renderHook(() => useDraggableCorner({ corner: 'bottom-right', onCornerChange, size, enabled: false }));

    act(() => {
      result.current.dragHandlers.onPointerDown(asPointerEvent(976, 720));
      result.current.dragHandlers.onPointerMove(asPointerEvent(100, 100));
      result.current.dragHandlers.onPointerUp(asPointerEvent(100, 100));
    });

    expect(result.current.isDragging).toBe(false);
    expect(onCornerChange).not.toHaveBeenCalled();
  });
});
