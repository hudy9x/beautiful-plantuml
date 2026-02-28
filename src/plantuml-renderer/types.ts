// ─── Participant ─────────────────────────────────────────────────────────────

export type ParticipantKind =
  | "participant" | "actor" | "boundary" | "control"
  | "entity" | "database" | "collections" | "queue";

export const PARTICIPANT_KINDS: ParticipantKind[] = [
  "participant", "actor", "boundary", "control",
  "entity", "database", "collections", "queue",
];

export interface Participant { alias: string; name: string; kind: ParticipantKind; }

// ─── Arrow / Note ─────────────────────────────────────────────────────────────

export type ArrowType = "->" | "<-" | "-->" | "<--";
export type NotePosition = "left" | "right" | "over" | "across";

// ─── Tokens (tokenizer output) ────────────────────────────────────────────────

export type Token =
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

// ─── AST nodes (parser output) ────────────────────────────────────────────────

export interface MessageNode { type: "MESSAGE"; from: string; arrow: ArrowType; to: string; label: string; idx: number; leftAlias: string; rightAlias: string; }
export interface NoteNode { type: "NOTE"; position: NotePosition; p1: string | null; p2: string | null; color: string | null; lines: string[]; }
export interface DividerNode { type: "DIVIDER"; label: string; }
export interface AltBranch { condition: string; statements: StatementNode[]; }
export interface AltBlockNode { type: "ALT_BLOCK"; branches: AltBranch[]; }
export interface GroupBlockNode { type: "GROUP_BLOCK"; label: string; statements: StatementNode[]; }
export interface LoopBlockNode { type: "LOOP_BLOCK"; label: string; statements: StatementNode[]; }
export interface BoxDeclNode { type: "BOX_DECL"; title: string | null; color: string | null; directAliases: string[]; children: BoxDeclNode[]; allAliases: string[]; }
export type StatementNode = MessageNode | NoteNode | DividerNode | AltBlockNode | GroupBlockNode | LoopBlockNode | BoxDeclNode;

export interface DiagramAST {
  autonumber: boolean;
  participants: Participant[];
  declMap: Record<string, Participant>;
  statements: StatementNode[];
  boxes: BoxDeclNode[];
}
