import { useEffect, useRef, useState } from "react";

import { useDiagram } from "./DiagramContext";
import { useZoomPan } from "./ZoomPanContext";

// ─────────────────────────────────────────────────────────────────────────────
// types/index.ts
// ─────────────────────────────────────────────────────────────────────────────

import { type Participant, type StatementNode, type BoxDeclNode } from "./types";
import { C } from "./theme";
import { boxDepth, resolveBoxRGB, shapeHalfW } from "./utils";
import { BLOCK_HDR_H, BLOCK_PAD_X, BLOCK_PAD_Y, BOX_GAP, BOX_SHAPE_PAD, BOX_TITLE_H, COL_MIN_W, DIVIDER_H, GAP, MSG_ARROW_BOT, MSG_H, MSG_LINE_H, PART_H, SELF_LOOP_H } from "./layout/constants";
import { computeColWidths } from "./layout/colwidth";
import { shapeBottomOffset, shapeTopOffset } from "./layout/shapes";
import { ParticipantShape } from "./renderer/shapes";
import { BlockHeader, DiagramDivider, MessageArrow, NoteBoxSvg, noteH, noteW, SelfArrow, selfMessageH, SvgDefs } from "./renderer/elements";
import { InteractiveHoverLayer } from "./renderer/InteractiveHoverLayer";
import { ArrowDragLayer, type MessageEndpoint } from "./renderer/ArrowDragLayer";


// ─────────────────────────────────────────────────────────────────────────────
// parser/tokenizer.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// parser/parser.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// parser/serializer.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// theme/index.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// layout/colwidth.ts  —  dynamic column width from message labels
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// layout/shapes.ts  —  FIX #1: per-shape bottom offset for lifeline attachment
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// renderer/shapes.tsx  —  participant icon primitives
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// renderer/elements.tsx  —  SVG primitives
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// renderer/SequenceDiagram.tsx  —  PASS 2: walk AST, emit SVG at explicit y
// ─────────────────────────────────────────────────────────────────────────────

interface DrawCtx {
  aliasToX: Record<string, number>;
  diagramX1: number;
  diagramX2: number;
}

function splitLabel(l: string): string[] { return l.split("\\n"); }

function getBlockBounds(s: StatementNode, aliasToX: Record<string, number>, diagramX1: number, diagramX2: number, depth: number): { bx1: number, bx2: number } {
  const indent = depth * 5;
  let minX = Infinity, maxX = -Infinity;
  let found = false;

  function update(x: number) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    found = true;
  }

  function visit(stmts: StatementNode[]) {
    for (const st of stmts) {
      if (st.type === "MESSAGE") {
        if (aliasToX[st.from] !== undefined) update(aliasToX[st.from]);
        if (aliasToX[st.to] !== undefined) update(aliasToX[st.to]);
      } else if (st.type === "NOTE") {
        if (st.p1 && aliasToX[st.p1] !== undefined) update(aliasToX[st.p1]);
        if (st.p2 && aliasToX[st.p2] !== undefined) update(aliasToX[st.p2]);
      } else if (st.type === "ALT_BLOCK" || st.type === "GROUP_BLOCK" || st.type === "LOOP_BLOCK") {
        const childBounds = getBlockBounds(st, aliasToX, diagramX1, diagramX2, depth + 1);
        update(childBounds.bx1 + BLOCK_PAD_X - 8);
        update(childBounds.bx2 - BLOCK_PAD_X + 8);
      }
    }
  }

  if (s.type === "ALT_BLOCK") {
    s.branches.forEach(b => visit(b.statements));
  } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
    visit(s.statements);
  }

  if (found) {
    return {
      bx1: Math.max(diagramX1 + indent, minX - BLOCK_PAD_X),
      bx2: Math.min(diagramX2 - indent, maxX + BLOCK_PAD_X)
    };
  }
  return { bx1: diagramX1 + indent, bx2: diagramX2 - indent };
}

function drawStmt(s: StatementNode, y: number, ctx: DrawCtx, depth: number): { node: React.ReactNode; h: number } {

  const { aliasToX, diagramX1, diagramX2 } = ctx;
  const indent = depth * 5;
  let bx1 = diagramX1 + indent;
  let bx2 = diagramX2 - indent;

  if (s.type === "ALT_BLOCK" || s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
    const bounds = getBlockBounds(s, aliasToX, diagramX1, diagramX2, depth);
    bx1 = bounds.bx1;
    bx2 = bounds.bx2;
  }
  const bw = bx2 - bx1;

  switch (s.type) {

    case "MESSAGE": {
      const isBack = s.arrow.startsWith("<");
      const fromX = aliasToX[s.from] ?? 0;
      const toX = aliasToX[s.to] ?? 0;
      const isSelf = s.from === s.to;

      if (isSelf) {
        const rawLines = s.label ? splitLabel(s.label) : [];
        const dispLines = s.autoNum !== null
          ? (rawLines.length ? [`${s.autoNum}. ${rawLines[0]}`, ...rawLines.slice(1)] : [`${s.autoNum}.`])
          : rawLines;
        const h = selfMessageH(dispLines);
        return {
          node: <SelfArrow key={`msg-${s.idx}`}
            cx={fromX} y={y}
            dashed={s.arrow.includes("--")}
            rawLabel={s.label} autoNum={s.autoNum} idx={s.idx}
            arrowBack={true} node={s} />,
          h,
        };
      }

      const x1 = isBack ? toX : fromX;
      const x2 = isBack ? fromX : toX;
      const lineCount = s.label ? splitLabel(s.label).length : 0;
      const h = MSG_H + Math.max(0, lineCount - 1) * MSG_LINE_H;
      return {
        node: <MessageArrow key={`msg-${s.idx}`}
          x1={x1} y={y} x2={x2}
          dashed={s.arrow.includes("--")}
          rawLabel={s.label} autoNum={s.autoNum} idx={s.idx} node={s} />,
        h,
      };
    }

    case "NOTE": {
      const nh = noteH(s.lines);
      let nx: number, ny: number, nw: number;

      if (s.position === "across") {
        // Force note to span the full diagram width
        nx = bx1 + 4;
        nw = bx2 - bx1 - 8;
        ny = y + 4;
      } else if (s.position === "over") {
        nw = noteW(s.lines);
        const x1 = s.p1 ? (aliasToX[s.p1] ?? 0) : 0, x2 = s.p2 ? (aliasToX[s.p2] ?? x1) : x1;
        nx = Math.min(x1, x2) - nw / 2;
        ny = y + 4;
      } else {
        // "left of X" / "right of X" — p1 is an explicit participant alias (NOTE_INLINE/NOTE_START with "of")
        // bare "note left" / "note right" — p1 resolved from the preceding message (NOTE_BARE_*)
        // We distinguish by checking whether p1 came from an explicit "of" clause:
        // NOTE_INLINE/NOTE_START tokenized with "of" always set p1.
        // NOTE_BARE_* set p1 = ref.current participant, but bare notes should float beside the arrow.
        // Both end up with position="left"|"right" and a p1.
        // Heuristic: if p1 is set AND the source was "of" syntax, it's a named note → place at y.
        //            If it's a bare note, the parser sets p1 from ref.current — same p1 but different intent.
        // We can't tell them apart from the AST alone, so we treat ALL left/right notes the same:
        // just place them at current y beside the participant, which is correct for both cases.
        nw = noteW(s.lines);
        const px = s.p1 ? (aliasToX[s.p1] ?? 0) : (s.position === "left" ? bx1 : bx2);
        nx = s.position === "left"
          ? px - nw - 8
          : px + 8;
        ny = y + 4;
      }

      const noteBottom = ny + nh + 4;
      return {
        node: <NoteBoxSvg key={`note-${y}`} x={nx} y={ny} w={s.position === "across" ? nw : undefined} lines={s.lines} color={s.color} node={s} />,
        h: noteBottom - y,
      };
    }


    case "DIVIDER": {
      return {
        node: <DiagramDivider key={`div-${y}`} x1={bx1} y={y} x2={bx2} label={s.label} node={s} />,
        h: DIVIDER_H,
      };
    }

    case "ALT_BLOCK": {
      const elems: React.ReactNode[] = [];
      let cy = y;
      s.branches.forEach((branch, bi) => {
        const isFirst = bi === 0;
        const kw = isFirst ? "alt" : "else";
        const cond = branch.condition ? `[${branch.condition}]` : "[else]";
        elems.push(
          <BlockHeader key={`alt-hdr-${bi}`} x={bx1} y={cy} w={bw}
            keyword={kw} condition={cond} stroke={C.altBorder}
            headerFill={isFirst ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"}
            labelColor={C.altLabel} nodeId={`${s.id}:${bi}`} />
        );
        cy += BLOCK_HDR_H + BLOCK_PAD_Y;
        const inner = drawBlock(branch.statements, cy, ctx, depth + 1);
        elems.push(...inner.nodes);
        cy += inner.h + BLOCK_PAD_Y;
        if (bi < s.branches.length - 1) {
          elems.push(
            <line key={`alt-sep-${bi}`} x1={bx1} y1={cy} x2={bx1 + bw} y2={cy}
              stroke={C.altBorder} strokeWidth={1} strokeDasharray="4,3" className="alt-separator" />
          );
        }
      });
      const totalH = cy - y;
      const { selectedNodeId } = useDiagram();
      const isSelected = selectedNodeId === s.id;
      return {
        node: (
          <g key={`alt-${y}`} className="alt-block">
            {/* Border stroke — painted before inner content so notes render on top */}
            <rect x={bx1} y={y} width={bw} height={totalH} fill="none"
              stroke={isSelected ? "#fff" : C.altBorder} strokeWidth={isSelected ? 2 : 1} rx={3} className="alt-border" />
            {elems}
          </g>
        ),
        h: totalH,
      };
    }

    case "GROUP_BLOCK": {
      const inner = drawBlock(s.statements, y + BLOCK_HDR_H + BLOCK_PAD_Y, ctx, depth + 1);
      const totalH = BLOCK_HDR_H + inner.h + BLOCK_PAD_Y;
      const { selectedNodeId } = useDiagram();
      const isSelected = selectedNodeId === s.id;
      return {
        node: (
          <g key={`grp-${y}`} className="group-block">
            <rect x={bx1} y={y} width={bw} height={totalH} fill="none"
              stroke={isSelected ? "#fff" : C.groupBorder} strokeWidth={isSelected ? 2 : 1} rx={3} />
            <BlockHeader x={bx1} y={y} w={bw} keyword="group" condition={s.label}
              stroke={C.groupBorder} headerFill="rgba(99,102,241,0.12)" labelColor={C.groupLabel} nodeId={s.id} />
            {inner.nodes}
          </g>
        ),
        h: totalH,
      };
    }

    case "LOOP_BLOCK": {
      const inner = drawBlock(s.statements, y + BLOCK_HDR_H + BLOCK_PAD_Y, ctx, depth + 1);
      const totalH = BLOCK_HDR_H + inner.h + BLOCK_PAD_Y;
      const ix = bx1 + bw - 18, iy = y + BLOCK_HDR_H / 2;
      const { selectedNodeId } = useDiagram();
      const isSelected = selectedNodeId === s.id;
      return {
        node: (
          <g key={`loop-${y}`} className="loop-block">
            <rect x={bx1} y={y} width={bw} height={totalH} fill="none"
              stroke={isSelected ? "#fff" : C.loopBorder} strokeWidth={isSelected ? 2 : 1} rx={3} />
            <BlockHeader x={bx1} y={y} w={bw} keyword="loop" condition={s.label}
              stroke={C.loopBorder} headerFill="rgba(52,211,153,0.08)" labelColor={C.loopLabel} nodeId={s.id} />
            <path d={`M${ix} ${iy - 5} A5 5 0 1 1 ${ix - 5} ${iy}`}
              stroke={C.loopLabel} strokeWidth={1.5} fill="none" className="loop-icon-arc" />
            <polygon points={`${ix - 5},${iy - 8} ${ix - 9},${iy} ${ix - 1},${iy}`}
              fill={C.loopLabel} className="loop-icon-head" />
            {inner.nodes}
          </g>
        ),
        h: totalH,
      };
    }

    default: return { node: null, h: 0 };
  }
}

function drawBlock(stmts: StatementNode[], startY: number, ctx: DrawCtx, depth: number): { nodes: React.ReactNode[]; h: number } {
  const nodes: React.ReactNode[] = [];
  let y = startY;
  for (const s of stmts) {
    const { node, h } = drawStmt(s, y, ctx, depth);
    nodes.push(node);
    y += h + GAP;
  }
  return { nodes, h: y - startY };
}

// ── Box bands ─────────────────────────────────────────────────────────────────


function drawBoxBands(
  boxes: BoxDeclNode[],
  aliasToX: Record<string, number>,
  declMap: Record<string, Participant>,
  colCenters: number[],
  gapW: number[],
  y1: number, y2: number,
  depth = 0
): React.ReactNode[] {
  return boxes.flatMap((box, bi) => {
    const aliases = box.allAliases.filter(a => aliasToX[a] !== undefined);
    if (!aliases.length) return [];

    // Column indices owned by this box
    const ownedIdxs = aliases
      .map(a => colCenters.findIndex(cx => Math.abs(cx - aliasToX[a]) < 0.5))
      .filter(i => i >= 0);
    if (!ownedIdxs.length) return [];
    const loIdx = Math.min(...ownedIdxs);
    const hiIdx = Math.max(...ownedIdxs);

    // Tight shape edges
    let lEdge = Infinity, rEdge = -Infinity;
    for (const a of aliases) {
      const cx = aliasToX[a];
      const p = declMap[a];
      const hw = p ? shapeHalfW(p.kind, p.name, p.stereoType) : 14;
      lEdge = Math.min(lEdge, cx - hw);
      rEdge = Math.max(rEdge, cx + hw);
    }

    // Padding around shapes.
    let lx = lEdge - BOX_SHAPE_PAD;
    let rx = rEdge + BOX_SHAPE_PAD;

    // Hard boundaries at the midpoint between this box and its neighbours
    const hardL = loIdx > 0
      ? (colCenters[loIdx - 1] + colCenters[loIdx]) / 2 + BOX_GAP
      : 2;
    const hardR = hiIdx < colCenters.length - 1
      ? (colCenters[hiIdx] + colCenters[hiIdx + 1]) / 2 - BOX_GAP
      : Infinity;

    lx = Math.max(lx, hardL);
    if (hardR !== Infinity) rx = Math.min(rx, hardR);

    // Pass 4 in computeColWidths pre-expanded the gap so the title fits.
    // Now grow lx/rx symmetrically (within hard limits) to actually use that space.
    if (box.title) {
      const titleW = box.title.length * 7.5 + 24;
      if (titleW > rx - lx) {
        const deficit = titleW - (rx - lx);
        const maxRight = hardR === Infinity ? lx + titleW : hardR;
        const takeR = Math.min(deficit / 2, maxRight - rx);
        const takeL = Math.min(deficit - takeR, lx - hardL);
        const takeR2 = Math.min(deficit - takeL, maxRight - rx);
        rx += takeR2;
        lx -= takeL;
      }
    }

    const bw = rx - lx;
    const rgb = resolveBoxRGB(box.color);

    const elems: React.ReactNode[] = [
      <rect key={`box-bg-${depth}-${bi}`} x={lx} y={y1} width={bw} height={y2 - y1}
        fill={C.bg} stroke={C.border}
        strokeWidth={1.5} rx={4} className="box-band" />,
      <rect key={`box-color-${depth}-${bi}`} x={lx} y={y1} width={bw} height={y2 - y1}
        fill={`rgba(${rgb},0.30)`} stroke="none" rx={4} />,
    ];
    if (box.title) {
      // Clip title to box width with SVG clipPath isn't easy; instead just render it
      // centered — if title is slightly wider than box it overflows symmetrically which is fine
      elems.push(
        <text key={`box-title-${depth}-${bi}`}
          x={lx + bw / 2} y={y1 + 15}
          textAnchor="middle" fontSize={11} fontWeight="bold"
          fill={C.text} className="box-title">{box.title}</text>
      );
    }
    const childY1 = y1 + (box.title ? BOX_TITLE_H : 4);
    elems.push(...drawBoxBands(box.children, aliasToX, declMap, colCenters, gapW, childY1, y2, depth + 1));
    return elems;
  });
}

// ── Main SequenceDiagram component ────────────────────────────────────────────
export function SequenceDiagram({
  enableHoverLayer = true,
  enableDragLayer = true,
  stickyParticipants = true,
  stickyParticipantsBackground = true
}: {
  enableHoverLayer?: boolean;
  enableDragLayer?: boolean;
  stickyParticipants?: boolean;
  stickyParticipantsBackground?: boolean;
} = {}) {
  const { ast } = useDiagram();
  if (!ast) return null;
  const { participants, statements, boxes, declMap, title } = ast;
  if (!participants.length) return null;

  const { diagramPadding } = useDiagram();
  const padTop = diagramPadding?.top ?? 0;
  const padRight = diagramPadding?.right ?? 0;
  const padBottom = diagramPadding?.bottom ?? 0;
  const padLeft = diagramPadding?.left ?? 0;

  const N = participants.length;

  // gapW[g] = pixel distance between center of col g and col g+1  (length N-1)
  const gapW = computeColWidths(participants, statements, boxes, declMap);

  // Edge margins: half of the adjacent gap (so shapes don't clip the svg edge)
  const edgeL = N > 1 ? Math.max(COL_MIN_W / 2, gapW[0] / 2) : COL_MIN_W / 2;
  const edgeR = N > 1 ? Math.max(COL_MIN_W / 2, gapW[N - 2] / 2) : COL_MIN_W / 2;

  // Absolute column centers: col[0] = edgeL, col[i] = col[i-1] + gapW[i-1]
  const colCenters: number[] = [];
  colCenters.push(edgeL);
  for (let i = 1; i < N; i++) colCenters.push(colCenters[i - 1] + gapW[i - 1]);

  // Compute how far "note left" notes extend to the left of column 0.
  // If any extend past x=0, we need to add left padding so they aren't clipped.
  const aliasIdx: Record<string, number> = {};
  participants.forEach((p, i) => { aliasIdx[p.alias] = i; });

  function calcLeftOverflow(stmts: StatementNode[]): number {
    let overflow = 0;
    for (const s of stmts) {
      if (s.type === "NOTE" && s.position) {
        const nw = noteW(s.lines);
        let noteLeft = 0;
        const idx1 = s.p1 ? aliasIdx[s.p1] ?? -1 : -1;
        const idx2 = s.p2 ? aliasIdx[s.p2] ?? -1 : -1;
        const cx1 = idx1 >= 0 ? colCenters[idx1] : 0;
        const cx2 = idx2 >= 0 ? colCenters[idx2] : colCenters[N - 1] + edgeR;

        if (s.position === "left" && idx1 >= 0) {
          noteLeft = cx1 - nw - 8;
        } else if (s.position === "over") {
          if (idx2 >= 0 && idx1 >= 0) {
            const minX = Math.min(cx1, cx2);
            const maxX = Math.max(cx1, cx2);
            noteLeft = minX + (maxX - minX) / 2 - nw / 2;
          } else if (idx1 >= 0) {
            noteLeft = cx1 - nw / 2;
          }
        } else if (s.position === "across") {
          noteLeft = (colCenters[N - 1] + edgeR) / 2 - nw / 2;
        }

        if (noteLeft < 0) overflow = Math.max(overflow, -noteLeft + 8);
      }
      if (s.type === "ALT_BLOCK") s.branches.forEach(b => { overflow = Math.max(overflow, calcLeftOverflow(b.statements)); });
      if (s.type === "GROUP_BLOCK") overflow = Math.max(overflow, calcLeftOverflow(s.statements));
      if (s.type === "LOOP_BLOCK") overflow = Math.max(overflow, calcLeftOverflow(s.statements));
    }
    return overflow;
  }
  const svgPadL = calcLeftOverflow(statements) + padLeft;

  // Shift all column centers right by svgPadL to make room for left-side notes
  const shiftedCenters = colCenters.map(x => x + svgPadL);
  const totalW = shiftedCenters[N - 1] + edgeR + padRight;

  const aliasToX: Record<string, number> = {};
  participants.forEach((p, i) => { aliasToX[p.alias] = shiftedCenters[i]; });

  // Box title extra height
  const hasBoxes = boxes.length > 0;
  let titleHOffset = padTop;
  if (title) titleHOffset += 40;
  const maxBDepth = hasBoxes ? Math.max(...boxes.map(boxDepth)) : 0;
  const boxTitleH = maxBDepth * BOX_TITLE_H + titleHOffset;

  const headerPartCY = boxTitleH + PART_H / 2;
  const timelineY = boxTitleH + PART_H + GAP;

  const ctx: DrawCtx = { aliasToX, diagramX1: 0, diagramX2: totalW };
  const { nodes: timelineNodes, h: timelineH } = drawBlock(statements, timelineY, ctx, 0);

  // Compute y-slots for each top-level statement (for horizontal + button snapping)
  interface StatementSlot { id: string; yMid: number; yBottom: number; }
  const statementSlots: StatementSlot[] = [];
  {
    let sy = timelineY;
    for (const s of statements) {
      const drawn = (() => {
        try {
          // We already computed this in drawBlock; replicate height here
          const tmp = { aliasToX, diagramX1: 0, diagramX2: totalW };
          // Import the drawStmt output height via drawBlock on a single statement
          const r = drawBlock([s], sy, tmp, 0);
          return r.h;
        } catch { return GAP; }
      })();
      const stmtH = drawn || GAP;
      statementSlots.push({ id: s.id, yMid: sy + stmtH / 2, yBottom: sy + stmtH });
      sy += stmtH + GAP;
    }
  }

  // Alias at each column index (parallel to shiftedCenters)
  const aliasAtIndex = participants.map(p => p.alias);

  // Compute message endpoints for drag-to-reroute — recursive through all block types
  const messageEndpoints: MessageEndpoint[] = [];
  {
    function collectEndpoints(stmts: typeof statements, startY: number, depth: number): number {
      let sy = startY;
      for (const s of stmts) {
        if (s.type === "MESSAGE") {
          const isSelf = s.from === s.to;
          const rawLines = s.label ? s.label.split("\\n") : [];
          const dispLines = s.autoNum !== null
            ? (rawLines.length ? [`${s.autoNum}. ${rawLines[0]}`, ...rawLines.slice(1)] : [`${s.autoNum}.`])
            : rawLines;
          const nExtra = Math.max(0, dispLines.length - 1);
          const rowH = isSelf
            ? (() => { const labelH = dispLines.length > 0 ? 20 + dispLines.length * 14 + 6 : 20; return labelH + SELF_LOOP_H + 8; })()
            : MSG_H + nExtra * MSG_LINE_H;
          const arrowY = isSelf ? sy + rowH - 8 : sy + rowH - MSG_ARROW_BOT;
          const fromX = aliasToX[s.from] ?? 0;
          const toX = aliasToX[s.to] ?? fromX;
          messageEndpoints.push({ id: s.id, fromAlias: s.from, toAlias: s.to, fromX, toX, arrowY, isSelf, selfCX: fromX });
          sy += rowH + GAP;
        } else if (s.type === "ALT_BLOCK") {
          let by = sy;
          s.branches.forEach(branch => {
            by += BLOCK_HDR_H + BLOCK_PAD_Y;
            const innerH = collectEndpoints(branch.statements, by, depth + 1);
            by += innerH + BLOCK_PAD_Y;
          });
          sy += (by - sy) + GAP;
        } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
          const innerStart = sy + BLOCK_HDR_H + BLOCK_PAD_Y;
          const innerH = collectEndpoints(s.statements, innerStart, depth + 1);
          // drawStmt GROUP/LOOP: totalH = BLOCK_HDR_H + inner.h + BLOCK_PAD_Y
          // inner.h starts from innerStart, so innerH already accounts for BLOCK_PAD_Y offset
          sy += BLOCK_HDR_H + innerH + BLOCK_PAD_Y + GAP;
        } else {
          // drawBlock returns h = stmtH + GAP already, so no extra GAP needed
          const r = drawBlock([s], sy, ctx, 0);
          sy += r.h;
        }
      }
      return sy - startY;
    }
    collectEndpoints(statements, timelineY, 0);
  }

  const footerY = timelineY + timelineH + GAP;
  const totalH = footerY + PART_H + 8 + padBottom;

  // Lifeline endpoints — use shiftedCenters
  const lifelineSegs = participants.map((p, i) => ({
    x: shiftedCenters[i],
    y1: headerPartCY + shapeBottomOffset(p.kind, !!p.stereoType),
    y2: footerY + PART_H / 2 - shapeTopOffset(p.kind, !!p.stereoType),
  }));

  const { setSelectedNodeId, setClickPosition } = useDiagram();
  const zoomPan = useZoomPan(); // null when used without ZoomPanContainer

  const svgRef = useRef<SVGSVGElement>(null);
  const hoverLinesRef = useRef<SVGGElement>(null);
  const vLineRef = useRef<SVGLineElement>(null);
  const hLineRef = useRef<SVGLineElement>(null);
  const addBtnGroupRef = useRef<SVGGElement>(null);       // vertical + button (participant insert)
  const hAddBtnGroupRef = useRef<SVGGElement>(null);      // horizontal + button (statement insert)
  const lastInsertIndexRef = useRef<number>(-1);
  const lastHoverAfterIdRef = useRef<string | null>(null);
  const participantsHeaderRef = useRef<SVGGElement>(null); // sticky header participants

  // ── Sticky top participants via RAF ───────────────────────────────────────
  // Reads zoomPanRef.current each frame — zero React re-renders.
  useEffect(() => {
    if (!stickyParticipants || !zoomPan) return;
    let rafId: number;
    let lastY = 0;
    function tick() {
      rafId = requestAnimationFrame(tick);
      const g = participantsHeaderRef.current;
      if (!g) return;
      const { pan, zoom } = zoomPan!.current;
      // Visible SVG top = -pan.y / zoom
      const visibleTopSvg = -pan.y / zoom;
      // extraOffset: clear the + button circle (r=12) with 4px gap above + below = 28px total
      const extraOffset = (4 + 12 + 4) / zoom;
      const originalTop = headerPartCY - PART_H / 2;
      const stickyY = Math.max(0, visibleTopSvg - originalTop + extraOffset);
      if (Math.abs(stickyY - lastY) > 0.1) {
        lastY = stickyY;
        const transform = stickyY > 0 ? `translate(0, ${stickyY})` : "";
        g.setAttribute("transform", transform);

        // fade in backdrop if sticky and stretch to top corner
        if (stickyParticipantsBackground) {
          const backdrop = g.querySelector(".sticky-backdrop") as SVGForeignObjectElement;
          if (backdrop) {
            const localTop = visibleTopSvg - stickyY;
            const localBottom = headerPartCY + PART_H / 2 + 8;
            backdrop.setAttribute("y", localTop.toString());
            backdrop.setAttribute("height", Math.max(0, localBottom - localTop).toString());
            // fade from 0 to 1 over the first 10px of scroll
            const opacity = Math.min(1, stickyY / 10);
            backdrop.style.opacity = opacity.toString();
          }
        }
      }
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [stickyParticipants, zoomPan, headerPartCY]);

  const [popover, setPopover] = useState<{ x: number, y: number, insertIdx: number } | null>(null);
  const [hStatementPopover, setHStatementPopover] = useState<{ x: number, y: number, afterId: string | null } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (popover || hStatementPopover) return;
    if (!svgRef.current || !hoverLinesRef.current || !vLineRef.current || !hLineRef.current || !addBtnGroupRef.current) return;

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const cursorPt = pt.matrixTransform(ctm.inverse());
    const nx = cursorPt.x;
    const ny = cursorPt.y;

    hoverLinesRef.current.style.display = "block";

    vLineRef.current.setAttribute("x1", String(nx));
    vLineRef.current.setAttribute("x2", String(nx));
    hLineRef.current.setAttribute("y1", String(ny));
    hLineRef.current.setAttribute("y2", String(ny));

    // Vertical + button: tracks x, fixed at top
    let insertIdx = 0;
    while (insertIdx < shiftedCenters.length && nx > shiftedCenters[insertIdx]) {
      insertIdx++;
    }
    lastInsertIndexRef.current = insertIdx;

    // Clamp + buttons to the visible viewport.
    // If inside ZoomPanContainer we can compute the visible SVG area from pan/zoom.
    // Otherwise fall back to hardcoded positions.
    let clampedTopY = 10;
    let clampedRightX = totalW - 20;
    if (zoomPan) {
      const { pan, zoom, containerWidth } = zoomPan.current;
      // ── Vertical + button: keep at the visible top edge ───────────────
      const visibleTopSvg = -pan.y / zoom;
      clampedTopY = Math.max(visibleTopSvg + 4 / zoom, 4);

      // ── Horizontal + button: only push left if actually off-screen ────
      const defaultScreenX = pan.x + (totalW - 20) * zoom;
      if (defaultScreenX > containerWidth) {
        clampedRightX = (containerWidth - 20 - pan.x) / zoom;
      }
    }

    addBtnGroupRef.current.setAttribute("transform", `translate(${nx}, ${clampedTopY})`);

    // Horizontal + button: tracks y, fixed at right edge
    if (hAddBtnGroupRef.current) {
      // Find the nearest slot: pick the slot whose midpoint is closest to ny
      let bestId: string | null = null;
      if (statementSlots.length > 0) {
        // If cursor is above the first statement, afterId = null (insert at top)
        if (ny < statementSlots[0].yMid) {
          bestId = null;
        } else {
          // Walk through slots and pick the one whose midpoint we've passed
          bestId = statementSlots[statementSlots.length - 1].id;
          for (let i = 0; i < statementSlots.length - 1; i++) {
            const midBetween = (statementSlots[i].yBottom + statementSlots[i + 1].yMid) / 2;
            if (ny < midBetween) {
              bestId = statementSlots[i].id;
              break;
            }
          }
        }
      }
      lastHoverAfterIdRef.current = bestId;
      hAddBtnGroupRef.current.setAttribute("transform", `translate(${clampedRightX}, ${ny})`);
    }
  };

  const handleMouseLeave = () => {
    if (popover || hStatementPopover) return;
    if (hoverLinesRef.current) {
      hoverLinesRef.current.style.display = "none";
    }
  };

  useEffect(() => {
    // Close participant popover when clicking anywhere else
    if (!popover) return;
    const closePopover = () => setPopover(null);
    document.addEventListener("click", closePopover);
    return () => document.removeEventListener("click", closePopover);
  }, [popover]);

  useEffect(() => {
    // Close statement popover when clicking anywhere else
    if (!hStatementPopover) return;
    const close = () => setHStatementPopover(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [hStatementPopover]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement;
      const clickable = target.closest('[data-id]');

      if (clickable) {
        const id = clickable.getAttribute('data-id');
        if (id) {
          setSelectedNodeId(id);
          setClickPosition({
            x: e.clientX,
            y: e.clientY,
          });
          return;
        }
      }

      const svg = target.closest('svg.sequence-diagram');
      if (svg && !clickable) {
        setSelectedNodeId(null);
        setClickPosition(null);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [setSelectedNodeId, setClickPosition]);

  return (
    <svg
      ref={svgRef}
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="sequence-diagram"
      style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", overflow: "visible", display: "block", position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <SvgDefs />

      {/* Diagram Title */}
      {title && (
        <text x={totalW / 2} y={padTop + 24} textAnchor="middle" fontSize={18} fontWeight="bold" fill={C.text}>
          {title}
        </text>
      )}

      {/* Box bands — drawn first (lowest layer) */}
      {hasBoxes && (
        <g className="box-bands">
          {drawBoxBands(boxes, aliasToX, declMap, shiftedCenters, gapW, titleHOffset, totalH - padBottom)}
        </g>
      )}

      {/* Lifelines — drawn second, block headers will paint over them */}
      <g className="lifelines">
        {lifelineSegs.map((seg, i) => (
          <line key={i} x1={seg.x} y1={seg.y1} x2={seg.x} y2={seg.y2}
            stroke={C.lifeline} strokeWidth={1} strokeDasharray="6,4"
            className="lifeline" />
        ))}
      </g>

      {/* Timeline — blocks have opaque background rects that cover lifelines */}
      <g className="timeline">
        {timelineNodes}
      </g>

      {/* Header participant shapes — drawn AFTER timeline so always on top */}
      <g ref={participantsHeaderRef} className="participants-header">
        {/* Glassmorphism backdrop — dynamically resized in RAF to cover from viewport top */}
        {stickyParticipantsBackground && (
          <foreignObject
            className="sticky-backdrop"
            x={0}
            y={0}
            width={totalW}
            height={0}
            style={{ opacity: 0, pointerEvents: "none" }}
          >
            <div style={{
              width: "100%",
              height: "100%",
              backgroundColor: "var(--c-bg)",
              opacity: 0.8,
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)"
            }} />
          </foreignObject>
        )}
        {participants.map((p, i) => (
          <ParticipantShape key={p.alias} kind={p.kind} name={p.name}
            cx={shiftedCenters[i]} cy={headerPartCY} stroke={C.accent} stereoType={p.stereoType} fill={p.color} dataId={`participant:${p.alias}`} />
        ))}
      </g>

      {/* Footer participant shapes */}
      <g className="participants-footer">
        {participants.map((p, i) => (
          <ParticipantShape key={p.alias} kind={p.kind} name={p.name}
            cx={shiftedCenters[i]} cy={footerY + PART_H / 2} stroke={C.accent} stereoType={p.stereoType} fill={p.color} dataId={`participant:${p.alias}`} />
        ))}
      </g>

      {enableHoverLayer && (
        <InteractiveHoverLayer
          totalW={totalW}
          totalH={totalH}
          shiftedCenters={shiftedCenters}
          hoverLinesRef={hoverLinesRef}
          vLineRef={vLineRef}
          hLineRef={hLineRef}
          addBtnGroupRef={addBtnGroupRef}
          hAddBtnGroupRef={hAddBtnGroupRef}
          lastInsertIndexRef={lastInsertIndexRef}
          lastHoverAfterIdRef={lastHoverAfterIdRef}
          popover={popover}
          setPopover={setPopover}
          hStatementPopover={hStatementPopover}
          setHStatementPopover={setHStatementPopover}
        />
      )}

      {enableDragLayer && (
        <ArrowDragLayer
          messageEndpoints={messageEndpoints}
          shiftedCenters={shiftedCenters}
          aliasAtIndex={aliasAtIndex}
          svgRef={svgRef}
        />
      )}
    </svg>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// Interactivity Context & Hooks
// Diagram actions have been moved to src/browser-based-plantuml-generator/DiagramActions.tsx

// ─────────────────────────────────────────────────────────────────────────────
// Diagram Actions UI
// ─────────────────────────────────────────────────────────────────────────────

// Diagram actions popup have been moved to src/browser-based-plantuml-generator/DiagramActions.tsx

// Contexts are defined in src/browser-based-plantuml-generator

// ─────────────────────────────────────────────────────────────────────────────
// App.tsx
// ─────────────────────────────────────────────────────────────────────────────
