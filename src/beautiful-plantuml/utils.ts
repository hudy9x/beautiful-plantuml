import { NAMED_RGB } from "./layout/constants";
import type { BoxDeclNode, ParticipantKind } from "./types";

export const genId = () => Math.random().toString(36).substring(2, 9);

export function boxDepth(b: BoxDeclNode): number {
  return b.children.length ? 1 + Math.max(...b.children.map(boxDepth)) : 1;
}
// Strip PlantUML rich text markers to compute the true character length
export function stripRichText(text: string): string {
  if (!text) return "";
  return text.replace(/<font\s+color=(?:"[^"]+"|[^>\s]+)[^>]*>|<\/font>|\*\*|\/\/|""|--|__|~~/g, "");
}

// Returns the visual half-width of a participant shape from its center.
// Used to compute tight box band edges.
export function shapeHalfW(kind: ParticipantKind, name: string, stereoType?: string): number {
  const lines = name.split("\\n");
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, stripRichText(l).trim().length * 3.6 + 9);
  let w = maxW;
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

export function resolveBoxRGB(raw: string | null): string {
  const name = raw ? (raw.startsWith("#") ? raw.slice(1) : raw) : "LightBlue";
  const key = name.toLowerCase();
  if (NAMED_RGB[key]) return NAMED_RGB[key];
  const h6 = name.match(/^([0-9a-fA-F]{6})$/);
  if (h6) { const n = parseInt(h6[1], 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; }
  const h3 = name.match(/^([0-9a-fA-F]{3})$/);
  if (h3) { const [r, g, b] = h3[1].split("").map(c => parseInt(c + c, 16)); return `${r},${g},${b}`; }
  return NAMED_RGB.lightblue;
}

