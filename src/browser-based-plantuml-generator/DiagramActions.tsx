import { C } from "./theme";
import type { DiagramAST, StatementNode } from "./types";
import { useDiagram } from "./DiagramContext";
import { ActionButton } from "./ActionButton";

function findNodeById(ast: DiagramAST, id: string): StatementNode | null {
  function search(stmts: StatementNode[]): StatementNode | null {
    for (const s of stmts) {
      if (s.id === id) return s;
      if (s.type === "ALT_BLOCK") {
        for (const b of s.branches) {
          const found = search(b.statements);
          if (found) return found;
        }
      } else if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") {
        const found = search(s.statements);
        if (found) return found;
      }
    }
    return null;
  }
  return search(ast.statements);
}

export function DiagramActions() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;

  if (selectedNodeId.startsWith("participant:")) {
    const alias = selectedNodeId.split(":")[1];
    const p = ast.participants.find(x => x.alias === alias);
    if (!p) return null;
    let s = `${p.kind} "${p.name}" as ${p.alias}`;
    if (p.name === p.alias && !p.name.includes(" ")) s = `${p.kind} ${p.name}`;
    if (p.stereoType) s += ` <<${p.stereoType}>>`;
    if (p.color) s += ` ${p.color}`;

    return (
      <div style={{
        position: "fixed", left: clickPosition.x, top: clickPosition.y - 8,
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 100,
        width: 200, transform: "translate(-50%, -100%)"
      }}>
        <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: C.text, textAlign: "center" }}>
          Participant Actions
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 12, wordBreak: "break-all", textAlign: "center" }}>
          <span>{s}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <ActionButton onClick={() => actions.createParticipant(alias)} label="Create participant" />
          <ActionButton onClick={() => {
            const str = window.prompt("Edit participant:", s);
            if (str !== null) actions.editParticipant(alias, str);
          }} label="Edit participant" />
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1 }}><ActionButton onClick={() => actions.moveParticipant(alias, "left")} label="Move Left" /></div>
            <div style={{ flex: 1 }}><ActionButton onClick={() => actions.moveParticipant(alias, "right")} label="Move Right" /></div>
          </div>
          <ActionButton onClick={() => actions.deleteParticipant(alias)} label="Delete participant" danger />
        </div>
      </div>
    );
  }

  const [baseId, branchIdxStr] = selectedNodeId.split(":");
  const branchIdx = branchIdxStr !== undefined ? parseInt(branchIdxStr, 10) : undefined;

  const node = findNodeById(ast, baseId);
  if (!node) return null;

  let title = "Node";
  if (node.type === "MESSAGE") title = "Message";
  if (node.type === "NOTE") title = "Note";
  if (node.type === "DIVIDER") title = "Divider";
  if (node.type === "ALT_BLOCK") title = "Alt Block";
  if (node.type === "GROUP_BLOCK") title = "Group Block";
  if (node.type === "LOOP_BLOCK") title = "Loop Block";

  // The global click listener gives us x = center, y = top of bounding box
  return (
    <div style={{
      position: "fixed", left: clickPosition.x, top: clickPosition.y - 8,
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.5)", zIndex: 100,
      width: 200, transform: "translate(-50%, -100%)"
    }}>
      <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8, color: C.text, textAlign: "center" }}>
        {title} Actions
      </div>
      {/* Node specifics for preview */}
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12, wordBreak: "break-all", textAlign: "center" }}>
        {node.type === "MESSAGE" && <span>{node.from} ➔ {node.to}</span>}
        {node.type === "NOTE" && <span>{node.position} {[node.p1, node.p2].filter(Boolean).join(", ")}</span>}
        {(node.type === "GROUP_BLOCK" || node.type === "LOOP_BLOCK") && <span>{node.label || "(no label)"}</span>}
        {node.type === "ALT_BLOCK" && <span>{node.branches.map(b => b.condition).join(" / ")}</span>}
        {node.type === "DIVIDER" && <span>{node.label}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {node.type === "MESSAGE" && (
          <>
            <ActionButton onClick={() => actions.createMessage(baseId, "after")} label="Create Message" />
            <ActionButton onClick={() => {
              const currentStr = node.label ? `${node.from} ${node.arrow} ${node.to}: ${node.label}` : `${node.from} ${node.arrow} ${node.to}`;
              const newStr = window.prompt("Edit message:", currentStr);
              if (newStr !== null) actions.editNodeLabel(baseId, newStr);
            }} label="Edit Message" />
            <ActionButton onClick={() => actions.deleteNode(baseId)} label="Delete Message" danger />
          </>
        )}

        {node.type === "ALT_BLOCK" && branchIdx !== undefined && node.branches[branchIdx] && (
          <>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, borderLeft: `2px solid ${C.border}`, paddingLeft: 6, textAlign: "left" }}>
              {branchIdx === 0 ? "Alt:" : "Else:"} {node.branches[branchIdx].condition || "(empty)"}
            </div>
            <ActionButton onClick={() => {
              const newCond = window.prompt(`Edit ${branchIdx === 0 ? "alt" : "else"} condition:`, node.branches[branchIdx].condition);
              if (newCond !== null) actions.editNodeLabel(baseId, newCond, branchIdx);
            }} label="Edit condition" />
            <ActionButton onClick={() => actions.createMessage(baseId, "inside", branchIdx)} label="Create message" />
            <ActionButton onClick={() => actions.createElse(baseId, branchIdx)} label="Create else" />
            {branchIdx > 0 ? (
              <ActionButton onClick={() => actions.deleteElse(baseId, branchIdx)} label="Delete else" danger />
            ) : (
              <ActionButton onClick={() => actions.deleteNode(baseId)} label="Delete alt" danger />
            )}
          </>
        )}

        {(node.type === "GROUP_BLOCK" || node.type === "LOOP_BLOCK") && (
          <>
            <ActionButton onClick={() => {
              const newLbl = window.prompt(`Edit ${node.type === "GROUP_BLOCK" ? "group" : "loop"} label:`, node.label);
              if (newLbl !== null) actions.editNodeLabel(baseId, newLbl);
            }} label="Edit header" />
            <ActionButton onClick={() => actions.createMessage(baseId, "inside")} label="Create message" />
            <ActionButton onClick={() => actions.deleteNode(baseId)} label="Delete block" danger />
          </>
        )}

        {(node.type === "NOTE" || node.type === "DIVIDER") && (
          <ActionButton onClick={() => actions.deleteNode(baseId)} label="Delete" danger />
        )}
      </div>
    </div>
  );
}
