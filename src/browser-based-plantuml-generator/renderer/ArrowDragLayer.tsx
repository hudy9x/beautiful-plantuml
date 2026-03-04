import React, { useEffect, useRef, useState } from "react";
import { useDiagram } from "../DiagramContext";
import { SELF_LOOP_H, SELF_LOOP_W } from "../layout/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageEndpoint {
  id: string;
  fromAlias: string;
  toAlias: string;
  fromX: number;
  toX: number;
  arrowY: number;
  isSelf: boolean;
  selfCX: number; // only meaningful when isSelf
}

interface DragState {
  msgId: string;
  end: "from" | "to";
  /** SVG x of the end NOT being dragged */
  fixedX: number;
  /** SVG y of both ends (arrow line y) */
  arrowY: number;
  /** Current snapped SVG x */
  currentX: number;
  /** Alias that currentX maps to */
  snapAlias: string;
  /** Whether the original (pre-drag) message was a self-loop */
  wasSelf: boolean;
}

interface ArrowDragLayerProps {
  messageEndpoints: MessageEndpoint[];
  shiftedCenters: number[];
  /** participant alias at each column index (parallel to shiftedCenters) */
  aliasAtIndex: string[];
  svgRef: React.RefObject<SVGSVGElement | null>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function snapToNearest(x: number, centers: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const d = Math.abs(centers[i] - x);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function svgX(clientX: number, svgEl: SVGSVGElement): number {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = 0;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return clientX;
  return pt.matrixTransform(ctm.inverse()).x;
}

// ── Component ─────────────────────────────────────────────────────────────────

const HANDLE_R = 7;
const HANDLE_FILL = "rgba(96,165,250,0.08)";
const HANDLE_STROKE = "rgba(96,165,250,0.35)";
const HANDLE_HOVER_FILL = "rgba(96,165,250,0.35)";
const HANDLE_HOVER_STROKE = "#60a5fa";

export function ArrowDragLayer({ messageEndpoints, shiftedCenters, aliasAtIndex, svgRef }: ArrowDragLayerProps) {
  const { actions } = useDiagram();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null); // "<id>:from" | "<id>:to"
  const dragRef = useRef<DragState | null>(null);

  // Keep ref in sync so mousemove handler always has latest state
  useEffect(() => { dragRef.current = drag; }, [drag]);

  useEffect(() => {
    if (!drag || !svgRef.current) return;

    const svg = svgRef.current;

    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const cur = dragRef.current;
      if (!cur) return;
      const nx = svgX(e.clientX, svg);
      const snapIdx = snapToNearest(nx, shiftedCenters);
      setDrag(prev => prev ? {
        ...prev,
        currentX: shiftedCenters[snapIdx],
        snapAlias: aliasAtIndex[snapIdx],
      } : null);
    };

    const onUp = () => {
      const cur = dragRef.current;
      if (!cur) return;
      // Find the endpoint by the message id stored in drag state
      const ep = messageEndpoints.find(m => m.id === cur.msgId);
      if (ep) {
        const original = cur.end === "from" ? ep.fromAlias : ep.toAlias;
        if (cur.snapAlias !== original) {
          actions.rerouteMessageEndpoint(cur.msgId, cur.end, cur.snapAlias);
        }
      } else {
        // Endpoint not in list (e.g. inside nested block) — still commit
        actions.rerouteMessageEndpoint(cur.msgId, cur.end, cur.snapAlias);
      }
      setDrag(null);
    };

    svg.addEventListener("mousemove", onMove);
    svg.addEventListener("mouseup", onUp);
    // Also cancel if mouse leaves the svg
    svg.addEventListener("mouseleave", onUp);
    return () => {
      svg.removeEventListener("mousemove", onMove);
      svg.removeEventListener("mouseup", onUp);
      svg.removeEventListener("mouseleave", onUp);
    };
  }, [drag, shiftedCenters, aliasAtIndex, messageEndpoints, svgRef, actions]);

  const startDrag = (
    e: React.MouseEvent,
    ep: MessageEndpoint,
    end: "from" | "to",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!svgRef.current) return;

    const fixedX = end === "from" ? ep.toX : ep.fromX;
    const startX = end === "from" ? ep.fromX : ep.toX;
    const snapIdx = snapToNearest(startX, shiftedCenters);

    setDrag({
      msgId: ep.id,
      end,
      fixedX,
      arrowY: ep.arrowY,
      currentX: shiftedCenters[snapIdx],
      snapAlias: aliasAtIndex[snapIdx],
      wasSelf: ep.isSelf,
    });
  };

  return (
    <g className="arrow-drag-layer">

      {/* ── Drag handles (always rendered, pointer events enabled per-handle) ── */}
      {messageEndpoints.map(ep => {
        const tailKey = `${ep.id}:from`;
        const headKey = `${ep.id}:to`;
        const tailHovered = hoveredHandle === tailKey;
        const headHovered = hoveredHandle === headKey;

        let tailX: number, headX: number, tailY: number, headY: number;

        if (ep.isSelf) {
          // Self-loop: tail is at lifeline x (top-left of loop), head is at lifeline x bottom-left
          tailX = ep.selfCX;
          tailY = ep.arrowY - SELF_LOOP_H;
          headX = ep.selfCX;
          headY = ep.arrowY;
        } else {
          tailX = ep.fromX;
          headX = ep.toX;
          tailY = ep.arrowY;
          headY = ep.arrowY;
        }

        return (
          <g key={ep.id} style={{ pointerEvents: "all" }}>
            {/* Tail handle */}
            <circle
              cx={tailX} cy={tailY} r={HANDLE_R}
              fill={tailHovered ? HANDLE_HOVER_FILL : HANDLE_FILL}
              stroke={tailHovered ? HANDLE_HOVER_STROKE : HANDLE_STROKE}
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onMouseEnter={() => setHoveredHandle(tailKey)}
              onMouseLeave={() => setHoveredHandle(null)}
              onMouseDown={(e) => startDrag(e, ep, "from")}
            />
            {/* Head handle */}
            <circle
              cx={headX} cy={headY} r={HANDLE_R}
              fill={headHovered ? HANDLE_HOVER_FILL : HANDLE_FILL}
              stroke={headHovered ? HANDLE_HOVER_STROKE : HANDLE_STROKE}
              strokeWidth={1.5}
              style={{ cursor: "grab" }}
              onMouseEnter={() => setHoveredHandle(headKey)}
              onMouseLeave={() => setHoveredHandle(null)}
              onMouseDown={(e) => startDrag(e, ep, "to")}
            />
          </g>
        );
      })}

      {/* ── Ghost arrow during drag ── */}
      {drag && (() => {
        const snapX = drag.currentX;
        const fixedX = drag.fixedX;
        const y = drag.arrowY;
        const isSelfPreview = Math.abs(snapX - fixedX) < 0.5;

        if (isSelfPreview) {
          // Ghost self-loop preview
          const cx = snapX;
          const loopRight = cx + SELF_LOOP_W;
          const loopTop = y - SELF_LOOP_H;
          return (
            <g className="drag-ghost" style={{ pointerEvents: "none" }}>
              {/* Snap indicator */}
              <line x1={snapX} y1={y - 30} x2={snapX} y2={y + 30}
                stroke="#60a5fa" strokeWidth={1.5} opacity={0.6} />
              {/* Ghost self-loop */}
              <line x1={cx} y1={loopTop} x2={loopRight} y2={loopTop}
                stroke="#60a5fa" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
              <line x1={loopRight} y1={loopTop} x2={loopRight} y2={y}
                stroke="#60a5fa" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
              <line x1={loopRight} y1={y} x2={cx} y2={y}
                stroke="#60a5fa" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
            </g>
          );
        }

        // Ghost regular arrow (left to right, direction doesn't matter for preview)
        const x1 = Math.min(snapX, fixedX);
        const x2 = Math.max(snapX, fixedX);
        return (
          <g className="drag-ghost" style={{ pointerEvents: "none" }}>
            {/* Snap indicator on target lifeline */}
            <line x1={snapX} y1={y - 30} x2={snapX} y2={y + 30}
              stroke="#60a5fa" strokeWidth={1.5} opacity={0.6} />
            {/* Ghost arrow line */}
            <line x1={x1} y1={y} x2={x2} y2={y}
              stroke="#60a5fa" strokeWidth={2} strokeDasharray="5,3" opacity={0.8} />
            {/* Ghost arrowhead dot at snap end */}
            <circle cx={snapX} cy={y} r={3} fill="#60a5fa" opacity={0.9} />
          </g>
        );
      })()}
    </g>
  );
}
