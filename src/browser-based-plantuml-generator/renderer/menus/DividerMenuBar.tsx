import React from "react";
import { useDiagram } from "../../DiagramContext";
import { ActionButton } from "../../ActionButton";
import { MenuPopover } from "./MenuPopover";

function findNode(ast: any, id: string): any {
  function search(stmts: any[]): any {
    for (const s of stmts) {
      if (s.id === id) return s;
      if (s.type === "ALT_BLOCK") for (const b of s.branches) { const f = search(b.statements); if (f) return f; }
      if (s.type === "GROUP_BLOCK" || s.type === "LOOP_BLOCK") { const f = search(s.statements); if (f) return f; }
    }
    return null;
  }
  return search(ast.statements);
}

/**
 * Shows when a divider is selected.
 * Replace with your own component to customize the divider context menu.
 */
export function DividerMenuBar() {
  const { ast, selectedNodeId, clickPosition, actions } = useDiagram();
  if (!ast || !selectedNodeId || !clickPosition) return null;
  if (selectedNodeId.startsWith("participant:") || selectedNodeId.includes(":")) return null;

  const node = findNode(ast, selectedNodeId);
  if (!node || node.type !== "DIVIDER") return null;

  return (
    <MenuPopover position={clickPosition} title="Divider Actions" subtitle={<span>{node.label}</span>}>
      <ActionButton onClick={() => actions.deleteNode(selectedNodeId)} label="Delete divider" danger />
    </MenuPopover>
  );
}
