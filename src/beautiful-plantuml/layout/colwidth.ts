// ─────────────────────────────────────────────────────────────────────────────
// layout/colwidth.ts  —  dynamic column width from message labels
//
// Algorithm (matches real PlantUML behaviour):
//
//   1. Start every gap at COL_MIN_W.
//   2. For each message (lo → hi):
//        needed = labelPixelWidth + COL_PAD*2
//        For a DIRECT (single-gap) message: gap[lo] = max(gap[lo], needed)
//        For a MULTI-gap message: if sum(gap[lo..hi-1]) < needed,
//          expand only gap[hi-1] (the last gap before the target) to make up
//          the shortfall.  All earlier gaps keep their individually-computed min.
//   3. After all messages, clamp every gap to ≥ COL_MIN_W and also ensure
//      each participant's name fits in the adjacent gap half-widths.
//
// Result: only the gap that a long label directly crosses grows — all others
// stay at their own minimum, matching image 2 from the reference.
// ─────────────────────────────────────────────────────────────────────────────

import type { BoxDeclNode, Participant, StatementNode } from "../types";
import { shapeHalfW, stripRichText } from "../utils";
import { BOX_SHAPE_PAD, CHAR_W, COL_MIN_W, COL_PAD, SELF_LOOP_W } from "./constants";

function estLabelW(label: string, autoNum: string | number | null): number {
  const prefix = autoNum !== null ? `${autoNum}. ` : "";
  const lines = label.split("\\n");
  const first = prefix + lines[0];
  const longest = lines.slice(1).reduce((a, b) => stripRichText(b).length > stripRichText(a).length ? b : a, first);
  return stripRichText(longest).length * CHAR_W;
}

export function computeColWidths(
  participants: Participant[],
  statements: StatementNode[],
  boxes: BoxDeclNode[],
  declMap: Record<string, Participant>
): number[] {
  const N = participants.length;
  if (N <= 1) return [COL_MIN_W];

  const aliasIdx: Record<string, number> = {};
  participants.forEach((p, i) => { aliasIdx[p.alias] = i; });

  const gapW = new Array(N - 1).fill(COL_MIN_W) as number[];

  interface MsgConstraint { lo: number; hi: number; needed: number; }
  const constraints: MsgConstraint[] = [];

  function visitStmts(stmts: StatementNode[]) {
    for (const s of stmts) {
      if (s.type === "MESSAGE") {
        const fi = aliasIdx[s.from] ?? 0;
        const ti = aliasIdx[s.to] ?? 0;
        if (fi === ti) {
          // Self-message: the loop + label extends to the RIGHT of the participant.
          // The gap to the right neighbor must be >= SELF_LOOP_W + label_width + margin.
          // If this is the rightmost column (no right neighbor), no constraint needed.
          if (fi < N - 1) {
            const tw = estLabelW(s.label, s.autoNum);
            const needed = SELF_LOOP_W + tw + COL_PAD;
            constraints.push({ lo: fi, hi: fi + 1, needed });
          }
          continue;
        }
        const lo = Math.min(fi, ti);
        const hi = Math.max(fi, ti);
        const tw = estLabelW(s.label, s.autoNum);
        const needed = tw + COL_PAD * 2;
        constraints.push({ lo, hi, needed });
      }
      if (s.type === "ALT_BLOCK") s.branches.forEach(b => visitStmts(b.statements));
      if (s.type === "GROUP_BLOCK") visitStmts(s.statements);
      if (s.type === "LOOP_BLOCK") visitStmts(s.statements);
    }
  }
  visitStmts(statements);

  // Pass 1 — direct single-gap messages
  for (const { lo, hi, needed } of constraints) {
    if (hi - lo === 1) gapW[lo] = Math.max(gapW[lo], needed);
  }

  // Pass 2 — multi-gap messages: expand last gap to cover shortfall
  const multiGap = constraints.filter(c => c.hi - c.lo > 1).sort((a, b) => (a.hi - a.lo) - (b.hi - b.lo));
  for (const { lo, hi, needed } of multiGap) {
    const cur = gapW.slice(lo, hi).reduce((a, b) => a + b, 0);
    if (cur < needed) gapW[hi - 1] += needed - cur;
  }

  // Pass 3 — participant shape/name fit
  for (let i = 0; i < N; i++) {
    const minGap = (stripRichText(participants[i].name).length * 4.0 + 22) * 2;
    if (i > 0 && gapW[i - 1] < minGap) gapW[i - 1] = minGap;
    if (i < N - 1 && gapW[i] < minGap) gapW[i] = minGap;
  }

  // Pass 4 — box titles: ensure each box's visual width fits its title.
  // Box interior = shapeHalfW(left) + internal gaps + shapeHalfW(right) + 2*BOX_SHAPE_PAD
  // If title is wider, expand the gap adjacent to the boundary side (or distribute
  // across internal gaps for multi-col boxes).
  function visitBoxes(bxs: BoxDeclNode[]) {
    for (const box of bxs) {
      if (box.title) {
        const aliases = box.allAliases.filter(a => aliasIdx[a] !== undefined);
        if (aliases.length) {
          const idxs = aliases.map(a => aliasIdx[a]);
          const loIdx = Math.min(...idxs);
          const hiIdx = Math.max(...idxs);

          const loAlias = aliases.find(a => aliasIdx[a] === loIdx)!;
          const hiAlias = aliases.find(a => aliasIdx[a] === hiIdx)!;
          const leftHW = declMap[loAlias] ? shapeHalfW(declMap[loAlias].kind, declMap[loAlias].name) : 14;
          const rightHW = declMap[hiAlias] ? shapeHalfW(declMap[hiAlias].kind, declMap[hiAlias].name) : 14;

          const internalSum = loIdx < hiIdx ? gapW.slice(loIdx, hiIdx).reduce((a, b) => a + b, 0) : 0;
          const interior = leftHW + internalSum + rightHW + BOX_SHAPE_PAD * 2;
          const titleW = stripRichText(box.title).length * 7.5 + 24;

          if (titleW > interior) {
            const deficit = titleW - interior;
            if (loIdx === hiIdx) {
              // Single-col box: expand gap to the right, fallback left
              if (loIdx < N - 1) gapW[loIdx] = Math.max(gapW[loIdx], gapW[loIdx] + deficit);
              else if (loIdx > 0) gapW[loIdx - 1] = Math.max(gapW[loIdx - 1], gapW[loIdx - 1] + deficit);
            } else {
              // Multi-col: distribute across internal gaps
              const perGap = deficit / (hiIdx - loIdx);
              for (let g = loIdx; g < hiIdx; g++) gapW[g] += perGap;
            }
          }
        }
      }
      visitBoxes(box.children);
    }
  }
  visitBoxes(boxes);

  return gapW;
}
