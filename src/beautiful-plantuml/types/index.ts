export type ParticipantKind =
  | "participant" | "actor" | "boundary" | "control"
  | "entity" | "database" | "collections" | "queue";

export const PARTICIPANT_KINDS: ParticipantKind[] = [
  "participant", "actor", "boundary", "control",
  "entity", "database", "collections", "queue",
];

export interface Participant { alias: string; name: string; kind: ParticipantKind; stereoType?: string; color?: string; }
export type ArrowType =
  // solid right / left (standard)
  | "->" | "<-"
  // dashed right / left (standard)
  | "-->" | "<--"
  // lost (×) head
  | "->x" | "x<-"
  // circle head
  | "->o" | "o<-"
  // open / thin arrowhead
  | "->>" | "<<-"
  // backslash / forward-slash aliases (same render as -> / <-)
  | "-\\" | "\\-" | "--\\" | "\\--"
  | "//--" | "--//"
  // circle-tail variants
  | "o\\-" | "-\\o" | "o\\--" | "--\\o";
export type NotePosition = "left" | "right" | "over" | "across";

export type Token =
  | { type: "START" } | { type: "END" }
  | { type: "TITLE"; text: string }
  | { type: "AUTONUMBER"; start?: string }
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
  | { type: "NOTE_BARE_START"; position: "left" | "right"; color: string | null }
  | { type: "SPACE"; pixels: number }
  | { type: "EMPTY_LINE" };

export interface MessageNode { type: "MESSAGE"; id: string; lineNo?: number; from: string; arrow: ArrowType; to: string; label: string; idx: number; autoNum: number | string | null; leftAlias: string; rightAlias: string; }
export interface NoteNode { type: "NOTE"; id: string; lineNo?: number; position: NotePosition; p1: string | null; p2: string | null; color: string | null; lines: string[]; }
export interface DividerNode { type: "DIVIDER"; id: string; lineNo?: number; label: string; }
export interface AltBranch { condition: string; statements: StatementNode[]; }
export interface AltBlockNode { type: "ALT_BLOCK"; id: string; lineNo?: number; branches: AltBranch[]; }
export interface GroupBlockNode { type: "GROUP_BLOCK"; id: string; lineNo?: number; label: string; statements: StatementNode[]; }
export interface LoopBlockNode { type: "LOOP_BLOCK"; id: string; lineNo?: number; label: string; statements: StatementNode[]; }
export interface BoxDeclNode { type: "BOX_DECL"; id: string; title: string | null; color: string | null; directAliases: string[]; children: BoxDeclNode[]; allAliases: string[]; }
export interface SpaceNode { type: "SPACE"; id: string; lineNo?: number; pixels: number; }
export type StatementNode = MessageNode | NoteNode | DividerNode | AltBlockNode | GroupBlockNode | LoopBlockNode | BoxDeclNode | SpaceNode;
export interface DiagramAST { title: string | null; autonumber: boolean; participants: Participant[]; declMap: Record<string, Participant>; statements: StatementNode[]; boxes: BoxDeclNode[]; errors: { line: number; text: string }[]; }
