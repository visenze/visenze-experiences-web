import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';

export type FloatingCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface FloatingSize {
  width: number;
  height: number;
}

export interface FloatingPosition {
  top: number;
  left: number;
}

const DEFAULT_MARGIN = 24;
const DRAG_THRESHOLD_PX = 6;

export const computeBasePosition = (
  corner: FloatingCorner,
  size: FloatingSize,
  margin: number,
  viewport: FloatingSize,
): FloatingPosition => ({
  top: corner.startsWith('top') ? margin : viewport.height - size.height - margin,
  left: corner.endsWith('left') ? margin : viewport.width - size.width - margin,
});

// Comparing independently against each axis's midpoint is mathematically equivalent to picking
// the corner nearest by Euclidean distance (the sum-of-squares distance to a corner is minimized
// by minimizing each axis term independently), so a center drop resolves to whichever corner is
// truly closest rather than an arbitrary default.
export const computeNearestCorner = (
  center: { x: number; y: number },
  viewport: FloatingSize,
): FloatingCorner => {
  const vertical = center.y < viewport.height / 2 ? 'top' : 'bottom';
  const horizontal = center.x < viewport.width / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}` as FloatingCorner;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

export interface UseDraggableCornerOptions {
  corner: FloatingCorner;
  onCornerChange: (corner: FloatingCorner) => void;
  size: FloatingSize;
  margin?: number;
  enabled?: boolean;
}

export interface UseDraggableCornerResult {
  position: FloatingPosition;
  isDragging: boolean;
  style: CSSProperties;
  dragHandlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onPointerUp: (e: ReactPointerEvent) => void;
    onPointerCancel: () => void;
  };
  consumeDragFlag: () => boolean;
}

interface DragState {
  startX: number;
  startY: number;
  moved: boolean;
}

const useDraggableCorner = ({
  corner, onCornerChange, size, margin = DEFAULT_MARGIN, enabled = true,
}: UseDraggableCornerOptions): UseDraggableCornerResult => {
  const [viewport, setViewport] = useState<FloatingSize>(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const draggedFlagRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const handleResize = (): void => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, [enabled]);

  const basePosition = computeBasePosition(corner, size, margin, viewport);
  const position: FloatingPosition = {
    top: clamp(basePosition.top + dragDelta.y, 0, Math.max(0, viewport.height - size.height)),
    left: clamp(basePosition.left + dragDelta.x, 0, Math.max(0, viewport.width - size.width)),
  };

  const onPointerDown = useCallback((e: ReactPointerEvent): void => {
    if (!enabled) {
      return;
    }
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    // Otherwise a drag starting over text (e.g. the card's header title) also kicks off the
    // browser's native text-selection gesture, leaving a stray highlight behind once released.
    e.preventDefault();
    const target = e.currentTarget as Element & { setPointerCapture?: (id: number) => void };
    if (target.setPointerCapture) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Older Safari / jsdom don't support pointer capture; the drag still works via the
        // move/up handlers below, just without capture once the pointer leaves the element.
      }
    }
  }, [enabled]);

  const onPointerMove = useCallback((e: ReactPointerEvent): void => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
      return;
    }
    dragState.moved = true;
    setIsDragging(true);
    setDragDelta({ x: dx, y: dy });
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent): void => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (!dragState?.moved) {
      return;
    }
    draggedFlagRef.current = true;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const finalPosition: FloatingPosition = {
      top: clamp(basePosition.top + dy, 0, Math.max(0, viewport.height - size.height)),
      left: clamp(basePosition.left + dx, 0, Math.max(0, viewport.width - size.width)),
    };
    const center = { x: finalPosition.left + size.width / 2, y: finalPosition.top + size.height / 2 };
    onCornerChange(computeNearestCorner(center, viewport));
    setDragDelta({ x: 0, y: 0 });
    setIsDragging(false);
  }, [basePosition.top, basePosition.left, viewport, size, onCornerChange]);

  const onPointerCancel = useCallback((): void => {
    dragStateRef.current = null;
    setDragDelta({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const consumeDragFlag = useCallback((): boolean => {
    if (draggedFlagRef.current) {
      draggedFlagRef.current = false;
      return true;
    }
    return false;
  }, []);

  const style: CSSProperties = {
    position: 'fixed',
    top: position.top,
    left: position.left,
    right: 'auto',
    bottom: 'auto',
    touchAction: 'none',
    transition: isDragging ? 'none' : 'top 250ms ease-out, left 250ms ease-out',
  };

  return {
    position,
    isDragging,
    style,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    consumeDragFlag,
  };
};

export default useDraggableCorner;
