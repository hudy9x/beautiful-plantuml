import React from "react";
import { createPortal } from "react-dom";
import { useDiagram } from "../DiagramContext";
import { PARTICIPANT_KINDS } from "../types";
import { C } from "../theme";
import { ParticipantShape } from "./shapes";

interface InteractiveHoverLayerProps {
  totalW: number;
  totalH: number;
  shiftedCenters: number[];
  hoverLinesRef: React.RefObject<SVGGElement | null>;
  vLineRef: React.RefObject<SVGLineElement | null>;
  hLineRef: React.RefObject<SVGLineElement | null>;
  addBtnGroupRef: React.RefObject<SVGGElement | null>;
  lastInsertIndexRef: React.MutableRefObject<number>;
  popover: { x: number; y: number; insertIdx: number } | null;
  setPopover: React.Dispatch<React.SetStateAction<{ x: number; y: number; insertIdx: number } | null>>;
}

export function InteractiveHoverLayer({
  totalW,
  totalH,
  hoverLinesRef,
  vLineRef,
  hLineRef,
  addBtnGroupRef,
  lastInsertIndexRef,
  popover,
  setPopover,
}: InteractiveHoverLayerProps) {
  const { actions } = useDiagram();

  return (
    <>
      {/* Interactive Hover Layer */}
      <g ref={hoverLinesRef} style={{ display: "none", zIndex: 1000 }}>
        <line ref={vLineRef} y1={0} y2={totalH} stroke="#d3d3d3ff" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} style={{ pointerEvents: "none" }} />
        <line ref={hLineRef} x1={0} x2={totalW} stroke="#d3d3d3ff" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} style={{ pointerEvents: "none" }} />

        <g
          ref={addBtnGroupRef}
          style={{ cursor: "pointer", pointerEvents: "all" }}
          onClick={(e) => {
            e.stopPropagation();
            if (lastInsertIndexRef.current >= 0) {
              setPopover({ x: e.clientX, y: e.clientY, insertIdx: lastInsertIndexRef.current });
            }
          }}
        >
          {/* Circular + icon button */}
          <circle cx={0} cy={12} r={12} fill="#3b82f6" />
          <line x1={-6} y1={12} x2={6} y2={12} stroke="#ffffff" strokeWidth={2} />
          <line x1={0} y1={6} x2={0} y2={18} stroke="#ffffff" strokeWidth={2} />
        </g>
      </g>

      {/* Popover Menu using Portal to render absolute HTML over the page */}
      {popover && createPortal(
        <div style={{
          position: "fixed", left: popover.x, top: popover.y + 16,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 9999,
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", gap: 4
        }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 11, fontWeight: "bold", padding: "4px 8px", color: C.text, textAlign: "center", borderBottom: `1px solid ${C.border}` }}>
            Participant Type
          </div>
          <div style={{ display: "flex" }}>
            {PARTICIPANT_KINDS.map((kind) => (
              <button
                key={kind}
                style={{
                  background: "transparent", border: "none", color: C.text,
                  fontSize: 12, padding: "6px 8px", textAlign: "left",
                  cursor: "pointer", borderRadius: 4, textTransform: "capitalize"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                onClick={() => {
                  actions.insertParticipantAt(popover.insertIdx, kind);
                  setPopover(null);
                  if (hoverLinesRef.current) hoverLinesRef.current.style.display = "none";
                }}
              >
                <svg viewBox="-25 -35 50 55" width="28" height="30" style={{ pointerEvents: "none" }}>
                  <ParticipantShape kind={kind} name="" cx={0} cy={0} stroke={C.text} />
                </svg>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
