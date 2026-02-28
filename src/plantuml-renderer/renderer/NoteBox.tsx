import { type NoteNode } from "../types";
import { C, NOTE_FONT_SIZE, NOTE_LINE_H, NOTE_PAD_V } from "../theme";
import { resolveCSSColor } from "./utils";

export function NoteBox({ lines, color }: { lines: string[]; color: string | null }) {
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

// Re-export type for convenience
export type { NoteNode };
