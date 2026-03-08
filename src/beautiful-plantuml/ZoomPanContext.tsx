import { createContext, useContext, useRef, type RefObject } from "react";

export interface ZoomPanState {
  zoom: number;
  pan: { x: number; y: number };
  containerWidth: number;
  containerHeight: number;
}

// The context holds a stable RefObject — updating .current never triggers re-renders.
export const ZoomPanContext = createContext<RefObject<ZoomPanState> | null>(null);

/**
 * Returns a stable ref to the current zoom/pan state.
 * Read .current in event handlers — zero React re-renders on drag/zoom.
 * Returns null when there is no ZoomPanContainer ancestor.
 */
export function useZoomPan(): RefObject<ZoomPanState> | null {
  return useContext(ZoomPanContext);
}

/**
 * Creates the mutable ref that ZoomPanContainer manages.
 * Call this once inside ZoomPanContainer.
 */
export function useZoomPanRef(initial?: Partial<ZoomPanState>): RefObject<ZoomPanState> {
  return useRef<ZoomPanState>({
    zoom: initial?.zoom ?? 1,
    pan: initial?.pan ?? { x: 0, y: 0 },
    containerWidth: initial?.containerWidth ?? 0,
    containerHeight: initial?.containerHeight ?? 0,
  });
}
