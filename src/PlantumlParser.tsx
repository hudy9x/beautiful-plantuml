// =============================================================================
// PlantUML Sequence Diagram Viewer  —  SVG renderer
// =============================================================================

import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// types/index.ts
// ─────────────────────────────────────────────────────────────────────────────

type ParticipantKind =
  | "participant" | "actor" | "boundary" | "control"
  | "entity" | "database" | "collections" | "queue";

const PARTICIPANT_KINDS: ParticipantKind[] = [
  "participant", "actor", "boundary", "control",
  "entity", "database", "collections", "queue",
];

interface Participant { alias: string; name: string; kind: ParticipantKind; stereoType?: string; color?: string; }
type ArrowType = "->" | "<-" | "-->" | "<--";
type NotePosition = "left" | "right" | "over" | "across";

type Token =
  | { type: "START" } | { type: "END" } | { type: "AUTONUMBER" }
  | { type: "END_NOTE" } | { type: "END_BOX" } | { type: "END_BLOCK" }
  | { type: "ELSE"; condition: string }
  | { type: "ALT"; condition: string }
  | { type: "GROUP"; label: string }
  | { type: "LOOP"; label: string }
  | { type: "BOX"; title: string | null; color: string | null }
  | { type: "DECLARATION"; kind: ParticipantKind; name: string; alias: string; stereoType?: string; color?: string; }
  | { type: "DIVIDER"; label: string }
  | { type: "MESSAGE"; from: string; arrow: ArrowType; to: string; label: string }
  | { type: "TEXT_LINE"; text: string }
  | { type: "NOTE_INLINE"; position: NotePosition; p1: string | null; p2: string | null; color: string | null; text: string }
  | { type: "NOTE_START"; position: NotePosition; p1: string | null; p2: string | null; color: string | null }
  | { type: "NOTE_BARE_INLINE"; position: "left" | "right"; color: string | null; text: string }
  | { type: "NOTE_BARE_START"; position: "left" | "right"; color: string | null };

interface MessageNode { type: "MESSAGE"; from: string; arrow: ArrowType; to: string; label: string; idx: number; leftAlias: string; rightAlias: string; }
interface NoteNode { type: "NOTE"; position: NotePosition; p1: string | null; p2: string | null; color: string | null; lines: string[]; }
interface DividerNode { type: "DIVIDER"; label: string; }
interface AltBranch { condition: string; statements: StatementNode[]; }
interface AltBlockNode { type: "ALT_BLOCK"; branches: AltBranch[]; }
interface GroupBlockNode { type: "GROUP_BLOCK"; label: string; statements: StatementNode[]; }
interface LoopBlockNode { type: "LOOP_BLOCK"; label: string; statements: StatementNode[]; }
interface BoxDeclNode { type: "BOX_DECL"; title: string | null; color: string | null; directAliases: string[]; children: BoxDeclNode[]; allAliases: string[]; }
type StatementNode = MessageNode | NoteNode | DividerNode | AltBlockNode | GroupBlockNode | LoopBlockNode | BoxDeclNode;
interface DiagramAST { autonumber: boolean; participants: Participant[]; declMap: Record<string, Participant>; statements: StatementNode[]; boxes: BoxDeclNode[]; errors: { line: number; text: string }[]; }

// ─────────────────────────────────────────────────────────────────────────────
// parser/tokenizer.ts
// ─────────────────────────────────────────────────────────────────────────────

function tokenizeLine(line: string): Token | null {
  const t = line.trim();
  if (!t) return null;
  if (t === "@startuml") return { type: "START" };
  if (t === "@enduml") return { type: "END" };
  if (t === "autonumber") return { type: "AUTONUMBER" };
  if (t === "end note") return { type: "END_NOTE" };
  if (t === "end box") return { type: "END_BOX" };
  if (t === "end") return { type: "END_BLOCK" };

  const boxM = t.match(/^box(?:\s+"([^"]*)"|\s+([^#\s]\S*))?(?:\s+(#\S+))?(?:\s+(#\S+))?$/i);
  if (boxM) return { type: "BOX", title: boxM[1] ?? boxM[2] ?? null, color: boxM[3] ?? boxM[4] ?? null };

  for (const kind of PARTICIPANT_KINDS) {
    const m = t.match(new RegExp(`^${kind}\\s+(?:"([^"]+)"|([^"\\s]+))(?:\\s+as\\s+(?:"([^"]+)"|([^"\\s]+)))?(?:\\s+<<\\s*(.+?)\\s*>>)?(?:\\s+(#\\S+))?$`, "i"));
    if (m) {
      const name = m[1] ?? m[2];
      const alias = m[3] ?? m[4] ?? name;
      return { type: "DECLARATION", kind: kind as ParticipantKind, name, alias, stereoType: m[5]?.trim(), color: m[6] };
    }
  }

  const divM = t.match(/^==+\s*(.+?)\s*==+$/);
  if (divM) return { type: "DIVIDER", label: divM[1].trim() };

  const nAcrossI = t.match(/^note\s+across\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nAcrossI) return { type: "NOTE_INLINE", position: "across", p1: null, p2: null, color: nAcrossI[1] ?? null, text: nAcrossI[2].trim() };
  const nAcrossM = t.match(/^note\s+across\s*(#\S+)?$/i);
  if (nAcrossM) return { type: "NOTE_START", position: "across", p1: null, p2: null, color: nAcrossM[1] ?? null };

  const nOfI = t.match(/^note\s+(left|right)\s+of\s+(\S+)\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nOfI) return { type: "NOTE_INLINE", position: nOfI[1].toLowerCase() as NotePosition, p1: nOfI[2], p2: null, color: nOfI[3] ?? null, text: nOfI[4].trim() };
  const nOfM = t.match(/^note\s+(left|right)\s+of\s+(\S+)\s*(#\S+)?$/i);
  if (nOfM) return { type: "NOTE_START", position: nOfM[1].toLowerCase() as NotePosition, p1: nOfM[2], p2: null, color: nOfM[3] ?? null };

  const nOverI = t.match(/^note\s+over\s+(\S+?)(?:\s*,\s*(\S+))?\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nOverI) return { type: "NOTE_INLINE", position: "over", p1: nOverI[1], p2: nOverI[2] ?? null, color: nOverI[3] ?? null, text: nOverI[4].trim() };
  const nOverM = t.match(/^note\s+over\s+(\S+?)(?:\s*,\s*(\S+))?\s*(#\S+)?$/i);
  if (nOverM) return { type: "NOTE_START", position: "over", p1: nOverM[1], p2: nOverM[2] ?? null, color: nOverM[3] ?? null };

  const nBareI = t.match(/^note\s+(left|right)\s*(#\S+)?\s*:\s*(.+)$/i);
  if (nBareI) return { type: "NOTE_BARE_INLINE", position: nBareI[1].toLowerCase() as "left" | "right", color: nBareI[2] ?? null, text: nBareI[3].trim() };
  const nBareM = t.match(/^note\s+(left|right)\s*(#\S+)?$/i);
  if (nBareM) return { type: "NOTE_BARE_START", position: nBareM[1].toLowerCase() as "left" | "right", color: nBareM[2] ?? null };

  const altM = t.match(/^alt\s+(.+)$/); if (altM) return { type: "ALT", condition: altM[1].trim() };
  const elseM = t.match(/^else(?:\s+(.+))?$/); if (elseM) return { type: "ELSE", condition: (elseM[1] ?? "").trim() };
  const grpM = t.match(/^group\s+(.+)$/); if (grpM) return { type: "GROUP", label: grpM[1].trim() };
  const loopM = t.match(/^loop\s+(.+)$/); if (loopM) return { type: "LOOP", label: loopM[1].trim() };

  const msgM = t.match(/^(\S+)\s*(->|<-|-->|<--)\s*(\S+)\s*:\s*(.+)$/);
  if (msgM) return { type: "MESSAGE", from: msgM[1], arrow: msgM[2] as ArrowType, to: msgM[3], label: msgM[4].trim() };
  const msgNoLabel = t.match(/^(\S+)\s*(->|<-|-->|<--)\s*(\S+)\s*$/);
  if (msgNoLabel) return { type: "MESSAGE", from: msgNoLabel[1], arrow: msgNoLabel[2] as ArrowType, to: msgNoLabel[3], label: "" };

  return { type: "TEXT_LINE", text: t };
}

// ─────────────────────────────────────────────────────────────────────────────
// parser/parser.ts
// ─────────────────────────────────────────────────────────────────────────────

function parse(input: string): DiagramAST {
  const tokens: (Token & { lineNo: number; raw: string })[] = [];
  input.split("\n").forEach((line, i) => {
    const t = tokenizeLine(line);
    if (t !== null) tokens.push({ ...t, lineNo: i + 1, raw: line });
  });
  let pos = 0, msgIdx = 0;
  const hasAutonumber = tokens.some(t => t.type === "AUTONUMBER");
  const declMap: Record<string, Participant> = {};
  const participantOrder: Participant[] = [];
  const participantSet = new Set<string>();
  const errors: { line: number; text: string }[] = [];

  function reg(alias: string, name: string, kind: ParticipantKind, stereoType?: string, color?: string) {
    if (participantSet.has(alias)) return;
    const p: Participant = { alias, name, kind, stereoType, color };
    participantSet.add(alias); participantOrder.push(p); declMap[alias] = p;
  }
  function ensure(alias: string) { reg(alias, alias, "participant"); }

  function collectNoteLines(): string[] {
    const lines: string[] = [];
    while (pos < tokens.length && tokens[pos].type !== "END_NOTE") {
      const tok = tokens[pos++]; if (tok.type === "TEXT_LINE") lines.push(tok.text);
    }
    if (pos < tokens.length) pos++;
    return lines;
  }

  const STOP = new Set(["END", "ELSE", "END_BLOCK", "END_BOX"]);

  function parseStmts(ref: { current: MessageNode | null }): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (STOP.has(tok.type)) break;
      switch (tok.type) {
        case "BOX": { pos++; stmts.push(parseBox(tok.title, tok.color, ref)); break; }
        case "DECLARATION": { reg(tok.alias, tok.name, tok.kind, tok.stereoType, tok.color); pos++; break; }
        case "NOTE_INLINE": { pos++; stmts.push({ type: "NOTE", position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: [tok.text] }); break; }
        case "NOTE_START": { pos++; stmts.push({ type: "NOTE", position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: collectNoteLines() }); break; }
        case "NOTE_BARE_INLINE": { pos++; const p1 = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", position: tok.position, p1, p2: null, color: tok.color, lines: [tok.text] }); break; }
        case "NOTE_BARE_START": { pos++; const p1 = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", position: tok.position, p1, p2: null, color: tok.color, lines: collectNoteLines() }); break; }
        case "DIVIDER": { stmts.push({ type: "DIVIDER", label: tok.label }); pos++; break; }
        case "ALT": { const c = tok.condition; pos++; stmts.push(parseAlt(c, ref)); break; }
        case "GROUP": { const l = tok.label; pos++; stmts.push(parseGroup(l, ref)); break; }
        case "LOOP": { const l = tok.label; pos++; stmts.push(parseLoop(l, ref)); break; }
        case "MESSAGE": {
          msgIdx++; ensure(tok.from); ensure(tok.to);
          const fi = participantOrder.findIndex(p => p.alias === tok.from);
          const ti = participantOrder.findIndex(p => p.alias === tok.to);
          const msg: MessageNode = {
            type: "MESSAGE", from: tok.from, arrow: tok.arrow, to: tok.to, label: tok.label, idx: msgIdx,
            leftAlias: fi <= ti ? tok.from : tok.to, rightAlias: fi <= ti ? tok.to : tok.from
          };
          ref.current = msg; stmts.push(msg); pos++; break;
        }
        default: {
          if (tok.type === "TEXT_LINE") {
            errors.push({ line: (tok as any).lineNo, text: (tok as any).raw });
          }
          pos++;
        }
      }
    }
    return stmts;
  }

  function parseAlt(cond: string, ref: { current: MessageNode | null }): AltBlockNode {
    const branches: AltBranch[] = [{ condition: cond, statements: parseStmts(ref) }];
    while (pos < tokens.length && tokens[pos].type === "ELSE") {
      const c = (tokens[pos] as { type: "ELSE"; condition: string }).condition; pos++;
      branches.push({ condition: c, statements: parseStmts(ref) });
    }
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "ALT_BLOCK", branches };
  }
  function parseGroup(label: string, ref: { current: MessageNode | null }): GroupBlockNode {
    const s = parseStmts(ref); if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "GROUP_BLOCK", label, statements: s };
  }
  function parseLoop(label: string, ref: { current: MessageNode | null }): LoopBlockNode {
    const s = parseStmts(ref); if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "LOOP_BLOCK", label, statements: s };
  }
  function parseBox(title: string | null, color: string | null, ref: { current: MessageNode | null }): BoxDeclNode {
    const direct: string[] = [], children: BoxDeclNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === "END_BOX" || tok.type === "END") { pos++; break; }
      if (tok.type === "BOX") { pos++; children.push(parseBox(tok.title, tok.color, ref)); }
      else if (tok.type === "DECLARATION") { reg(tok.alias, tok.name, tok.kind, tok.stereoType, tok.color); direct.push(tok.alias); pos++; }
      else {
        if (tok.type === "TEXT_LINE") {
          errors.push({ line: (tok as any).lineNo, text: (tok as any).raw });
        }
        pos++;
      }
    }
    return {
      type: "BOX_DECL", title, color, directAliases: direct, children,
      allAliases: [...direct, ...children.flatMap(c => c.allAliases)]
    };
  }

  const ref = { current: null as MessageNode | null };
  const all = parseStmts(ref);
  while (pos < tokens.length) {
    const tok = tokens[pos];
    if (tok.type === "TEXT_LINE") {
      errors.push({ line: (tok as any).lineNo, text: (tok as any).raw });
    }
    pos++;
  }

  return {
    autonumber: hasAutonumber, participants: participantOrder, declMap,
    boxes: all.filter((s): s is BoxDeclNode => s.type === "BOX_DECL"),
    statements: all.filter((s): s is StatementNode => s.type !== "BOX_DECL"),
    errors
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// theme/index.ts
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  accent: "#79c0ff",
  text: "#cdd9e5",
  muted: "#768390",
  arrow: "#c3c3c3",
  altBorder: "#444c56", altLabel: "#e3b341", altBg: "rgba(255,255,255,0.04)",
  groupBorder: "#6e7fd2", groupLabel: "#a5b4fc", groupBg: "rgba(99,102,241,0.08)",
  loopBorder: "#3d9e6e", loopLabel: "#6ee7b7", loopBg: "rgba(52,211,153,0.06)",
  noteBg: "#fefce8", noteBorder: "#b5a642", noteText: "#2d2a00",
  dividerLine: "#58a6ff", dividerText: "#58a6ff",
  lifeline: "#7ca8c4",
} as const;

// Layout constants
const COL_MIN_W = 90;   // minimum gap between two adjacent participant centers
const COL_PAD = 20;   // padding added on each side of the label text (total 40px margin)
const CHAR_W = 7.2;  // estimated px per character in message labels
const PART_H = 80;   // participant header/footer area height (px)
const NOTE_FONT = 11;
const NOTE_LINE_H = NOTE_FONT * 1.65;
const NOTE_PAD_V = 10;
const NOTE_PAD_H = 14;
const MSG_H = 44;   // total height of one message row
const MSG_LABEL_OFF = 20;   // y of first label baseline from row top
const MSG_LINE_H = 14;   // height per extra label line
const MSG_ARROW_BOT = 10;   // gap from bottom of row to arrow line
const DIVIDER_H = 36;
const BLOCK_HDR_H = 26;
const BLOCK_PAD_X = 24;
const BLOCK_PAD_Y = 8;
const BOX_TITLE_H = 22;
const GAP = 10;

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

function estLabelW(label: string, autonumber: boolean, idx: number): number {
  const prefix = autonumber ? `${idx}. ` : "";
  const lines = label.split("\\n");
  const first = prefix + lines[0];
  const longest = lines.slice(1).reduce((a, b) => b.length > a.length ? b : a, first);
  return longest.length * CHAR_W;
}

function computeColWidths(
  participants: Participant[],
  statements: StatementNode[],
  autonumber: boolean,
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
            const tw = estLabelW(s.label, autonumber, s.idx);
            const needed = SELF_LOOP_W + tw + COL_PAD;
            constraints.push({ lo: fi, hi: fi + 1, needed });
          }
          continue;
        }
        const lo = Math.min(fi, ti);
        const hi = Math.max(fi, ti);
        const tw = estLabelW(s.label, autonumber, s.idx);
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
    const minGap = (participants[i].name.length * 4.0 + 22) * 2;
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
          const titleW = box.title.length * 7.5 + 24;

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

// ─────────────────────────────────────────────────────────────────────────────
// layout/shapes.ts  —  FIX #1: per-shape bottom offset for lifeline attachment
//
// Each shape is drawn centered at (cx, cy).
// The lifeline must start exactly at the bottom of the visible shape.
// bottomOffset = distance from cy DOWN to where the shape ends.
// topOffset    = distance from cy UP   to where the shape ends (footer).
// ─────────────────────────────────────────────────────────────────────────────

// Returns the y-offset from shape center to bottom edge (where lifeline connects)
function shapeBottomOffset(kind: ParticipantKind, hasStereo?: boolean): number {
  switch (kind) {
    case "participant": return hasStereo ? 22 : 14;   // bottom of rect
    case "actor": return 12;   // bottom of legs: cy+12
    case "boundary": return 14;   // bottom of circle: cy+14
    case "control": return 14;   // bottom of circle: cy+14
    case "entity": return 14;   // bottom of circle: cy+14
    case "database": return 16;   // bottom of curve: cy+16
    case "collections": return 10;   // bottom of front rect: cy+10
    case "queue": return 10;   // bottom of pill: cy+10
    default: return 14;
  }
}
// Top offset: where the footer shape's TOP edge is (lifeline ends here)
function shapeTopOffset(kind: ParticipantKind, hasStereo?: boolean): number {
  switch (kind) {
    case "participant": return hasStereo ? 22 : 14;   // top of rect
    case "actor": return 31;   // top of head: cy-31
    case "boundary": return 14;   // top of circle: cy-14
    case "control": return 14;   // top of circle: cy-14
    case "entity": return 14;   // top of circle: cy-14
    case "database": return 16;   // top of ellipse: cy-16
    case "collections": return 14;   // top of back rect: cy-14
    case "queue": return 10;   // top of pill: cy-10
    default: return 14;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/shapes.tsx  —  participant icon primitives
// ─────────────────────────────────────────────────────────────────────────────

function shapeParticipant(name: string, s: string, bg: string, sIconChar: string, sIconColor: string, sTitle: string) {
  let w = name.length * 7.2 + 18;
  let stereoW = sTitle ? sTitle.length * 7.2 + 20 : 0;
  if (sIconChar) stereoW += 20;
  const tw = Math.max(44, w, stereoW);
  const h = sTitle ? 44 : 28;
  const topY = -h / 2;

  return <>
    <rect x={-tw / 2} y={topY} width={tw} height={h} rx={4}
      fill={bg} stroke={s} strokeWidth={1.5} className="participant-box" />
    {sTitle && (
      <g transform={`translate(0, ${topY + 14})`}>
        {sIconChar && (
          <g transform={`translate(${-(sTitle.length * 3.6) - 10}, 0)`}>
            <circle cx={0} cy={-4} r={8} fill={sIconColor} stroke={s} strokeWidth={1} />
            <text x={0} y={0} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#000">{sIconChar}</text>
          </g>
        )}
        <text x={sIconChar ? 8 : 0} y={0} textAnchor="middle" fontSize={11} fontStyle="italic" fill={s}>
          {`«${sTitle}»`}
        </text>
      </g>
    )}
    <text x={0} y={sTitle ? topY + 32 : 6} textAnchor="middle" fontSize={11} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeActor(name: string, s: string, bg: string) {
  return <>
    <circle cx={0} cy={-24} r={7} fill={bg} stroke={s} strokeWidth={1.5} className="actor-head" />
    <line x1={0} y1={-17} x2={0} y2={-2} stroke={s} strokeWidth={1.5} className="actor-body" />
    <line x1={-12} y1={-11} x2={12} y2={-11} stroke={s} strokeWidth={1.5} className="actor-arms" />
    <line x1={0} y1={-2} x2={-9} y2={12} stroke={s} strokeWidth={1.5} className="actor-leg-l" />
    <line x1={0} y1={-2} x2={9} y2={12} stroke={s} strokeWidth={1.5} className="actor-leg-r" />
    <text x={0} y={28} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeBoundary(name: string, s: string, bg: string) {
  return <>
    <line x1={-19} y1={-14} x2={-19} y2={14} stroke={s} strokeWidth={2.5} />
    <line x1={-19} y1={0} x2={-10} y2={0} stroke={s} strokeWidth={1.5} />
    <circle cx={2} cy={0} r={12} fill={bg} stroke={s} strokeWidth={1.5} className="boundary-circle" />
    <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeControl(name: string, s: string, bg: string) {
  return <>
    <circle cx={0} cy={0} r={14} fill={bg} stroke={s} strokeWidth={1.5} className="control-circle" />
    <path d="M 7 -12 A 12 12 0 0 1 13 -4" stroke={s} strokeWidth={1.5} fill="none" className="control-arrow-arc" />
    <polygon points="13,-4 17,-12 9,-10" fill={s} className="control-arrow-head" />
    <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeEntity(name: string, s: string, bg: string) {
  return <>
    <circle cx={0} cy={0} r={14} fill={bg} stroke={s} strokeWidth={1.5} className="entity-circle" />
    <line x1={-14} y1={10} x2={14} y2={10} stroke={s} strokeWidth={1.5} className="entity-underline" />
    <text x={0} y={30} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeDatabase(name: string, s: string, bg: string) {
  return <>
    <rect x={-14} y={-12} width={28} height={22} fill={bg} stroke={s} strokeWidth={1.5} rx={2} className="database-body" />
    <ellipse cx={0} cy={-12} rx={14} ry={4} fill={bg} stroke={s} strokeWidth={1.5} className="database-top" />
    <path d="M-14 10 Q0 16 14 10" stroke={s} strokeWidth={1.5} fill="none" className="database-bottom" />
    <text x={0} y={32} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeCollections(name: string, s: string, bg: string) {
  const fd = "#1f2937";
  return <>
    <rect x={-7} y={-14} width={24} height={18} fill={fd} stroke={s} strokeWidth={1.2} rx={1} />
    <rect x={-10} y={-11} width={24} height={18} fill={fd} stroke={s} strokeWidth={1.2} rx={1} />
    <rect x={-13} y={-8} width={24} height={18} fill={bg} stroke={s} strokeWidth={1.5} rx={1} className="collections-front" />
    <text x={-1} y={22} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}
function shapeQueue(name: string, s: string, bg: string) {
  return <>
    <rect x={-16} y={-10} width={32} height={20} fill={bg} stroke={s} strokeWidth={1.5} rx={10} className="queue-body" />
    <ellipse cx={-11} cy={0} rx={7} ry={10} fill={bg} stroke={s} strokeWidth={1.5} className="queue-left-cap" />
    <text x={0} y={26} textAnchor="middle" fontSize={10} fontWeight="bold"
      fill={s} className="participant-label">{name}</text>
  </>;
}

const SHAPE_FNS: Record<ParticipantKind, (n: string, s: string, bg: string, sIconChar: string, sIconColor: string, sTitle: string) => React.ReactNode> = {
  participant: shapeParticipant, actor: shapeActor, boundary: shapeBoundary,
  control: shapeControl, entity: shapeEntity, database: shapeDatabase,
  collections: shapeCollections, queue: shapeQueue,
};

function ParticipantShape({ kind, name, cx, cy, stroke, stereoType, fill }:
  { kind: ParticipantKind; name: string; cx: number; cy: number; stroke: string; stereoType?: string; fill?: string; }) {

  const rgb = fill ? resolveBoxRGB(fill) : undefined;
  const bg = rgb ? `rgb(${rgb})` : C.surface;

  let sIconChar = "", sIconColor = "", sTitle = stereoType || "";
  if (stereoType) {
    const match = stereoType.match(/^\(([A-Za-z0-9]),\s*(#[A-Za-z0-9]+)\)\s*(.*)$/);
    if (match) {
      sIconChar = match[1];
      sIconColor = match[2];
      sTitle = match[3];
    }
  }

  return (
    <g transform={`translate(${cx},${cy})`}
      className={`participant participant-${kind}`} data-name={name}>
      {(SHAPE_FNS[kind] ?? shapeParticipant)(name, stroke, bg, sIconChar, sIconColor, sTitle)}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/elements.tsx  —  SVG primitives
// ─────────────────────────────────────────────────────────────────────────────

const MK_SOLID = "mk-solid";
const MK_DASHED = "mk-dashed";

function SvgDefs() {
  const mk = (id: string, color: string) => (
    <marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0,8 3,0 6" fill={color} />
    </marker>
  );
  return <defs>{mk(MK_SOLID, C.arrow)}{mk(MK_DASHED, C.arrow)}</defs>;
}

// ── Lifelines ─────────────────────────────────────────────────────────────────
// FIX #2: lifelines are drawn FIRST (lowest z-order), then blocks draw opaque
// background rects that visually cover the lifeline in block header regions.
function Lifelines({ xs, y1, y2 }: { xs: number[]; y1: number; y2: number }) {
  return (
    <g className="lifelines">
      {xs.map((x, i) => (
        <line key={i} x1={x} y1={y1} x2={x} y2={y2}
          stroke={C.lifeline} strokeWidth={2} strokeDasharray="6,4"
          className="lifeline" />
      ))}
    </g>
  );
}

// ── Message arrow  ─────────────────────────────────────────────────────────────
// FIX #3: autonumber is prepended as "N. " to the label text — no separate badge.
function MessageArrow({ x1, y, x2, dashed, rawLabel, autonumber, idx }:
  { x1: number; y: number; x2: number; dashed: boolean; rawLabel: string; autonumber: boolean; idx: number }) {

  // Build display lines: prepend "N. " to first line if autonumber
  const rawLines = rawLabel ? rawLabel.split("\\n") : [];
  const lines = [...rawLines];
  if (autonumber && lines.length === 0) lines.push(`${idx}.`);
  else if (autonumber) lines[0] = `${idx}. ${lines[0]}`;

  const mid = (x1 + x2) / 2;
  const nExtra = Math.max(0, lines.length - 1);
  const rowH = MSG_H + nExtra * MSG_LINE_H;
  const arrowY = y + rowH - MSG_ARROW_BOT;

  return (
    <g className="message" data-idx={idx}>
      {lines.map((l, i) => l ? (
        <text key={i}
          x={mid} y={y + MSG_LABEL_OFF + i * MSG_LINE_H}
          textAnchor="middle" fontSize={11} fill={C.text}
          className="message-label">{l}</text>
      ) : null)}
      <line
        x1={x1} y1={arrowY} x2={x2} y2={arrowY}
        stroke={C.arrow} strokeWidth={1.5}
        strokeDasharray={dashed ? "5,3" : undefined}
        markerEnd={`url(#${dashed ? MK_DASHED : MK_SOLID})`}
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

const SELF_LOOP_W = 36;  // px the loop extends right of lifeline
const SELF_LOOP_H = 18;  // px height of the loop rectangle
const SELF_LOOP_GAP = 6;   // px gap between last label line and loop top

function selfMessageH(lines: string[]): number {
  // When no label, loop sits at top of row with minimal padding
  const labelH = lines.length > 0 ? MSG_LABEL_OFF + lines.length * MSG_LINE_H + SELF_LOOP_GAP : MSG_LABEL_OFF;
  return labelH + SELF_LOOP_H + 8;
}

function SelfArrow({ cx, y, dashed, rawLabel, autonumber, idx, arrowBack }:
  { cx: number; y: number; dashed: boolean; rawLabel: string; autonumber: boolean; idx: number; arrowBack: boolean }) {

  const rawLines = rawLabel ? rawLabel.split("\\n") : [];
  const lines = [...rawLines];
  if (autonumber && lines.length === 0) lines.push(`${idx}.`);
  else if (autonumber) lines[0] = `${idx}. ${lines[0]}`;

  const dash = dashed ? "5,3" : undefined;
  const mk = dashed ? MK_DASHED : MK_SOLID;

  const labelX = cx + SELF_LOOP_W + 8;
  const labelH = lines.length > 0 ? MSG_LABEL_OFF + lines.length * MSG_LINE_H + SELF_LOOP_GAP : MSG_LABEL_OFF;
  const loopTop = y + labelH;
  const loopBot = loopTop + SELF_LOOP_H;
  const loopRight = cx + SELF_LOOP_W;

  // arrowBack=true  (->):  top exits lifeline right, loops around, bottom returns left → arrowhead on bottom pointing left
  // arrowBack=false (<-):  top exits lifeline right with arrowhead, loops around, bottom returns left (no arrowhead)
  // Both look like a rectangle; difference is which end has the arrowhead
  return (
    <g className="message message-self" data-idx={idx}>
      {lines.map((l, i) => l ? (
        <text key={i}
          x={labelX} y={y + MSG_LABEL_OFF + i * MSG_LINE_H}
          textAnchor="start" fontSize={11} fill={C.text}
          className="message-label">{l}</text>
      ) : null)}
      {/* top horizontal segment: lifeline → right */}
      <line x1={cx} y1={loopTop} x2={loopRight} y2={loopTop}
        stroke={C.arrow} strokeWidth={1.5} strokeDasharray={dash}
        markerEnd={!arrowBack ? `url(#${mk})` : undefined}
        className="message-arrow" />
      {/* right vertical segment */}
      <line x1={loopRight} y1={loopTop} x2={loopRight} y2={loopBot}
        stroke={C.arrow} strokeWidth={1.5} strokeDasharray={dash}
        className="message-arrow" />
      {/* bottom horizontal segment: right → lifeline */}
      <line x1={loopRight} y1={loopBot} x2={cx} y2={loopBot}
        stroke={C.arrow} strokeWidth={1.5} strokeDasharray={dash}
        markerEnd={arrowBack ? `url(#${mk})` : undefined}
        className="message-arrow" />
    </g>
  );
}

// ── Note box ──────────────────────────────────────────────────────────────────
const NAMED_RGB: Record<string, string> = {
  lightblue: "173,216,230", lightgray: "211,211,211", lightgrey: "211,211,211",
  lightyellow: "255,255,224", lightgreen: "144,238,144", lightpink: "255,182,193",
  lightsalmon: "255,160,122", lightcoral: "240,128,128", lavender: "230,230,250",
  aqua: "0,255,255", cyan: "0,255,255", pink: "255,192,203", yellow: "255,255,0",
  orange: "255,165,0", green: "0,128,0", blue: "0,0,255", red: "255,0,0",
  gray: "128,128,128", grey: "128,128,128", white: "255,255,255", beige: "245,245,220",
  wheat: "245,222,179", khaki: "240,230,140", plum: "221,160,221", violet: "238,130,238",
  turquoise: "64,224,208", skyblue: "135,206,235", steelblue: "70,130,180",
};

function resolveNoteColor(raw: string | null): { bg: string; border: string; text: string } {
  if (!raw) return { bg: C.noteBg, border: C.noteBorder, text: C.noteText };
  const name = raw.startsWith("#") ? raw.slice(1) : raw;
  const isHex = /^[0-9a-fA-F]{3,6}$/.test(name);
  return { bg: isHex ? `#${name}` : name, border: C.noteBorder, text: "#111" };
}

function noteH(lines: string[]): number {
  return Math.max(1, lines.length) * NOTE_LINE_H + NOTE_PAD_V + 4;
}
function noteW(lines: string[]): number {
  const longest = lines.reduce((a, b) => b.length > a.length ? b : a, "");
  return Math.max(80, longest.length * 6.6 + NOTE_PAD_H * 2 + 14);
}

function NoteBoxSvg({ x, y, lines, color, w: wOverride }: { x: number; y: number; lines: string[]; color: string | null; w?: number }) {
  const { bg, border, text } = resolveNoteColor(color);
  const w = wOverride ?? noteW(lines), h = noteH(lines), FOLD = 10;
  const pts = `${x},${y} ${x + w - FOLD},${y} ${x + w},${y + FOLD} ${x + w},${y + h} ${x},${y + h}`;
  return (
    <g className="note">
      <polygon points={pts} fill={bg} stroke={border} strokeWidth={1} className="note-body" />
      <polyline points={`${x + w - FOLD},${y} ${x + w - FOLD},${y + FOLD} ${x + w},${y + FOLD}`}
        fill="none" stroke={border} strokeWidth={1} opacity={0.6} className="note-fold" />
      {lines.map((l, i) => (
        <text key={i} x={x + NOTE_PAD_H} y={y + NOTE_PAD_V / 2 + NOTE_FONT + i * NOTE_LINE_H}
          fontSize={NOTE_FONT} fill={text} className="note-line">{l || " "}</text>
      ))}
    </g>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function DiagramDivider({ x1, y, x2, label }: { x1: number; y: number; x2: number; label: string }) {
  const cy = y + DIVIDER_H / 2, tw = label.length * 7.2 + 22, mid = (x1 + x2) / 2;
  const lx = mid - tw / 2 - 8, rx = mid + tw / 2 + 8;
  return (
    <g className="divider">
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
function BlockHeader({ x, y, w, keyword, condition, stroke, headerFill, labelColor }:
  {
    x: number; y: number; w: number; keyword: string; condition: string;
    stroke: string; headerFill: string; labelColor: string
  }) {
  const tagW = keyword.length * 7.5 + 16;
  return (
    <g className={`block-header block-header-${keyword}`}>
      {/* Solid background covers lifeline under header */}
      <rect x={x} y={y} width={w} height={BLOCK_HDR_H}
        fill={C.surface} stroke="none" />
      {/* Colored header */}
      <rect x={x} y={y} width={w} height={BLOCK_HDR_H}
        fill={headerFill} stroke={stroke} strokeWidth={1.5} rx={3} />
      {/* Keyword tag */}
      <rect x={x} y={y} width={tagW} height={BLOCK_HDR_H - 1} rx={3}
        fill={C.surface} stroke={stroke} strokeWidth={1} className="block-keyword-tag" />
      <text x={x + tagW / 2} y={y + BLOCK_HDR_H / 2 + 4} textAnchor="middle"
        fontSize={11} fontWeight="bold" fontFamily="monospace"
        fill={labelColor} className="block-keyword">{keyword}</text>
      <text x={x + tagW + 8} y={y + BLOCK_HDR_H / 2 + 4}
        fontSize={11} fill={labelColor} opacity={0.85}
        className="block-condition">{condition}</text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/SequenceDiagram.tsx  —  PASS 2: walk AST, emit SVG at explicit y
// ─────────────────────────────────────────────────────────────────────────────

interface DrawCtx {
  aliasToX: Record<string, number>;
  diagramX1: number;
  diagramX2: number;
  autonumber: boolean;
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

  const { aliasToX, diagramX1, diagramX2, autonumber } = ctx;
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
        const dispLines = autonumber
          ? (rawLines.length ? [`${s.idx}. ${rawLines[0]}`, ...rawLines.slice(1)] : [`${s.idx}.`])
          : rawLines;
        const h = selfMessageH(dispLines);
        return {
          node: <SelfArrow key={`msg-${s.idx}`}
            cx={fromX} y={y}
            dashed={s.arrow.includes("--")}
            rawLabel={s.label} autonumber={autonumber} idx={s.idx}
            arrowBack={true} />,
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
          rawLabel={s.label} autonumber={autonumber} idx={s.idx} />,
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
        // "left" / "right" bare notes: vertically center on the preceding arrow.
        // The note is placed right after a message row (MSG_H tall, arrow at MSG_H - MSG_ARROW_BOT from row top).
        // We shift the note up so it sits beside the arrow rather than below it.
        nw = noteW(s.lines);
        nx = s.position === "left"
          ? (s.p1 ? (aliasToX[s.p1] ?? 0) : 0) - nw - 8
          : (s.p1 ? (aliasToX[s.p1] ?? 0) : 0) + 8;
        // Center note vertically on the arrow line of the preceding message
        const arrowLineY = y - GAP - MSG_ARROW_BOT;  // approx y of arrow in prev row
        ny = arrowLineY - nh / 2;
      }

      const noteBottom = ny + nh + 4;
      return {
        node: <NoteBoxSvg key={`note-${y}`} x={nx} y={ny} w={s.position === "across" ? nw : undefined} lines={s.lines} color={s.color} />,
        h: s.position === "left" || s.position === "right"
          ? Math.max(0, noteBottom - y)   // only consume space if note extends past current y
          : nh + 8,
      };
    }

    case "DIVIDER": {
      return {
        node: <DiagramDivider key={`div-${y}`} x1={bx1} y={y} x2={bx2} label={s.label} />,
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
            labelColor={C.altLabel} />
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
      return {
        node: (
          <g key={`alt-${y}`} className="alt-block">
            <rect x={bx1} y={y} width={bw} height={totalH} fill={C.altBg} stroke="none" rx={3} />
            {elems}
            <rect x={bx1} y={y} width={bw} height={totalH} fill="none"
              stroke={C.altBorder} strokeWidth={1.5} rx={3} className="alt-border" />
          </g>
        ),
        h: totalH,
      };
    }

    case "GROUP_BLOCK": {
      const inner = drawBlock(s.statements, y + BLOCK_HDR_H + BLOCK_PAD_Y, ctx, depth + 1);
      const totalH = BLOCK_HDR_H + inner.h + BLOCK_PAD_Y;
      return {
        node: (
          <g key={`grp-${y}`} className="group-block">
            <rect x={bx1} y={y} width={bw} height={totalH}
              fill={C.groupBg} stroke={C.groupBorder} strokeWidth={1.5} rx={3} />
            <BlockHeader x={bx1} y={y} w={bw} keyword="group" condition={s.label}
              stroke={C.groupBorder} headerFill="rgba(99,102,241,0.12)" labelColor={C.groupLabel} />
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
      return {
        node: (
          <g key={`loop-${y}`} className="loop-block">
            <rect x={bx1} y={y} width={bw} height={totalH}
              fill={C.loopBg} stroke={C.loopBorder} strokeWidth={1.5} rx={3} />
            <BlockHeader x={bx1} y={y} w={bw} keyword="loop" condition={s.label}
              stroke={C.loopBorder} headerFill="rgba(52,211,153,0.08)" labelColor={C.loopLabel} />
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

function resolveBoxRGB(raw: string | null): string {
  const name = raw ? (raw.startsWith("#") ? raw.slice(1) : raw) : "LightBlue";
  const key = name.toLowerCase();
  if (NAMED_RGB[key]) return NAMED_RGB[key];
  const h6 = name.match(/^([0-9a-fA-F]{6})$/);
  if (h6) { const n = parseInt(h6[1], 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
  const h3 = name.match(/^([0-9a-fA-F]{3})$/);
  if (h3) { const [r, g, b] = h3[1].split("").map(c => parseInt(c + c, 16)); return `${r},${g},${b}`; }
  return NAMED_RGB.lightblue;
}
function boxDepth(b: BoxDeclNode): number {
  return b.children.length ? 1 + Math.max(...b.children.map(boxDepth)) : 1;
}
// Returns the visual half-width of a participant shape from its center.
// Used to compute tight box band edges.
function shapeHalfW(kind: ParticipantKind, name: string, stereoType?: string): number {
  let w = name.length * 3.6 + 9;
  if (stereoType) {
    let stereoW = stereoType.length * 3.6 + 10;
    if (stereoType.match(/^\(([A-Za-z0-9]),/)) stereoW += 10;
    w = Math.max(w, stereoW);
  }

  switch (kind) {
    case "participant": return Math.max(22, w); // half of rect width
    case "actor": return 13;   // widest point: arms span ±12, label ~±name/2
    case "boundary": return 20;   // left bar at -19
    case "control": return 14;
    case "entity": return 14;
    case "database": return 14;
    case "collections": return 14;
    case "queue": return 16;
    default: return 14;
  }
}

const BOX_SHAPE_PAD = 10; // px of padding between shape edge and box border
const BOX_GAP = 3;  // px gap between adjacent box borders at the midpoint

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
        fill={`rgba(${rgb},0.18)`} stroke={`rgba(${rgb},0.70)`}
        strokeWidth={1.5} rx={4} className="box-band" />,
    ];
    if (box.title) {
      // Clip title to box width with SVG clipPath isn't easy; instead just render it
      // centered — if title is slightly wider than box it overflows symmetrically which is fine
      elems.push(
        <text key={`box-title-${depth}-${bi}`}
          x={lx + bw / 2} y={y1 + 15}
          textAnchor="middle" fontSize={11} fontWeight="bold"
          fill={`rgba(${rgb},0.95)`} className="box-title">{box.title}</text>
      );
    }
    const childY1 = y1 + (box.title ? BOX_TITLE_H : 4);
    elems.push(...drawBoxBands(box.children, aliasToX, declMap, colCenters, gapW, childY1, y2, depth + 1));
    return elems;
  });
}

// ── Main SequenceDiagram component ────────────────────────────────────────────
function SequenceDiagram({ ast }: { ast: DiagramAST }) {
  const { participants, statements, autonumber, boxes, declMap } = ast;
  if (!participants.length) return null;

  const N = participants.length;

  // gapW[g] = pixel distance between center of col g and col g+1  (length N-1)
  const gapW = computeColWidths(participants, statements, autonumber, boxes, declMap);

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
      if (s.type === "NOTE" && (s.position === "left") && s.p1) {
        const idx = aliasIdx[s.p1] ?? 0;
        const cx = colCenters[idx];
        const nw = noteW(s.lines);
        const noteLeft = cx - nw - 8;   // leftmost x of the note box
        if (noteLeft < 0) overflow = Math.max(overflow, -noteLeft + 8);
      }
      if (s.type === "ALT_BLOCK") s.branches.forEach(b => { overflow = Math.max(overflow, calcLeftOverflow(b.statements)); });
      if (s.type === "GROUP_BLOCK") overflow = Math.max(overflow, calcLeftOverflow(s.statements));
      if (s.type === "LOOP_BLOCK") overflow = Math.max(overflow, calcLeftOverflow(s.statements));
    }
    return overflow;
  }
  const svgPadL = calcLeftOverflow(statements);

  // Shift all column centers right by svgPadL to make room for left-side notes
  const shiftedCenters = colCenters.map(x => x + svgPadL);
  const totalW = shiftedCenters[N - 1] + edgeR;  // edgeR only — svgPadL already baked into shiftedCenters

  const aliasToX: Record<string, number> = {};
  participants.forEach((p, i) => { aliasToX[p.alias] = shiftedCenters[i]; });

  // Box title extra height
  const hasBoxes = boxes.length > 0;
  const maxBDepth = hasBoxes ? Math.max(...boxes.map(boxDepth)) : 0;
  const boxTitleH = maxBDepth * BOX_TITLE_H;

  const headerPartCY = boxTitleH + PART_H / 2;
  const timelineY = boxTitleH + PART_H + GAP;

  const ctx: DrawCtx = { aliasToX, diagramX1: 0, diagramX2: totalW, autonumber };
  const { nodes: timelineNodes, h: timelineH } = drawBlock(statements, timelineY, ctx, 0);

  const footerY = timelineY + timelineH + GAP;
  const totalH = footerY + PART_H + 8;

  // Lifeline endpoints — use shiftedCenters
  const lifelineSegs = participants.map((p, i) => ({
    x: shiftedCenters[i],
    y1: headerPartCY + shapeBottomOffset(p.kind, !!p.stereoType),
    y2: footerY + PART_H / 2 - shapeTopOffset(p.kind, !!p.stereoType),
  }));

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="sequence-diagram"
      style={{ fontFamily: "'JetBrains Mono','Fira Code',monospace", overflow: "visible", display: "block" }}
    >
      <SvgDefs />

      {/* Box bands — drawn first (lowest layer) */}
      {hasBoxes && (
        <g className="box-bands">
          {drawBoxBands(boxes, aliasToX, declMap, shiftedCenters, gapW, 0, totalH)}
        </g>
      )}

      {/* Lifelines — drawn second, block headers will paint over them */}
      <g className="lifelines">
        {lifelineSegs.map((seg, i) => (
          <line key={i} x1={seg.x} y1={seg.y1} x2={seg.x} y2={seg.y2}
            stroke={C.lifeline} strokeWidth={2} strokeDasharray="6,4"
            className="lifeline" />
        ))}
      </g>

      {/* Header participant shapes */}
      <g className="participants-header">
        {participants.map((p, i) => (
          <ParticipantShape key={p.alias} kind={p.kind} name={p.name}
            cx={colCenters[i]} cy={headerPartCY} stroke={C.accent} stereoType={p.stereoType} fill={p.color} />
        ))}
      </g>

      {/* Timeline — blocks have opaque background rects that cover lifelines */}
      <g className="timeline">
        {timelineNodes}
      </g>

      {/* Footer participant shapes */}
      <g className="participants-footer">
        {participants.map((p, i) => (
          <ParticipantShape key={p.alias} kind={p.kind} name={p.name}
            cx={colCenters[i]} cy={footerY + PART_H / 2} stroke={C.accent} stereoType={p.stereoType} fill={p.color} />
        ))}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// samples/index.ts
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLES: { label: string; code: string }[] = [
  { label: "box", code: `@startuml\n\nbox "Internal Service" #LightBlue\n  participant Bob\n  participant Alice\nend box\n\nparticipant Other\n\nBob -> Alice : hello\nAlice -> Other : hello\n\n@enduml` },
  { label: "box nested", code: `@startuml\n\nbox "Internal Service" #LightBlue\n  participant Bob\n  box "Subteam" #LightGray\n    participant Alice\n    participant John\n  end box\nend box\n\nparticipant Other\n\nBob -> Alice : hello\nAlice -> John : hello\nJohn -> Other: Hello\n\n@enduml` },
  { label: "notes bare", code: `@startuml\nAlice->Bob : hello\nnote left: this is a first note\n\nBob->Alice : ok\nnote right: this is another note\n\nJame->Bob : I am thinking\nnote left\na note\ncan also be defined\non several lines\nend note\n@enduml` },
  { label: "notes full", code: `@startuml\nparticipant Alice\nparticipant Bob\n\nnote left of Alice #aqua\nThis is displayed\nleft of Alice.\nend note\n\nnote right of Alice: This is displayed right of Alice.\nnote over Alice: This is displayed over Alice.\nnote over Alice, Bob #FFAAAA: This is displayed\nover Bob and Alice.\nnote across: This note spans ALL participants!\n\nAlice -> Bob: Hello\nBob --> Alice: Hi back\n@enduml` },
  { label: "dividers", code: `@startuml\n\n== Initialization ==\n\nAlice -> Bob: Authentication Request\nBob --> Alice: Authentication Response\n\n== Repetition ==\n\nAlice -> Bob: Another authentication Request\nAlice <-- Bob: another authentication Response\n\n@enduml` },
  { label: "combined", code: `@startuml\nactor User as U\nparticipant App as A\ndatabase Cache as C\ndatabase DB as D\n\n== Authentication ==\n\nnote over U, A: User initiates login flow\n\nU -> A : Login Request\n\nalt cache hit\n    A -> C : Check session\n    C -> A : Session found\n    note right of A: Session valid!\n    A -> U : Welcome back!\nelse cache miss\n    A -> DB : Verify credentials\n    DB -> A : User valid\n    A -> C : Store session\n    A -> U : Login successful\nend\n\n== Data Operations ==\n\ngroup Sync Loop\n    loop every 5 seconds\n        A -> DB : Poll for updates\n        DB -> A : Latest data\\n(delta only)\n        A -> C : Refresh cache\n    end\nend\n\nnote across #lightblue: All operations complete\n\n@enduml` },
  { label: "all types", code: `@startuml\nparticipant Participant as Foo\nactor Actor as Foo1\nboundary Boundary as Foo2\ncontrol Control as Foo3\nentity Entity as Foo4\ndatabase Database as Foo5\ncollections Collections as Foo6\nqueue Queue as Foo7\n\nFoo -> Foo1 : To actor\nFoo -> Foo2 : To boundary\nFoo -> Foo3 : To control\nFoo -> Foo4 : To entity\nFoo -> Foo5 : To database\nFoo -> Foo6 : To collections\nFoo -> Foo7 : To queue\n@enduml` },
  { label: "alt / else", code: `@startuml\nactor Alice as A\nparticipant Server as S\ndatabase DB as D\n\nA -> S : Authentication Request\n\nalt success\n    S -> D : Query user\n    D -> S : User found\n    S -> A : Authentication Accepted\nelse failure\n    S -> A : Authentication Failure\n    alt retry\n        A -> S : Retry login\n        S -> A : Please repeat\n    else give up\n        A -> S : Cancel\n    end\nend\n@enduml` },
  { label: "self msg", code: `@startuml\nAlice -> Alice: This is a signal to self.\\nIt also demonstrates\\nmultiline\\ntext\nAlice -> Bob: Normal message\nBob --> Bob: Self reply\\nwith dashes\nBob -> Alice\nAlice <- Alice: Back arrow self\n@enduml` },
  { label: "autonumber", code: `@startuml\nautonumber\nAlice -> Bob: Authentication Request\nBob --> Alice: Authentication Response\nAlice -> Bob: Another authentication Request\nAlice <-- Bob: another authentication Response\n@enduml` },
];

// ─────────────────────────────────────────────────────────────────────────────
// App.tsx
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [input, setInput] = useState(SAMPLES[5].code);
  const [ast, setAst] = useState<DiagramAST | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"diagram" | "ast">("diagram");

  useEffect(() => {
    try { setAst(parse(input)); setError(null); }
    catch (e) { setError((e as Error).message); setAst(null); }
  }, [input]);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'JetBrains Mono','Fira Code',monospace", padding: 20, boxSizing: "border-box"
    }}>

      <div style={{ marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 17, color: C.accent }}>PlantUML Sequence Viewer</h1>
          <span style={{
            fontSize: 10, color: C.muted, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px"
          }}>
            SVG · dynamic column width · lifeline touch · notes · dividers · alt · group · loop · box
          </span>
        </div>
      </div>

      {/* Shape legend */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "8px 16px", marginBottom: 14, overflowX: "auto"
      }}>
        <svg height={90} width={PARTICIPANT_KINDS.length * 130}
          style={{ fontFamily: "'JetBrains Mono',monospace", display: "block" }}>
          {PARTICIPANT_KINDS.map((k, i) => (
            <ParticipantShape key={k} kind={k}
              name={k === "participant" ? "Participant" : k.charAt(0).toUpperCase() + k.slice(1)}
              cx={65 + i * 130} cy={46} stroke={C.accent} />
          ))}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
        <div>
          <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            {SAMPLES.map(({ label, code }) => (
              <button key={label} onClick={() => setInput(code)}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  color: C.text, borderRadius: 5, padding: "3px 9px",
                  fontSize: 10, cursor: "pointer", fontFamily: "inherit"
                }}>{label}</button>
            ))}
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} spellCheck={false}
            style={{
              width: "100%", height: 440, background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 8, color: C.text,
              fontFamily: "inherit", fontSize: 12, lineHeight: 1.7,
              padding: 14, resize: "vertical", outline: "none", boxSizing: "border-box"
            }} />
          {error && <div style={{
            marginTop: 8, background: "#2d1515", border: "1px solid #f47067",
            borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#f47067"
          }}>⚠ {error}</div>}
          {ast?.errors && ast.errors.length > 0 && (
            <div style={{
              marginTop: 8, background: "#2d1515", border: "1px solid #f47067",
              borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#f47067",
              maxHeight: 150, overflowY: "auto"
            }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>⚠ Unsupported Syntax:</div>
              {ast.errors.map((e, i) => (
                <div key={i} style={{ fontFamily: "monospace", marginTop: 2 }}>
                  Line {e.line}: <span style={{ opacity: 0.8 }}>{e.text.trim()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["diagram", "ast"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  background: tab === t ? C.accent : C.surface, color: tab === t ? C.bg : C.muted,
                  border: `1px solid ${tab === t ? C.accent : C.border}`, borderRadius: 6,
                  padding: "4px 14px", fontSize: 10, cursor: "pointer",
                  fontWeight: tab === t ? "bold" : "normal",
                  textTransform: "uppercase", letterSpacing: 1, fontFamily: "inherit"
                }}>{t}</button>
            ))}
          </div>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: 16, minHeight: 500, overflowX: "auto"
          }}>
            {ast && tab === "diagram" && <SequenceDiagram ast={ast} />}
            {ast && tab === "ast" && <pre style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{JSON.stringify(ast, null, 2)}</pre>}
          </div>
          <div style={{
            marginTop: 8, display: "flex", gap: 14, fontSize: 10, color: C.muted,
            borderTop: `1px solid ${C.border}`, paddingTop: 8, flexWrap: "wrap"
          }}>
            {[{ c: C.arrow, l: "message" }, { c: C.altLabel, l: "alt/else" }, { c: C.groupLabel, l: "group" },
            { c: C.loopLabel, l: "loop" }, { c: C.noteBorder, l: "note" }, { c: C.dividerLine, l: "divider" }
            ].map(({ c, l }) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: "inline-block" }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}