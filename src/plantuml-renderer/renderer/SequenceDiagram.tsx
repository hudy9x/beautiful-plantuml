import React from "react";
import { type DiagramAST, type StatementNode } from "../types";
import { C, BOX_TITLE_ROW_H, PART_BAR_BASE_H } from "../theme";
import { parse } from "../parser/parser";
import { ParticipantShape } from "./ParticipantShape";
import { BoxBand } from "./BoxOverlay";
import { renderStatements } from "./DiagramRow";

function SequenceDiagramInner({ ast }: { ast: DiagramAST }) {
  const { participants, statements, autonumber, boxes } = ast;
  if (!participants.length) return null;

  const N = participants.length, colW = 100 / N, cx = (i: number) => (i + 0.5) * colW;
  const aliasToIdx: Record<string, number> = {};
  participants.forEach((p, i) => { aliasToIdx[p.alias] = i; });

  const lifelines = () => participants.map((_, i) => (
    <div key={i} style={{ position: "absolute", left: `${cx(i)}%`, top: 0, bottom: 0, width: 1.5, background: C.lifeline, transform: "translateX(-50%)", zIndex: 0 }} />
  ));

  const hasBoxes = boxes.length > 0;
  function boxDepth(b: typeof boxes[0]): number { return b.children.length ? 1 + Math.max(...b.children.map(boxDepth)) : 1; }
  const titleBarH = hasBoxes ? Math.max(...boxes.map(boxDepth)) * BOX_TITLE_ROW_H : 0;
  const partBarH = titleBarH + PART_BAR_BASE_H;

  const ParticipantRow = () => (
    <div style={{ position: "relative", height: PART_BAR_BASE_H, zIndex: 5, width: "100%" }}>
      {participants.map((p, i) => (
        <div key={p.alias} style={{ position: "absolute", left: `${cx(i)}%`, transform: "translateX(-50%)", bottom: 2, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <ParticipantShape kind={p.kind} name={p.name} />
        </div>
      ))}
    </div>
  );

  const renderStmts = (stmts: StatementNode[], depth: number): React.ReactNode =>
    renderStatements(stmts, depth, { autonumber, cx, aliasToIdx, lifelines, renderStmts });

  return (
    <div style={{ fontFamily: "monospace", color: C.text, position: "relative" }}>
      {hasBoxes && boxes.map((box, bi) => <BoxBand key={bi} box={box} colW={colW} aliasToIdx={aliasToIdx} nestDepth={0} />)}
      <div style={{ position: "relative", zIndex: 5 }}>
        <div style={{ height: partBarH, position: "relative", display: "flex", alignItems: "flex-end" }}><ParticipantRow /></div>
        <div style={{ position: "relative" }}>{renderStmts(statements, 0)}</div>
        <div style={{ height: partBarH, position: "relative", display: "flex", alignItems: "flex-start" }}><ParticipantRow /></div>
      </div>
    </div>
  );
}

/**
 * Renders a PlantUML sequence diagram from raw PlantUML text.
 *
 * @example
 * <SequenceDiagram code="@startuml\nAlice -> Bob: Hello\n@enduml" />
 */
export default function SequenceDiagram({ code }: { code: string }) {
  const ast = React.useMemo(() => {
    try { return parse(code); }
    catch { return null; }
  }, [code]);

  if (!ast) return null;
  return <SequenceDiagramInner ast={ast} />;
}
