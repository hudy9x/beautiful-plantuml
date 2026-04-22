import { useDiagram } from "../DiagramContext";
import { BLOCK_HDR_H, DIVIDER_H, MSG_ARROW_BOT, MSG_H, MSG_LABEL_OFF, MSG_LINE_H, NOTE_FONT, NOTE_LINE_H, NOTE_PAD_H, NOTE_PAD_V, SELF_LOOP_GAP, SELF_LOOP_H, SELF_LOOP_W } from "../layout/constants";
import { C } from "../theme";
import type { ArrowType, MessageNode, NoteNode, DividerNode } from "../types";

// ── Marker IDs ────────────────────────────────────────────────────────────────
const MK_SOLID   = "mk-solid";
const MK_DASHED  = "mk-dashed";
const MK_X       = "mk-x";       // ×  lost/destroyed
const MK_O       = "mk-o";       // ●  filled circle
const MK_OPEN    = "mk-open";    // ›› open thin arrowhead
const MK_CIRCLE  = "mk-circle";  // ○  circle tail (start)

// ── SVG defs ──────────────────────────────────────────────────────────────────
export function SvgDefs() {
  const solidMk = (id: string, color: string) => (
    <marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill={color} />
    </marker>
  );
  return (
    <defs>
      {solidMk(MK_SOLID,  C.arrow)}
      {solidMk(MK_DASHED, C.arrow)}

      {/* × lost/destroyed head */}
      <marker id={MK_X} markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
        <line x1="1" y1="1" x2="9" y2="9" stroke={C.arrow} strokeWidth="2" />
        <line x1="9" y1="1" x2="1" y2="9" stroke={C.arrow} strokeWidth="2" />
      </marker>

      {/* ● filled-circle head */}
      <marker id={MK_O} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <circle cx="5" cy="5" r="4" fill={C.arrow} />
      </marker>

      {/* open / thin arrowhead (>>) */}
      <marker id={MK_OPEN} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <polyline points="0 0,7 4,0 8" fill="none" stroke={C.arrow} strokeWidth="1.5" />
      </marker>

      {/* ○ circle tail (placed at start, so refX near 0) */}
      <marker id={MK_CIRCLE} markerWidth="10" markerHeight="10" refX="2" refY="5" orient="auto">
        <circle cx="5" cy="5" r="4" fill={C.bg} stroke={C.arrow} strokeWidth="1.5" />
      </marker>
    </defs>
  );
}

// ── Arrow property helper ────────────────────────────────────────────────────
// Given a raw PlantUML arrow string, returns the SVG attributes needed to
// render the line correctly.
export interface ArrowRenderProps {
  dashed: boolean;
  markerEnd: string | undefined;
  markerStart: string | undefined;
}

/** Normalise an arrow string to its canonical direction and style. */
export function arrowProps(arrow: ArrowType): ArrowRenderProps {
  // Circle-tail variants  (o\- / o\-- and mirrors)
  const isCircleTail = arrow === "o\\-" || arrow === "o\\--"
                    || arrow === "-\\o" || arrow === "--\\o";
  // Resolve dashed: true when the arrow string contains '--' (two dashes)
  const dashed = arrow.includes("--");

  if (arrow === "->x" || arrow === "x<-") {
    return { dashed: false, markerEnd: `url(#${MK_X})`, markerStart: undefined };
  }
  if (arrow === "->o" || arrow === "o<-") {
    return { dashed: false, markerEnd: `url(#${MK_O})`, markerStart: undefined };
  }
  if (arrow === "->>") {
    return { dashed: false, markerEnd: `url(#${MK_OPEN})`, markerStart: undefined };
  }
  if (arrow === "<<-") {
    return { dashed: false, markerEnd: `url(#${MK_OPEN})`, markerStart: undefined };
  }
  if (isCircleTail) {
    return {
      dashed,
      markerEnd:   `url(#${dashed ? MK_DASHED : MK_SOLID})`,
      markerStart: `url(#${MK_CIRCLE})`,
    };
  }
  // All remaining variants (including backslash/slash aliases) render as
  // a plain solid or dashed arrow with a filled-triangle head.
  return {
    dashed,
    markerEnd: `url(#${dashed ? MK_DASHED : MK_SOLID})`,
    markerStart: undefined,
  };
}



// ── Message arrow  ─────────────────────────────────────────────────────────────
// FIX #3: autonumber is prepended as "N. " to the label text — no separate badge.
export function MessageArrow({ x1, y, x2, rawLabel, autoNum, idx, node }:
  { x1: number; y: number; x2: number; rawLabel: string; autoNum: number | string | null; idx: number; node: MessageNode }) {

  const { selectedNodeId } = useDiagram();
  const isSelected = selectedNodeId === node.id;

  const ap = arrowProps(node.arrow);

  // Build display lines: prepend "N. " to first line if autonumber
  const rawLines = rawLabel ? rawLabel.split("\\n") : [];
  const lines = [...rawLines];
  if (autoNum !== null && lines.length === 0) lines.push(`${autoNum}.`);
  else if (autoNum !== null) lines[0] = `${autoNum}. ${lines[0]}`;

  const nExtra = Math.max(0, lines.length - 1);
  const rowH = MSG_H + nExtra * MSG_LINE_H;
  const arrowY = y + rowH - MSG_ARROW_BOT;

  return (
    <g className="message" data-idx={idx} data-id={node.id}
      style={{ cursor: "pointer" }}>
      {/* Interactive hover/select bounding box */}
      <rect x={Math.min(x1, x2)} y={y} width={Math.abs(x2 - x1)} height={rowH} fill={isSelected ? "rgba(255,255,255,0.1)" : "transparent"} className="message-hover-rect" />

      {lines.map((l, i) => l ? (
        <text key={i}
          x={Math.min(x1, x2) + 10} y={y + MSG_LABEL_OFF + i * MSG_LINE_H}
          textAnchor="start" fontSize={11} fill={C.text}
          className="message-label">{l}</text>
      ) : null)}
      <line
        x1={x1} y1={arrowY} x2={x2} y2={arrowY}
        stroke={C.arrow} strokeWidth={1.5}
        strokeDasharray={ap.dashed ? "5,3" : undefined}
        markerEnd={ap.markerEnd}
        markerStart={ap.markerStart}
        className="message-arrow" />
    </g>
  );
}

// ── Self-message arrow ────────────────────────────────────────────────────────
// Draws a rectangular loop to the right of the lifeline.
// Layout (from reference images):
//   - Label lines are left-aligned, x = cx + SELF_LOOP_W + 6, top-baseline at y + MSG_LABEL_OFF
//   - Loop: top-line at labelBottomY + SELF_LOOP_GAP, extends SELF_LOOP_W to the right
//           bottom-line SELF_LOOP_H below the top-line
//   - Arrow: -> (from=to): arrowhead points LEFT  (back to lifeline) on bottom line
//            <- (from=to): arrowhead points RIGHT (away from lifeline) on top line

// const SELF_LOOP_W = 36;  // px the loop extends right of lifeline
// const SELF_LOOP_H = 18;  // px height of the loop rectangle
// const SELF_LOOP_GAP = 6;   // px gap between last label line and loop top

export function selfMessageH(lines: string[]): number {
  // When no label, loop sits at top of row with minimal padding
  const labelH = lines.length > 0 ? MSG_LABEL_OFF + lines.length * MSG_LINE_H + SELF_LOOP_GAP : MSG_LABEL_OFF;
  return labelH + SELF_LOOP_H + 8;
}

export function SelfArrow({ cx, y, rawLabel, autoNum, idx, arrowBack, node }:
  { cx: number; y: number; rawLabel: string; autoNum: number | string | null; idx: number; arrowBack: boolean; node: MessageNode }) {

  const { selectedNodeId } = useDiagram();
  const isSelected = selectedNodeId === node.id;

  const ap = arrowProps(node.arrow);

  const rawLines = rawLabel ? rawLabel.split("\\n") : [];
  const lines = [...rawLines];
  if (autoNum !== null && lines.length === 0) lines.push(`${autoNum}.`);
  else if (autoNum !== null) lines[0] = `${autoNum}. ${lines[0]}`;

  const dash = ap.dashed ? "5,3" : undefined;

  const labelX = cx + 10;
  const labelH = lines.length > 0 ? MSG_LABEL_OFF + lines.length * MSG_LINE_H + SELF_LOOP_GAP : MSG_LABEL_OFF;
  const loopTop = y + labelH;
  const loopBot = loopTop + SELF_LOOP_H;
  const loopRight = cx + SELF_LOOP_W;

  // arrowBack=true  (->):  top exits lifeline right, loops around, bottom returns left → arrowhead on bottom pointing left
  // arrowBack=false (<-):  top exits lifeline right with arrowhead, loops around, bottom returns left (no arrowhead)
  // Both look like a rectangle; difference is which end has the arrowhead
  return (
    <g className="message message-self" data-idx={idx} data-id={node.id} style={{ cursor: "pointer" }}>
      {/* Interactive hover/select bounding box */}
      <rect x={cx} y={y} width={SELF_LOOP_W + 36} height={loopBot - y} fill={isSelected ? "rgba(255,255,255,0.1)" : "transparent"} className="message-hover-rect" />

      {lines.map((l, i) => l ? (
        <text key={i}
          x={labelX} y={y + MSG_LABEL_OFF + i * MSG_LINE_H}
          textAnchor="start" fontSize={11} fill={C.text}
          className="message-label">{l}</text>
      ) : null)}
      {/* top horizontal segment: lifeline → right */}
      <line x1={cx} y1={loopTop} x2={loopRight} y2={loopTop}
        stroke={C.arrow} strokeWidth={1.5} strokeDasharray={dash}
        markerEnd={!arrowBack ? ap.markerEnd : undefined}
        markerStart={!arrowBack ? ap.markerStart : undefined}
        className="message-arrow" />
      {/* right vertical segment */}
      <line x1={loopRight} y1={loopTop} x2={loopRight} y2={loopBot}
        stroke={C.arrow} strokeWidth={1.5} strokeDasharray={dash}
        className="message-arrow" />
      {/* bottom horizontal segment: right → lifeline */}
      <line x1={loopRight} y1={loopBot} x2={cx} y2={loopBot}
        stroke={C.arrow} strokeWidth={1.5} strokeDasharray={dash}
        markerEnd={arrowBack ? ap.markerEnd : undefined}
        markerStart={arrowBack ? ap.markerStart : undefined}
        className="message-arrow" />
    </g>
  );
}

// ── Note box ──────────────────────────────────────────────────────────────────

function resolveNoteColor(raw: string | null): { bg: string; border: string; text: string } {
  if (!raw) return { bg: C.noteBg, border: C.noteBorder, text: C.noteText };
  const name = raw.startsWith("#") ? raw.slice(1) : raw;
  const isHex = /^[0-9a-fA-F]{3,6}$/.test(name);
  return { bg: isHex ? `#${name}` : name, border: C.noteBorder, text: "#111" };
}

export function noteH(lines: string[]): number {
  return Math.max(1, lines.length) * NOTE_LINE_H + NOTE_PAD_V + 4;
}
export function noteW(lines: string[]): number {
  const longest = lines.reduce((a, b) => b.length > a.length ? b : a, "");
  return Math.max(80, longest.length * 6.6 + NOTE_PAD_H * 2 + 14);
}

export function NoteBoxSvg({ x, y, lines, color, w: wOverride, node }: { x: number; y: number; lines: string[]; color: string | null; w?: number; node: NoteNode }) {
  const { selectedNodeId } = useDiagram();
  const isSelected = selectedNodeId === node.id;
  const { bg, border, text } = resolveNoteColor(color);
  const w = wOverride ?? noteW(lines), h = noteH(lines), FOLD = 10;
  const pts = `${x},${y} ${x + w - FOLD},${y} ${x + w},${y + FOLD} ${x + w},${y + h} ${x},${y + h}`;
  return (
    <g className="note" data-id={node.id} style={{ cursor: "pointer" }}>
      <polygon points={pts} fill={bg} stroke={isSelected ? "#fff" : border} strokeWidth={isSelected ? 2 : 1} className="note-body" />
      <polyline points={`${x + w - FOLD},${y} ${x + w - FOLD},${y + FOLD} ${x + w},${y + FOLD}`}
        fill="none" stroke={isSelected ? "#fff" : border} strokeWidth={isSelected ? 2 : 1} opacity={0.6} className="note-fold" />
      {lines.map((l, i) => (
        <text key={i} x={x + NOTE_PAD_H} y={y + NOTE_PAD_V / 2 + NOTE_FONT + i * NOTE_LINE_H}
          fontSize={NOTE_FONT} fill={text} xmlSpace="preserve" className="note-line">{l || " "}</text>
      ))}
    </g>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function DiagramDivider({ x1, y, x2, label, node }: { x1: number; y: number; x2: number; label: string; node: DividerNode }) {
  const { selectedNodeId } = useDiagram();
  const isSelected = selectedNodeId === node.id;
  const cy = y + DIVIDER_H / 2, tw = label.length * 7.2 + 22, mid = (x1 + x2) / 2;
  const lx = mid - tw / 2 - 8, rx = mid + tw / 2 + 8;
  return (
    <g className="divider" data-id={node.id} style={{ cursor: "pointer" }}>
      {/* Interactive hover/select bounding box */}
      <rect x={mid - tw / 2 - 20} y={cy - 12} width={tw + 40} height={24} fill={isSelected ? "rgba(255,255,255,0.1)" : "transparent"} />

      <line x1={x1} y1={cy - 2} x2={lx} y2={cy - 2} stroke={C.dividerLine} strokeWidth={1.5} />
      <line x1={x1} y1={cy + 2} x2={lx} y2={cy + 2} stroke={C.dividerLine} strokeWidth={1.5} />
      <rect x={mid - tw / 2} y={cy - 11} width={tw} height={22} fill={C.surface}
        stroke={C.dividerLine} strokeWidth={1.5} rx={3} className="divider-box" />
      <text x={mid} y={cy + 5} textAnchor="middle" fontSize={12} fontWeight="bold"
        fill={C.dividerText} className="divider-label">{label}</text>
      <line x1={rx} y1={cy - 2} x2={x2} y2={cy - 2} stroke={C.dividerLine} strokeWidth={1.5} />
      <line x1={rx} y1={cy + 2} x2={x2} y2={cy + 2} stroke={C.dividerLine} strokeWidth={1.5} />
    </g>
  );
}

// ── Block header bar ──────────────────────────────────────────────────────────
// FIX #2: block rects use solid fills so they paint over the lifeline dashes.
// The lifeline shows through the transparent body area but is hidden under headers.
export function BlockHeader({ x, y, w, keyword, condition, stroke, headerFill, labelColor, nodeId }:
  {
    x: number; y: number; w: number; keyword: string; condition: string;
    stroke: string; headerFill: string; labelColor: string;
    nodeId?: string;
  }) {
  const kwW = keyword.length * 7.5;
  const condW = condition ? condition.length * 7.5 + 8 : 0;
  const tagW = kwW + condW + 16;
  return (
    <g className={`block-header block-header-${keyword}`} data-id={nodeId} style={nodeId ? { cursor: "pointer" } : undefined}>
      {/* Solid background covers lifeline under header */}
      <rect x={x} y={y} width={w} height={BLOCK_HDR_H}
        fill={C.surface} stroke="none" rx={3} />
      {/* Colored header background (no stroke yet so it sits underneath) */}
      <rect x={x} y={y} width={w} height={BLOCK_HDR_H}
        fill={headerFill} stroke="none" rx={3} />

      {/* Keyword tag body (solid background to mask the colored header underneath) */}
      <rect x={x} y={y} width={tagW} height={BLOCK_HDR_H} rx={3}
        fill={C.surface} stroke="none" className="block-keyword-tag" />
      {/* Ensure square right corners on the tag background */}
      <rect x={x + 10} y={y} width={tagW - 10} height={BLOCK_HDR_H}
        fill={C.surface} stroke="none" />

      {/* The right vertical separator connecting top to bottom of the header */}
      <line x1={x + tagW} y1={y} x2={x + tagW} y2={y + BLOCK_HDR_H}
        stroke={stroke} strokeWidth={1} />

      {/* Outer border for the entire header (drawn last so its stroke remains perfectly intact) */}
      <rect x={x} y={y} width={w} height={BLOCK_HDR_H}
        fill="none" stroke={stroke} strokeWidth={1} rx={3} />
      <text x={x + 8} y={y + BLOCK_HDR_H / 2 + 4} textAnchor="start"
        fontSize={11} fontWeight="bold" fontFamily="monospace"
        fill={labelColor} className="block-keyword">{keyword}</text>
      {condition && (
        <text x={x + 8 + kwW + 6} y={y + BLOCK_HDR_H / 2 + 4}
          fontSize={11} fill={labelColor} opacity={0.85}
          className="block-condition">{condition}</text>
      )}
    </g>
  );
}
