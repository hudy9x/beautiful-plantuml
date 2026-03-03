// ─────────────────────────────────────────────────────────────────────────────
// layout/shapes.ts  —  FIX #1: per-shape bottom offset for lifeline attachment
//
// Each shape is drawn centered at (cx, cy).
// The lifeline must start exactly at the bottom of the visible shape.
// bottomOffset = distance from cy DOWN to where the shape ends.
// topOffset    = distance from cy UP   to where the shape ends (footer).
// ─────────────────────────────────────────────────────────────────────────────

import type { ParticipantKind } from "../types";

// Returns the y-offset from shape center to bottom edge (where lifeline connects)
export function shapeBottomOffset(kind: ParticipantKind, hasStereo?: boolean): number {
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
export function shapeTopOffset(kind: ParticipantKind, hasStereo?: boolean): number {
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
