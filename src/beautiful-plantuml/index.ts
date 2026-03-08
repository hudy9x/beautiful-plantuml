/**
 * browser-based-plantuml-generator
 *
 * A portable, copy-shareable PlantUML sequence diagram library.
 * Drop this folder into any React project — no build step required.
 *
 * Usage:
 *   import { DiagramProvider, SequenceDiagram, useDiagramActions } from './browser-based-plantuml-generator'
 */

// ── Core ──────────────────────────────────────────────────────────────────────
export { DiagramProvider, useDiagram, useDiagramActions } from "./DiagramContext";
export type { DiagramContextType } from "./DiagramContext";

// ── Diagram renderer ──────────────────────────────────────────────────────────
// SequenceDiagram reads ast from DiagramProvider context — no props needed
export { SequenceDiagram } from "./main";

// ── Zoom/Pan ──────────────────────────────────────────────────────────────────
// Optional wrapper — SequenceDiagram works without it too
export { ZoomPanContainer } from "./ZoomPanContainer";
export type { ZoomPanContainerProps } from "./ZoomPanContainer";
export { ZoomPanContext, useZoomPan } from "./ZoomPanContext";
export type { ZoomPanState } from "./ZoomPanContext";
export type { ZoomConfig } from "./zoomConfig";

// ── Interaction overlays ──────────────────────────────────────────────────────
// Drag arrowheads/tails between lifelines
export { ArrowDragLayer as MessageArrowHandler } from "./renderer/ArrowDragLayer";
// NOTE: CrosshairToolbar (InteractiveHoverLayer) is NOT exported — it is an internal
// SVG sub-component already embedded inside SequenceDiagram. No need to add it separately.

// ── Context menu components ───────────────────────────────────────────────────
// Use the built-in ones, replace any with your own, or omit unwanted menus.
export { DiagramActions } from "./DiagramActions";          // all-in-one composite
export { ParticipantMenuBar } from "./renderer/menus/ParticipantMenuBar";
export { MessageMenuBar } from "./renderer/menus/MessageMenuBar";
export { AltMenuBar } from "./renderer/menus/AltMenuBar";
export { GroupMenuBar } from "./renderer/menus/GroupMenuBar";
export { LoopMenuBar } from "./renderer/menus/LoopMenuBar";
export { DividerMenuBar } from "./renderer/menus/DividerMenuBar";
export { NoteMenuBar } from "./renderer/menus/NoteMenuBar";
export { MenuPopover } from "./renderer/menus/MenuPopover";

// ── Utilities ─────────────────────────────────────────────────────────────────
export { parse, parse as stringToAst } from "./parser/parser";
export { astToString } from "./parser/serializer";
export { C, THEMES } from "./theme";
export { PARTICIPANT_KINDS } from "./types";
export type { DiagramAST, StatementNode, Participant, MessageNode, NoteNode } from "./types";

// ── Internal building blocks (for advanced customisation) ─────────────────────
export { ParticipantShape } from "./renderer/shapes";
export { ActionButton } from "./ActionButton";
export { PromptDialog } from "./PromptDialog";
export type { PromptDialogProps } from "./PromptDialog";
