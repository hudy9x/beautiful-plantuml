import React from "react";
import { type StatementNode, type MessageNode, type NoteNode } from "../types";
import { C, MSG_ARROW_H, MSG_EXTRA_V, MSG_LABEL_LINE_H } from "../theme";
import { splitLabel, msgRowHeight, noteHeight } from "./utils";
import { ArrowSVG } from "./ArrowSVG";
import { NoteBox } from "./NoteBox";

export interface RenderCtx {
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

export function renderStatements(stmts: StatementNode[], depth: number, ctx: RenderCtx): React.ReactNode {
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
