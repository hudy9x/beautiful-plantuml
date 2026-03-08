import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type ZoomConfig, defaultZoomConfig } from './zoomConfig';
import { ZoomPanContext, useZoomPanRef } from './ZoomPanContext';

export interface ZoomPanContainerProps {
  children: ReactNode;
  config?: Partial<ZoomConfig>;
  className?: string;
}

// Store zoom/pan state outside component to persist across remounts
const zoomPanState = {
  zoom: 1,
  pan: { x: 0, y: 0 }
};

// ── Inline SVG Icons ───────────────────────────────────────────────────────────

function IconZoomIn() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconZoomOut() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function IconReset() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// ── ZoomButton ─────────────────────────────────────────────────────────────────

function ZoomButton({ onClick, title, children }: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6,
        background: 'rgba(15,15,15,0.75)',
        backdropFilter: 'blur(8px)',
        color: '#cdd9e5',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(40,40,40,0.9)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,15,15,0.75)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
      }}
    >
      {children}
    </button>
  );
}

// ── ZoomPanContainer ───────────────────────────────────────────────────────────
//
// Wraps children with drag-to-pan and scroll-to-zoom behaviour.
// Provides ZoomPanContext so that nested components (e.g. InteractiveHoverLayer)
// can read the current transform to clamp UI elements to the visible viewport.
//
// Usage inside beautiful-plantuml:
//   <ZoomPanContainer>
//     <SequenceDiagram />
//   </ZoomPanContainer>
//
// SequenceDiagram also works WITHOUT ZoomPanContainer — useZoomPan() returns null
// in that case and all features degrade gracefully.

export function ZoomPanContainer({
  children,
  config: userConfig,
  className = ''
}: ZoomPanContainerProps) {
  const config = { ...defaultZoomConfig, ...userConfig };

  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable ref shared via context — writing .current never triggers re-renders in consumers
  const zoomPanRef = useZoomPanRef({ zoom: zoomPanState.zoom, pan: zoomPanState.pan });

  const [zoom, setZoom] = useState(() => zoomPanState.zoom || config.initialZoom);
  const [pan, setPan] = useState(() => zoomPanState.pan || { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => { zoomPanState.zoom = zoom; }, [zoom]);
  useEffect(() => { zoomPanState.pan = pan; }, [pan]);

  const clampZoom = useCallback((value: number) => {
    return Math.min(Math.max(value, config.minZoom), config.maxZoom);
  }, [config.minZoom, config.maxZoom]);

  // Wheel zoom — zoom towards the cursor position
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const delta = -e.deltaY * config.wheelZoomSpeed;
    const newZoom = clampZoom(zoom + delta);

    if (newZoom !== zoom) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const contentX = (mouseX - pan.x) / zoom;
        const contentY = (mouseY - pan.y) / zoom;
        const newPan = {
          x: mouseX - contentX * newZoom,
          y: mouseY - contentY * newZoom,
        };
        zoomPanRef.current.pan = newPan;
        setPan(newPan);
      }
      zoomPanRef.current.zoom = newZoom;
      setZoom(newZoom);
    }
  }, [zoom, pan, config.wheelZoomSpeed, clampZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPan = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
      zoomPanRef.current.pan = newPan;
      zoomPanRef.current.containerWidth = containerRef.current?.clientWidth ?? 0;
      zoomPanRef.current.containerHeight = containerRef.current?.clientHeight ?? 0;
      setPan(newPan);
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const next = clampZoom(prev + config.zoomStep);
      zoomPanRef.current.zoom = next;
      return next;
    });
  }, [config.zoomStep, clampZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const next = clampZoom(prev - config.zoomStep);
      zoomPanRef.current.zoom = next;
      return next;
    });
  }, [config.zoomStep, clampZoom]);

  const resetZoom = useCallback(() => {
    zoomPanRef.current.zoom = config.initialZoom;
    zoomPanRef.current.pan = { x: 0, y: 0 };
    setZoom(config.initialZoom);
    setPan({ x: 0, y: 0 });
  }, [config.initialZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keep containerWidth/Height in sync on initial mount
  useEffect(() => {
    if (containerRef.current) {
      zoomPanRef.current.containerWidth = containerRef.current.clientWidth;
      zoomPanRef.current.containerHeight = containerRef.current.clientHeight;
    }
  });

  return (
    <ZoomPanContext.Provider value={zoomPanRef}>
      <div
        ref={containerRef}
        className={className}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Transformed content layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transformOrigin: '0 0',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'all' }}>
            {children}
          </div>
        </div>

        {/* Zoom controls overlay */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 20,
          pointerEvents: 'all',
        }}
          onMouseDown={e => e.stopPropagation()}
        >
          <ZoomButton onClick={zoomIn} title="Zoom In"><IconZoomIn /></ZoomButton>
          <ZoomButton onClick={zoomOut} title="Zoom Out"><IconZoomOut /></ZoomButton>
          <ZoomButton onClick={resetZoom} title="Reset Zoom"><IconReset /></ZoomButton>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            width: 40,
            padding: '3px 0',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(15,15,15,0.75)',
            backdropFilter: 'blur(8px)',
            color: '#cdd9e5',
            textAlign: 'center',
          }}>
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
    </ZoomPanContext.Provider>
  );
}
