export type ParticipantKind =
  | "participant" | "actor" | "boundary" | "control"
  | "entity" | "database" | "collections" | "queue";

export const PARTICIPANT_KINDS: ParticipantKind[] = [
  "participant", "actor", "boundary", "control",
  "entity", "database", "collections", "queue",
];

export interface Participant { alias: string; name: string; kind: ParticipantKind; stereoType?: string; color?: string; }
export type ArrowType = "->" | "<-" | "-->" | "<--";
export type NotePosition = "left" | "right" | "over" | "across";

export type Token =
  | { type: "START" } | { type: "END" }
  | { type: "TITLE"; text: string }
  | { type: "AUTONUMBER" }
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

export interface MessageNode { type: "MESSAGE"; id: string; from: string; arrow: ArrowType; to: string; label: string; idx: number; autoNum: number | null; leftAlias: string; rightAlias: string; }
export interface NoteNode { type: "NOTE"; id: string; position: NotePosition; p1: string | null; p2: string | null; color: string | null; lines: string[]; }
export interface DividerNode { type: "DIVIDER"; id: string; label: string; }
export interface AltBranch { condition: string; statements: StatementNode[]; }
export interface AltBlockNode { type: "ALT_BLOCK"; id: string; branches: AltBranch[]; }
export interface GroupBlockNode { type: "GROUP_BLOCK"; id: string; label: string; statements: StatementNode[]; }
export interface LoopBlockNode { type: "LOOP_BLOCK"; id: string; label: string; statements: StatementNode[]; }
export interface BoxDeclNode { type: "BOX_DECL"; id: string; title: string | null; color: string | null; directAliases: string[]; children: BoxDeclNode[]; allAliases: string[]; }
export type StatementNode = MessageNode | NoteNode | DividerNode | AltBlockNode | GroupBlockNode | LoopBlockNode | BoxDeclNode;
export interface DiagramAST { title: string | null; autonumber: boolean; participants: Participant[]; declMap: Record<string, Participant>; statements: StatementNode[]; boxes: BoxDeclNode[]; errors: { line: number; text: string }[]; }
