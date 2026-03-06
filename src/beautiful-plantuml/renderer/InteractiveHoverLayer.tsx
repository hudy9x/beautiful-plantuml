import { createPortal } from "react-dom";
import { useDiagram } from "../DiagramContext";
import { PARTICIPANT_KINDS } from "../types";
import { C } from "../theme";
import { ParticipantShape } from "./shapes";
import { StatementPopover } from "./menus/StatementPopover";

// ── Types ────────────────────────────────────────────────────────────────────

interface InteractiveHoverLayerProps {
  totalW: number;
  totalH: number;
  shiftedCenters: number[];
  hoverLinesRef: React.RefObject<SVGGElement | null>;
  vLineRef: React.RefObject<SVGLineElement | null>;
  hLineRef: React.RefObject<SVGLineElement | null>;
  /** Vertical + button ref (participant insert, top of SVG) */
  addBtnGroupRef: React.RefObject<SVGGElement | null>;
  /** Horizontal + button ref (statement insert, right edge of SVG) */
  hAddBtnGroupRef: React.RefObject<SVGGElement | null>;
  lastInsertIndexRef: React.MutableRefObject<number>;
  lastHoverAfterIdRef: React.MutableRefObject<string | null>;
  popover: { x: number; y: number; insertIdx: number } | null;
  setPopover: React.Dispatch<React.SetStateAction<{ x: number; y: number; insertIdx: number } | null>>;
  hStatementPopover: { x: number; y: number; afterId: string | null } | null;
  setHStatementPopover: React.Dispatch<React.SetStateAction<{ x: number; y: number; afterId: string | null } | null>>;
}

// ── Types ────────────────────────────────────────────────────────────────────

// ── Component ─────────────────────────────────────────────────────────────────

export function InteractiveHoverLayer({
  totalW,
  totalH,
  hoverLinesRef,
  vLineRef,
  hLineRef,
  addBtnGroupRef,
  hAddBtnGroupRef,
  lastInsertIndexRef,
  lastHoverAfterIdRef,
  popover,
  setPopover,
  hStatementPopover,
  setHStatementPopover,
}: InteractiveHoverLayerProps) {
  const { actions } = useDiagram();

  return (
    <>
      {/* ── Crosshair + both + buttons ── */}
      <g ref={hoverLinesRef} style={{ display: "none", zIndex: 1000 }}>

        {/* Vertical dashed line */}
        <line
          ref={vLineRef}
          y1={0} y2={totalH}
          stroke="#d3d3d3ff" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6}
          style={{ pointerEvents: "none" }}
        />

        {/* Horizontal dashed line */}
        <line
          ref={hLineRef}
          x1={0} x2={totalW}
          stroke="#d3d3d3ff" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6}
          style={{ pointerEvents: "none" }}
        />

        {/* Vertical + button — tracks cursor X, fixed near top — participant insert */}
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
          <circle cx={0} cy={12} r={12} fill="#3b82f6" />
          <line x1={-6} y1={12} x2={6} y2={12} stroke="#ffffff" strokeWidth={2} />
          <line x1={0} y1={6} x2={0} y2={18} stroke="#ffffff" strokeWidth={2} />
        </g>

        {/* Horizontal + button — tracks cursor Y, fixed at right edge — statement insert */}
        <g
          ref={hAddBtnGroupRef}
          style={{ cursor: "pointer", pointerEvents: "all" }}
          onClick={(e) => {
            e.stopPropagation();
            setHStatementPopover({ x: e.clientX, y: e.clientY, afterId: lastHoverAfterIdRef.current });
          }}
        >
          <circle cx={0} cy={0} r={12} fill="#10b981" />
          <line x1={-6} y1={0} x2={6} y2={0} stroke="#ffffff" strokeWidth={2} />
          <line x1={0} y1={-6} x2={0} y2={6} stroke="#ffffff" strokeWidth={2} />
        </g>

      </g>

      {/* ── Participant-type popover (vertical + button) ── */}
      {popover && createPortal(
        <div
          style={{
            position: "fixed", left: popover.x, top: popover.y + 16,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 9999,
            transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", gap: 4,
          }}
          onClick={e => e.stopPropagation()}
        >
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
                  cursor: "pointer", borderRadius: 4, textTransform: "capitalize",
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

      {/* ── Statement-kind popover (horizontal + button) ── */}
      {hStatementPopover && createPortal(
        <StatementPopover
          x={hStatementPopover.x}
          y={hStatementPopover.y}
          afterId={hStatementPopover.afterId}
          onClose={() => setHStatementPopover(null)}
          hoverLinesHide={() => {
            if (hoverLinesRef.current) hoverLinesRef.current.style.display = "none";
          }}
        />,
        document.body
      )}
    </>
  );
}
