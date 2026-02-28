// =============================================================================
// PlantUML Sequence Diagram Viewer
//
// FILE STRUCTURE (how this would be split in a real project):
//
//   src/
//   ├── types/index.ts            ← ALL types: ParticipantKind, ArrowType,
//   │                                Token, AST nodes, DiagramAST
//   ├── parser/
//   │   ├── tokenizer.ts          ← line → Token  (one regex per grammar rule)
//   │   └── parser.ts             ← tokens → DiagramAST  (recursive descent)
//   ├── theme/index.ts            ← colors + layout constants (edit here only)
//   ├── renderer/
//   │   ├── utils.ts              ← pure layout math + color helpers (no React)
//   │   ├── ParticipantShape.tsx  ← one case per participant kind
//   │   ├── ArrowSVG.tsx          ← message arrow
//   │   ├── NoteBox.tsx           ← dog-eared note box
//   │   ├── DiagramRow.tsx        ← one renderer per statement type
//   │   ├── BoxOverlay.tsx        ← colored box bands (full-height overlay)
//   │   └── SequenceDiagram.tsx   ← wires everything together
//   ├── samples/index.ts          ← sample PlantUML strings
//   └── App.tsx                   ← editor + tabs + legend
// =============================================================================

import React from "react";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// types/index.ts
// ─────────────────────────────────────────────────────────────────────────────

type ParticipantKind = "participant" | "actor" | "boundary" | "control" | "entity" | "database" | "collections" | "queue";
const PARTICIPANT_KINDS: ParticipantKind[] = ["participant", "actor", "boundary", "control", "entity", "database", "collections", "queue"];

interface Participant { alias: string; name: string; kind: ParticipantKind; }
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
  | { type: "DECLARATION"; kind: ParticipantKind; name: string; alias: string }
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

interface DiagramAST { autonumber: boolean; participants: Participant[]; declMap: Record<string, Participant>; statements: StatementNode[]; boxes: BoxDeclNode[]; }

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

  const boxM = t.match(/^box(?:\s+"([^"]*)")?(?:\s+(#\S+))?(?:\s+(#\S+))?$/i);
  if (boxM) return { type: "BOX", title: boxM[1] ?? null, color: boxM[2] ?? boxM[3] ?? null };

  for (const kind of PARTICIPANT_KINDS) {
    const m = t.match(new RegExp(`^${kind}\\s+(\\S+)(?:\\s+as\\s+(\\S+))?$`, "i"));
    if (m) return { type: "DECLARATION", kind: kind as ParticipantKind, name: m[1], alias: m[2] ?? m[1] };
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

  return { type: "TEXT_LINE", text: t };
}

// ─────────────────────────────────────────────────────────────────────────────
// parser/parser.ts
// ─────────────────────────────────────────────────────────────────────────────

function parse(input: string): DiagramAST {
  const tokens: Token[] = input.split("\n").map(tokenizeLine).filter((t): t is Token => t !== null);
  let pos = 0, msgIdx = 0;
  const hasAutonumber = tokens.some(t => t.type === "AUTONUMBER");
  const declMap: Record<string, Participant> = {};
  const participantOrder: Participant[] = [];
  const participantSet = new Set<string>();

  function registerParticipant(alias: string, name: string, kind: ParticipantKind) {
    if (participantSet.has(alias)) return;
    const p: Participant = { alias, name, kind };
    participantSet.add(alias); participantOrder.push(p); declMap[alias] = p;
  }
  function ensureParticipant(alias: string) { registerParticipant(alias, alias, "participant"); }

  function collectNoteLines(): string[] {
    const lines: string[] = [];
    while (pos < tokens.length && tokens[pos].type !== "END_NOTE") {
      const tok = tokens[pos++];
      if (tok.type === "TEXT_LINE") lines.push(tok.text);
    }
    if (pos < tokens.length) pos++;
    return lines;
  }

  const STOP = new Set(["END", "ELSE", "END_BLOCK", "END_BOX"]);

  function parseStatements(ref: { current: MessageNode | null }): StatementNode[] {
    const stmts: StatementNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (STOP.has(tok.type)) break;
      switch (tok.type) {
        case "BOX": { pos++; stmts.push(parseBox(tok.title, tok.color, ref)); break; }
        case "DECLARATION": { registerParticipant(tok.alias, tok.name, tok.kind); pos++; break; }
        case "NOTE_INLINE": { pos++; stmts.push({ type: "NOTE", position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: [tok.text] }); break; }
        case "NOTE_START": { pos++; stmts.push({ type: "NOTE", position: tok.position, p1: tok.p1, p2: tok.p2, color: tok.color, lines: collectNoteLines() }); break; }
        case "NOTE_BARE_INLINE": { pos++; const p1 = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", position: tok.position, p1, p2: null, color: tok.color, lines: [tok.text] }); break; }
        case "NOTE_BARE_START": { pos++; const p1 = ref.current ? (tok.position === "left" ? ref.current.leftAlias : ref.current.rightAlias) : null; stmts.push({ type: "NOTE", position: tok.position, p1, p2: null, color: tok.color, lines: collectNoteLines() }); break; }
        case "DIVIDER": { stmts.push({ type: "DIVIDER", label: tok.label }); pos++; break; }
        case "ALT": { const c = tok.condition; pos++; stmts.push(parseAlt(c, ref)); break; }
        case "GROUP": { const l = tok.label; pos++; stmts.push(parseGroup(l, ref)); break; }
        case "LOOP": { const l = tok.label; pos++; stmts.push(parseLoop(l, ref)); break; }
        case "MESSAGE": {
          msgIdx++;
          ensureParticipant(tok.from); ensureParticipant(tok.to);
          const fi = participantOrder.findIndex(p => p.alias === tok.from);
          const ti = participantOrder.findIndex(p => p.alias === tok.to);
          const msg: MessageNode = { type: "MESSAGE", from: tok.from, arrow: tok.arrow, to: tok.to, label: tok.label, idx: msgIdx, leftAlias: fi <= ti ? tok.from : tok.to, rightAlias: fi <= ti ? tok.to : tok.from };
          ref.current = msg; stmts.push(msg); pos++;
          break;
        }
        default: pos++;
      }
    }
    return stmts;
  }

  function parseAlt(cond: string, ref: { current: MessageNode | null }): AltBlockNode {
    const branches: AltBranch[] = [{ condition: cond, statements: parseStatements(ref) }];
    while (pos < tokens.length && tokens[pos].type === "ELSE") {
      const c = (tokens[pos] as { type: "ELSE"; condition: string }).condition; pos++;
      branches.push({ condition: c, statements: parseStatements(ref) });
    }
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "ALT_BLOCK", branches };
  }
  function parseGroup(label: string, ref: { current: MessageNode | null }): GroupBlockNode {
    const s = parseStatements(ref);
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "GROUP_BLOCK", label, statements: s };
  }
  function parseLoop(label: string, ref: { current: MessageNode | null }): LoopBlockNode {
    const s = parseStatements(ref);
    if (pos < tokens.length && tokens[pos].type === "END_BLOCK") pos++;
    return { type: "LOOP_BLOCK", label, statements: s };
  }
  function parseBox(title: string | null, color: string | null, ref: { current: MessageNode | null }): BoxDeclNode {
    const direct: string[] = [], children: BoxDeclNode[] = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.type === "END_BOX" || tok.type === "END") { pos++; break; }
      if (tok.type === "BOX") { pos++; children.push(parseBox(tok.title, tok.color, ref)); }
      else if (tok.type === "DECLARATION") { registerParticipant(tok.alias, tok.name, tok.kind); direct.push(tok.alias); pos++; }
      else { pos++; }
    }
    return { type: "BOX_DECL", title, color, directAliases: direct, children, allAliases: [...direct, ...children.flatMap(c => c.allAliases)] };
  }

  const ref = { current: null as MessageNode | null };
  const all = parseStatements(ref);
  return {
    autonumber: hasAutonumber, participants: participantOrder, declMap,
    boxes: all.filter((s): s is BoxDeclNode => s.type === "BOX_DECL"),
    statements: all.filter((s): s is StatementNode => s.type !== "BOX_DECL"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// theme/index.ts
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: "#0d1117", surface: "#161b22", border: "#30363d",
  accent: "#79c0ff", accentDim: "#1c3452", text: "#cdd9e5", muted: "#768390",
  arrow: "#c3c3c3",
  altBorder: "#444c56", altLabel: "#e3b341", altBg: "rgba(255,255,255,0.025)",
  groupBorder: "#6e7fd2", groupLabel: "#a5b4fc", groupBg: "rgba(99,102,241,0.06)",
  loopBorder: "#3d9e6e", loopLabel: "#6ee7b7", loopBg: "rgba(52,211,153,0.05)",
  noteBg: "#fefce8", noteBorder: "#b5a642", noteText: "#2d2a00",
  dividerLine: "#58a6ff", dividerText: "#58a6ff",
  lifeline: "#546070",
} as const;

const NOTE_FONT_SIZE = 11;
const NOTE_LINE_H = NOTE_FONT_SIZE * 1.65;
const NOTE_PAD_V = 10;
const MSG_ARROW_H = 18;
const MSG_LABEL_LINE_H = 15;
const MSG_EXTRA_V = 14;
const SHAPE_W = 64;
const SHAPE_H = 52;
const BOX_TITLE_ROW_H = 22;
const PART_BAR_BASE_H = 50;

// ─────────────────────────────────────────────────────────────────────────────
// renderer/utils.ts
// ─────────────────────────────────────────────────────────────────────────────

function noteHeight(lines: string[]) { return Math.max(1, lines.length) * NOTE_LINE_H + NOTE_PAD_V + 6; }
function msgRowHeight(ll: string[]) { return ll.length * MSG_LABEL_LINE_H + MSG_ARROW_H + MSG_EXTRA_V; }
function splitLabel(l: string) { return l.split("\\n"); }

function resolveCSSColor(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("#")) { const i = raw.slice(1); return /^[0-9a-fA-F]{3,6}$/.test(i) ? raw : i; }
  return raw;
}

interface BoxColors { bg: string; border: string; text: string; }
const NAMED_RGB: Record<string, string> = {
  lightblue: "173,216,230", lightgray: "211,211,211", lightgrey: "211,211,211",
  lightyellow: "255,255,224", lightgreen: "144,238,144", lightpink: "255,182,193",
  lightsalmon: "255,160,122", lightcoral: "240,128,128", lavender: "230,230,250",
  aqua: "0,255,255", cyan: "0,255,255", pink: "255,192,203", yellow: "255,255,0",
  orange: "255,165,0", green: "0,128,0", blue: "0,0,255", red: "255,0,0",
  gray: "128,128,128", grey: "128,128,128", white: "255,255,255", beige: "245,245,220",
  wheat: "245,222,179", khaki: "240,230,140", plum: "221,160,221",
  violet: "238,130,238", turquoise: "64,224,208", skyblue: "135,206,235",
  steelblue: "70,130,180", cornflowerblue: "100,149,237",
};
function hexToRgb(h: string): string | null {
  const h6 = h.match(/^([0-9a-fA-F]{6})$/); if (h6) { const n = parseInt(h6[1], 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
  const h3 = h.match(/^([0-9a-fA-F]{3})$/); if (h3) { const [r, g, b] = h3[1].split("").map(c => parseInt(c + c, 16)); return `${r},${g},${b}`; }
  return null;
}
function resolveBoxColors(raw: string | null): BoxColors {
  const name = raw ? (raw.startsWith("#") ? raw.slice(1) : raw) : "LightBlue";
  const rgb = NAMED_RGB[name.toLowerCase()] ?? hexToRgb(name) ?? NAMED_RGB.lightblue;
  return { bg: `rgba(${rgb},0.12)`, border: `rgba(${rgb},0.65)`, text: `rgba(${rgb},0.9)` };
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/ParticipantShape.tsx
// ─────────────────────────────────────────────────────────────────────────────

function ParticipantShape({ kind, name, accent = C.accent }: { kind: ParticipantKind; name: string; accent?: string }) {
  const s = accent, f = C.surface, fd = "#1f2937";
  const Svg = ({ children }: { children: React.ReactNode }) => <svg width={SHAPE_W} height={SHAPE_H} style={{ overflow: "visible" }}>{children}</svg>;
  const Label = () => <span style={{ fontSize: 11, color: s, fontWeight: "bold", whiteSpace: "nowrap" }}>{name}</span>;
  const Stack = ({ children }: { children: React.ReactNode }) => <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>{children}<Label /></div>;
  switch (kind) {
    case "participant": return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ background: C.surface, border: `1.5px solid ${s}`, borderRadius: 5, padding: "4px 14px", fontSize: 12, fontWeight: "bold", color: s, whiteSpace: "nowrap", boxShadow: `0 0 10px ${C.accentDim}` }}>{name}</div></div>;
    case "actor": return <Stack><Svg><circle cx="32" cy="10" r="8" stroke={s} strokeWidth="1.5" fill={f} /><line x1="32" y1="18" x2="32" y2="36" stroke={s} strokeWidth="1.5" /><line x1="18" y1="26" x2="46" y2="26" stroke={s} strokeWidth="1.5" /><line x1="32" y1="36" x2="20" y2="50" stroke={s} strokeWidth="1.5" /><line x1="32" y1="36" x2="44" y2="50" stroke={s} strokeWidth="1.5" /></Svg></Stack>;
    case "boundary": return <Stack><Svg><line x1="14" y1="10" x2="14" y2="42" stroke={s} strokeWidth="2.5" /><line x1="14" y1="26" x2="24" y2="26" stroke={s} strokeWidth="1.5" /><circle cx="38" cy="26" r="14" stroke={s} strokeWidth="1.5" fill={f} /></Svg></Stack>;
    case "control": return <Stack><Svg><circle cx="32" cy="26" r="16" stroke={s} strokeWidth="1.5" fill={f} /><path d="M 40 12 A 14 14 0 0 1 46 22" stroke={s} strokeWidth="1.5" fill="none" /><polygon points="46,22 50,14 41,16" fill={s} /></Svg></Stack>;
    case "entity": return <Stack><Svg><circle cx="32" cy="26" r="16" stroke={s} strokeWidth="1.5" fill={f} /><line x1="17" y1="38" x2="47" y2="38" stroke={s} strokeWidth="1.5" /></Svg></Stack>;
    case "database": return <Stack><Svg><rect x="16" y="16" width="32" height="26" stroke={s} strokeWidth="1.5" fill={f} rx="2" /><ellipse cx="32" cy="16" rx="16" ry="5" stroke={s} strokeWidth="1.5" fill={f} /><path d="M16 42 Q32 48 48 42" stroke={s} strokeWidth="1.5" fill="none" /></Svg></Stack>;
    case "collections": return <Stack><Svg><rect x="22" y="10" width="28" height="22" stroke={s} strokeWidth="1.2" fill={fd} rx="1" /><rect x="19" y="13" width="28" height="22" stroke={s} strokeWidth="1.2" fill={fd} rx="1" /><rect x="16" y="16" width="28" height="22" stroke={s} strokeWidth="1.5" fill={f} rx="1" /></Svg></Stack>;
    case "queue": return <Stack><Svg><rect x="12" y="14" width="40" height="22" stroke={s} strokeWidth="1.5" fill={f} rx="11" /><ellipse cx="12" cy="25" rx="4" ry="11" stroke={s} strokeWidth="1.5" fill={f} /></Svg></Stack>;
    default: return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ border: `1.5px solid ${s}`, borderRadius: 5, padding: "4px 14px", fontSize: 12, fontWeight: "bold", color: s, whiteSpace: "nowrap" }}>{name}</div></div>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/ArrowSVG.tsx
// ─────────────────────────────────────────────────────────────────────────────

let _aid = 0;
function ArrowSVG({ arrow, x1pct, x2pct, rowH }: { arrow: string; x1pct: number; x2pct: number; rowH: number }) {
  const id = `ah${_aid++}`, isDashed = arrow.includes("--"), color = C.arrow, y = rowH - MSG_EXTRA_V / 2;
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none", zIndex: 1 }}>
      <defs><marker id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill={color} /></marker></defs>
      <line x1={`${x1pct}%`} y1={y} x2={`${x2pct}%`} y2={y} stroke={color} strokeWidth="1.5" strokeDasharray={isDashed ? "5,3" : undefined} markerEnd={`url(#${id})`} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/NoteBox.tsx
// ─────────────────────────────────────────────────────────────────────────────

function NoteBox({ lines, color }: { lines: string[]; color: string | null }) {
  const bg = color ? resolveCSSColor(color) ?? C.noteBg : C.noteBg;
  const txt = color ? "#111" : C.noteText;
  const multi = lines.length > 1;
  const FOLD = 10;
  return (
    <div style={{ position: "relative", display: "inline-block", background: bg, border: `1px solid ${C.noteBorder}`, fontSize: NOTE_FONT_SIZE, color: txt, lineHeight: `${NOTE_LINE_H}px`, padding: `${NOTE_PAD_V / 2}px 12px`, whiteSpace: multi ? "pre-wrap" : "nowrap", wordBreak: multi ? "break-word" : "normal", clipPath: `polygon(0 0,calc(100% - ${FOLD}px) 0,100% ${FOLD}px,100% 100%,0 100%)`, boxShadow: "1px 2px 5px rgba(0,0,0,0.25)" }}>
      <svg style={{ position: "absolute", top: 0, right: 0, width: FOLD, height: FOLD, overflow: "visible" }}><polygon points={`0,0 ${FOLD},${FOLD} ${FOLD},0`} fill={C.noteBorder} opacity="0.6" /></svg>
      {lines.map((l, i) => <div key={i}>{l || "\u00A0"}</div>)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/DiagramRow.tsx
// ─────────────────────────────────────────────────────────────────────────────

interface RenderCtx {
  autonumber: boolean;
  cx: (i: number) => number;
  aliasToIdx: Record<string, number>;
  lifelines: () => React.ReactNode;
  renderStmts: (s: StatementNode[], d: number) => React.ReactNode;
}

function renderMessage(s: MessageNode, ctx: RenderCtx) {
  const { cx, aliasToIdx, lifelines, autonumber } = ctx;
  const fi = aliasToIdx[s.from] ?? 0, ti = aliasToIdx[s.to] ?? 0;
  const isBack = s.arrow.startsWith("<"), x1 = cx(isBack ? ti : fi), x2 = cx(isBack ? fi : ti);
  const ll = splitLabel(s.label), rowH = msgRowHeight(ll);
  return (
    <div style={{ position: "relative", height: rowH }}>
      {lifelines()}
      <ArrowSVG arrow={s.arrow} x1pct={x1} x2pct={x2} rowH={rowH} />
      <div style={{ position: "absolute", left: `${Math.min(cx(fi), cx(ti)) + 1}%`, right: `${100 - Math.max(cx(fi), cx(ti)) + 1}%`, top: 4, bottom: MSG_ARROW_H + MSG_EXTRA_V / 2, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", zIndex: 2, pointerEvents: "none" }}>
        {autonumber && <span style={{ background: C.arrow, color: C.bg, borderRadius: 9, padding: "1px 6px", marginBottom: 2, fontWeight: "bold", fontSize: 10 }}>{s.idx}</span>}
        {ll.map((l, i) => <span key={i} style={{ display: "block", fontSize: 11, color: C.text, textAlign: "center", lineHeight: `${MSG_LABEL_LINE_H}px`, whiteSpace: "nowrap" }}>{l}</span>)}
      </div>
    </div>
  );
}

function renderNote(s: NoteNode, key: string, ctx: RenderCtx) {
  const { cx, aliasToIdx, lifelines } = ctx;
  const h = noteHeight(s.lines);
  if (s.position === "across") return <div key={key} style={{ position: "relative", height: h + 8 }}>{lifelines()}<div style={{ position: "absolute", left: 4, right: 4, top: 4, zIndex: 3 }}><NoteBox lines={s.lines} color={s.color} /></div></div>;
  if (s.position === "over") {
    const i1 = s.p1 ? (aliasToIdx[s.p1] ?? 0) : 0, i2 = s.p2 ? (aliasToIdx[s.p2] ?? i1) : i1;
    const cxMin = Math.min(cx(i1), cx(i2)), cxMax = Math.max(cx(i1), cx(i2));
    const center = (cxMin + cxMax) / 2, span = i1 !== i2 ? cxMax - cxMin + 10 : 0;
    return <div key={key} style={{ position: "relative", height: h + 8 }}>{lifelines()}<div style={{ position: "absolute", left: `${center}%`, transform: "translateX(-50%)", top: 4, zIndex: 3, minWidth: 130, ...(span > 0 ? { width: `${span}%` } : {}) }}><NoteBox lines={s.lines} color={s.color} /></div></div>;
  }
  const idx = s.p1 ? (aliasToIdx[s.p1] ?? 0) : 0, isLeft = s.position === "left";
  return <div key={key} style={{ position: "relative", height: h + 8 }}>{lifelines()}<div style={{ position: "absolute", ...(isLeft ? { right: `calc(${100 - cx(idx)}% + 6px)` } : { left: `calc(${cx(idx)}% + 6px)` }), top: 4, zIndex: 3, minWidth: 100, maxWidth: 220 }}><NoteBox lines={s.lines} color={s.color} /></div></div>;
}

function Tag({ label, color, border }: { label: string; color: string; border: string }) {
  return <span style={{ background: C.surface, border: `1px solid ${border}`, borderRadius: "3px 0 5px 0", padding: "1px 8px", fontSize: 11, fontWeight: "bold", color, fontFamily: "monospace", flexShrink: 0 }}>{label}</span>;
}

function renderStatements(stmts: StatementNode[], depth: number, ctx: RenderCtx): React.ReactNode {
  return stmts.map((s, si) => {
    const key = `${depth}-${si}`;
    switch (s.type) {
      case "MESSAGE": return <React.Fragment key={key}>{renderMessage(s, ctx)}</React.Fragment>;
      case "NOTE": return renderNote(s, key, ctx);
      case "DIVIDER": return (
        <div key={key} style={{ position: "relative", height: 38, display: "flex", alignItems: "center" }}>
          {ctx.lifelines()}
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 2, display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><div style={{ height: 1.5, background: C.dividerLine }} /><div style={{ height: 1.5, background: C.dividerLine }} /></div>
            <div style={{ padding: "2px 14px", background: C.surface, border: `1.5px solid ${C.dividerLine}`, borderRadius: 3, fontSize: 12, fontWeight: "bold", color: C.dividerText, whiteSpace: "nowrap", margin: "0 10px" }}>{s.label}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><div style={{ height: 1.5, background: C.dividerLine }} /><div style={{ height: 1.5, background: C.dividerLine }} /></div>
          </div>
        </div>
      );
      case "ALT_BLOCK": return (
        <div key={key} style={{ border: `1.5px solid ${C.altBorder}`, borderRadius: 4, margin: "4px 0", background: C.altBg, position: "relative" }}>
          {s.branches.map((b, bi) => (
            <div key={bi}>
              <div style={{ display: "flex", alignItems: "center", height: 26, background: "rgba(255,255,255,0.04)", borderBottom: `1px solid ${C.altBorder}`, paddingLeft: 6, gap: 8 }}>
                {bi === 0 ? <><Tag label="alt" color={C.altLabel} border={C.altBorder} /><span style={{ fontSize: 12, color: C.muted }}>[{b.condition}]</span></> : <span style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>[{b.condition || "else"}]</span>}
              </div>
              <div style={{ position: "relative", padding: "0 6px" }}>{ctx.lifelines()}{b.statements.length > 0 ? ctx.renderStmts(b.statements, depth + 1) : <div style={{ height: 20 }} />}</div>
              {bi < s.branches.length - 1 && <div style={{ borderTop: `1px dashed ${C.altBorder}` }} />}
            </div>
          ))}
        </div>
      );
      case "GROUP_BLOCK": return (
        <div key={key} style={{ border: `1.5px solid ${C.groupBorder}`, borderRadius: 4, margin: "4px 0", background: C.groupBg, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", height: 26, background: "rgba(99,102,241,0.12)", borderBottom: `1px solid ${C.groupBorder}`, paddingLeft: 6, gap: 8 }}><Tag label="group" color={C.groupLabel} border={C.groupBorder} /><span style={{ fontSize: 12, color: C.groupLabel, opacity: 0.8 }}>{s.label}</span></div>
          <div style={{ position: "relative", padding: "0 6px" }}>{ctx.lifelines()}{s.statements.length > 0 ? ctx.renderStmts(s.statements, depth + 1) : <div style={{ height: 20 }} />}</div>
        </div>
      );
      case "LOOP_BLOCK": return (
        <div key={key} style={{ border: `1.5px solid ${C.loopBorder}`, borderRadius: 4, margin: "4px 0", background: C.loopBg, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", height: 26, background: "rgba(52,211,153,0.08)", borderBottom: `1px solid ${C.loopBorder}`, paddingLeft: 6, gap: 8 }}>
            <Tag label="loop" color={C.loopLabel} border={C.loopBorder} />
            <span style={{ fontSize: 12, color: C.loopLabel, opacity: 0.8 }}>{s.label}</span>
            <svg width="14" height="14" style={{ marginLeft: "auto", marginRight: 8, opacity: 0.7, flexShrink: 0 }}><path d="M7 2 A5 5 0 1 1 2 7" stroke={C.loopLabel} strokeWidth="1.5" fill="none" /><polygon points="7,0 11,4 3,4" fill={C.loopLabel} /></svg>
          </div>
          <div style={{ position: "relative", padding: "0 6px" }}>{ctx.lifelines()}{s.statements.length > 0 ? ctx.renderStmts(s.statements, depth + 1) : <div style={{ height: 20 }} />}</div>
        </div>
      );
      default: return null;
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/BoxOverlay.tsx
// ─────────────────────────────────────────────────────────────────────────────

function getBoxSpan(box: BoxDeclNode, colW: number, aliasToIdx: Record<string, number>) {
  const idxs = box.allAliases.map(a => aliasToIdx[a]).filter((i): i is number => i !== undefined);
  if (!idxs.length) return null;
  const min = Math.min(...idxs), max = Math.max(...idxs);
  return { leftPct: min * colW, rightPct: 100 - (max + 1) * colW };
}

function BoxBand({ box, colW, aliasToIdx, nestDepth = 0 }: { box: BoxDeclNode; colW: number; aliasToIdx: Record<string, number>; nestDepth?: number }) {
  const span = getBoxSpan(box, colW, aliasToIdx);
  if (!span) return null;
  const { bg, border, text } = resolveBoxColors(box.color);
  const parentW = 100 - span.leftPct - span.rightPct;
  const titleStyle = { position: "absolute" as const, top: 5, left: 6, right: 6, textAlign: "center" as const, fontSize: 12, fontWeight: "bold", fontStyle: "italic", opacity: 0.75, whiteSpace: "nowrap" as const, overflow: "hidden" as const, textOverflow: "ellipsis" as const, pointerEvents: "none" as const, lineHeight: `${BOX_TITLE_ROW_H - 6}px` };
  return (
    <div style={{ position: "absolute", left: `${span.leftPct}%`, right: `${span.rightPct}%`, top: 0, bottom: 0, background: bg, border: `1.5px solid ${border}`, borderRadius: 5, zIndex: nestDepth + 1, pointerEvents: "none", overflow: "hidden" }}>
      {box.title && <div style={{ ...titleStyle, color: text }}>{box.title}</div>}
      {box.children.map((child, ci) => {
        const cs = getBoxSpan(child, colW, aliasToIdx); if (!cs) return null;
        const { bg: cbg, border: cb, text: ct } = resolveBoxColors(child.color);
        const cl = ((cs.leftPct - span.leftPct) / parentW) * 100, cr = ((cs.rightPct - span.rightPct) / parentW) * 100;
        const top = box.title ? BOX_TITLE_ROW_H : 4;
        return <div key={ci} style={{ position: "absolute", left: `${cl}%`, right: `${cr}%`, top, bottom: 0, background: cbg, border: `1.5px solid ${cb}`, borderRadius: 4, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>{child.title && <div style={{ ...titleStyle, color: ct }}>{child.title}</div>}</div>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderer/SequenceDiagram.tsx
// ─────────────────────────────────────────────────────────────────────────────

function SequenceDiagram({ ast }: { ast: DiagramAST }) {
  const { participants, statements, autonumber, boxes } = ast;
  if (!participants.length) return null;

  const N = participants.length, colW = 100 / N, cx = (i: number) => (i + 0.5) * colW;
  const aliasToIdx: Record<string, number> = {};
  participants.forEach((p, i) => { aliasToIdx[p.alias] = i; });

  const lifelines = () => participants.map((_, i) => (
    <div key={i} style={{ position: "absolute", left: `${cx(i)}%`, top: 0, bottom: 0, width: 1.5, background: C.lifeline, transform: "translateX(-50%)", zIndex: 0 }} />
  ));

  const hasBoxes = boxes.length > 0;
  function boxDepth(b: BoxDeclNode): number { return b.children.length ? 1 + Math.max(...b.children.map(boxDepth)) : 1; }
  const titleBarH = hasBoxes ? Math.max(...boxes.map(boxDepth)) * BOX_TITLE_ROW_H : 0;
  const partBarH = titleBarH + PART_BAR_BASE_H;

  const ParticipantRow = () => (
    <div style={{ position: "relative", height: PART_BAR_BASE_H, zIndex: 5, width: "100%" }}>
      {participants.map((p, i) => (
        <div key={p.alias} style={{ position: "absolute", left: `${cx(i)}%`, transform: "translateX(-50%)", bottom: 2, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ParticipantShape kind={p.kind} name={p.name} />
        </div>
      ))}
    </div>
  );

  const renderStmts = (stmts: StatementNode[], depth: number): React.ReactNode =>
    renderStatements(stmts, depth, { autonumber, cx, aliasToIdx, lifelines, renderStmts });

  return (
    <div style={{ fontFamily: "monospace", color: C.text, position: "relative" }}>
      {hasBoxes && boxes.map((box, bi) => <BoxBand key={bi} box={box} colW={colW} aliasToIdx={aliasToIdx} nestDepth={0} />)}
      <div style={{ position: "relative", zIndex: 5 }}>
        <div style={{ height: partBarH, position: "relative", display: "flex", alignItems: "flex-end" }}><ParticipantRow /></div>
        <div style={{ position: "relative" }}>{renderStmts(statements, 0)}</div>
        <div style={{ height: partBarH, position: "relative", display: "flex", alignItems: "flex-start" }}><ParticipantRow /></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// samples/index.ts
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLES: { label: string; code: string }[] = [
  { label: "box", code: `@startuml\n\nbox "Internal Service" #LightBlue\n  participant Bob\n  participant Alice\nend box\n\nparticipant Other\n\nBob -> Alice : hello\nAlice -> Other : hello\n\n@enduml` },
  { label: "box nested", code: `@startuml\n\nbox "Internal Service" #LightBlue\n  participant Bob\n  box "Subteam" #LightGray\n    participant Alice\n    participant John\n  end box\nend box\n\nparticipant Other\n\nBob -> Alice : hello\nAlice -> John : hello\nJohn -> Other: Hello\n\n@enduml` },
  { label: "notes bare", code: `@startuml\nAlice->Bob : hello\nnote left: this is a first note\n\nBob->Alice : ok\nnote right: this is another note\n\nJame->Bob : I am thinking\nnote left\na note\ncan also be defined\non several lines\nend note\n@enduml` },
  { label: "notes full", code: `@startuml\nparticipant Alice\nparticipant Bob\n\nnote left of Alice #aqua\nThis is displayed\nleft of Alice.\nend note\n\nnote right of Alice: This is displayed right of Alice.\nnote over Alice: This is displayed over Alice.\nnote over Alice, Bob #FFAAAA: This is displayed over Bob and Alice.\nnote across: This note spans ALL participants!\n\nAlice -> Bob: Hello\nBob --> Alice: Hi back\n@enduml` },
  { label: "dividers", code: `@startuml\n\n== Initialization ==\n\nAlice -> Bob: Authentication Request\nBob --> Alice: Authentication Response\n\n== Repetition ==\n\nAlice -> Bob: Another authentication Request\nAlice <-- Bob: another authentication Response\n\n@enduml` },
  { label: "combined", code: `@startuml\nactor User as U\nparticipant App as A\ndatabase Cache as C\ndatabase DB as D\n\n== Authentication ==\n\nnote over U, A: User initiates login flow\n\nU -> A : Login Request\n\nalt cache hit\n    A -> C : Check session\n    C -> A : Session found\n    A -> U : Welcome back!\nelse cache miss\n    A -> DB : Verify credentials\n    DB -> A : User valid\n    A -> U : Login successful\nend\n\ngroup Sync\n    loop every 5 seconds\n        A -> DB : Poll\n        DB -> A : Data\n    end\nend\n\nnote across #lightblue: All done\n\n@enduml` },
  { label: "all types", code: `@startuml\nparticipant Participant as Foo\nactor Actor as Foo1\nboundary Boundary as Foo2\ncontrol Control as Foo3\nentity Entity as Foo4\ndatabase Database as Foo5\ncollections Collections as Foo6\nqueue Queue as Foo7\n\nFoo -> Foo1 : To actor\nFoo -> Foo2 : To boundary\nFoo -> Foo3 : To control\nFoo -> Foo4 : To entity\nFoo -> Foo5 : To database\nFoo -> Foo6 : To collections\nFoo -> Foo7 : To queue\n@enduml` },
  { label: "alt/else", code: `@startuml\nactor Alice as A\nparticipant Server as S\ndatabase DB as D\n\nA -> S : Authentication Request\n\nalt success\n    S -> D : Query user\n    D -> S : User found\n    S -> A : Authentication Accepted\nelse failure\n    S -> A : Authentication Failure\n    alt retry\n        A -> S : Retry login\n        S -> A : Please repeat\n    else give up\n        A -> S : Cancel\n    end\nend\n@enduml` },
];

// ─────────────────────────────────────────────────────────────────────────────
// App.tsx
// ─────────────────────────────────────────────────────────────────────────────

export default function PlantumlParser() {
  const [input, setInput] = useState(SAMPLES[0].code);
  const [ast, setAst] = useState<DiagramAST | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"diagram" | "ast">("diagram");

  useEffect(() => {
    try { setAst(parse(input)); setError(null); }
    catch (e) { setError((e as Error).message); setAst(null); }
  }, [input]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'JetBrains Mono','Fira Code',monospace", padding: 20, boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ marginBottom: 18, borderBottom: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 18, color: C.accent }}>PlantUML Sequence Viewer</h1>
          <span style={{ fontSize: 10, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px" }}>
            notes · dividers · alt · group · loop · box · all participant types
          </span>
        </div>
      </div>

      {/* Shape legend */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", marginBottom: 18, alignItems: "flex-end" }}>
        {PARTICIPANT_KINDS.map(k => (
          <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <ParticipantShape kind={k} name={k === "participant" ? "Participant" : k.charAt(0).toUpperCase() + k.slice(1)} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        {/* Editor */}
        <div>
          <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            {SAMPLES.map(({ label, code }) => (
              <button key={label} onClick={() => setInput(code)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 5, padding: "3px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
            ))}
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} spellCheck={false}
            style={{ width: "100%", height: 400, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: "inherit", fontSize: 12, lineHeight: 1.7, padding: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
          {error && <div style={{ marginTop: 8, background: "#2d1515", border: "1px solid #f47067", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#f47067" }}>⚠ {error}</div>}
        </div>

        {/* Output */}
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {(["diagram", "ast"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? C.accent : C.surface, color: tab === t ? C.bg : C.muted, border: `1px solid ${tab === t ? C.accent : C.border}`, borderRadius: 6, padding: "4px 14px", fontSize: 10, cursor: "pointer", fontWeight: tab === t ? "bold" : "normal", textTransform: "uppercase", letterSpacing: 1, fontFamily: "inherit" }}>{t}</button>
            ))}
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, minHeight: 500, overflowX: "auto" }}>
            {ast && tab === "diagram" && <SequenceDiagram ast={ast} />}
            {ast && tab === "ast" && <pre style={{ margin: 0, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>{JSON.stringify(ast, null, 2)}</pre>}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 10, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8, flexWrap: "wrap" }}>
            {[{ c: C.arrow, l: "→ arrow" }, { c: C.altLabel, l: "alt" }, { c: C.groupLabel, l: "group" }, { c: C.loopLabel, l: "loop" }, { c: C.noteBorder, l: "note" }, { c: C.dividerLine, l: "divider" }].map(({ c, l }) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}