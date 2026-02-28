// ─── React component (primary usage) ─────────────────────────────────────────
export { default as SequenceDiagram } from "./renderer/SequenceDiagram";

// ─── Parser (headless — no React needed) ─────────────────────────────────────
export { parse } from "./parser/parser";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  DiagramAST,
  Participant,
  ParticipantKind,
  StatementNode,
  MessageNode,
  NoteNode,
  DividerNode,
  AltBlockNode,
  AltBranch,
  GroupBlockNode,
  LoopBlockNode,
  BoxDeclNode,
  ArrowType,
  NotePosition,
} from "./types";

// ─── Theme (optional — for custom theming) ────────────────────────────────────
export { C } from "./theme";
export { PARTICIPANT_KINDS } from "./types";
