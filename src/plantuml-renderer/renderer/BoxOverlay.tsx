import { type BoxDeclNode } from "../types";
import { BOX_TITLE_ROW_H } from "../theme";
import { resolveBoxColors } from "./utils";

function getBoxSpan(box: BoxDeclNode, colW: number, aliasToIdx: Record<string, number>) {
  const idxs = box.allAliases.map(a => aliasToIdx[a]).filter((i): i is number => i !== undefined);
  if (!idxs.length) return null;
  const min = Math.min(...idxs), max = Math.max(...idxs);
  return { leftPct: min * colW, rightPct: 100 - (max + 1) * colW };
}

export function BoxBand({ box, colW, aliasToIdx, nestDepth = 0 }: { box: BoxDeclNode; colW: number; aliasToIdx: Record<string, number>; nestDepth?: number }) {
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
